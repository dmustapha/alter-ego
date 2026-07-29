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
import { isCanonicalTimestampMs, MAX_SOURCE_PRICE_DELTA_MS } from "./types";
import { canonicalNativeAsset } from "./native-assets";

const MAX_PRICE_LOOKUP_REQUESTS = 100;

export interface PriceObservationRequest {
  readonly walletAddress: string;
  readonly chain: EvidenceChain;
  readonly asset: EvidenceAsset;
  readonly requestedAt: number;
  readonly evidenceIds: readonly string[];
}

interface InvalidPriceObservationRequest {
  readonly walletAddress: "unknown";
  readonly chain: EvidenceChain;
  readonly asset: EvidenceAsset;
  readonly requestedAt: null;
  readonly evidenceIds: readonly string[];
}

type ObservationRequest = PriceObservationRequest | InvalidPriceObservationRequest;

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
  return isCanonicalTimestampMs(detail.returnedAt)
    && isCanonicalTimestampMs(detail.requestedAt)
    && typeof detail.priceUsd === "number"
    && Number.isFinite(detail.priceUsd)
    && detail.priceUsd >= 0
    && detail.priceUsd <= Number.MAX_SAFE_INTEGER
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validRequest(value: unknown): value is PriceObservationRequest {
  return isRecord(value) && typeof value.walletAddress === "string" && value.walletAddress !== ""
    && isRecord(value.chain) && typeof value.chain.id === "string" && value.chain.id !== ""
    && typeof value.chain.name === "string" && value.chain.name !== ""
    && isRecord(value.asset) && (value.asset.address === null || (typeof value.asset.address === "string" && value.asset.address !== ""))
    && (value.asset.symbol === null || (typeof value.asset.symbol === "string" && value.asset.symbol !== ""))
    && isCanonicalTimestampMs(value.requestedAt)
    && Array.isArray(value.evidenceIds) && value.evidenceIds.every((id) => typeof id === "string" && id !== "");
}

function fallbackRequest(): InvalidPriceObservationRequest {
  return { walletAddress: "unknown", chain: { id: "unknown", name: "unknown" }, asset: { address: null, symbol: null }, requestedAt: null, evidenceIds: [] };
}

function priceRequest(request: ObservationRequest): PriceRequest | null {
  if (request.requestedAt === null) return null;
  if (request.asset.address !== null) {
    return { chain: request.chain.name, address: request.asset.address, ts: request.requestedAt };
  }
  const native = canonicalNativeAsset(request.chain);
  if (!native || native.asset.symbol !== request.asset.symbol) return null;
  const [chain, address] = native.sourceAssetId.split(":") as [string, string];
  return { chain, address, ts: request.requestedAt };
}

function fromDetail(
  request: ObservationRequest,
  detail: HistoricalPriceDetail | null | undefined,
  retrievedAt: number,
  index: number,
  source: PriceRequest | null,
): PriceObservation {
  const validDetail = isValidDetail(detail) && detail.returnedAt <= retrievedAt ? detail : null;
  const unavailable = !validDetail
    || request.requestedAt === null
    || validDetail.requestedAt !== request.requestedAt
    || validDetail.confidence < PRICE_CONFIDENCE_THRESHOLD
    || Math.abs(validDetail.returnedAt - request.requestedAt) > MAX_SOURCE_PRICE_DELTA_MS;
  const assetAddress = request.asset.address;
  return freezeObservation({
    id: `defillama:price:${request.chain.id}:${assetAddress ?? "unknown"}:${request.requestedAt ?? "unknown"}:${index}`,
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
      ...(request.requestedAt === null ? {} : { requestedAt: request.requestedAt }),
      ...(source ? { sourceAssetId: `${source.chain}:${source.address}` } : {}),
    },
  });
}

export async function collectPriceObservations(
  requests: readonly PriceObservationRequest[] | readonly unknown[],
  lookup: HistoricalPriceLookup = getHistoricalPriceDetails,
  retrievedAt = Date.now(),
): Promise<readonly PriceObservation[]> {
  if (!Array.isArray(requests)) return Object.freeze([]);
  const validRetrievedAt = isCanonicalTimestampMs(retrievedAt, Date.now());
  const validRequests = requests.map((request) =>
    validRetrievedAt && validRequest(request) && request.requestedAt <= retrievedAt ? request : fallbackRequest(),
  );
  const lookupRequests = validRequests.flatMap((request) => {
    const lookupRequest = priceRequest(request);
    return lookupRequest ? [lookupRequest] : [];
  });
  const uniqueLookupRequests = [...new Map(
    lookupRequests.map((request) => [key(request.chain, request.address, request.ts), request]),
  ).values()].slice(0, MAX_PRICE_LOOKUP_REQUESTS);
  let details: Map<string, HistoricalPriceDetail | null> = new Map();
  try {
    const result: unknown = await lookup(uniqueLookupRequests);
    if (result instanceof Map) details = result as Map<string, HistoricalPriceDetail | null>;
  } catch {
    // External lookup failures become explicit unavailable observations below.
  }

  return Object.freeze(validRequests.map((request, index) => {
    const source = priceRequest(request);
    const detail = source === null ? null : details.get(key(source.chain, source.address, source.ts));
    return fromDetail(request, detail, retrievedAt, index, source);
  }));
}
