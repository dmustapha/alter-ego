import { describe, expect, it } from "vitest";
import { createHistoricalValidationDataset, registerHistoricalSource } from "./validation-dataset";

const observedAt = 1_700_000_000_000;

function completeObservation(id = "observation:test") {
  return { id, observedAt, outcomeAt: observedAt + 1, chainId: "1", assetId: "asset:test", metric: "turnover", metricValue: 0.3, outcomeUsd: 3, costUsd: 1, slippageUsd: 0, liquidityUsd: 10, sourceEvidenceIds: ["evidence:test"] };
}

function datasetInput(observations: readonly unknown[] = [completeObservation()]) {
  const source = registerHistoricalSource({
    source: { id: "snapshot:test", version: "v1", retrievedAt: observedAt + 1_000, interval: { startAt: observedAt - 1_000, endAt: observedAt + 1_000 } },
    observations,
  });
  return [source, { observationIds: observations.map((item) => typeof item === "object" && item !== null && "id" in item ? String(item.id) : "unknown"), foldConfiguration: { trainingSize: 2, testSize: 1 } }] as const;
}

function dataset(observations: readonly unknown[] = [completeObservation()]) { const [source, request] = datasetInput(observations); return createHistoricalValidationDataset(source, request); }

describe("createHistoricalValidationDataset", () => {
  it("rejects a raw caller-shaped source unless it was registered at the source boundary", () => {
    expect(() => createHistoricalValidationDataset({ source: { id: "forged", version: "v1", retrievedAt: observedAt, interval: { startAt: observedAt - 1, endAt: observedAt } }, observations: [] } as never, { observationIds: [], foldConfiguration: { trainingSize: 2, testSize: 1 } })).toThrow("registered source snapshot");
  });

  it("records a caller-shaped utility observation without source evidence as insufficient", () => {
    expect(dataset([{ ...completeObservation(), sourceEvidenceIds: [] }])).toMatchObject({ status: "insufficient", observations: [], exclusions: [{ id: "observation:test", reason: "missing-source-evidence" }] });
  });

  it("never converts unavailable liquidity into zero utility", () => {
    expect(dataset([{ ...completeObservation(), liquidityUsd: null }])).toMatchObject({ status: "insufficient", observations: [], exclusions: [{ id: "observation:test", reason: "unavailable-liquidity" }] });
  });

  it("excludes unavailable slippage instead of treating it as zero", () => {
    expect(dataset([{ ...completeObservation(), slippageUsd: null }])).toMatchObject({ status: "insufficient", exclusions: [{ id: "observation:test", reason: "unavailable-slippage" }] });
  });

  it("freezes a reproducible fingerprint and excludes duplicate IDs", () => {
    const result = dataset([completeObservation(), completeObservation()]);

    expect(result).toMatchObject({ status: "ready", exclusions: [{ id: "observation:test", reason: "duplicate-observation-id" }] });
    expect(Object.isFrozen(result.observations)).toBe(true);
    expect(result.fingerprint).not.toBe(dataset().fingerprint);
  });

  it("excludes reused source evidence and observations outside the fixed snapshot interval", () => {
    const reusedEvidence = { ...completeObservation("observation:second"), sourceEvidenceIds: ["evidence:test"] };
    const outsideInterval = { ...completeObservation("observation:outside"), observedAt: observedAt - 2_000, outcomeAt: observedAt - 1_000, sourceEvidenceIds: ["evidence:outside"] };

    expect(dataset([completeObservation(), reusedEvidence, outsideInterval])).toMatchObject({
      observations: [expect.objectContaining({ id: "observation:test" })],
      exclusions: expect.arrayContaining([
        { id: "observation:second", reason: "duplicate-source-evidence" },
        { id: "observation:outside", reason: "outside-source-interval" },
      ]),
    });
  });

  it("rejects a noncanonical snapshot time", () => {
    expect(() => registerHistoricalSource({ source: { id: "snapshot:test", version: "v1", retrievedAt: 0, interval: { startAt: observedAt - 1, endAt: observedAt } }, observations: [] })).toThrow("canonical provenance");
  });

  it.each([0, 1_700_000_000_000.5, Date.now() + 1_000])("rejects epoch, fractional, and future snapshot retrieval time %s", (retrievedAt) => {
    expect(() => registerHistoricalSource({ source: { id: "snapshot:test", version: "v1", retrievedAt, interval: { startAt: observedAt - 1, endAt: observedAt } }, observations: [] })).toThrow("canonical provenance");
  });
});
