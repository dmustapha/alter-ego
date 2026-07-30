import type { BalanceSnapshot, BehaviorMetric, ClassifiedTrade, ExecutionCostRecord, RealizedOutcome, WalletBehaviorProfile, WalletCoverageSummary } from "./types";

const METRICS = ["concentration", "turnover", "holding-horizon", "risk-exposure", "execution-cost", "realized-outcome"] as const;

function unknownMetric(name: BehaviorMetric["name"], coverage: WalletCoverageSummary): BehaviorMetric {
  return Object.freeze({ name, value: Object.freeze({ status: "unknown", reason: "unavailable" }), confidence: 0, observationCount: 0, recency: coverage.recency, evidenceIds: Object.freeze([]) });
}

export function buildWalletBehaviorProfile({ coverage, balances = [], outcomes = [], costs = [], trades = [] }: { readonly coverage: WalletCoverageSummary; readonly balances?: readonly BalanceSnapshot[]; readonly outcomes?: readonly RealizedOutcome[]; readonly costs?: readonly ExecutionCostRecord[]; readonly trades?: readonly ClassifiedTrade[] }): WalletBehaviorProfile {
  if (balances.some((balance) => balance.walletAddress !== coverage.walletAddress) || outcomes.some((outcome) => outcome.walletAddress !== coverage.walletAddress) || costs.some((cost) => cost.walletAddress !== coverage.walletAddress) || trades.some((trade) => trade.walletAddress !== coverage.walletAddress)) throw new Error("Profile evidence must belong to one wallet");
  const known = balances.filter((balance) => balance.quotedUsd.status === "known" && balance.quotedUsd.value >= 0);
  const total = known.reduce((sum, balance) => sum + (balance.quotedUsd.status === "known" ? balance.quotedUsd.value : 0), 0);
  const largest = Math.max(0, ...known.map((balance) => balance.quotedUsd.status === "known" ? balance.quotedUsd.value : 0));
  const concentration: BehaviorMetric = known.length >= 2 && total > 0
    ? Object.freeze({ name: "concentration", value: Object.freeze({ status: "known", value: largest / total }), confidence: Math.min(1, known.length / 2) * coverage.score, observationCount: known.length, recency: coverage.recency, evidenceIds: Object.freeze(known.flatMap((balance) => balance.evidenceIds)) })
    : unknownMetric("concentration", coverage);
  const riskKnown = known.length > 0 && known.every((balance) => balance.riskToken.status === "known");
  const riskValue = known.reduce((sum, balance) => sum + (balance.riskToken.status === "known" && balance.riskToken.value && balance.quotedUsd.status === "known" ? balance.quotedUsd.value : 0), 0);
  const riskExposure: BehaviorMetric = riskKnown && total > 0
    ? Object.freeze({ name: "risk-exposure", value: Object.freeze({ status: "known", value: riskValue / total }), confidence: Math.min(1, known.length / 2) * coverage.score, observationCount: known.length, recency: coverage.recency, evidenceIds: Object.freeze(known.flatMap((balance) => balance.evidenceIds)) })
    : unknownMetric("risk-exposure", coverage);
  const knownOutcomes = outcomes.filter((outcome) => outcome.realizedPnlUsd.status === "known" && outcome.tradeEvidenceIds.length > 0 && outcome.priceEvidenceIds.length > 0);
  const realizedOutcome: BehaviorMetric = knownOutcomes.length > 0
    ? Object.freeze({ name: "realized-outcome", value: Object.freeze({ status: "known", value: knownOutcomes.reduce((sum, outcome) => sum + (outcome.realizedPnlUsd.status === "known" ? outcome.realizedPnlUsd.value : 0), 0) }), confidence: Math.min(1, knownOutcomes.length / 10) * coverage.score, observationCount: knownOutcomes.length, recency: coverage.recency, evidenceIds: Object.freeze(knownOutcomes.flatMap((outcome) => outcome.evidenceIds)) })
    : unknownMetric("realized-outcome", coverage);
  const knownCosts = costs.filter((cost) => cost.gasFeeUsd.status === "known" && cost.priceEvidenceIds.length > 0);
  const executionCost: BehaviorMetric = knownCosts.length > 0
    ? Object.freeze({ name: "execution-cost", value: Object.freeze({ status: "known", value: knownCosts.reduce((sum, cost) => sum + (cost.gasFeeUsd.status === "known" ? cost.gasFeeUsd.value : 0), 0) }), confidence: Math.min(1, knownCosts.length / 10) * coverage.score, observationCount: knownCosts.length, recency: coverage.recency, evidenceIds: Object.freeze(knownCosts.flatMap((cost) => cost.evidenceIds)) })
    : unknownMetric("execution-cost", coverage);
  const legs = trades.flatMap((trade) => trade.legs).filter((leg) => leg.quantity.status === "known");
  const acquired = legs.filter((leg) => leg.direction === "acquired").reduce((sum, leg) => sum + (leg.quantity.status === "known" ? leg.quantity.value : 0), 0);
  const disposed = legs.filter((leg) => leg.direction === "disposed").reduce((sum, leg) => sum + (leg.quantity.status === "known" ? leg.quantity.value : 0), 0);
  const turnover: BehaviorMetric = acquired > 0
    ? Object.freeze({ name: "turnover", value: Object.freeze({ status: "known", value: disposed / acquired }), confidence: Math.min(1, legs.length / 10) * coverage.score, observationCount: legs.length, recency: coverage.recency, evidenceIds: Object.freeze(trades.flatMap((trade) => trade.evidenceIds)) })
    : unknownMetric("turnover", coverage);
  const timedOutcomes = knownOutcomes.filter((outcome) => outcome.openedAt?.status === "known" && outcome.closedAt.status === "known" && outcome.closedAt.value >= outcome.openedAt.value);
  const holdingHorizon: BehaviorMetric = timedOutcomes.length > 0
    ? Object.freeze({ name: "holding-horizon", value: Object.freeze({ status: "known", value: timedOutcomes.reduce((sum, outcome) => sum + (outcome.closedAt.status === "known" && outcome.openedAt?.status === "known" ? outcome.closedAt.value - outcome.openedAt.value : 0), 0) / timedOutcomes.length }), confidence: Math.min(1, timedOutcomes.length / 10) * coverage.score, observationCount: timedOutcomes.length, recency: coverage.recency, evidenceIds: Object.freeze(timedOutcomes.flatMap((outcome) => outcome.evidenceIds)) })
    : unknownMetric("holding-horizon", coverage);
  return Object.freeze({ id: `profile:${coverage.walletAddress}`, walletAddress: coverage.walletAddress, chainIds: Object.freeze([...coverage.chainIds]), metrics: Object.freeze([concentration, riskExposure, realizedOutcome, executionCost, turnover, holdingHorizon]), coverage: Object.freeze({ ...coverage }), limitations: Object.freeze([]) });
}
