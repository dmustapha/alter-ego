import { describe, expect, it } from "vitest";
import { approveProposal, createProposal } from "./proposals";
import type { StrategyHypothesis, WalkForwardValidation } from "./types";

const hypothesis: StrategyHypothesis = { id: "hypothesis:1", status: "validated", findingIds: ["finding:1"], condition: "neutral condition", outcomeDefinition: "neutral outcome", assumptions: [] };
const validation: WalkForwardValidation = { hypothesisId: hypothesis.id, status: "validated", eligibleCount: 10, excludedCount: 0, totalCostUsd: { status: "known", value: 2 }, limitations: [] };

describe("proposal-only approval", () => {
  it("creates and approves a readonly proposal without execution fields", () => {
    const proposal = createProposal(hypothesis, validation, 1_700_000_000_000);
    const approved = approveProposal(proposal);

    expect(approved).toMatchObject({ state: "approved", hypothesisId: hypothesis.id });
    expect(approved).not.toHaveProperty("transaction");
    expect(Object.isFrozen(approved)).toBe(true);
  });
});
