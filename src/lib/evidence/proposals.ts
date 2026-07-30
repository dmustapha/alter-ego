import type { DecisionProposal, StrategyHypothesis, WalkForwardValidation } from "./types";

export function createProposal(hypothesis: StrategyHypothesis, validation: WalkForwardValidation, nowMs: number): DecisionProposal {
  if (hypothesis.status !== "draft" || validation.status !== "validated" || validation.hypothesisId !== hypothesis.id) throw new Error("A draft hypothesis and matching validation are required");
  return Object.freeze({ id: `proposal:${hypothesis.id}:${nowMs}`, state: "draft", hypothesisId: hypothesis.id, validation: Object.freeze({ ...validation }), assumptions: Object.freeze([...hypothesis.assumptions]), risks: Object.freeze([...validation.limitations]), expiresAt: nowMs + 24 * 60 * 60 * 1_000 });
}

export function approveProposal(proposal: DecisionProposal): DecisionProposal {
  if (proposal.state !== "draft") throw new Error("Only draft proposals can be approved");
  return Object.freeze({ ...proposal, state: "approved" });
}
