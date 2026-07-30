export type UnknownReason = "missing" | "unavailable" | "not-applicable";

export const EVIDENCE_TIMESTAMP_UNIT = "milliseconds" as const;
export const MIN_EVIDENCE_TIMESTAMP_MS = 946_684_800_000;
export const MAX_SOURCE_PRICE_DELTA_MS = 5 * 60 * 1_000;

export function isCanonicalTimestampMs(value: unknown, latestAt?: number): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= MIN_EVIDENCE_TIMESTAMP_MS
    && (latestAt === undefined || value <= latestAt);
}

export const COLLECTOR_KINDS = Object.freeze([
  "balance-snapshot",
  "price-observation",
  "trade-classification",
  "position-lot",
  "realized-outcome",
  "execution-cost",
] as const);

export type CollectorKind = typeof COLLECTOR_KINDS[number];

export const DECISION_PROPOSAL_STATES = Object.freeze([
  "draft",
  "approved",
  "declined",
  "expired",
] as const);

export type DecisionProposalState = typeof DECISION_PROPOSAL_STATES[number];
export type BehaviorMetricName = "concentration" | "turnover" | "holding-horizon" | "risk-exposure" | "execution-cost" | "realized-outcome";

export const DECISION_METRIC_UNITS: Readonly<Record<BehaviorMetricName, "ratio" | "milliseconds" | "usd">> = Object.freeze({
  concentration: "ratio",
  turnover: "ratio",
  "holding-horizon": "milliseconds",
  "risk-exposure": "ratio",
  "execution-cost": "usd",
  "realized-outcome": "usd",
});

export interface BehaviorMetric {
  readonly name: BehaviorMetricName;
  readonly value: EvidenceValue<number>;
  readonly confidence: number;
  readonly sourceCoverage: number;
  readonly observationCount: number;
  readonly recency: WalletCoverageSummary["recency"];
  readonly evidenceIds: readonly string[];
}

export interface WalletBehaviorProfile {
  readonly id: string;
  readonly walletAddress: string;
  readonly chainIds: readonly string[];
  readonly metrics: readonly BehaviorMetric[];
  readonly coverage: WalletCoverageSummary;
  readonly limitations: readonly string[];
}

export interface CohortFinding {
  readonly id: string;
  readonly kind: "consensus" | "disagreement" | "insufficient";
  readonly metric: BehaviorMetricName;
  readonly unit: "ratio" | "milliseconds" | "usd";
  readonly profileIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly distribution: { readonly minimum: number; readonly maximum: number; readonly count: number };
  readonly value: EvidenceValue<number>;
  readonly confidence: number;
  readonly limitations: readonly string[];
}

export interface CohortSynthesis {
  readonly cohortSize: number;
  readonly findings: readonly CohortFinding[];
  readonly excludedWallets: readonly { readonly walletAddress: string; readonly reason: UnknownReason }[];
  readonly limits: readonly string[];
}

export interface StrategyHypothesis {
  readonly id: string;
  readonly status: "draft" | "insufficient" | "validated" | "rejected";
  readonly findingIds: readonly string[];
  readonly condition: string;
  readonly outcomeDefinition: string;
  readonly assumptions: readonly string[];
}

export interface WalkForwardValidation {
  readonly hypothesisId: string;
  readonly status: "validated" | "rejected" | "insufficient";
  readonly eligibleCount: number;
  readonly excludedCount: number;
  readonly totalCostUsd: EvidenceValue<number>;
  readonly limitations: readonly string[];
}

export interface DecisionProposal {
  readonly id: string;
  readonly state: DecisionProposalState;
  readonly hypothesisId: string;
  readonly validation: WalkForwardValidation;
  readonly assumptions: readonly string[];
  readonly risks: readonly string[];
  readonly expiresAt: number;
}

export type EvidenceValue<T> =
  | { readonly status: "known"; readonly value: T }
  | { readonly status: "unknown"; readonly reason: UnknownReason; readonly raw?: string };

export interface RawTransactionRecord {
  readonly txHash?: string;
  readonly txTime?: string;
  readonly from?: ReadonlyArray<{ readonly address?: string }>;
  readonly to?: ReadonlyArray<{ readonly address?: string }>;
  readonly amount?: string;
  readonly methodId?: string;
  readonly symbol?: string;
  readonly tokenContractAddress?: string;
  readonly txFee?: string;
  readonly txFeeUnit?: "native-decimal";
  readonly txFeeDecimals?: number;
}

export interface TransactionSource {
  readonly walletAddress: string;
  readonly chainIndex: string;
  readonly transactions: ReadonlyArray<RawTransactionRecord>;
  readonly retrievedAt: number;
}

export interface RawBalanceRecord {
  readonly chainIndex?: string;
  readonly tokenContractAddress?: string;
  readonly symbol?: string;
  readonly balance?: string;
  readonly tokenPrice?: string;
  readonly isRiskToken?: boolean;
}

export interface BalanceSource {
  readonly walletAddress: string;
  readonly chainIndex: string;
  readonly balances: ReadonlyArray<RawBalanceRecord>;
  readonly retrievedAt: number;
}

export interface EvidenceProvenance {
  readonly provider: "okx-web3";
  readonly endpoint: "transactions-by-address";
  readonly chainIndex: string;
  readonly transactionHash: string | null;
  readonly retrievedAt: number;
  readonly sourceIndex: number;
  readonly rawTimestamp?: string | null;
  readonly timestampReason?: UnknownReason | null;
}

export interface NormalizedTransactionEvent {
  readonly id: string;
  readonly walletAddress: string;
  readonly chain: { readonly id: string; readonly name: string };
  readonly timestampMs: number | null;
  readonly asset: { readonly address: string | null; readonly symbol: string | null };
  readonly direction: EvidenceValue<"inflow" | "outflow">;
  readonly amount: EvidenceValue<number>;
  readonly priceUsd: EvidenceValue<number>;
  readonly gasFeeNative: EvidenceValue<number>;
  readonly gasFeeUnit?: NativeFeeUnit;
  readonly protocol: EvidenceValue<string>;
  readonly provenance: EvidenceProvenance;
}

export interface NativeFeeUnit {
  readonly representation: "native-decimal";
  readonly asset: EvidenceAsset;
  readonly decimals: number;
}

export interface EvidenceChain {
  readonly id: string;
  readonly name: string;
}

export interface EvidenceAsset {
  readonly address: string | null;
  readonly symbol: string | null;
}

export interface CollectorProvenance {
  readonly provider: "okx-web3" | "defillama" | "derived";
  readonly endpoint:
    | "balances-by-address"
    | "historical-prices"
    | "transaction-detail"
    | "trade-classifier"
    | "fifo-lot-builder"
    | "fifo-outcome-builder"
    | "execution-cost-normalizer";
  readonly retrievedAt: number;
  readonly chainIndex?: string;
  readonly sourceIndex?: number;
  readonly requestedAt?: number;
  readonly sourceAssetId?: string;
}

export interface BalanceSnapshot {
  readonly id: string;
  readonly walletAddress: string;
  readonly chain: EvidenceChain;
  readonly asset: EvidenceAsset;
  readonly observedAt: number;
  readonly balance: EvidenceValue<number>;
  readonly quotedUsd: EvidenceValue<number>;
  readonly riskToken: EvidenceValue<boolean>;
  readonly evidenceIds: readonly string[];
  readonly provenance: CollectorProvenance;
}

export interface PriceObservation {
  readonly id: string;
  readonly walletAddress: string;
  readonly chain: EvidenceChain;
  readonly asset: EvidenceAsset;
  readonly requestedAt: number | null;
  readonly returnedAt: EvidenceValue<number>;
  readonly priceUsd: EvidenceValue<number>;
  readonly confidence: EvidenceValue<number>;
  readonly evidenceIds: readonly string[];
  readonly provenance: CollectorProvenance;
}

export interface TradeLeg {
  readonly asset: EvidenceAsset;
  readonly direction: "acquired" | "disposed";
  readonly quantity: EvidenceValue<number>;
  readonly priceUsd: EvidenceValue<number>;
  readonly priceEvidenceIds: readonly string[];
}

interface TradeClassificationBase {
  readonly id: string;
  readonly walletAddress: string;
  readonly chain: EvidenceChain;
  readonly timestampMs: EvidenceValue<number>;
  readonly evidenceIds: readonly string[];
  readonly provenance: CollectorProvenance;
}

export interface ClassifiedTrade extends TradeClassificationBase {
  readonly classification: "classified";
  readonly legs: readonly TradeLeg[];
}

export interface UnknownTrade extends TradeClassificationBase {
  readonly classification: "unknown";
  readonly reason: UnknownReason;
}

export type TradeClassification = ClassifiedTrade | UnknownTrade;

export interface PositionLot {
  readonly id: string;
  readonly walletAddress: string;
  readonly chain: EvidenceChain;
  readonly asset: EvidenceAsset;
  readonly openedAt: EvidenceValue<number>;
  readonly quantity: EvidenceValue<number>;
  readonly costBasisUsd: EvidenceValue<number>;
  readonly evidenceIds: readonly string[];
  readonly tradeEvidenceIds: readonly string[];
  readonly priceEvidenceIds: readonly string[];
  readonly provenance: CollectorProvenance;
}

export interface RealizedOutcome {
  readonly id: string;
  readonly walletAddress: string;
  readonly chain: EvidenceChain;
  readonly asset: EvidenceAsset;
  readonly openedAt?: EvidenceValue<number>;
  readonly closedAt: EvidenceValue<number>;
  readonly quantity: EvidenceValue<number>;
  readonly realizedPnlUsd: EvidenceValue<number>;
  readonly evidenceIds: readonly string[];
  readonly tradeEvidenceIds: readonly string[];
  readonly priceEvidenceIds: readonly string[];
  readonly provenance: CollectorProvenance;
}

export interface OutcomeInsufficiency {
  readonly id: string;
  readonly walletAddress: string | null;
  readonly chain: EvidenceChain | null;
  readonly asset: EvidenceAsset | null;
  readonly reason: UnknownReason;
  readonly tradeEvidenceIds: readonly string[];
  readonly priceEvidenceIds: readonly string[];
  readonly excludedEvidenceIds: readonly string[];
}

export interface RealizedOutcomeBuild {
  readonly lots: readonly PositionLot[];
  readonly outcomes: readonly RealizedOutcome[];
  readonly insufficient: readonly OutcomeInsufficiency[];
  readonly excludedEvents: readonly string[];
  readonly assumptions: readonly string[];
}

export interface ExecutionCostRecord {
  readonly id: string;
  readonly walletAddress: string;
  readonly chain: EvidenceChain;
  readonly nativeAsset: EvidenceAsset;
  readonly eventId: string;
  readonly observedAt: EvidenceValue<number>;
  readonly gasFeeNative: EvidenceValue<number>;
  readonly gasFeeUsd: EvidenceValue<number>;
  readonly priceEvidenceIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly provenance: CollectorProvenance;
}

export interface WalletCoverageSummary {
  readonly walletAddress: string;
  readonly chainIds: readonly string[];
  readonly eventCount: number;
  readonly knownDirectionCount: number;
  readonly knownAmountCount: number;
  readonly knownPriceCount: number;
  readonly score: number;
  readonly transactionFieldCoverage: {
    readonly eventCount: number;
    readonly knownDirectionCount: number;
    readonly knownAmountCount: number;
    readonly knownPriceCount: number;
    readonly score: number;
  };
  readonly collectorCoverage: {
    readonly collectedKinds: readonly CollectorKind[];
    readonly score: number;
  };
  readonly newestEventAt: number | null;
  readonly ageMs: number | null;
  readonly recency: "current" | "recent" | "stale" | "unknown";
}
