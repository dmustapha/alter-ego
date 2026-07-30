import { isCanonicalTimestampMs, type BalanceSnapshot, type BehaviorMetric, type ClassifiedTrade, type ExecutionCostRecord, type RealizedOutcome, type WalletBehaviorProfile, type WalletCoverageSummary } from "./types";

function unknownMetric(name: BehaviorMetric["name"], coverage: WalletCoverageSummary): BehaviorMetric {
  return Object.freeze({ name, value: Object.freeze({ status: "unknown", reason: "unavailable" }), confidence: 0, sourceCoverage: 0, observationCount: 0, recency: coverage.recency, evidenceIds: Object.freeze([]) });
}

function recencyFactor(recency: WalletCoverageSummary["recency"]): number { return recency === "current" ? 1 : recency === "recent" ? 0.5 : recency === "stale" ? 0.25 : 0; }
function metricConfidence(sourceCoverage: number, recency: WalletCoverageSummary["recency"], sampleFactor: number): number { return sourceCoverage * recencyFactor(recency) * sampleFactor; }
function hasValidBalanceProvenance(balance: BalanceSnapshot): boolean { return balance.evidenceIds.length > 0 && balance.provenance.provider === "okx-web3" && balance.provenance.endpoint === "balances-by-address" && balance.provenance.chainIndex === balance.chain.id && isCanonicalTimestampMs(balance.provenance.retrievedAt, Date.now()); }

export function buildWalletBehaviorProfile({ coverage, balances = [], outcomes = [], costs = [], trades = [] }: { readonly coverage: WalletCoverageSummary; readonly balances?: readonly BalanceSnapshot[]; readonly outcomes?: readonly RealizedOutcome[]; readonly costs?: readonly ExecutionCostRecord[]; readonly trades?: readonly ClassifiedTrade[] }): WalletBehaviorProfile {
  const records = [...balances, ...outcomes, ...costs, ...trades];
  if (records.some((record) => record.walletAddress !== coverage.walletAddress)) throw new Error("Profile evidence must belong to one wallet");
  if (records.some((record) => !coverage.chainIds.includes(record.chain.id))) throw new Error("Profile evidence must belong to profile chains");
  const validBalances = balances.filter(hasValidBalanceProvenance);
  const known = validBalances.filter((balance) => balance.quotedUsd.status === "known" && balance.quotedUsd.value >= 0);
  const incompleteBalanceEvidence = balances.length > 0 && (known.length !== balances.length || validBalances.length !== balances.length);
  const total = known.reduce((sum, balance) => sum + (balance.quotedUsd.status === "known" ? balance.quotedUsd.value : 0), 0);
  const largest = Math.max(0, ...known.map((balance) => balance.quotedUsd.status === "known" ? balance.quotedUsd.value : 0));
  const concentration: BehaviorMetric = !incompleteBalanceEvidence && known.length >= 2 && total > 0
    ? Object.freeze({ name: "concentration", value: Object.freeze({ status: "known", value: largest / total }), confidence: metricConfidence(1, coverage.recency, Math.min(1, known.length / 2)), sourceCoverage: 1, observationCount: known.length, recency: coverage.recency, evidenceIds: Object.freeze(known.flatMap((balance) => balance.evidenceIds)) })
    : unknownMetric("concentration", coverage);
  const riskKnown = !incompleteBalanceEvidence && known.length > 0 && known.every((balance) => balance.riskToken.status === "known");
  const riskValue = known.reduce((sum, balance) => sum + (balance.riskToken.status === "known" && balance.riskToken.value && balance.quotedUsd.status === "known" ? balance.quotedUsd.value : 0), 0);
  const riskExposure: BehaviorMetric = riskKnown && total > 0
    ? Object.freeze({ name: "risk-exposure", value: Object.freeze({ status: "known", value: riskValue / total }), confidence: metricConfidence(1, coverage.recency, Math.min(1, known.length / 2)), sourceCoverage: 1, observationCount: known.length, recency: coverage.recency, evidenceIds: Object.freeze(known.flatMap((balance) => balance.evidenceIds)) })
    : unknownMetric("risk-exposure", coverage);
  const knownOutcomes = outcomes.filter((outcome) => outcome.realizedPnlUsd.status === "known" && outcome.tradeEvidenceIds.length > 0 && outcome.priceEvidenceIds.length > 0);
  const incompleteOutcomeEvidence = outcomes.length > 0 && knownOutcomes.length !== outcomes.length;
  const realizedOutcome: BehaviorMetric = !incompleteOutcomeEvidence && knownOutcomes.length > 0
    ? Object.freeze({ name: "realized-outcome", value: Object.freeze({ status: "known", value: knownOutcomes.reduce((sum, outcome) => sum + (outcome.realizedPnlUsd.status === "known" ? outcome.realizedPnlUsd.value : 0), 0) }), confidence: metricConfidence(1, coverage.recency, Math.min(1, knownOutcomes.length / 10)), sourceCoverage: 1, observationCount: knownOutcomes.length, recency: coverage.recency, evidenceIds: Object.freeze(knownOutcomes.flatMap((outcome) => outcome.evidenceIds)) })
    : unknownMetric("realized-outcome", coverage);
  const knownCosts = costs.filter((cost) => cost.gasFeeUsd.status === "known" && cost.priceEvidenceIds.length > 0);
  const executionCost: BehaviorMetric = knownCosts.length > 0
    ? Object.freeze({ name: "execution-cost", value: Object.freeze({ status: "known", value: knownCosts.reduce((sum, cost) => sum + (cost.gasFeeUsd.status === "known" ? cost.gasFeeUsd.value : 0), 0) }), confidence: metricConfidence(1, coverage.recency, Math.min(1, knownCosts.length / 10)), sourceCoverage: 1, observationCount: knownCosts.length, recency: coverage.recency, evidenceIds: Object.freeze(knownCosts.flatMap((cost) => cost.evidenceIds)) })
    : unknownMetric("execution-cost", coverage);
  const allLegs = trades.flatMap((trade) => trade.legs);
  const legs = allLegs.filter((leg) => leg.quantity.status === "known");
  const incompleteTradeEvidence = allLegs.length > 0 && legs.length !== allLegs.length;
  const acquired = legs.filter((leg) => leg.direction === "acquired").reduce((sum, leg) => sum + (leg.quantity.status === "known" ? leg.quantity.value : 0), 0);
  const disposed = legs.filter((leg) => leg.direction === "disposed").reduce((sum, leg) => sum + (leg.quantity.status === "known" ? leg.quantity.value : 0), 0);
  const turnover: BehaviorMetric = !incompleteTradeEvidence && acquired > 0
    ? Object.freeze({ name: "turnover", value: Object.freeze({ status: "known", value: disposed / acquired }), confidence: metricConfidence(1, coverage.recency, Math.min(1, legs.length / 10)), sourceCoverage: 1, observationCount: legs.length, recency: coverage.recency, evidenceIds: Object.freeze(trades.flatMap((trade) => trade.evidenceIds)) })
    : unknownMetric("turnover", coverage);
  const timedOutcomes = knownOutcomes.filter((outcome) => outcome.openedAt?.status === "known" && outcome.closedAt.status === "known" && outcome.closedAt.value >= outcome.openedAt.value);
  const holdingHorizon: BehaviorMetric = !incompleteOutcomeEvidence && timedOutcomes.length === knownOutcomes.length && timedOutcomes.length > 0
    ? Object.freeze({ name: "holding-horizon", value: Object.freeze({ status: "known", value: timedOutcomes.reduce((sum, outcome) => sum + (outcome.closedAt.status === "known" && outcome.openedAt?.status === "known" ? outcome.closedAt.value - outcome.openedAt.value : 0), 0) / timedOutcomes.length }), confidence: metricConfidence(1, coverage.recency, Math.min(1, timedOutcomes.length / 10)), sourceCoverage: 1, observationCount: timedOutcomes.length, recency: coverage.recency, evidenceIds: Object.freeze(timedOutcomes.flatMap((outcome) => outcome.evidenceIds)) })
    : unknownMetric("holding-horizon", coverage);
  const limitations = [
    ...(incompleteBalanceEvidence ? [validBalances.length !== balances.length ? "concentration excluded invalid balance provenance." : "concentration excluded incomplete balance evidence."] : []),
    ...(incompleteTradeEvidence ? ["turnover excluded incomplete trade evidence."] : []),
    ...(incompleteOutcomeEvidence ? ["outcome metrics excluded incomplete outcome evidence."] : []),
  ];
  return Object.freeze({ id: `profile:${coverage.walletAddress}`, walletAddress: coverage.walletAddress, chainIds: Object.freeze([...coverage.chainIds]), metrics: Object.freeze([concentration, riskExposure, realizedOutcome, executionCost, turnover, holdingHorizon]), coverage: Object.freeze({ ...coverage }), limitations: Object.freeze(limitations) });
}
