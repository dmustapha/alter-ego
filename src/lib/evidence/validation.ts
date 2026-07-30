import type { StrategyHypothesis, WalkForwardValidation } from "./types";

export interface ValidationObservation { readonly observedAt: number; readonly utilityUsd: number; readonly costUsd: number | null; }

export function validateWalkForward(hypothesis: StrategyHypothesis, observations: readonly ValidationObservation[]): WalkForwardValidation {
  const ordered = [...observations].sort((left, right) => left.observedAt - right.observedAt);
  const test = ordered.slice(Math.ceil(ordered.length / 2));
  if (hypothesis.status !== "draft" || ordered.length < 4 || test.some((item) => item.costUsd === null)) return Object.freeze({ hypothesisId: hypothesis.id, status: "insufficient", eligibleCount: 0, excludedCount: observations.length, totalCostUsd: Object.freeze({ status: "unknown", reason: "unavailable" }), limitations: Object.freeze(["Chronological observations with supplied costs are required."]) });
  const totalCost = test.reduce((sum, item) => sum + (item.costUsd ?? 0), 0);
  const netUtility = test.reduce((sum, item) => sum + item.utilityUsd - (item.costUsd ?? 0), 0);
  return Object.freeze({ hypothesisId: hypothesis.id, status: netUtility > 0 ? "validated" : "rejected", eligibleCount: test.length, excludedCount: ordered.length - test.length, totalCostUsd: Object.freeze({ status: "known", value: totalCost }), limitations: Object.freeze(["Result is out-of-sample only and not a performance promise."]) });
}
