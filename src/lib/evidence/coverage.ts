import { COLLECTOR_KINDS, type CollectorKind, type NormalizedTransactionEvent, type WalletCoverageSummary } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const CURRENT_WINDOW_MS = 7 * DAY_MS;
const RECENT_WINDOW_MS = 30 * DAY_MS;

export interface CoverageOptions {
  readonly nowMs: number;
  readonly collectorRecords?: readonly unknown[];
}

function knownCount<T>(
  events: readonly NormalizedTransactionEvent[],
  field: (event: NormalizedTransactionEvent) => { readonly status: "known" | "unknown"; readonly value?: T },
): number {
  return events.filter((event) => field(event).status === "known").length;
}

function newestTimestamp(events: readonly NormalizedTransactionEvent[], nowMs: number): number | null {
  const timestamps = events.flatMap((event) => event.timestampMs === null || event.timestampMs > nowMs ? [] : [event.timestampMs]);
  return timestamps.length === 0 ? null : Math.max(...timestamps);
}

function recency(ageMs: number | null): WalletCoverageSummary["recency"] {
  if (ageMs === null) return "unknown";
  if (ageMs <= CURRENT_WINDOW_MS) return "current";
  return ageMs <= RECENT_WINDOW_MS ? "recent" : "stale";
}

function collectorKind(value: unknown): CollectorKind | null {
  if (typeof value !== "object" || value === null) return null;
  const provenance = (value as { provenance?: unknown }).provenance;
  if (typeof provenance !== "object" || provenance === null) return null;
  switch ((provenance as { endpoint?: unknown }).endpoint) {
    case "balances-by-address": return "balance-snapshot";
    case "historical-prices": return "price-observation";
    case "transaction-detail": return "trade-classification";
    case "fifo-lot-builder": return "position-lot";
    case "fifo-outcome-builder": return "realized-outcome";
    case "execution-cost-normalizer": return "execution-cost";
    default: return null;
  }
}

export function summarizeCoverage(
  events: readonly NormalizedTransactionEvent[],
  { nowMs, collectorRecords = [] }: CoverageOptions,
): WalletCoverageSummary {
  if (events.length === 0) throw new Error("Coverage requires at least one event");
  const walletAddress = events[0].walletAddress;
  if (events.some((event) => event.walletAddress !== walletAddress)) {
    throw new Error("Coverage summary requires events from one wallet");
  }

  const knownDirectionCount = knownCount(events, (event) => event.direction);
  const knownAmountCount = knownCount(events, (event) => event.amount);
  const knownPriceCount = knownCount(events, (event) => event.priceUsd);
  const transactionFieldScore = (knownDirectionCount + knownAmountCount + knownPriceCount) / (events.length * 3);
  const observedCollectors = Object.freeze([...new Set(collectorRecords.flatMap((record) => {
    const kind = collectorKind(record);
    return kind === null ? [] : [kind];
  }))]);
  const newestEventAt = newestTimestamp(events, nowMs);
  const ageMs = newestEventAt === null ? null : nowMs - newestEventAt;

  return Object.freeze({
    walletAddress,
    chainIds: Object.freeze([...new Set(events.map((event) => event.chain.id))]),
    eventCount: events.length,
    knownDirectionCount,
    knownAmountCount,
    knownPriceCount,
    score: transactionFieldScore,
    transactionFieldCoverage: Object.freeze({
      eventCount: events.length,
      knownDirectionCount,
      knownAmountCount,
      knownPriceCount,
      score: transactionFieldScore,
    }),
    collectorCoverage: Object.freeze({
      collectedKinds: observedCollectors,
      score: observedCollectors.length / COLLECTOR_KINDS.length,
    }),
    newestEventAt,
    ageMs,
    recency: recency(ageMs),
  });
}
