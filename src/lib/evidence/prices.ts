import {
  getHistoricalPriceDetails,
  PRICE_CONFIDENCE_THRESHOLD,
  type HistoricalPriceDetail,
  type PriceRequest,
} from "../defillama";
import type {
  EvidenceAsset,
  EvidenceChain,
  EvidenceValue,
  PriceObservation,
  UnknownReason,
} from "./types";

export interface PriceObservationRequest {
  readonly walletAddress: string;
  readonly chain: EvidenceChain;
  readonly asset: EvidenceAsset;
  readonly requestedAt: number;
  readonly evidenceIds: readonly string[];
}

export type HistoricalPriceLookup = (
  requests: PriceRequest[],
) => Promise<Map<string, HistoricalPriceDetail | null>>;

function key(chain: string, address: string, timestamp: number): string {
  return `${chain.toLowerCase()}:${address}:${timestamp}`;
}

function unknown<T>(reason: UnknownReason): EvidenceValue<T> {
  return Object.freeze({ status: "unknown" as const, reason });
}

function known<T>(value: T): EvidenceValue<T> {
  return Object.freeze({ status: "known" as const, value });
}

function isValidDetail(value: unknown): value is HistoricalPriceDetail {
  if (typeof value !== "object" || value === null) return false;
  const detail = value as Partial<HistoricalPriceDetail>;
  return typeof detail.returnedAt === "number"
    && Number.isFinite(detail.returnedAt)
    && detail.returnedAt >= 0
    && typeof detail.priceUsd === "number"
    && Number.isFinite(detail.priceUsd)
    && detail.priceUsd >= 0
    && typeof detail.confidence === "number"
    && Number.isFinite(detail.confidence)
    && detail.confidence >= 0
    && detail.confidence <= 1;
}

function freezeObservation(observation: PriceObservation): PriceObservation {
  Object.freeze(observation.chain);
  Object.freeze(observation.asset);
  Object.freeze(observation.returnedAt);
  Object.freeze(observation.priceUsd);
  Object.freeze(observation.confidence);
  Object.freeze(observation.evidenceIds);
  Object.freeze(observation.provenance);
  return Object.freeze(observation);
}

function fromDetail(
  request: PriceObservationRequest,
  detail: HistoricalPriceDetail | null | undefined,
  retrievedAt: number,
  index: number,
): PriceObservation {
  const validDetail = isValidDetail(detail) ? detail : null;
  const unavailable = !validDetail || validDetail.confidence < PRICE_CONFIDENCE_THRESHOLD;
  const assetAddress = request.asset.address;
  return freezeObservation({
    id: `defillama:price:${request.chain.id}:${assetAddress ?? "unknown"}:${request.requestedAt}:${index}`,
    walletAddress: request.walletAddress,
    chain: { ...request.chain },
    asset: { ...request.asset },
    requestedAt: request.requestedAt,
    returnedAt: validDetail ? known(validDetail.returnedAt) : unknown("unavailable"),
    priceUsd: unavailable ? unknown("unavailable") : known(validDetail.priceUsd),
    confidence: validDetail ? known(validDetail.confidence) : unknown("unavailable"),
    evidenceIds: Object.freeze([...request.evidenceIds]),
    provenance: {
      provider: "defillama",
      endpoint: "historical-prices",
      retrievedAt,
      requestedAt: request.requestedAt,
    },
  });
}

export async function collectPriceObservations(
  requests: readonly PriceObservationRequest[],
  lookup: HistoricalPriceLookup = getHistoricalPriceDetails,
  retrievedAt = Date.now(),
): Promise<readonly PriceObservation[]> {
  const lookupRequests = requests.flatMap((request) => request.asset.address === null
    ? []
    : [{ chain: request.chain.name, address: request.asset.address, ts: request.requestedAt }]);
  const details = await lookup(lookupRequests);

  return Object.freeze(requests.map((request, index) => {
    const address = request.asset.address;
    const detail = address === null
      ? null
      : details.get(key(request.chain.name, address, request.requestedAt));
    return fromDetail(request, detail, retrievedAt, index);
  }));
}
