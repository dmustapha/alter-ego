import { describe, it, expect, vi, afterEach } from "vitest";
import { getHistoricalPriceDetails, getHistoricalPrices } from "./defillama";

// DefiLlama batchHistorical response shape:
// { coins: { "chain:address": { decimals, symbol, prices: [{ timestamp, price, confidence }] } } }

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getHistoricalPrices", () => {
  it("retains returned timestamp and confidence in detailed results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ coins: { "ethereum:0xDETAIL": { prices: [
        { timestamp: 999, price: 100, confidence: 0.3 },
        { timestamp: 1010, price: 101, confidence: 0.95 },
      ] } } }),
    }));

    const result = await getHistoricalPriceDetails([{ chain: "ethereum", address: "0xDETAIL", ts: 1000 }]);

    expect(result.get("ethereum:0xDETAIL:1000")).toEqual({
      requestedAt: 1000,
      returnedAt: 999,
      priceUsd: 100,
      confidence: 0.3,
    });
  });

  it("ignores malformed detailed entries before choosing a returned price", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ coins: { "ethereum:0xSAFE": { prices: [
        null,
        "not-an-entry",
        { timestamp: Number.NaN, price: 99, confidence: 0.99 },
        { timestamp: 1000, price: Number.POSITIVE_INFINITY, confidence: 0.99 },
        { timestamp: 1000, price: 100, confidence: Number.NaN },
        { timestamp: 1001, price: 101, confidence: 0.95 },
      ] } } }),
    }));

    const result = await getHistoricalPriceDetails([{ chain: "ethereum", address: "0xSAFE", ts: 1000 }]);

    expect(result.get("ethereum:0xSAFE:1000")).toEqual({
      requestedAt: 1000,
      returnedAt: 1001,
      priceUsd: 101,
      confidence: 0.95,
    });
  });

  it("rejects out-of-domain source values while preserving valid zero values", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ coins: { "ethereum:0xBOUNDARY": { prices: [
        { timestamp: 1000, price: 100, confidence: 1.01 },
        { timestamp: 1000, price: 100, confidence: -0.01 },
        { timestamp: 1000, price: -1, confidence: 0.99 },
        { timestamp: -1, price: 100, confidence: 0.99 },
        { timestamp: 0, price: 0, confidence: 0 },
      ] } } }),
    }));

    const result = await getHistoricalPriceDetails([{ chain: "ethereum", address: "0xBOUNDARY", ts: 1000 }]);

    expect(result.get("ethereum:0xBOUNDARY:1000")).toEqual({
      requestedAt: 1000,
      returnedAt: 0,
      priceUsd: 0,
      confidence: 0,
    });
  });

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

  it("returns all-null map on non-2xx response (e.g. 429)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => { throw new Error("should not decode body"); },
      })
    );

    const ts = 1704067200;
    const result = await getHistoricalPrices([
      { chain: "ethereum", address: "0xRATE", ts },
    ]);

    expect(result.get("ethereum:0xRATE:" + ts)).toBeNull();
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

  it("filter-then-closest: nearer low-confidence entry is gated out; farther high-confidence entry wins", async () => {
    // ts=1000; nearest entry is at 995 (conf 0.5, gated); farther entry at 1010 (conf 0.95, passes).
    // Result must be 101 -- proves confidence filter runs BEFORE distance selection.
    const requestTs = 1000;
    const mockResponse = {
      coins: {
        "ethereum:0xGATE": {
          decimals: 18,
          symbol: "GATE",
          prices: [
            { timestamp: 995, price: 100.0, confidence: 0.5 },
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
      { chain: "ethereum", address: "0xGATE", ts: requestTs },
    ]);

    expect(result.get("ethereum:0xGATE:" + requestTs)).toBe(101.0);
  });

  it("all-low-confidence: returns null when every entry is below threshold", async () => {
    // This test MUST fail if the confidence gate is removed.
    const requestTs = 1000;
    const mockResponse = {
      coins: {
        "ethereum:0xLOW": {
          decimals: 18,
          symbol: "LOW",
          prices: [
            { timestamp: 1000, price: 99.0, confidence: 0.3 },
            { timestamp: 1001, price: 98.0, confidence: 0.5 },
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
      { chain: "ethereum", address: "0xLOW", ts: requestTs },
    ]);

    expect(result.get("ethereum:0xLOW:" + requestTs)).toBeNull();
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
