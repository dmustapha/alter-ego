import { isCanonicalTimestampMs, type BehaviorMetricName } from "./types";
import { createHmac, timingSafeEqual } from "node:crypto";

const verifiedDatasets = new WeakSet<object>();

export interface HistoricalDataset {
  readonly source: HistoricalSource;
  readonly observations: readonly HistoricalObservation[];
  readonly exclusions: readonly DatasetExclusion[];
  readonly status: "ready" | "insufficient";
  readonly foldConfiguration: { readonly trainingSize: number; readonly testSize: number };
  readonly fingerprint: string;
}
export interface HistoricalSource { readonly id: string; readonly version: string; readonly retrievedAt: number; readonly interval: { readonly startAt: number; readonly endAt: number } }
export interface HistoricalSourceSnapshot { readonly source: HistoricalSource; readonly observations: readonly unknown[]; readonly attestation: string; }
export interface HistoricalSourceAdapter { readonly snapshot: () => HistoricalSourceSnapshot; }
export interface HistoricalDatasetRequest { readonly observationIds: readonly string[]; readonly foldConfiguration: { readonly trainingSize: number; readonly testSize: number }; }
export interface DatasetExclusion { readonly id: string; readonly reason: string; }
export interface HistoricalObservation { readonly id: string; readonly observedAt: number; readonly outcomeAt: number; readonly chainId: string; readonly assetId: string; readonly metric: BehaviorMetricName; readonly metricValue: number; readonly outcomeUsd: number; readonly costUsd: number; readonly slippageUsd: number; readonly liquidityUsd: number; readonly sourceEvidenceIds: readonly string[]; }

function attestHistoricalSource(input: Omit<HistoricalSourceSnapshot, "attestation">): HistoricalSourceSnapshot {
  const key = process.env.ALTER_EGO_HISTORICAL_SOURCE_KEY;
  if (!key) throw new Error("Historical source attestation key is unavailable.");
  const snapshot = { source: input.source, observations: input.observations, attestation: sign(input, key) };
  return Object.freeze({ ...snapshot, source: Object.freeze({ ...snapshot.source, interval: Object.freeze({ ...snapshot.source.interval }) }), observations: Object.freeze(snapshot.observations.map((item) => Object.freeze({ ...(item as Record<string, unknown>) }))) });
}

export const __testOnlyAttestHistoricalSource = process.env.NODE_ENV === "test" ? attestHistoricalSource : undefined;

export function createHistoricalValidationDataset(adapter: HistoricalSourceAdapter, request: HistoricalDatasetRequest): HistoricalDataset {
  const source = adapter?.snapshot?.();
  if (!isSnapshot(source) || !isAttested(source) || !isRequest(request)) throw new Error("Historical validation requires an attested source adapter and observation IDs.");
  const requested = new Set(request.observationIds);
  const sourceIds = new Set(source.observations.map((item) => isRecord(item) && typeof item.id === "string" ? item.id : ""));
  const missing = request.observationIds.filter((id) => !sourceIds.has(id)).map((id) => ({ id, reason: "unknown-source-observation" }));
  const seenIds = new Set<string>();
  const classified = source.observations.filter((item) => isRecord(item) && requested.has(String(item.id))).map((item, index) => classifyUnique(item, index, seenIds));
  const seenEvidence = new Set<string>();
  const scoped = classified.map((item) => isObservation(item) ? classifyScoped(item, source.source, seenEvidence) : item);
  const observations = scoped.filter(isObservation).map(freezeObservation);
  const exclusions = [...scoped.filter(isExclusion).map(freezeExclusion), ...missing.map(freezeExclusion)];
  const base = { source: Object.freeze({ ...source.source, interval: Object.freeze({ ...source.source.interval }) }), observations: Object.freeze(observations), exclusions: Object.freeze(exclusions), foldConfiguration: Object.freeze({ ...request.foldConfiguration }), status: observations.length ? "ready" as const : "insufficient" as const };
  const dataset = Object.freeze({ ...base, fingerprint: fingerprint(base) });
  verifiedDatasets.add(dataset);
  return dataset;
}

export function isHistoricalValidationDataset(value: unknown): value is HistoricalDataset { return isRecord(value) && verifiedDatasets.has(value) && Object.isFrozen(value) && typeof value.fingerprint === "string"; }

function isSnapshot(value: unknown): value is HistoricalSourceSnapshot { return isRecord(value) && isPlainData(value.source) && isPlainData(value.observations) && isSource(value.source) && Array.isArray(value.observations) && isNonemptyString(value.attestation); }
function isAttested(value: HistoricalSourceSnapshot): boolean { const key = process.env.ALTER_EGO_HISTORICAL_SOURCE_KEY; if (!key) return false; const expected = sign({ source: value.source, observations: value.observations }, key); return value.attestation.length === expected.length && timingSafeEqual(Buffer.from(value.attestation), Buffer.from(expected)); }
function sign(value: Omit<HistoricalSourceSnapshot, "attestation">, key: string): string { return createHmac("sha256", key).update(canonicalize([value.source, value.observations])).digest("hex"); }
function canonicalize(value: unknown): string { return JSON.stringify(normalizePlainData(value)); }
function normalizePlainData(value: unknown): unknown { if (Array.isArray(value)) return value.map(normalizePlainData); if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalizePlainData(value[key])])); return value; }
function isPlainData(value: unknown): boolean { if (value === null || typeof value !== "object") return typeof value !== "function"; if (Array.isArray(value)) return Object.getPrototypeOf(value) === Array.prototype && !Object.prototype.hasOwnProperty.call(value, "toJSON") && value.every(isPlainData); if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false; return !Object.prototype.hasOwnProperty.call(value, "toJSON") && Object.values(Object.getOwnPropertyDescriptors(value)).every((descriptor) => "value" in descriptor && isPlainData(descriptor.value)); }
function isRequest(value: unknown): value is HistoricalDatasetRequest { return isRecord(value) && Array.isArray(value.observationIds) && value.observationIds.every(isNonemptyString) && isFoldConfiguration(value.foldConfiguration); }
function isSource(value: unknown): value is HistoricalSource { return isRecord(value) && isNonemptyString(value.id) && isNonemptyString(value.version) && isRecord(value.interval) && isCanonicalTimestampMs(value.retrievedAt, Date.now()) && isCanonicalTimestampMs(value.interval.startAt, value.retrievedAt) && isCanonicalTimestampMs(value.interval.endAt, value.retrievedAt) && value.interval.startAt <= value.interval.endAt; }
function isFoldConfiguration(value: unknown): boolean { return isRecord(value) && isPositiveInteger(value.trainingSize) && isPositiveInteger(value.testSize); }
function classifyUnique(value: unknown, index: number, seenIds: Set<string>): HistoricalObservation | DatasetExclusion { const result = classify(value, index); if (!isObservation(result) || !seenIds.has(result.id)) { if (isObservation(result)) seenIds.add(result.id); return result; } return { id: result.id, reason: "duplicate-observation-id" }; }
function classify(value: unknown, index: number): HistoricalObservation | DatasetExclusion { const id = isRecord(value) && isNonemptyString(value.id) ? value.id : `observation:${index}`; if (!isRecord(value) || !isNonemptyString(value.id) || !isNonemptyString(value.chainId) || !isNonemptyString(value.assetId) || !isMetric(value.metric)) return { id, reason: "malformed-observation" }; if (!Array.isArray(value.sourceEvidenceIds) || !value.sourceEvidenceIds.every(isNonemptyString) || !value.sourceEvidenceIds.length) return { id, reason: "missing-source-evidence" }; if (value.liquidityUsd == null) return { id, reason: "unavailable-liquidity" }; if (value.slippageUsd == null) return { id, reason: "unavailable-slippage" }; if (value.costUsd == null) return { id, reason: "unavailable-cost" }; return isCanonicalTimestampMs(value.observedAt) && isCanonicalTimestampMs(value.outcomeAt) && value.outcomeAt > value.observedAt && isFiniteNumber(value.metricValue) && isFiniteNumber(value.outcomeUsd) && isFiniteNumber(value.costUsd) && value.costUsd >= 0 && isFiniteNumber(value.slippageUsd) && value.slippageUsd >= 0 && isFiniteNumber(value.liquidityUsd) && value.liquidityUsd >= 0 ? value as unknown as HistoricalObservation : { id, reason: "incomplete-observation" }; }
function classifyScoped(item: HistoricalObservation, source: HistoricalSource, seenEvidence: Set<string>): HistoricalObservation | DatasetExclusion { if (item.observedAt < source.interval.startAt || item.outcomeAt > source.interval.endAt) return { id: item.id, reason: "outside-source-interval" }; if (item.sourceEvidenceIds.some((id) => seenEvidence.has(id))) return { id: item.id, reason: "duplicate-source-evidence" }; item.sourceEvidenceIds.forEach((id) => seenEvidence.add(id)); return item; }
function isObservation(value: HistoricalObservation | DatasetExclusion): value is HistoricalObservation { return "observedAt" in value; }
function isExclusion(value: HistoricalObservation | DatasetExclusion): value is DatasetExclusion { return "reason" in value; }
function freezeObservation(value: HistoricalObservation): HistoricalObservation { return Object.freeze({ ...value, sourceEvidenceIds: Object.freeze([...value.sourceEvidenceIds]) }); }
function freezeExclusion(value: DatasetExclusion): DatasetExclusion { return Object.freeze({ ...value }); }
function fingerprint(value: Omit<HistoricalDataset, "fingerprint">): string { return JSON.stringify([value.source, value.foldConfiguration, value.status, value.observations, value.exclusions]); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isFiniteNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function isNonemptyString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isPositiveInteger(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value > 0; }
function isMetric(value: unknown): value is BehaviorMetricName { return ["concentration", "turnover", "holding-horizon", "risk-exposure", "execution-cost", "realized-outcome"].includes(String(value)); }
