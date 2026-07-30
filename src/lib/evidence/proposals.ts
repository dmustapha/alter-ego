import { isCanonicalTimestampMs, type DecisionProposal, type ValidatedHypothesis } from "./types";
import { isValidatedHypothesis } from "./validation";

const REVIEW_WINDOW_MS = 24 * 60 * 60 * 1_000;
const verifiedProposals = new WeakSet<object>();

export function createProposal(validatedHypothesis: ValidatedHypothesis, nowMs: number): DecisionProposal {
  if (!isValidatedHypothesis(validatedHypothesis)) throw new Error("A verified validated hypothesis is required");
  if (!isCanonicalTimestampMs(nowMs, Date.now()) || nowMs < validatedHypothesis.receipt.issuedAt) throw new Error("Proposal time must be canonical and no earlier than its receipt");
  if (nowMs > validatedHypothesis.receipt.issuedAt + REVIEW_WINDOW_MS) throw new Error("Validation receipt is stale");
  return freezeProposal({ id: `proposal:${validatedHypothesis.hypothesis.id}:${nowMs}`, state: "draft", hypothesisId: validatedHypothesis.hypothesis.id, validatedHypothesis, assumptions: Object.freeze([...validatedHypothesis.hypothesis.assumptions]), risks: Object.freeze([...validatedHypothesis.validation.limitations, "Caller acknowledgement is not identity verification and does not authorize an action."]), createdAt: nowMs, expiresAt: nowMs + REVIEW_WINDOW_MS });
}

export function approveProposal(proposal: DecisionProposal, acknowledgement: { readonly text: string; readonly acknowledgedAt: number }, nowMs: number): DecisionProposal {
  assertDraft(proposal, nowMs);
  if (!acknowledgement.text.trim() || !isCanonicalTimestampMs(acknowledgement.acknowledgedAt, nowMs) || acknowledgement.acknowledgedAt < proposal.createdAt) throw new Error("A caller acknowledgement with a canonical time is required");
  return freezeProposal({ ...proposal, state: "approved", acknowledgement: Object.freeze({ text: acknowledgement.text, acknowledgedAt: acknowledgement.acknowledgedAt, acknowledgementSource: "caller" as const }) });
}

export function declineProposal(proposal: DecisionProposal, nowMs: number): DecisionProposal { assertDraft(proposal, nowMs); return freezeProposal({ ...proposal, state: "declined" }); }
export function expireProposal(proposal: DecisionProposal, nowMs: number): DecisionProposal {
  if (!isVerifiedProposal(proposal)) throw new Error("A verified proposal is required");
  if (!isCanonicalTimestampMs(nowMs, Date.now())) throw new Error("Proposal transition time must be canonical");
  if (proposal.state !== "draft") throw new Error("Only draft proposals can expire");
  if (nowMs < proposal.expiresAt) throw new Error("Proposal review window has not expired");
  return freezeProposal({ ...proposal, state: "expired" });
}

function assertDraft(proposal: DecisionProposal, nowMs: number): void {
  if (!isVerifiedProposal(proposal)) throw new Error("A verified proposal is required");
  if (!isCanonicalTimestampMs(nowMs, Date.now())) throw new Error("Proposal transition time must be canonical");
  if (proposal.state !== "draft") throw new Error("Only draft proposals can transition");
  if (nowMs >= proposal.expiresAt) throw new Error("Proposal has expired");
}
function isVerifiedProposal(value: unknown): value is DecisionProposal { return typeof value === "object" && value !== null && verifiedProposals.has(value); }
function freezeProposal(proposal: DecisionProposal): DecisionProposal {
  const frozen = Object.freeze({ ...proposal, assumptions: Object.freeze([...proposal.assumptions]), risks: Object.freeze([...proposal.risks]) });
  verifiedProposals.add(frozen);
  return frozen;
}
