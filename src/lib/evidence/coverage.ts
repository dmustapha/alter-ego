import { COLLECTOR_KINDS, type CollectorKind, type NormalizedTransactionEvent, type WalletCoverageSummary } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const CURRENT_WINDOW_MS = 7 * DAY_MS;
const RECENT_WINDOW_MS = 30 * DAY_MS;

export interface CoverageOptions {
  readonly nowMs: number;
  readonly collectedKinds?: readonly CollectorKind[];
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

function isCollectorKind(value: unknown): value is CollectorKind {
  return typeof value === "string" && (COLLECTOR_KINDS as readonly string[]).includes(value);
}

export function summarizeCoverage(
  events: readonly NormalizedTransactionEvent[],
  { nowMs, collectedKinds = [] }: CoverageOptions,
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
  const observedCollectors = Object.freeze([...new Set(collectedKinds.filter(isCollectorKind))]);
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
