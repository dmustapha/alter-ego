import { describe, expect, it } from "vitest";
import { createHistoricalValidationDataset } from "./validation-dataset";

const observedAt = 1_700_000_000_000;

function completeObservation(id = "observation:test") {
  return { id, observedAt, outcomeAt: observedAt + 1, chainId: "1", assetId: "asset:test", metric: "turnover", metricValue: 0.3, outcomeUsd: 3, costUsd: 1, liquidityUsd: 10, sourceEvidenceIds: ["evidence:test"] };
}

function datasetInput(observations: readonly unknown[] = [completeObservation()]) {
  return {
    source: { id: "snapshot:test", version: "v1", retrievedAt: observedAt, interval: { startAt: observedAt - 1_000, endAt: observedAt } },
    observations,
    foldConfiguration: { trainingSize: 2, testSize: 1 },
  };
}

describe("createHistoricalValidationDataset", () => {
  it("records a caller-shaped utility observation without source evidence as insufficient", () => {
    expect(createHistoricalValidationDataset(datasetInput([{ ...completeObservation(), sourceEvidenceIds: [] }]))).toMatchObject({ status: "insufficient", observations: [], exclusions: [{ id: "observation:test", reason: "missing-source-evidence" }] });
  });

  it("never converts unavailable liquidity into zero utility", () => {
    expect(createHistoricalValidationDataset(datasetInput([{ ...completeObservation(), liquidityUsd: null }]))).toMatchObject({ status: "insufficient", observations: [], exclusions: [{ id: "observation:test", reason: "unavailable-liquidity" }] });
  });

  it("freezes a reproducible fingerprint and excludes duplicate IDs", () => {
    const result = createHistoricalValidationDataset(datasetInput([completeObservation(), completeObservation()]));

    expect(result).toMatchObject({ status: "ready", exclusions: [{ id: "observation:test", reason: "duplicate-observation-id" }] });
    expect(Object.isFrozen(result.observations)).toBe(true);
    expect(result.fingerprint).toBe(createHistoricalValidationDataset(datasetInput()).fingerprint);
  });

  it("rejects a noncanonical snapshot time", () => {
    expect(() => createHistoricalValidationDataset({ ...datasetInput(), source: { ...datasetInput().source, retrievedAt: 0 } })).toThrow("canonical source provenance");
  });
});
