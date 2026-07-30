import { describe, expect, it } from "vitest";
import { validateWalkForward } from "./validation";
import type { StrategyHypothesis } from "./types";

const hypothesis: StrategyHypothesis = { id: "hypothesis:test", status: "draft", findingIds: ["consensus:test"], sourceEvidenceIds: ["evidence:test"], condition: { metric: "concentration", operator: "within-range", minimum: 0.7, maximum: 0.9 }, scope: { chainIds: [], outcomeHorizonMs: 86_400_000 }, outcomeDefinition: "neutral outcome", assumptions: [] };

describe("validateWalkForward", () => {
  it("uses only chronological out-of-sample observations and supplied costs", () => {
    const result = validateWalkForward(hypothesis, [
      { observedAt: 1, utilityUsd: 3, costUsd: 1 },
      { observedAt: 2, utilityUsd: 4, costUsd: 1 },
      { observedAt: 3, utilityUsd: 5, costUsd: 1 },
      { observedAt: 4, utilityUsd: 6, costUsd: 1 },
    ]);

    expect(result).toMatchObject({ hypothesisId: hypothesis.id, status: "validated", eligibleCount: 2, totalCostUsd: { status: "known", value: 2 } });
  });
});
