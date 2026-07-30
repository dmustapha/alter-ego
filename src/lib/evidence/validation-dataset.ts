import { isCanonicalTimestampMs, type BehaviorMetricName } from "./types";

const registeredSources = new WeakSet<object>();
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
export interface HistoricalSourceSnapshot { readonly source: HistoricalSource; readonly observations: readonly unknown[]; }
export interface HistoricalDatasetRequest { readonly observationIds: readonly string[]; readonly foldConfiguration: { readonly trainingSize: number; readonly testSize: number }; }
export interface DatasetExclusion { readonly id: string; readonly reason: string; }
export interface HistoricalObservation { readonly id: string; readonly observedAt: number; readonly outcomeAt: number; readonly chainId: string; readonly assetId: string; readonly metric: BehaviorMetricName; readonly metricValue: number; readonly outcomeUsd: number; readonly costUsd: number; readonly slippageUsd: number; readonly liquidityUsd: number; readonly sourceEvidenceIds: readonly string[]; }

export function registerHistoricalSource(input: unknown): HistoricalSourceSnapshot {
  if (!isSnapshot(input)) throw new Error("Historical source requires canonical provenance and immutable observations.");
  const snapshot = Object.freeze({
    source: Object.freeze({ ...input.source, interval: Object.freeze({ ...input.source.interval }) }),
    observations: Object.freeze(input.observations.map((item) => Object.freeze({ ...(item as Record<string, unknown>) }))),
  });
  registeredSources.add(snapshot);
  return snapshot;
}

export function createHistoricalValidationDataset(source: HistoricalSourceSnapshot, request: HistoricalDatasetRequest): HistoricalDataset {
  if (!registeredSources.has(source) || !isRequest(request)) throw new Error("Historical validation requires a registered source snapshot and observation IDs.");
  const requested = new Set(request.observationIds);
  const sourceIds = new Set(source.observations.map((item) => isRecord(item) && typeof item.id === "string" ? item.id : ""));
  const missing = request.observationIds.filter((id) => !sourceIds.has(id)).map((id) => ({ id, reason: "unknown-source-observation" }));
  const seenIds = new Set<string>();
  const classified = source.observations.filter((item) => isRecord(item) && requested.has(String(item.id))).map((item, index) => classifyUnique(item, index, seenIds));
  const seenEvidence = new Set<string>();
  const scoped = classified.map((item) => isObservation(item) ? classifyScoped(item, source.source, seenEvidence) : item);
  const observations = scoped.filter(isObservation).map(freezeObservation);
  const exclusions = [...scoped.filter(isExclusion).map(freezeExclusion), ...missing.map(freezeExclusion)];
  const base = { source: source.source, observations: Object.freeze(observations), exclusions: Object.freeze(exclusions), foldConfiguration: Object.freeze({ ...request.foldConfiguration }), status: observations.length ? "ready" as const : "insufficient" as const };
  const dataset = Object.freeze({ ...base, fingerprint: fingerprint(base) });
  verifiedDatasets.add(dataset);
  return dataset;
}

export function isHistoricalValidationDataset(value: unknown): value is HistoricalDataset { return isRecord(value) && verifiedDatasets.has(value) && Object.isFrozen(value) && typeof value.fingerprint === "string"; }

function isSnapshot(value: unknown): value is { source: HistoricalSource; observations: readonly unknown[] } { return isRecord(value) && isSource(value.source) && Array.isArray(value.observations); }
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
