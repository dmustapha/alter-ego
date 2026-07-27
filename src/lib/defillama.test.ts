import { describe, it, expect, vi, afterEach } from "vitest";
import { getHistoricalPrices } from "./defillama";

// DefiLlama batchHistorical response shape:
// { coins: { "chain:address": { decimals, symbol, prices: [{ timestamp, price, confidence }] } } }

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getHistoricalPrices", () => {
  it("returns price for high-confidence coin and null for low-confidence coin", async () => {
    const highTs = 1704067200; // unix seconds
    const lowTs = 1704153600;

    const mockResponse = {
      coins: {
        "ethereum:0xHIGH": {
          decimals: 18,
          symbol: "WETH",
          prices: [{ timestamp: highTs, price: 2275.21, confidence: 0.99 }],
        },
        "solana:SOL_LOW": {
          decimals: 9,
          symbol: "SOL",
          prices: [{ timestamp: lowTs, price: 150.0, confidence: 0.5 }],
        },
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })
    );

    const reqs = [
      { chain: "ethereum", address: "0xHIGH", ts: highTs },
      { chain: "solana", address: "SOL_LOW", ts: lowTs },
    ];

    const result = await getHistoricalPrices(reqs);

    expect(result.get("ethereum:0xHIGH:" + highTs)).toBe(2275.21);
    expect(result.get("solana:SOL_LOW:" + lowTs)).toBeNull();
  });

  it("returns all-null map when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network failure"))
    );

    const ts = 1704067200;
    const reqs = [
      { chain: "ethereum", address: "0xABC", ts },
      { chain: "xlayer", address: "0xDEF", ts },
    ];

    const result = await getHistoricalPrices(reqs);

    expect(result.get("ethereum:0xABC:" + ts)).toBeNull();
    expect(result.get("xlayer:0xDEF:" + ts)).toBeNull();
  });

  it("picks closest timestamp when multiple prices returned", async () => {
    // Request ts = 1000, response has timestamps 990 and 1010 -- both equidistant.
    // Should pick either; we assert the value comes from a qualifying price.
    const requestTs = 1000;
    const mockResponse = {
      coins: {
        "ethereum:0xTOK": {
          decimals: 18,
          symbol: "TOK",
          prices: [
            { timestamp: 990, price: 100.0, confidence: 0.95 },
            { timestamp: 1010, price: 101.0, confidence: 0.95 },
          ],
        },
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })
    );

    const result = await getHistoricalPrices([
      { chain: "ethereum", address: "0xTOK", ts: requestTs },
    ]);

    const val = result.get("ethereum:0xTOK:" + requestTs);
    expect(val).not.toBeNull();
    expect([100.0, 101.0]).toContain(val);
  });

  it("returns null when no prices array returned for a coin", async () => {
    const ts = 1704067200;
    const mockResponse = { coins: {} };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })
    );

    const result = await getHistoricalPrices([
      { chain: "ethereum", address: "0xMISSING", ts },
    ]);

    expect(result.get("ethereum:0xMISSING:" + ts)).toBeNull();
  });
});
