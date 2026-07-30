import { isCanonicalTimestampMs, type BehaviorMetricName } from "./types";

const verifiedDatasets = new WeakSet<object>();

export interface HistoricalDataset {
  readonly source: { readonly id: string; readonly version: string; readonly retrievedAt: number; readonly interval: { readonly startAt: number; readonly endAt: number } };
  readonly observations: readonly HistoricalObservation[];
  readonly exclusions: readonly DatasetExclusion[];
  readonly status: "ready" | "insufficient";
  readonly foldConfiguration: { readonly trainingSize: number; readonly testSize: number };
  readonly fingerprint: string;
}

export interface DatasetExclusion { readonly id: string; readonly reason: string; }

export interface HistoricalObservation {
  readonly id: string;
  readonly observedAt: number;
  readonly outcomeAt: number;
  readonly chainId: string;
  readonly assetId: string;
  readonly metric: BehaviorMetricName;
  readonly metricValue: number;
  readonly outcomeUsd: number;
  readonly costUsd: number;
  readonly slippageUsd: number;
  readonly liquidityUsd: number;
  readonly sourceEvidenceIds: readonly string[];
}

export function createHistoricalValidationDataset(input: unknown): HistoricalDataset {
  if (!isDatasetEnvelope(input)) throw new Error("Historical dataset requires canonical source provenance.");
  const seenIds = new Set<string>();
  const classified = input.observations.map((observation, index) => classifyUniqueObservation(observation, index, seenIds));
  const seenEvidenceIds = new Set<string>();
  const scoped = classified.map((item) => isEligible(item) ? classifyScopedObservation(item, input.source, seenEvidenceIds) : item);
  const observations = scoped.filter(isEligible).map(freezeObservation);
  const exclusions = scoped.filter(isExcluded).map(freezeExclusion);
  const dataset = { source: Object.freeze({ ...input.source, interval: Object.freeze({ ...input.source.interval }) }), observations: Object.freeze(observations), exclusions: Object.freeze(exclusions), foldConfiguration: Object.freeze({ ...input.foldConfiguration }), status: observations.length ? "ready" as const : "insufficient" as const };
  const result = Object.freeze({ ...dataset, fingerprint: fingerprint(dataset) });
  verifiedDatasets.add(result);
  return result;
}

export function isHistoricalValidationDataset(value: unknown): value is HistoricalDataset {
  if (!isRecord(value) || !verifiedDatasets.has(value) || !isDatasetEnvelope(value) || !Array.isArray(value.observations) || !Array.isArray(value.exclusions) || (value.status !== "ready" && value.status !== "insufficient") || typeof value.fingerprint !== "string") return false;
  if (!Object.isFrozen(value) || !Object.isFrozen(value.observations) || !Object.isFrozen(value.exclusions) || !Object.isFrozen(value.source) || !Object.isFrozen(value.foldConfiguration)) return false;
  const observations = value.observations as readonly unknown[];
  const exclusions = value.exclusions as readonly unknown[];
  if (!observations.every((item) => isRecord(item) && isEligible(item as unknown as HistoricalObservation | DatasetExclusion) && Object.isFrozen(item) && Object.isFrozen(item.sourceEvidenceIds)) || !exclusions.every((item) => isRecord(item) && isExcluded(item as unknown as HistoricalObservation | DatasetExclusion) && Object.isFrozen(item))) return false;
  const dataset = value as unknown as HistoricalDataset;
  return dataset.status === (dataset.observations.length ? "ready" : "insufficient") && dataset.fingerprint === fingerprint({ ...dataset, fingerprint: undefined } as Omit<HistoricalDataset, "fingerprint">);
}

interface DatasetEnvelope {
  readonly source: HistoricalDataset["source"];
  readonly observations: readonly unknown[];
  readonly foldConfiguration: HistoricalDataset["foldConfiguration"];
}

function isDatasetEnvelope(value: unknown): value is DatasetEnvelope {
  if (!isRecord(value) || !isSource(value.source) || !isFoldConfiguration(value.foldConfiguration) || !Array.isArray(value.observations)) return false;
  return true;
}

function isSource(value: unknown): boolean {
  if (!isRecord(value) || !isNonemptyString(value.id) || !isNonemptyString(value.version) || !isRecord(value.interval)) return false;
  return isCanonicalTimestampMs(value.retrievedAt, Date.now()) && isCanonicalTimestampMs(value.interval.startAt, value.retrievedAt)
    && isCanonicalTimestampMs(value.interval.endAt, value.retrievedAt) && value.interval.startAt <= value.interval.endAt;
}

function isFoldConfiguration(value: unknown): boolean {
  return isRecord(value) && isPositiveInteger(value.trainingSize) && isPositiveInteger(value.testSize);
}

function classifyObservation(value: unknown, index: number): HistoricalObservation | DatasetExclusion {
  const id = isRecord(value) && isNonemptyString(value.id) ? value.id : `observation:${index}`;
  if (!isRecord(value) || !isNonemptyString(value.id) || !isNonemptyString(value.chainId) || !isNonemptyString(value.assetId) || !isMetric(value.metric)) return { id, reason: "malformed-observation" };
  if (!Array.isArray(value.sourceEvidenceIds) || !value.sourceEvidenceIds.every(isNonemptyString) || value.sourceEvidenceIds.length === 0) return { id, reason: "missing-source-evidence" };
  if (value.liquidityUsd === null || value.liquidityUsd === undefined) return { id, reason: "unavailable-liquidity" };
  if (value.slippageUsd === null || value.slippageUsd === undefined) return { id, reason: "unavailable-slippage" };
  if (value.costUsd === null || value.costUsd === undefined) return { id, reason: "unavailable-cost" };
  return isCanonicalTimestampMs(value.observedAt) && isCanonicalTimestampMs(value.outcomeAt) && value.outcomeAt > value.observedAt
    && isFiniteNumber(value.metricValue) && isFiniteNumber(value.outcomeUsd) && isFiniteNumber(value.costUsd) && value.costUsd >= 0 && isFiniteNumber(value.slippageUsd) && value.slippageUsd >= 0
    && isFiniteNumber(value.liquidityUsd) && value.liquidityUsd >= 0 ? value as unknown as HistoricalObservation : { id, reason: "incomplete-observation" };
}

function classifyUniqueObservation(value: unknown, index: number, seenIds: Set<string>): HistoricalObservation | DatasetExclusion {
  const observation = classifyObservation(value, index);
  if (!isEligible(observation)) return observation;
  if (seenIds.has(observation.id)) return { id: observation.id, reason: "duplicate-observation-id" };
  seenIds.add(observation.id);
  return observation;
}

function classifyScopedObservation(observation: HistoricalObservation, source: HistoricalDataset["source"], seenEvidenceIds: Set<string>): HistoricalObservation | DatasetExclusion {
  if (observation.observedAt < source.interval.startAt || observation.outcomeAt > source.interval.endAt) return { id: observation.id, reason: "outside-source-interval" };
  if (observation.sourceEvidenceIds.some((id) => seenEvidenceIds.has(id))) return { id: observation.id, reason: "duplicate-source-evidence" };
  observation.sourceEvidenceIds.forEach((id) => seenEvidenceIds.add(id));
  return observation;
}

function isEligible(value: HistoricalObservation | DatasetExclusion): value is HistoricalObservation { return "observedAt" in value; }
function isExcluded(value: HistoricalObservation | DatasetExclusion): value is DatasetExclusion { return "reason" in value; }

function freezeObservation(observation: HistoricalObservation): HistoricalObservation {
  return Object.freeze({ ...observation, sourceEvidenceIds: Object.freeze([...observation.sourceEvidenceIds]) });
}

function freezeExclusion(exclusion: DatasetExclusion): DatasetExclusion { return Object.freeze({ ...exclusion }); }

function fingerprint(dataset: Omit<HistoricalDataset, "fingerprint">): string {
  return JSON.stringify([dataset.source, dataset.foldConfiguration, dataset.status, dataset.observations, dataset.exclusions]);
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isFiniteNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function isNonemptyString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isPositiveInteger(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value > 0; }
function isMetric(value: unknown): value is BehaviorMetricName { return ["concentration", "turnover", "holding-horizon", "risk-exposure", "execution-cost", "realized-outcome"].includes(String(value)); }
