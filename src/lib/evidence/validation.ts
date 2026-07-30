import { isCanonicalTimestampMs, type StrategyHypothesis, type ValidatedHypothesis, type ValidationReceipt, type WalkForwardFold, type WalkForwardValidation } from "./types";
import { isHistoricalValidationDataset, type HistoricalDataset, type HistoricalObservation } from "./validation-dataset";

const verifiedReceipts = new WeakSet<object>();
const verifiedArtifacts = new WeakSet<object>();
const verifiedReports = new WeakSet<object>();

export function validateWalkForward(hypothesis: StrategyHypothesis, dataset: HistoricalDataset, issuedAt?: number): WalkForwardValidation {
  if (!isHistoricalValidationDataset(dataset)) throw new Error("A verified historical validation dataset is required");
  const canonicalIssuedAt = issuedAt ?? dataset.source.retrievedAt;
  if (!isCanonicalTimestampMs(canonicalIssuedAt, Date.now()) || canonicalIssuedAt < dataset.source.retrievedAt) throw new Error("Validation receipt requires a canonical issuance time");
  const hypothesisFingerprint = fingerprintHypothesis(hypothesis);
  const ordered = [...dataset.observations].sort((left, right) => left.observedAt - right.observedAt || left.id.localeCompare(right.id));
  const foldResults = createFolds(hypothesis, ordered, dataset);
  const folds = Object.freeze(foldResults.map(freezeFold));
  const eligibleCount = folds.reduce((total, fold) => total + fold.eligibleCount, 0);
  const excludedCount = dataset.exclusions.length + folds.reduce((total, fold) => total + fold.excludedCount, 0);
  const totalCost = folds.reduce((total, fold) => total + fold.totalCostUsd, 0);
  const netOutcome = folds.reduce((total, fold) => total + fold.netOutcomeUsd, 0);
  const status = dataset.status === "ready" && eligibleCount >= dataset.foldConfiguration.testSize
    ? netOutcome > 0 ? "validated" as const : "rejected" as const
    : "insufficient" as const;
  const limitations = Object.freeze(status === "insufficient"
    ? ["A verified dataset with enough chronological out-of-sample observations is required."]
    : ["Result is derived from out-of-sample folds only and is not a performance promise."]);
  const base = { hypothesisId: hypothesis.id, status, eligibleCount, excludedCount, totalCostUsd: Object.freeze({ status: "known" as const, value: totalCost }), limitations, folds, datasetFingerprint: dataset.fingerprint, hypothesisFingerprint, issuedAt: canonicalIssuedAt };
  const report = Object.freeze({ ...base, fingerprint: fingerprintReport(base) });
  verifiedReports.add(report);
  return report;
}

export function createValidationReceipt(validation: WalkForwardValidation, dataset: HistoricalDataset): ValidationReceipt {
  if (!isHistoricalValidationDataset(dataset) || !isWalkForwardValidation(validation) || validation.datasetFingerprint !== dataset.fingerprint) throw new Error("A verified validation report and matching dataset are required");
  const receipt = Object.freeze({ version: "validation-receipt/v1" as const, hypothesisId: validation.hypothesisId, hypothesisFingerprint: validation.hypothesisFingerprint, datasetFingerprint: dataset.fingerprint, foldConfiguration: Object.freeze({ ...dataset.foldConfiguration }), reportFingerprint: validation.fingerprint, issuedAt: validation.issuedAt });
  verifiedReceipts.add(receipt);
  return receipt;
}

export function createValidatedHypothesis(hypothesis: StrategyHypothesis, validation: WalkForwardValidation, receipt: ValidationReceipt): ValidatedHypothesis {
  if (!isWalkForwardValidation(validation) || !isValidationReceipt(receipt) || validation.status !== "validated" || receipt.hypothesisId !== hypothesis.id || receipt.hypothesisFingerprint !== fingerprintHypothesis(hypothesis) || receipt.reportFingerprint !== validation.fingerprint || receipt.datasetFingerprint !== validation.datasetFingerprint) throw new Error("A matching verified validation receipt is required");
  const artifact = Object.freeze({ version: "validated-hypothesis/v1" as const, hypothesis: Object.freeze({ ...hypothesis, findingIds: Object.freeze([...hypothesis.findingIds]), sourceEvidenceIds: Object.freeze([...hypothesis.sourceEvidenceIds]), condition: Object.freeze({ ...hypothesis.condition }), scope: Object.freeze({ ...hypothesis.scope, chainIds: Object.freeze([...hypothesis.scope.chainIds]), assetIds: Object.freeze([...hypothesis.scope.assetIds]) }), assumptions: Object.freeze([...hypothesis.assumptions]) }), validation, receipt });
  verifiedArtifacts.add(artifact);
  return artifact;
}

export function isValidatedHypothesis(value: unknown): value is ValidatedHypothesis {
  if (!isRecord(value) || value.version !== "validated-hypothesis/v1" || !isRecord(value.hypothesis) || !isWalkForwardValidation(value.validation) || !isValidationReceipt(value.receipt)) return false;
  return verifiedArtifacts.has(value) && value.validation.status === "validated" && value.receipt.hypothesisId === value.hypothesis.id && value.receipt.hypothesisFingerprint === fingerprintHypothesis(value.hypothesis as unknown as StrategyHypothesis) && value.receipt.reportFingerprint === value.validation.fingerprint && value.receipt.datasetFingerprint === value.validation.datasetFingerprint;
}

export function isValidationReceipt(value: unknown): value is ValidationReceipt {
  return isRecord(value) && verifiedReceipts.has(value) && value.version === "validation-receipt/v1" && typeof value.hypothesisId === "string" && typeof value.hypothesisFingerprint === "string" && typeof value.datasetFingerprint === "string" && typeof value.reportFingerprint === "string" && isCanonicalTimestampMs(value.issuedAt) && isFoldConfiguration(value.foldConfiguration) && Object.isFrozen(value) && Object.isFrozen(value.foldConfiguration);
}

function createFolds(hypothesis: StrategyHypothesis, observations: readonly HistoricalObservation[], dataset: HistoricalDataset): readonly WalkForwardFold[] {
  const folds: WalkForwardFold[] = [];
  for (let start = 0; start + dataset.foldConfiguration.trainingSize + dataset.foldConfiguration.testSize <= observations.length; start += dataset.foldConfiguration.trainingSize + dataset.foldConfiguration.testSize) {
    const training = observations.slice(start, start + dataset.foldConfiguration.trainingSize);
    const testing = observations.slice(start + dataset.foldConfiguration.trainingSize, start + dataset.foldConfiguration.trainingSize + dataset.foldConfiguration.testSize);
    folds.push(evaluateFold(hypothesis, training, testing));
  }
  return folds;
}

function evaluateFold(hypothesis: StrategyHypothesis, training: readonly HistoricalObservation[], testing: readonly HistoricalObservation[]): WalkForwardFold {
  const matchingTraining = training.filter((item) => matchesScope(item, hypothesis));
  const fittedRange = matchingTraining.length ? range(matchingTraining.map((item) => item.metricValue)) : { minimum: Number.NaN, maximum: Number.NaN };
  const eligible = testing.filter((item) => matchesScope(item, hypothesis) && item.metricValue >= fittedRange.minimum && item.metricValue <= fittedRange.maximum && withinCondition(item, hypothesis));
  const excluded = testing.length - eligible.length;
  const totalCostUsd = eligible.reduce((total, item) => total + item.costUsd + item.slippageUsd, 0);
  const netOutcomeUsd = eligible.reduce((total, item) => total + item.outcomeUsd - item.costUsd - item.slippageUsd, 0);
  return { trainingObservationIds: Object.freeze(training.map((item) => item.id)), testObservationIds: Object.freeze(testing.map((item) => item.id)), fittedRange: Object.freeze(fittedRange), eligibleCount: eligible.length, excludedCount: excluded, totalCostUsd, netOutcomeUsd, sourceEvidenceIds: Object.freeze([...new Set(eligible.flatMap((item) => item.sourceEvidenceIds))]), limitations: Object.freeze(eligible.length ? [] : ["No test observation met the frozen training predicate and declared scope."]) };
}

function matchesScope(item: HistoricalObservation, hypothesis: StrategyHypothesis): boolean {
  return item.metric === hypothesis.condition.metric && (hypothesis.scope.chainIds.length === 0 || hypothesis.scope.chainIds.includes(item.chainId)) && (hypothesis.scope.assetIds.length === 0 || hypothesis.scope.assetIds.includes(item.assetId)) && item.outcomeAt - item.observedAt === hypothesis.scope.outcomeHorizonMs;
}

function withinCondition(item: HistoricalObservation, hypothesis: StrategyHypothesis): boolean {
  return item.metricValue >= hypothesis.condition.minimum && item.metricValue <= hypothesis.condition.maximum;
}

function range(values: readonly number[]): { minimum: number; maximum: number } { return { minimum: Math.min(...values), maximum: Math.max(...values) }; }
function freezeFold(fold: WalkForwardFold): WalkForwardFold { return Object.freeze({ ...fold, trainingObservationIds: Object.freeze([...fold.trainingObservationIds]), testObservationIds: Object.freeze([...fold.testObservationIds]), fittedRange: Object.freeze({ ...fold.fittedRange }), sourceEvidenceIds: Object.freeze([...fold.sourceEvidenceIds]), limitations: Object.freeze([...fold.limitations]) }); }
function fingerprintHypothesis(hypothesis: StrategyHypothesis): string { return JSON.stringify([hypothesis.id, hypothesis.findingIds, hypothesis.sourceEvidenceIds, hypothesis.condition, hypothesis.scope, hypothesis.outcomeDefinition, hypothesis.assumptions]); }
function fingerprintReport(report: Omit<WalkForwardValidation, "fingerprint">): string { return JSON.stringify([report.hypothesisId, report.status, report.eligibleCount, report.excludedCount, report.totalCostUsd, report.folds, report.datasetFingerprint, report.hypothesisFingerprint, report.issuedAt]); }
function isWalkForwardValidation(value: unknown): value is WalkForwardValidation { return isRecord(value) && verifiedReports.has(value) && typeof value.hypothesisId === "string" && ["validated", "rejected", "insufficient"].includes(String(value.status)) && typeof value.datasetFingerprint === "string" && typeof value.hypothesisFingerprint === "string" && typeof value.fingerprint === "string" && isCanonicalTimestampMs(value.issuedAt) && Array.isArray(value.folds) && Object.isFrozen(value) && value.fingerprint === fingerprintReport(value as unknown as Omit<WalkForwardValidation, "fingerprint">); }
function isFoldConfiguration(value: unknown): boolean { return isRecord(value) && typeof value.trainingSize === "number" && Number.isSafeInteger(value.trainingSize) && value.trainingSize > 0 && typeof value.testSize === "number" && Number.isSafeInteger(value.testSize) && value.testSize > 0; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
