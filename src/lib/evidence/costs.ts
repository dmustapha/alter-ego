import type {
  EvidenceAsset,
  EvidenceChain,
  EvidenceValue,
  ExecutionCostRecord,
  NormalizedTransactionEvent,
  PriceObservation,
  UnknownReason,
} from "./types";
import { canonicalNativeAsset, type CanonicalNativeAsset } from "./native-assets";

function known<T>(value: T): EvidenceValue<T> {
  return Object.freeze({ status: "known" as const, value });
}

function unknown<T>(reason: UnknownReason): EvidenceValue<T> {
  return Object.freeze({ status: "unknown" as const, reason });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isKnownNonnegative(value: unknown): value is EvidenceValue<number> & { readonly status: "known" } {
  return isRecord(value) && value.status === "known"
    && typeof value.value === "number" && Number.isFinite(value.value) && value.value >= 0;
}

function isUnknown(value: unknown): value is EvidenceValue<unknown> & { readonly status: "unknown" } {
  return isRecord(value) && value.status === "unknown"
    && (value.reason === "missing" || value.reason === "unavailable" || value.reason === "not-applicable");
}

function validChain(value: unknown): value is EvidenceChain {
  return isRecord(value) && typeof value.id === "string" && value.id !== ""
    && typeof value.name === "string" && value.name !== "";
}

function validEvent(value: unknown): value is NormalizedTransactionEvent {
  return isRecord(value) && typeof value.id === "string" && value.id !== ""
    && typeof value.walletAddress === "string" && value.walletAddress !== ""
    && validChain(value.chain);
}

function nativeAsset(chain: EvidenceChain): EvidenceAsset {
  const canonical = canonicalNativeAsset(chain);
  return Object.freeze(canonical ? { ...canonical.asset } : { address: null, symbol: null });
}

function timestamp(event: { readonly timestampMs?: unknown }): EvidenceValue<number> {
  return typeof event.timestampMs === "number" && Number.isFinite(event.timestampMs) && event.timestampMs >= 0
    ? known(event.timestampMs)
    : event.timestampMs === null || event.timestampMs === undefined
      ? unknown("missing")
      : unknown("unavailable");
}

function fee(event: { readonly gasFeeNative?: unknown }): EvidenceValue<number> {
  const value = event.gasFeeNative;
  if (isKnownNonnegative(value)) return known(value.value);
  if (isUnknown(value)) return unknown(value.reason as UnknownReason);
  return unknown("unavailable");
}

function isMatchingPrice(
  price: unknown,
  event: NormalizedTransactionEvent,
  native: CanonicalNativeAsset | null,
): price is PriceObservation {
  if (!isRecord(price) || !validChain(price.chain) || !isRecord(price.asset)) return false;
  if (!native || !isRecord(price.provenance)) return false;
  return price.chain.id === event.chain.id
    && price.chain.name === event.chain.name
    && price.asset.address === native.asset.address
    && price.asset.symbol === native.asset.symbol
    && price.requestedAt === event.timestampMs
    && typeof price.id === "string" && price.id !== ""
    && isKnownNonnegative(price.priceUsd)
    && isKnownNonnegative(price.returnedAt)
    && isRecord(price.confidence) && price.confidence.status === "known"
    && typeof price.confidence.value === "number" && Number.isFinite(price.confidence.value)
    && price.confidence.value >= 0.9 && price.confidence.value <= 1
    && price.provenance.provider === "defillama"
    && price.provenance.endpoint === "historical-prices"
    && price.provenance.sourceAssetId === native.sourceAssetId
    && price.provenance.requestedAt === event.timestampMs
    && typeof price.provenance.retrievedAt === "number"
    && Number.isFinite(price.provenance.retrievedAt) && price.provenance.retrievedAt >= 0;
}

function conversion(
  event: NormalizedTransactionEvent,
  native: CanonicalNativeAsset | null,
  prices: readonly unknown[],
  gasFeeNative: EvidenceValue<number>,
): { readonly usd: EvidenceValue<number>; readonly ids: readonly string[] } {
  if (gasFeeNative.status !== "known" || event.timestampMs === null || native === null) {
    return Object.freeze({ usd: unknown<number>("unavailable"), ids: Object.freeze<string[]>([]) });
  }
  const price = prices.find((value) => isMatchingPrice(value, event, native));
  if (!price || price.priceUsd.status !== "known") {
    return Object.freeze({ usd: unknown<number>("unavailable"), ids: Object.freeze<string[]>([]) });
  }
  const converted = gasFeeNative.value * price.priceUsd.value;
  return Number.isFinite(converted)
    ? Object.freeze({ usd: known(converted), ids: Object.freeze([price.id]) })
    : Object.freeze({ usd: unknown<number>("unavailable"), ids: Object.freeze<string[]>([]) });
}

function freezeCost(cost: ExecutionCostRecord): ExecutionCostRecord {
  Object.freeze(cost.chain);
  Object.freeze(cost.nativeAsset);
  Object.freeze(cost.observedAt);
  Object.freeze(cost.gasFeeNative);
  Object.freeze(cost.gasFeeUsd);
  Object.freeze(cost.priceEvidenceIds);
  Object.freeze(cost.evidenceIds);
  Object.freeze(cost.provenance);
  return Object.freeze(cost);
}

export function collectExecutionCosts(
  events: readonly NormalizedTransactionEvent[] | readonly unknown[],
  prices: readonly PriceObservation[] | readonly unknown[] = [],
  retrievedAt = Date.now(),
): readonly ExecutionCostRecord[] {
  if (!Number.isFinite(retrievedAt) || retrievedAt < 0 || !Array.isArray(events) || !Array.isArray(prices)) {
    return Object.freeze([]);
  }
  const costs = events.flatMap((value) => {
    if (!validEvent(value)) return [];
    const event = value;
    const native = canonicalNativeAsset(event.chain);
    const asset = nativeAsset(event.chain);
    const gasFeeNative = fee(event);
    const observedAt = timestamp(event);
    const matched = conversion(event, native, prices, gasFeeNative);
    return [freezeCost({
      id: `cost:${event.id}`,
      walletAddress: event.walletAddress,
      chain: Object.freeze({ ...event.chain }),
      nativeAsset: asset,
      eventId: event.id,
      observedAt,
      gasFeeNative,
      gasFeeUsd: matched.usd,
      priceEvidenceIds: matched.ids,
      evidenceIds: Object.freeze([event.id, ...matched.ids]),
      provenance: Object.freeze({
        provider: "derived",
        endpoint: "execution-cost-normalizer",
        chainIndex: event.chain.id,
        retrievedAt,
      }),
    })];
  });
  return Object.freeze(costs);
}
