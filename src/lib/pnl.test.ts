import { describe, it, expect, vi, afterEach } from "vitest";
import { computePnl } from "./pnl";

// Mock getHistoricalPrices from defillama so tests are deterministic and offline.
vi.mock("./defillama", () => ({
  getHistoricalPrices: vi.fn(),
}));

import { getHistoricalPrices } from "./defillama";
import type { Trade } from "./types";

const mockGetHistoricalPrices = getHistoricalPrices as ReturnType<typeof vi.fn>;

afterEach(() => {
  vi.clearAllMocks();
});

// Helpers to build minimal Trade objects.
function makeTrade(
  overrides: Partial<Trade> & Pick<Trade, "type" | "token" | "amount" | "timestamp">
): Trade {
  return {
    id: "t-" + Math.random().toString(36).slice(2),
    tokenSymbol: "TOK",
    chain: "ethereum",
    amountUsd: 0,
    price: 0,
    pnlPct: 0,
    pnlUsd: 0,
    holdDurationDays: 0,
    ...overrides,
  };
}

describe("computePnl", () => {
  // Test A: simple buy then sell, full profit.
  it("A: buy 100 at $10 then sell 100 at $15 -> realizedPnl 500, winRate 100, source fifo", async () => {
    const token = "0xTOKA";
    const buyTs = 1_000_000;
    const sellTs = 2_000_000;
    const chain = "ethereum";

    const buyTrade = makeTrade({ type: "BUY", token, amount: 100, timestamp: buyTs, chain });
    const sellTrade = makeTrade({ type: "SELL", token, amount: 100, timestamp: sellTs, chain });

    const priceMap = new Map<string, number | null>([
      [`${chain}:${token}:${buyTs}`, 10],
      [`${chain}:${token}:${sellTs}`, 15],
    ]);
    mockGetHistoricalPrices.mockResolvedValueOnce(priceMap);

    const result = await computePnl([buyTrade, sellTrade], chain);

    expect(result.realizedPnl).toBe(500);
    expect(result.winRate).toBe(100);
    expect(result.source).toBe("fifo");
    expect(result.pricedTrades.length).toBe(2);
    // buy trade annotated at $10
    const pricedBuy = result.pricedTrades.find(t => t.type === "BUY")!;
    expect(pricedBuy.price).toBe(10);
    expect(pricedBuy.amountUsd).toBe(1000);
    // sell trade annotated at $15
    const pricedSell = result.pricedTrades.find(t => t.type === "SELL")!;
    expect(pricedSell.price).toBe(15);
    expect(pricedSell.amountUsd).toBe(1500);
  });

  // Test B: two closed positions, one win and one loss -> winRate 50.
  it("B: 1 winning close + 1 losing close -> winRate 50", async () => {
    const tokenA = "0xTOKB_A";
    const tokenB = "0xTOKB_B";
    const chain = "ethereum";

    // Token A: buy at $10, sell at $20 (win, +$1000)
    const buyA = makeTrade({ type: "BUY", token: tokenA, amount: 100, timestamp: 1000, chain });
    const sellA = makeTrade({ type: "SELL", token: tokenA, amount: 100, timestamp: 2000, chain });
    // Token B: buy at $10, sell at $5 (loss, -$500)
    const buyB = makeTrade({ type: "BUY", token: tokenB, amount: 100, timestamp: 1000, chain });
    const sellB = makeTrade({ type: "SELL", token: tokenB, amount: 100, timestamp: 2000, chain });

    const priceMap = new Map<string, number | null>([
      [`${chain}:${tokenA}:1000`, 10],
      [`${chain}:${tokenA}:2000`, 20],
      [`${chain}:${tokenB}:1000`, 10],
      [`${chain}:${tokenB}:2000`, 5],
    ]);
    mockGetHistoricalPrices.mockResolvedValueOnce(priceMap);

    const result = await computePnl([buyA, sellA, buyB, sellB], chain);

    expect(result.realizedPnl).toBe(500); // 1000 - 500
    expect(result.winRate).toBe(50);
    expect(result.source).toBe("fifo");
  });

  // Test C: a token whose buy price is null is fully excluded from PnL and win/loss counts.
  it("C: token with null buy price is excluded; only the priced token counts", async () => {
    const tokenGood = "0xTOKC_G";
    const tokenBad = "0xTOKC_B";
    const chain = "ethereum";

    // Good token: buy $10, sell $20 -> +1000
    const buyGood = makeTrade({ type: "BUY", token: tokenGood, amount: 100, timestamp: 1000, chain });
    const sellGood = makeTrade({ type: "SELL", token: tokenGood, amount: 100, timestamp: 2000, chain });
    // Bad token: buy price null, sell price present -- should be fully excluded
    const buyBad = makeTrade({ type: "BUY", token: tokenBad, amount: 50, timestamp: 1000, chain });
    const sellBad = makeTrade({ type: "SELL", token: tokenBad, amount: 50, timestamp: 2000, chain });

    const priceMap = new Map<string, number | null>([
      [`${chain}:${tokenGood}:1000`, 10],
      [`${chain}:${tokenGood}:2000`, 20],
      [`${chain}:${tokenBad}:1000`, null],  // unpriceable buy
      [`${chain}:${tokenBad}:2000`, 30],
    ]);
    mockGetHistoricalPrices.mockResolvedValueOnce(priceMap);

    const result = await computePnl([buyGood, sellGood, buyBad, sellBad], chain);

    // Only good token counts
    expect(result.realizedPnl).toBe(1000);
    // win/loss count = 1 win (good token), bad token excluded
    expect(result.winRate).toBe(100);
    expect(result.source).toBe("fifo");
  });

  // Test D: airdrop (buy price = 0) is excluded from PnL computation.
  it("D: airdrop (buy price 0) is excluded from PnL and win/loss counts", async () => {
    const tokenAirdrop = "0xTOKD_A";
    const tokenReal = "0xTOKD_R";
    const chain = "ethereum";

    // Airdrop: buy at price 0, then sell at $5 -- excluded entirely
    const buyAirdrop = makeTrade({ type: "BUY", token: tokenAirdrop, amount: 1000, timestamp: 1000, chain });
    const sellAirdrop = makeTrade({ type: "SELL", token: tokenAirdrop, amount: 1000, timestamp: 2000, chain });
    // Real token: buy $2, sell $4 -> +200
    const buyReal = makeTrade({ type: "BUY", token: tokenReal, amount: 100, timestamp: 1000, chain });
    const sellReal = makeTrade({ type: "SELL", token: tokenReal, amount: 100, timestamp: 2000, chain });

    const priceMap = new Map<string, number | null>([
      [`${chain}:${tokenAirdrop}:1000`, 0],   // zero-cost inflow / airdrop
      [`${chain}:${tokenAirdrop}:2000`, 5],
      [`${chain}:${tokenReal}:1000`, 2],
      [`${chain}:${tokenReal}:2000`, 4],
    ]);
    mockGetHistoricalPrices.mockResolvedValueOnce(priceMap);

    const result = await computePnl([buyAirdrop, sellAirdrop, buyReal, sellReal], chain);

    expect(result.realizedPnl).toBe(200);
    expect(result.winRate).toBe(100); // only real token's close counted
    expect(result.source).toBe("fifo");
  });

  // Test E: all tokens unpriceable -> null result, source "unavailable".
  it("E: all tokens unpriceable -> realizedPnl null, winRate null, source unavailable", async () => {
    const token = "0xTOKE";
    const chain = "ethereum";

    const buy = makeTrade({ type: "BUY", token, amount: 100, timestamp: 1000, chain });
    const sell = makeTrade({ type: "SELL", token, amount: 100, timestamp: 2000, chain });

    const priceMap = new Map<string, number | null>([
      [`${chain}:${token}:1000`, null],
      [`${chain}:${token}:2000`, null],
    ]);
    mockGetHistoricalPrices.mockResolvedValueOnce(priceMap);

    const result = await computePnl([buy, sell], chain);

    expect(result.realizedPnl).toBeNull();
    expect(result.winRate).toBeNull();
    expect(result.pricedTrades).toEqual([]);
    expect(result.source).toBe("unavailable");
  });
});
