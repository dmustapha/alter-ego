import { describe, expect, it } from "vitest";
import { approveProposal, createProposal, declineProposal, expireProposal } from "./proposals";
import { createValidatedHypothesis, createValidationReceipt, validateWalkForward } from "./validation";
import { __testOnlyAttestHistoricalSource, createHistoricalValidationDataset } from "./validation-dataset";
import type { StrategyHypothesis } from "./types";

const nowMs = 1_700_000_000_000;
process.env.ALTER_EGO_HISTORICAL_SOURCE_KEY = "test-historical-source-key";
const attestHistoricalSource = __testOnlyAttestHistoricalSource!;
const horizonMs = 86_400_000;
const hypothesis: StrategyHypothesis = { id: "hypothesis:1", status: "draft", findingIds: ["finding:1"], sourceEvidenceIds: ["evidence:1"], condition: { metric: "concentration", operator: "within-range", minimum: 0.7, maximum: 0.9 }, scope: { chainIds: [], assetIds: [], outcomeHorizonMs: horizonMs }, outcomeDefinition: "neutral outcome", assumptions: [] };

function validatedHypothesis() {
  const observations = [0, 1, 2].map((index) => ({ id: `observation:${index}`, observedAt: nowMs - (4 - index) * horizonMs, outcomeAt: nowMs - (3 - index) * horizonMs, chainId: "1", assetId: "asset:test", metric: "concentration" as const, metricValue: 0.8, outcomeUsd: 3, costUsd: 1, slippageUsd: 0, liquidityUsd: 10, sourceEvidenceIds: [`evidence:${index}`] }));
  const source = { snapshot: () => attestHistoricalSource({ source: { id: "snapshot:test", version: "v1", retrievedAt: nowMs, interval: { startAt: nowMs - 5 * horizonMs, endAt: nowMs } }, observations }) };
  const dataset = createHistoricalValidationDataset(source, { observationIds: observations.map((item) => item.id), foldConfiguration: { trainingSize: 2, testSize: 1 } });
  const validation = validateWalkForward(hypothesis, dataset);
  return createValidatedHypothesis(hypothesis, validation, createValidationReceipt(validation, dataset));
}

describe("proposal-only approval", () => {
  it("rejects forged validated artifacts and stale receipts", () => {
    expect(() => createProposal({ version: "validated-hypothesis/v1" } as never, nowMs)).toThrow("verified validated hypothesis");
    expect(() => createProposal(validatedHypothesis(), nowMs + 24 * 60 * 60 * 1_000 + 1)).toThrow("stale");
  });

  it("records caller acknowledgement and supports only pure terminal transitions", () => {
    const proposal = createProposal(validatedHypothesis(), nowMs);
    const approved = approveProposal(proposal, { text: "I acknowledge this is a non-executing review artifact.", acknowledgedAt: nowMs }, nowMs);
    const declined = declineProposal(createProposal(validatedHypothesis(), nowMs), nowMs);
    const expired = expireProposal(createProposal(validatedHypothesis(), nowMs), nowMs + 24 * 60 * 60 * 1_000);

    expect(approved).toMatchObject({ state: "approved", acknowledgement: { acknowledgementSource: "caller" } });
    expect(declined.state).toBe("declined");
    expect(expired.state).toBe("expired");
    expect(() => approveProposal(expired, { text: "late", acknowledgedAt: nowMs }, nowMs + 24 * 60 * 60 * 1_000)).toThrow("Only draft");
    expect(() => declineProposal(createProposal(validatedHypothesis(), nowMs), Number.NaN)).toThrow("canonical");
    expect(() => expireProposal(createProposal(validatedHypothesis(), nowMs), Number.NaN)).toThrow("canonical");
    expect(approved).not.toHaveProperty("transaction");
    expect(Object.isFrozen(approved)).toBe(true);
  });

  it("deeply freezes the validated asset scope", () => {
    const mutable = { ...hypothesis, scope: { ...hypothesis.scope, assetIds: ["asset:test"] } };
    const observations = [0, 1, 2].map((index) => ({ id: `immutable:${index}`, observedAt: nowMs - (4 - index) * horizonMs, outcomeAt: nowMs - (3 - index) * horizonMs, chainId: "1", assetId: "asset:test", metric: "concentration" as const, metricValue: 0.8, outcomeUsd: 3, costUsd: 1, slippageUsd: 0, liquidityUsd: 10, sourceEvidenceIds: [`immutable-evidence:${index}`] }));
    const source = { snapshot: () => attestHistoricalSource({ source: { id: "snapshot:immutable", version: "v1", retrievedAt: nowMs, interval: { startAt: nowMs - 5 * horizonMs, endAt: nowMs } }, observations }) };
    const dataset = createHistoricalValidationDataset(source, { observationIds: observations.map((item) => item.id), foldConfiguration: { trainingSize: 2, testSize: 1 } });
    const validation = validateWalkForward(mutable, dataset);
    const artifact = createValidatedHypothesis(mutable, validation, createValidationReceipt(validation, dataset));

    mutable.scope.assetIds.push("asset:other");
    expect(artifact.hypothesis.scope.assetIds).toEqual(["asset:test"]);
    expect(Object.isFrozen(artifact.hypothesis.scope.assetIds)).toBe(true);
  });
});
