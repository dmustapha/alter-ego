import type {
  ClassifiedTrade,
  EvidenceAsset,
  EvidenceChain,
  EvidenceValue,
  OutcomeInsufficiency,
  PriceObservation,
  PositionLot,
  RealizedOutcome,
  RealizedOutcomeBuild,
  TradeClassification,
  TradeLeg,
  UnknownReason,
} from "./types";
import { isCanonicalTimestampMs, MAX_SOURCE_PRICE_DELTA_MS } from "./types";
import { canonicalNativeAsset } from "./native-assets";
import { PRICE_CONFIDENCE_THRESHOLD } from "../defillama";

interface OpenLot {
  readonly trade: ClassifiedTrade;
  readonly leg: TradeLeg;
  readonly legIndex: number;
  readonly openedAt: EvidenceValue<number>;
  readonly quantity: number;
}

const FIFO_ASSUMPTION = "FIFO matching is applied independently per wallet, chain, and asset.";

function unknown<T>(reason: UnknownReason): EvidenceValue<T> {
  return Object.freeze({ status: "unknown" as const, reason });
}

function known<T>(value: T): EvidenceValue<T> {
  return Object.freeze({ status: "known" as const, value });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReason(value: unknown): value is UnknownReason {
  return value === "missing" || value === "unavailable" || value === "not-applicable";
}

function isKnownNonnegative(value: unknown): value is EvidenceValue<number> & { readonly status: "known" } {
  return isRecord(value) && value.status === "known"
    && typeof value.value === "number" && Number.isFinite(value.value) && value.value >= 0;
}

function isUnknownValue(value: unknown): value is EvidenceValue<unknown> & { readonly status: "unknown" } {
  return isRecord(value) && value.status === "unknown" && isReason(value.reason);
}

function isChain(value: unknown): value is EvidenceChain {
  return isRecord(value) && typeof value.id === "string" && value.id !== ""
    && typeof value.name === "string" && value.name !== "";
}

function isAsset(value: unknown): value is EvidenceAsset {
  return isRecord(value) && (value.address === null || (typeof value.address === "string" && value.address.trim() !== ""))
    && (typeof value.symbol === "string" || value.symbol === null)
    && (value.address !== null || value.symbol !== null);
}

function isIds(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((id) => typeof id === "string" && id !== "");
}

function isNonEmptyIds(value: unknown): value is readonly string[] {
  return isIds(value) && value.length > 0;
}

function isTradeProvenance(value: unknown, chain: EvidenceChain): boolean {
  if (!isRecord(value)) return false;
  return value.provider === "okx-web3"
    && value.endpoint === "transaction-detail"
    && isCanonicalTimestampMs(value.retrievedAt, Date.now())
    && value.chainIndex === chain.id
    && (value.sourceIndex === undefined || (typeof value.sourceIndex === "number" && Number.isInteger(value.sourceIndex) && value.sourceIndex >= 0));
}

function isLeg(value: unknown): value is TradeLeg {
  return isRecord(value) && isAsset(value.asset)
    && (value.direction === "acquired" || value.direction === "disposed")
    && (isKnownNonnegative(value.quantity) || isUnknownValue(value.quantity))
    && (isKnownNonnegative(value.priceUsd) || isUnknownValue(value.priceUsd))
    && isIds(value.priceEvidenceIds);
}

function isClassifiedTrade(value: unknown): value is ClassifiedTrade {
  return isRecord(value) && value.classification === "classified"
    && typeof value.id === "string" && value.id !== ""
    && typeof value.walletAddress === "string" && value.walletAddress !== ""
    && isChain(value.chain) && isNonEmptyIds(value.evidenceIds) && Array.isArray(value.legs)
    && value.legs.every(isLeg)
    && (isKnownNonnegative(value.timestampMs) || isUnknownValue(value.timestampMs))
    && isTradeProvenance(value.provenance, value.chain as EvidenceChain);
}

function assetKey(walletAddress: string, chain: EvidenceChain, asset: EvidenceAsset): string | null {
  if (typeof asset.address === "string" && asset.address.trim() !== "") {
    return `${walletAddress}:${chain.id}:${asset.address}`;
  }
  const native = asset.address === null ? canonicalNativeAsset(chain) : null;
  return native && native.asset.symbol === asset.symbol
    ? `${walletAddress}:${chain.id}:${native.sourceAssetId}`
    : null;
}

function priceEvidenceIds(leg: TradeLeg): readonly string[] {
  return Object.freeze([...leg.priceEvidenceIds]);
}

function combinedIds(...ids: readonly (readonly string[])[]): readonly string[] {
  return Object.freeze([...new Set(ids.flat())]);
}

function valueReason(value: EvidenceValue<number>): UnknownReason {
  return value.status === "unknown" ? value.reason : "missing";
}

function hasFinitePnl(openLeg: TradeLeg, closeLeg: TradeLeg, quantity: number): boolean {
  return openLeg.priceUsd.status === "known"
    && closeLeg.priceUsd.status === "known"
    && Number.isFinite((closeLeg.priceUsd.value - openLeg.priceUsd.value) * quantity);
}

function insufficiency(
  id: string,
  reason: UnknownReason,
  tradeEvidenceIds: readonly string[],
  priceEvidenceIds: readonly string[],
  excludedEvidenceIds: readonly string[],
  trade?: Pick<ClassifiedTrade, "walletAddress" | "chain">,
  asset: EvidenceAsset | null = null,
): OutcomeInsufficiency {
  return Object.freeze({
    id,
    walletAddress: trade?.walletAddress ?? null,
    chain: trade ? Object.freeze({ ...trade.chain }) : null,
    asset: asset ? Object.freeze({ ...asset }) : null,
    reason,
    tradeEvidenceIds: Object.freeze([...tradeEvidenceIds]),
    priceEvidenceIds: Object.freeze([...priceEvidenceIds]),
    excludedEvidenceIds: Object.freeze([...excludedEvidenceIds]),
  });
}

function timestamp(trade: ClassifiedTrade): number | null {
  return trade.timestampMs.status === "known" ? trade.timestampMs.value : null;
}

function isMatchingAsset(trade: ClassifiedTrade, leg: TradeLeg, price: Record<string, unknown>): boolean {
  const asset = price.asset as Record<string, unknown>;
  const provenance = price.provenance as Record<string, unknown>;
  if (asset.address !== leg.asset.address || asset.symbol !== leg.asset.symbol) return false;
  if (leg.asset.address !== null) return leg.asset.address.trim() !== "";
  const native = canonicalNativeAsset(trade.chain);
  return native !== null
    && native.asset.address === leg.asset.address
    && native.asset.symbol === leg.asset.symbol
    && provenance.sourceAssetId === native.sourceAssetId;
}

function isResolvedPrice(
  trade: ClassifiedTrade,
  leg: TradeLeg,
  price: unknown,
  retrievedAt: number,
): price is PriceObservation {
  if (!isRecord(price) || !isRecord(price.chain) || !isRecord(price.asset) || !isRecord(price.provenance)) return false;
  const eventTime = timestamp(trade);
  const expectedSource = leg.asset.address === null
    ? canonicalNativeAsset(trade.chain)?.sourceAssetId
    : `${trade.chain.name}:${leg.asset.address}`;
  return eventTime !== null
    && typeof price.id === "string" && leg.priceEvidenceIds.includes(price.id)
    && isNonEmptyIds(price.evidenceIds) && price.evidenceIds.some((id) => trade.evidenceIds.includes(id))
    && price.walletAddress === trade.walletAddress
    && price.chain.id === trade.chain.id && price.chain.name === trade.chain.name
    && isMatchingAsset(trade, leg, price)
    && price.requestedAt === eventTime
    && isKnownNonnegative(price.returnedAt)
    && Math.abs(price.returnedAt.value - eventTime) <= MAX_SOURCE_PRICE_DELTA_MS
    && price.returnedAt.value <= retrievedAt
    && isKnownNonnegative(price.priceUsd) && leg.priceUsd.status === "known" && price.priceUsd.value === leg.priceUsd.value
    && isKnownNonnegative(price.confidence) && price.confidence.value <= 1 && price.confidence.value >= PRICE_CONFIDENCE_THRESHOLD
    && price.provenance.provider === "defillama"
    && price.provenance.endpoint === "historical-prices"
    && price.provenance.requestedAt === eventTime
    && isCanonicalTimestampMs(price.provenance.retrievedAt, retrievedAt)
    && price.provenance.sourceAssetId === expectedSource;
}

function hasResolvedPrice(
  trade: ClassifiedTrade,
  leg: TradeLeg,
  prices: readonly unknown[],
  retrievedAt: number,
): boolean {
  return leg.priceUsd.status !== "known" || (leg.priceEvidenceIds.length > 0
    && leg.priceEvidenceIds.every((id) => prices.some((price) => isResolvedPrice(trade, leg, price, retrievedAt) && price.id === id)));
}

function unpricedLeg(leg: TradeLeg): TradeLeg {
  return Object.freeze({ ...leg, priceUsd: unknown<number>("unavailable"), priceEvidenceIds: Object.freeze([]) });
}

function createLot(openLot: OpenLot, quantity: number, retrievedAt: number): PositionLot {
  const price = openLot.leg.priceUsd;
  const openedAt: EvidenceValue<number> = openLot.openedAt.status === "known"
    ? known<number>(openLot.openedAt.value)
    : unknown(valueReason(openLot.openedAt));
  const costBasisUsd: EvidenceValue<number> = price.status === "known"
    ? known<number>(price.value)
    : unknown(valueReason(price));
  return Object.freeze({
    id: `lot:${openLot.trade.id}:${openLot.legIndex}:${openLot.leg.asset.address ?? openLot.leg.asset.symbol}`,
    walletAddress: openLot.trade.walletAddress,
    chain: Object.freeze({ ...openLot.trade.chain }),
    asset: Object.freeze({ ...openLot.leg.asset }),
    openedAt,
    quantity: known<number>(quantity),
    costBasisUsd,
    evidenceIds: combinedIds(openLot.trade.evidenceIds),
    tradeEvidenceIds: Object.freeze([openLot.trade.id]),
    priceEvidenceIds: priceEvidenceIds(openLot.leg),
    provenance: Object.freeze({
      provider: "derived",
      endpoint: "fifo-lot-builder",
      chainIndex: openLot.trade.chain.id,
      retrievedAt,
    }),
  });
}

function createOutcome(
  openLot: OpenLot,
  close: ClassifiedTrade,
  closeLeg: TradeLeg,
  closeLegIndex: number,
  matchIndex: number,
  quantity: number,
  retrievedAt: number,
): RealizedOutcome {
  const buyPrice = openLot.leg.priceUsd;
  const sellPrice = closeLeg.priceUsd;
  const closedAt: EvidenceValue<number> = close.timestampMs.status === "known"
    ? known<number>(close.timestampMs.value)
    : unknown(valueReason(close.timestampMs));
  const openedAt: EvidenceValue<number> = openLot.openedAt.status === "known"
    ? known<number>(openLot.openedAt.value)
    : unknown(valueReason(openLot.openedAt));
  const realizedPnlUsd: EvidenceValue<number> = buyPrice.status === "known" && sellPrice.status === "known"
    ? known<number>((sellPrice.value - buyPrice.value) * quantity)
    : unknown(valueReason(buyPrice.status === "unknown" ? buyPrice : sellPrice));
  return Object.freeze({
    id: `outcome:${openLot.trade.id}:${openLot.legIndex}:${close.id}:${closeLegIndex}:${matchIndex}:${closeLeg.asset.address ?? closeLeg.asset.symbol}`,
    walletAddress: close.walletAddress,
    chain: Object.freeze({ ...close.chain }),
    asset: Object.freeze({ ...closeLeg.asset }),
    openedAt,
    closedAt,
    quantity: known<number>(quantity),
    realizedPnlUsd,
    evidenceIds: combinedIds(openLot.trade.evidenceIds, close.evidenceIds),
    tradeEvidenceIds: Object.freeze([openLot.trade.id, close.id]),
    priceEvidenceIds: combinedIds(priceEvidenceIds(openLot.leg), priceEvidenceIds(closeLeg)),
    provenance: Object.freeze({
      provider: "derived",
      endpoint: "fifo-outcome-builder",
      chainIndex: close.chain.id,
      retrievedAt,
    }),
  });
}

export function buildRealizedOutcomes(
  input: readonly TradeClassification[] | readonly unknown[],
  prices: readonly PriceObservation[] | readonly unknown[] = [],
  retrievedAt = Date.now(),
): RealizedOutcomeBuild {
  const lots = new Map<string, OpenLot[]>();
  const outcomes: RealizedOutcome[] = [];
  const insufficient: OutcomeInsufficiency[] = [];
  const excludedEvents: string[] = [];
  const candidates: ClassifiedTrade[] = [];

  if (!Number.isFinite(retrievedAt) || retrievedAt < 0) {
    const insufficient = Array.isArray(input)
      ? input.map((value, index) => {
        const trade = isClassifiedTrade(value) ? value : undefined;
        const tradeId = trade?.id ?? `invalid:${index}`;
        return insufficiency(`insufficient:${tradeId}:retrieved-at`, "unavailable", [tradeId], [], trade?.evidenceIds ?? [], trade);
      })
      : [insufficiency("insufficient:input:retrieved-at", "unavailable", [], [], [])];
    return Object.freeze({
      lots: Object.freeze([]),
      outcomes: Object.freeze([]),
      insufficient: Object.freeze(insufficient),
      excludedEvents: Object.freeze([]),
      assumptions: Object.freeze([FIFO_ASSUMPTION, "A finite nonnegative collection timestamp is required."]),
    });
  }

  for (const [index, value] of input.entries()) {
    if (isClassifiedTrade(value)) {
      candidates.push(value);
      continue;
    }
    const record = isRecord(value) ? value : null;
    const evidence = record && isIds(record.evidenceIds) ? record.evidenceIds : [];
    const tradeId = record && typeof record.id === "string" && record.id !== "" ? record.id : `invalid:${index}`;
    const reason = record && isReason(record.reason) ? record.reason : "unavailable";
    insufficient.push(insufficiency(`insufficient:${tradeId}`, reason, [tradeId], [], evidence));
    excludedEvents.push(...evidence);
  }

  candidates.sort((left, right) => {
    const timestampDifference = (timestamp(left) ?? Number.MAX_SAFE_INTEGER) - (timestamp(right) ?? Number.MAX_SAFE_INTEGER);
    if (timestampDifference !== 0) return timestampDifference;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
  for (const trade of candidates) {
    if (timestamp(trade) === null) {
      insufficient.push(insufficiency(`insufficient:${trade.id}:timestamp`, "missing", [trade.id], [], trade.evidenceIds, trade));
      excludedEvents.push(...trade.evidenceIds);
      continue;
    }
    for (const [legIndex, leg] of trade.legs.entries()) {
      if (leg.quantity.status !== "known" || leg.quantity.value === 0) {
        insufficient.push(insufficiency(`insufficient:${trade.id}:quantity`, valueReason(leg.quantity), [trade.id], priceEvidenceIds(leg), trade.evidenceIds, trade, leg.asset));
        excludedEvents.push(...trade.evidenceIds);
        continue;
      }
      const key = assetKey(trade.walletAddress, trade.chain, leg.asset);
      if (key === null) {
        insufficient.push(insufficiency(`insufficient:${trade.id}:asset`, "unavailable", [trade.id], priceEvidenceIds(leg), trade.evidenceIds, trade, leg.asset));
        excludedEvents.push(...trade.evidenceIds);
        continue;
      }
      const resolved = hasResolvedPrice(trade, leg, prices, retrievedAt);
      if (leg.direction === "acquired") {
        const queue = lots.get(key) ?? [];
        const unprovenPrice = leg.priceUsd.status === "known" && !resolved;
        if (unprovenPrice) {
          insufficient.push(insufficiency(`insufficient:${trade.id}:open-price`, "unavailable", [trade.id], [], trade.evidenceIds, trade, leg.asset));
          excludedEvents.push(...trade.evidenceIds);
        }
        const storedLeg = unprovenPrice
          ? unpricedLeg(leg)
          : leg;
        queue.push({ trade, leg: storedLeg, legIndex, openedAt: trade.timestampMs, quantity: leg.quantity.value });
        lots.set(key, queue);
        continue;
      }
      const closeLeg = leg.priceUsd.status === "known" && !resolved ? unpricedLeg(leg) : leg;
      let remaining = leg.quantity.value;
      let matchIndex = 0;
      const queue = lots.get(key) ?? [];
      while (remaining > 0 && queue.length > 0) {
        const opening = queue[0];
        const matched = Math.min(remaining, opening.quantity);
        const hasResolvedPrices = opening.leg.priceUsd.status === "known" && closeLeg.priceUsd.status === "known"
          && opening.leg.priceEvidenceIds.length > 0 && closeLeg.priceEvidenceIds.length > 0;
        if (hasResolvedPrices && hasFinitePnl(opening.leg, closeLeg, matched)) {
          outcomes.push(createOutcome(opening, trade, closeLeg, legIndex, matchIndex, matched, retrievedAt));
        } else {
          const priceReason = hasResolvedPrices
            ? "unavailable"
            : opening.leg.priceEvidenceIds.length === 0 || closeLeg.priceEvidenceIds.length === 0
            ? "unavailable"
            : valueReason(opening.leg.priceUsd.status === "unknown" ? opening.leg.priceUsd : closeLeg.priceUsd);
          insufficient.push(insufficiency(
            `insufficient:${opening.trade.id}:${trade.id}:${closeLeg.asset.address ?? closeLeg.asset.symbol}`,
            priceReason,
            [opening.trade.id, trade.id],
            combinedIds(priceEvidenceIds(opening.leg), priceEvidenceIds(closeLeg)),
            combinedIds(opening.trade.evidenceIds, trade.evidenceIds),
            trade,
            closeLeg.asset,
          ));
          excludedEvents.push(...opening.trade.evidenceIds, ...trade.evidenceIds);
        }
        remaining -= matched;
        matchIndex += 1;
        if (matched === opening.quantity) queue.shift();
        else queue[0] = { ...opening, quantity: opening.quantity - matched };
      }
      if (remaining > 0) {
        insufficient.push(insufficiency(`insufficient:${trade.id}:unmatched-disposal`, "unavailable", [trade.id], priceEvidenceIds(closeLeg), trade.evidenceIds, trade, closeLeg.asset));
        excludedEvents.push(...trade.evidenceIds);
      }
    }
  }

  const remainingLots = [...lots.values()].flatMap((queue) => queue.map((lot) => createLot(lot, lot.quantity, retrievedAt)));
  return Object.freeze({
    lots: Object.freeze(remainingLots),
    outcomes: Object.freeze(outcomes),
    insufficient: Object.freeze(insufficient),
    excludedEvents: Object.freeze([...new Set(excludedEvents)]),
    assumptions: Object.freeze([FIFO_ASSUMPTION, "Only explicit classified trade legs with known quantities are matched."]),
  });
}
