import type {
  CollectorProvenance,
  EvidenceValue,
  NormalizedTransactionEvent,
  TradeClassification,
  TradeLeg,
  UnknownReason,
} from "./types";

export interface TradeSourceDetail {
  readonly eventId: string;
  readonly walletAddress: string;
  readonly chain: { readonly id: string; readonly name: string };
  readonly transactionHash: string;
  readonly sourceDetailId: string;
  readonly legs: readonly TradeLeg[];
  readonly evidenceIds: readonly string[];
  readonly provenance: CollectorProvenance;
}

export type TradeSourceDetailAdapter = (
  event: NormalizedTransactionEvent,
) => TradeSourceDetail | null;

function unknown<T>(reason: UnknownReason): EvidenceValue<T> {
  return Object.freeze({ status: "unknown" as const, reason });
}

function timestamp(event: NormalizedTransactionEvent): EvidenceValue<number> {
  return event.timestampMs === null
    ? unknown("missing")
    : Object.freeze({ status: "known" as const, value: event.timestampMs });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonBlank(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isUnknownReason(value: unknown): value is UnknownReason {
  return value === "missing" || value === "unavailable" || value === "not-applicable";
}

function isEvidenceValue(value: unknown): value is EvidenceValue<number> {
  if (!isRecord(value)) return false;
  if (value.status === "unknown") return isUnknownReason(value.reason);
  return value.status === "known"
    && typeof value.value === "number"
    && Number.isFinite(value.value)
    && value.value >= 0;
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isValidProvenance(value: unknown): value is CollectorProvenance {
  if (!isRecord(value)) return false;
  return value.provider === "okx-web3"
    && value.endpoint === "transaction-detail"
    && typeof value.retrievedAt === "number"
    && Number.isFinite(value.retrievedAt)
    && value.retrievedAt >= 0
    && (value.chainIndex === undefined || isNonBlank(value.chainIndex))
    && (value.sourceIndex === undefined || isNonnegativeInteger(value.sourceIndex));
}

function isValidLeg(value: unknown): value is TradeLeg {
  if (!isRecord(value) || !isRecord(value.asset)) return false;
  const priceUsd = value.priceUsd;
  if (!isEvidenceValue(priceUsd)) return false;
  const validPriceEvidenceIds = Array.isArray(value.priceEvidenceIds)
    && value.priceEvidenceIds.every(isNonBlank)
    && (priceUsd.status !== "known" || value.priceEvidenceIds.length > 0);
  return isNonBlank(value.asset.address)
    && isNonBlank(value.asset.symbol)
    && (value.direction === "acquired" || value.direction === "disposed")
    && isEvidenceValue(value.quantity)
    && validPriceEvidenceIds;
}

function hasEventProvenance(detail: Record<string, unknown>, event: NormalizedTransactionEvent): boolean {
  const eventHash = event.provenance.transactionHash;
  return isNonBlank(eventHash)
    && detail.eventId === event.id
    && detail.walletAddress === event.walletAddress
    && isRecord(detail.chain)
    && detail.chain.id === event.chain.id
    && detail.chain.name === event.chain.name
    && detail.transactionHash === eventHash
    && isNonBlank(detail.sourceDetailId)
    && Array.isArray(detail.evidenceIds)
    && detail.evidenceIds.includes(detail.sourceDetailId);
}

function isValidTradeDetail(value: unknown, event: NormalizedTransactionEvent): value is TradeSourceDetail {
  if (!isRecord(value) || !hasEventProvenance(value, event) || !Array.isArray(value.legs)) return false;
  if (!value.legs.every(isValidLeg) || value.legs.length < 2) return false;
  if (!Array.isArray(value.evidenceIds) || value.evidenceIds.length === 0 || !value.evidenceIds.every(isNonBlank)) return false;
  if (!isValidProvenance(value.provenance)) return false;
  if (value.provenance.chainIndex !== event.chain.id) return false;
  return value.legs.some((leg) => leg.direction === "acquired")
    && value.legs.some((leg) => leg.direction === "disposed");
}

function sourceDetail(
  event: NormalizedTransactionEvent,
  adapter: TradeSourceDetailAdapter,
): TradeSourceDetail | null {
  try {
    const detail: unknown = adapter(event);
    return isValidTradeDetail(detail, event) ? detail : null;
  } catch {
    return null;
  }
}

function copyValue<T>(value: EvidenceValue<T>): EvidenceValue<T> {
  return value.status === "known"
    ? Object.freeze({ status: "known" as const, value: value.value })
    : unknown(value.reason);
}

function copyLeg(leg: TradeLeg): TradeLeg {
  return Object.freeze({
    asset: Object.freeze({ ...leg.asset }),
    direction: leg.direction,
    quantity: copyValue(leg.quantity),
    priceUsd: copyValue(leg.priceUsd),
    priceEvidenceIds: Object.freeze([...leg.priceEvidenceIds]),
  });
}

function copyProvenance(provenance: CollectorProvenance): CollectorProvenance {
  return Object.freeze({ ...provenance });
}

function evidenceIds(eventId: string, detail?: TradeSourceDetail): readonly string[] {
  return Object.freeze([...new Set([eventId, ...(detail?.evidenceIds ?? [])])]);
}

function unknownTrade(
  event: NormalizedTransactionEvent,
  retrievedAt: number,
): TradeClassification {
  return Object.freeze({
    id: `trade:${event.id}`,
    walletAddress: event.walletAddress,
    chain: Object.freeze({ ...event.chain }),
    classification: "unknown",
    reason: "unavailable",
    timestampMs: timestamp(event),
    evidenceIds: evidenceIds(event.id),
    provenance: Object.freeze({
      provider: "derived",
      endpoint: "trade-classifier",
      chainIndex: event.chain.id,
      retrievedAt,
    }),
  });
}

function classifiedTrade(
  event: NormalizedTransactionEvent,
  detail: TradeSourceDetail,
): TradeClassification {
  return Object.freeze({
    id: `trade:${event.id}`,
    walletAddress: event.walletAddress,
    chain: Object.freeze({ ...event.chain }),
    classification: "classified",
    timestampMs: timestamp(event),
    legs: Object.freeze(detail.legs.map(copyLeg)),
    evidenceIds: evidenceIds(event.id, detail),
    provenance: copyProvenance(detail.provenance),
  });
}

export function classifyTrades(
  events: readonly NormalizedTransactionEvent[],
  detailAdapter: TradeSourceDetailAdapter,
  retrievedAt = Date.now(),
): readonly TradeClassification[] {
  return Object.freeze(events.map((event) => {
    const detail = sourceDetail(event, detailAdapter);
    return detail
      ? classifiedTrade(event, detail)
      : unknownTrade(event, retrievedAt);
  }));
}
