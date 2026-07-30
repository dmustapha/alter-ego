/**
 * DefiLlama historical-price client.
 *
 * Uses the free batchHistorical endpoint (no API key required).
 * Confidence threshold: >= 0.9. Returns null for missing or low-confidence prices.
 */
import { MAX_SOURCE_PRICE_DELTA_MS } from "./evidence/types";
import { isCanonicalTimestampMs } from "./evidence/types";

const DEFILLAMA_URL = "https://coins.llama.fi/batchHistorical";
export const PRICE_CONFIDENCE_THRESHOLD = 0.9;
const FETCH_TIMEOUT_MS = 8000;
const MAX_HISTORICAL_PRICE_REQUESTS = 100;

type PriceEntry = {
  timestamp: number;
  price: number;
  confidence: number;
};

type BatchHistoricalResponse = {
  coins: Record<
    string,
    { decimals?: number; symbol?: string; prices: PriceEntry[] }
  >;
};

function isValidPriceEntry(value: unknown): value is PriceEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<PriceEntry>;
  return typeof entry.timestamp === "number"
    && Number.isFinite(entry.timestamp)
    && entry.timestamp >= 0
    && typeof entry.price === "number"
    && Number.isFinite(entry.price)
    && entry.price >= 0
    && entry.price <= Number.MAX_SAFE_INTEGER
    && typeof entry.confidence === "number"
    && Number.isFinite(entry.confidence)
    && entry.confidence >= 0
    && entry.confidence <= 1;
}

export type PriceRequest = {
  chain: string;
  address: string;
  ts: number;
};

export type HistoricalPriceDetail = {
  readonly requestedAt: number;
  readonly returnedAt: number;
  readonly priceUsd: number;
  readonly confidence: number;
};

/** Build Map key from chain, address and ts (ts as provided in input). */
function makeKey(chain: string, address: string, ts: number): string {
  return `${chain.toLowerCase()}:${address}:${ts}`;
}

/** Evidence timestamps are milliseconds; provider requests are seconds. */
function toSeconds(timestampMs: number): number {
  return Math.round(timestampMs / 1000);
}

/**
 * Returns USD prices for the requested (chain, address, ts) tuples.
 *
 * Map key: `chain:address:ts` (chain lowercased, ts is the value from the input).
 * Map value: price if confidence >= 0.9, else null.
 *
 * On any fetch error, all keys map to null (degrade, never throw).
 */
export async function getHistoricalPrices(
  reqs: PriceRequest[]
): Promise<Map<string, number | null>> {
  const details = await fetchHistoricalPriceDetails(reqs, PRICE_CONFIDENCE_THRESHOLD);
  // Build null-filled result map first so error paths can return it as-is.
  const result = new Map<string, number | null>();
  for (const r of reqs) {
    const detail = details.get(makeKey(r.chain, r.address, r.ts));
    result.set(
      makeKey(r.chain, r.address, r.ts),
      detail !== null && detail !== undefined
        ? detail.priceUsd
        : null,
    );
  }

  return result;
}

/**
 * Returns source details for the closest historical price response per request.
 * Unlike the compatibility wrapper, this preserves low-confidence responses so
 * callers can record their limitation instead of losing provenance.
 */
export async function getHistoricalPriceDetails(
  reqs: PriceRequest[],
): Promise<Map<string, HistoricalPriceDetail | null>> {
  return fetchHistoricalPriceDetails(reqs);
}

async function fetchHistoricalPriceDetails(
  reqs: PriceRequest[],
  minimumConfidence?: number,
): Promise<Map<string, HistoricalPriceDetail | null>> {
  const result = new Map<string, HistoricalPriceDetail | null>();
  if (!Array.isArray(reqs)) return result;
  for (const r of reqs) result.set(makeKey(r.chain, r.address, r.ts), null);

  const collectedAt = Date.now();
  const validRequests = reqs.filter((request) =>
    typeof request.chain === "string" && request.chain !== ""
    && typeof request.address === "string" && request.address !== ""
    && isCanonicalTimestampMs(request.ts, collectedAt),
  );

  if (validRequests.length === 0) return result;

  const boundedRequests = [...new Map(
    validRequests.map((request) => [makeKey(request.chain, request.address, request.ts), request]),
  ).values()].slice(0, MAX_HISTORICAL_PRICE_REQUESTS);

  // Group by "chain:address", collecting timestamps (convert ms -> seconds if needed).
  const coinsBody: Record<string, number[]> = {};
  for (const r of boundedRequests) {
    const chainKey = `${r.chain.toLowerCase()}:${r.address}`;
    const tsSec = toSeconds(r.ts);
    if (!coinsBody[chainKey]) coinsBody[chainKey] = [];
    if (!coinsBody[chainKey].includes(tsSec)) coinsBody[chainKey].push(tsSec);
  }

  let data: BatchHistoricalResponse;
  try {
    const res = await fetch(DEFILLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coins: coinsBody }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return result;
    data = (await res.json()) as BatchHistoricalResponse;
  } catch {
    // Network error, timeout, or JSON parse failure -- degrade to all-null.
    return result;
  }

  // Resolve each requested (chain, address, ts) from the response.
  for (const r of boundedRequests) {
    const chainKey = `${r.chain.toLowerCase()}:${r.address}`;
    const mapKey = makeKey(r.chain, r.address, r.ts);
    const coin = data?.coins?.[chainKey];
    if (!coin || !Array.isArray(coin.prices) || coin.prices.length === 0) {
      continue; // already null
    }

    const requestedTsSec = toSeconds(r.ts);

    const validEntries = coin.prices.filter(isValidPriceEntry);
    const candidates = minimumConfidence === undefined
      ? validEntries
      : validEntries.filter((entry) => entry.confidence >= minimumConfidence);
    if (candidates.length === 0) continue;

    let best = candidates[0];
    let bestDiff = Math.abs(candidates[0].timestamp - requestedTsSec);
    for (const entry of candidates.slice(1)) {
      const diff = Math.abs(entry.timestamp - requestedTsSec);
      if (diff < bestDiff) { bestDiff = diff; best = entry; }
    }

    const returnedAt = best.timestamp * 1_000;
    if (!Number.isSafeInteger(returnedAt) || Math.abs(returnedAt - r.ts) > MAX_SOURCE_PRICE_DELTA_MS) continue;
    result.set(mapKey, {
      requestedAt: r.ts,
      returnedAt,
      priceUsd: best.price,
      confidence: best.confidence,
    });
  }

  return result;
}
