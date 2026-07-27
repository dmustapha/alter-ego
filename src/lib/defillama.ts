/**
 * DefiLlama historical-price client.
 *
 * Uses the free batchHistorical endpoint (no API key required).
 * Confidence threshold: >= 0.9. Returns null for missing or low-confidence prices.
 */

const DEFILLAMA_URL = "https://coins.llama.fi/batchHistorical";
const CONFIDENCE_THRESHOLD = 0.9;
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

export type PriceRequest = {
  chain: string;
  address: string;
  ts: number;
};

/** Build Map key from chain, address and ts (ts as provided in input). */
function makeKey(chain: string, address: string, ts: number): string {
  return `${chain.toLowerCase()}:${address}:${ts}`;
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
  // Build null-filled result map first so error paths can return it as-is.
  const result = new Map<string, number | null>();
  for (const r of reqs) {
    result.set(makeKey(r.chain, r.address, r.ts), null);
  }

  if (reqs.length === 0) return result;

  // Group by "chain:address", collecting timestamps (convert ms -> seconds if needed).
  const coinsBody: Record<string, number[]> = {};
  for (const r of reqs) {
    const chainKey = `${r.chain.toLowerCase()}:${r.address}`;
    const tsSec = r.ts > 1e12 ? Math.round(r.ts / 1000) : r.ts;
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

    const requestedTsSec = r.ts > 1e12 ? Math.round(r.ts / 1000) : r.ts;

    // Pick the price entry whose timestamp is closest to the requested ts.
    let best: PriceEntry | null = null;
    let bestDiff = Infinity;
    for (const entry of coin.prices) {
      const diff = Math.abs(entry.timestamp - requestedTsSec);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = entry;
      }
    }

    if (best && best.confidence >= CONFIDENCE_THRESHOLD) {
      result.set(mapKey, best.price);
    }
  }

  return result;
}
