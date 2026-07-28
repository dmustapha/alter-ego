/**
 * DefiLlama historical-price client.
 *
 * Uses the free batchHistorical endpoint (no API key required).
 * Confidence threshold: >= 0.9. Returns null for missing or low-confidence prices.
 */

const DEFILLAMA_URL = "https://coins.llama.fi/batchHistorical";
export const PRICE_CONFIDENCE_THRESHOLD = 0.9;
const FETCH_TIMEOUT_MS = 8000;

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

/** Convert a timestamp to seconds; pass through if already in seconds. */
function toSeconds(ts: number): number {
  return ts > 1e12 ? Math.round(ts / 1000) : ts;
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
  for (const r of reqs) result.set(makeKey(r.chain, r.address, r.ts), null);

  if (reqs.length === 0) return result;

  // Group by "chain:address", collecting timestamps (convert ms -> seconds if needed).
  const coinsBody: Record<string, number[]> = {};
  for (const r of reqs) {
    const chainKey = `${r.chain.toLowerCase()}:${r.address}`;
    const tsSec = toSeconds(r.ts);
    if (!coinsBody[chainKey]) coinsBody[chainKey] = [];
    coinsBody[chainKey].push(tsSec);
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
  for (const r of reqs) {
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

    result.set(mapKey, {
      requestedAt: r.ts,
      returnedAt: best.timestamp,
      priceUsd: best.price,
      confidence: best.confidence,
    });
  }

  return result;
}
