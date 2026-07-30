import { describe, expect, it } from "vitest";
import { validateWalkForward } from "./validation";
import { createHistoricalValidationDataset, registerHistoricalSource } from "./validation-dataset";
import type { StrategyHypothesis } from "./types";

const horizonMs = 86_400_000;
const hypothesis: StrategyHypothesis = { id: "hypothesis:test", status: "draft", findingIds: ["consensus:test"], sourceEvidenceIds: ["evidence:test"], condition: { metric: "concentration", operator: "within-range", minimum: 0.7, maximum: 0.9 }, scope: { chainIds: [], assetIds: [], outcomeHorizonMs: horizonMs }, outcomeDefinition: "neutral outcome", assumptions: [] };

function dataset(observations: readonly unknown[]) {
  const source = registerHistoricalSource({
    source: { id: "snapshot:test", version: "v1", retrievedAt: 1_700_000_000_000, interval: { startAt: 1_699_000_000_000, endAt: 1_700_000_000_000 } },
    observations,
  });
  return createHistoricalValidationDataset(source, { observationIds: observations.map((item) => String((item as { id: string }).id)), foldConfiguration: { trainingSize: 2, testSize: 1 } });
}

function observation(index: number, outcomeUsd = 3) {
  const observedAt = 1_699_400_000_000 + index * horizonMs;
  return { id: `observation:${index}`, observedAt, outcomeAt: observedAt + horizonMs, chainId: "1", assetId: "asset:test", metric: "concentration", metricValue: 0.8, outcomeUsd, costUsd: 1, slippageUsd: 0, liquidityUsd: 10, sourceEvidenceIds: [`evidence:${index}`] };
}

describe("validateWalkForward", () => {
  it("rejects caller-shaped utility observations and requires the immutable dataset boundary", () => {
    expect(() => validateWalkForward(hypothesis, [{ observedAt: 1_700_000_000_000, utilityUsd: 3, costUsd: 1 }] as never)).toThrow("historical validation dataset");
    expect(validateWalkForward(hypothesis, dataset([]))).toMatchObject({ status: "insufficient" });
  });

  it("uses only chronological out-of-sample folds with supplied costs", () => {
    const result = validateWalkForward(hypothesis, dataset([observation(4), observation(0), observation(3), observation(1), observation(2)]));

    expect(result).toMatchObject({ hypothesisId: hypothesis.id, status: "validated", eligibleCount: 1, totalCostUsd: { status: "known", value: 1 } });
    expect(result.folds.map((fold) => [fold.trainingObservationIds, fold.testObservationIds])).toEqual([
      [["observation:0", "observation:1"], ["observation:2"]],
    ]);
  });

  it("rejects a future receipt issuance time", () => {
    expect(() => validateWalkForward(hypothesis, dataset([observation(0), observation(1), observation(2)]), Date.now() + 1_000)).toThrow("canonical issuance time");
  });

  it("excludes observations outside the declared asset scope", () => {
    const scoped = { ...hypothesis, scope: { ...hypothesis.scope, assetIds: ["asset:other"] } };
    expect(validateWalkForward(scoped, dataset([observation(0), observation(1), observation(2)])).status).toBe("insufficient");
  });

  it("deducts supplied slippage from out-of-sample totals", () => {
    const costly = { ...observation(2), slippageUsd: 3 };
    const result = validateWalkForward(hypothesis, dataset([observation(0), observation(1), costly]));

    expect(result).toMatchObject({ status: "rejected", totalCostUsd: { value: 4 } });
  });
});
