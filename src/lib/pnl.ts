import { getHistoricalPrices, type PriceRequest } from "./defillama";
import type { Trade } from "./types";

export interface PnlResult {
  realizedPnl: number | null;
  winRate: number | null;
  pricedTrades: Trade[];
  source: "fifo" | "unavailable";
}

/**
 * Computes realized PnL and win rate using FIFO cost-basis with DefiLlama
 * historical prices. Never fabricates: returns null when data is insufficient.
 */
export async function computePnl(
  trades: Trade[],
  chain: string
): Promise<PnlResult> {
  if (trades.length === 0) {
    return { realizedPnl: null, winRate: null, pricedTrades: [], source: "unavailable" };
  }

  // Step 1: collect all (chain, token, timestamp) tuples and fetch prices once.
  const reqs: PriceRequest[] = trades.map(t => ({
    chain: chain.toLowerCase(),
    address: t.token,
    ts: t.timestamp,
  }));
  const priceMap = await getHistoricalPrices(reqs);

  // Helper: look up price from map using lowercase chain key.
  function lookupPrice(trade: Trade): number | null {
    return priceMap.get(`${chain.toLowerCase()}:${trade.token}:${trade.timestamp}`) ?? null;
  }

  // Step 2: group trades by token, sorted by timestamp ascending.
  const byToken = new Map<string, Trade[]>();
  for (const t of trades) {
    const bucket = byToken.get(t.token) ?? [];
    bucket.push(t);
    byToken.set(t.token, bucket);
  }
  for (const bucket of byToken.values()) {
    bucket.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Step 3: FIFO computation per token.
  let totalRealized = 0;
  let wins = 0;
  let losses = 0;
  let anyPricedToken = false;

  // Build annotated trades array (price + amountUsd filled where known).
  const annotated = new Map<string, Trade>(); // id -> annotated trade

  for (const [, bucket] of byToken) {
    const lots: { qty: number; price: number }[] = [];
    let tokenExcluded = false;

    for (const trade of bucket) {
      const price = lookupPrice(trade);

      // Annotate with price if found.
      const annotatedTrade: Trade = { ...trade };
      if (price !== null) {
        annotatedTrade.price = price;
        annotatedTrade.amountUsd = price * trade.amount;
      }
      annotated.set(trade.id, annotatedTrade);

      if (trade.type === "BUY") {
        if (price === null || price === 0) {
          // Cannot cost-basis this token reliably -- exclude entire token.
          // Sticky: one unpriceable BUY invalidates all subsequent lots for this token's bucket.
          tokenExcluded = true;
        } else if (!tokenExcluded) {
          lots.push({ qty: trade.amount, price });
        }
      } else {
        // SELL
        if (tokenExcluded) continue;
        if (price === null) continue; // cannot value this sell
        if (lots.length === 0) continue; // no cost basis available

        anyPricedToken = true;
        let remaining = trade.amount;
        let positionRealized = 0;

        while (remaining > 0 && lots.length > 0) {
          const lot = lots[0];
          const matched = Math.min(remaining, lot.qty);
          positionRealized += (price - lot.price) * matched;
          lot.qty -= matched;
          remaining -= matched;
          if (lot.qty <= 0) lots.shift();
        }

        totalRealized += positionRealized;
        if (positionRealized > 0) {
          wins++;
        } else if (positionRealized < 0) {
          losses++;
        }
        // else breakeven: not counted as win or loss
      }
    }
  }

  if (!anyPricedToken) {
    return { realizedPnl: null, winRate: null, pricedTrades: [], source: "unavailable" };
  }

  const totalClosed = wins + losses;
  const winRate = totalClosed > 0 ? Math.round((wins / totalClosed) * 100) : null;

  // Rebuild pricedTrades in original order with annotations applied.
  const pricedTrades = trades.map(t => annotated.get(t.id) ?? t);

  return {
    realizedPnl: totalRealized,
    winRate,
    pricedTrades,
    source: "fifo",
  };
}
