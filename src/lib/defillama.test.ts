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
        { timestamp: 1_699_999_999, price: 100, confidence: 0.3 },
        { timestamp: 1_700_000_010, price: 101, confidence: 0.95 },
      ] } } }),
    }));

    const result = await getHistoricalPriceDetails([{ chain: "ethereum", address: "0xDETAIL", ts: 1_700_000_000_000 }]);

    expect(result.get("ethereum:0xDETAIL:1700000000000")).toEqual({
      requestedAt: 1_700_000_000_000,
      returnedAt: 1_699_999_999_000,
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
        { timestamp: 1_700_000_000, price: Number.POSITIVE_INFINITY, confidence: 0.99 },
        { timestamp: 1_700_000_000, price: 100, confidence: Number.NaN },
        { timestamp: 1_700_000_001, price: 101, confidence: 0.95 },
      ] } } }),
    }));

    const result = await getHistoricalPriceDetails([{ chain: "ethereum", address: "0xSAFE", ts: 1_700_000_000_000 }]);

    expect(result.get("ethereum:0xSAFE:1700000000000")).toEqual({
      requestedAt: 1_700_000_000_000,
      returnedAt: 1_700_000_001_000,
      priceUsd: 101,
      confidence: 0.95,
    });
  });

  it("rejects out-of-domain source values while preserving valid zero values", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ coins: { "ethereum:0xBOUNDARY": { prices: [
        { timestamp: 1_700_000_000, price: 100, confidence: 1.01 },
        { timestamp: 1_700_000_000, price: 100, confidence: -0.01 },
        { timestamp: 1_700_000_000, price: -1, confidence: 0.99 },
        { timestamp: -1, price: 100, confidence: 0.99 },
        { timestamp: 1_700_000_000, price: 0, confidence: 0 },
      ] } } }),
    }));

    const result = await getHistoricalPriceDetails([{ chain: "ethereum", address: "0xBOUNDARY", ts: 1_700_000_000_000 }]);

    expect(result.get("ethereum:0xBOUNDARY:1700000000000")).toEqual({
      requestedAt: 1_700_000_000_000,
      returnedAt: 1_700_000_000_000,
      priceUsd: 0,
      confidence: 0,
    });
  });

  it("returns price for high-confidence coin and null for low-confidence coin", async () => {
    const highTs = 1_704_067_200_000;
    const lowTs = 1_704_153_600_000;

    const mockResponse = {
      coins: {
        "ethereum:0xHIGH": {
          decimals: 18,
          symbol: "WETH",
          prices: [{ timestamp: highTs / 1_000, price: 2275.21, confidence: 0.99 }],
        },
        "solana:SOL_LOW": {
          decimals: 9,
          symbol: "SOL",
          prices: [{ timestamp: lowTs / 1_000, price: 150.0, confidence: 0.5 }],
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
    // Evidence request timestamps are milliseconds; source timestamps are seconds.
    // Should pick either; we assert the value comes from a qualifying price.
    const requestTs = 1_700_000_000_000;
    const mockResponse = {
      coins: {
        "ethereum:0xTOK": {
          decimals: 18,
          symbol: "TOK",
          prices: [
            { timestamp: 1_699_999_990, price: 100.0, confidence: 0.95 },
            { timestamp: 1_700_000_010, price: 101.0, confidence: 0.95 },
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
    // The nearer low-confidence entry is gated; the farther high-confidence entry wins.
    // Result must be 101 -- proves confidence filter runs BEFORE distance selection.
    const requestTs = 1_700_000_000_000;
    const mockResponse = {
      coins: {
        "ethereum:0xGATE": {
          decimals: 18,
          symbol: "GATE",
          prices: [
            { timestamp: 1_699_999_995, price: 100.0, confidence: 0.5 },
            { timestamp: 1_700_000_010, price: 101.0, confidence: 0.95 },
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

  it.each([
    ["seconds", 1_700_000_000],
    ["negative", -1],
    ["future", Date.now() + 60_000],
  ])("fails closed for a %s public detail request timestamp", async (_label, ts) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getHistoricalPriceDetails([{ chain: "ethereum", address: "0xINVALID", ts }]);

    expect(result.get(`ethereum:0xINVALID:${ts}`)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unsafe public source prices before they can enter a historical price result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ coins: { "ethereum:0xUNSAFE": { prices: [{
        timestamp: 1_700_000_000,
        price: Number.MAX_VALUE,
        confidence: 0.99,
      }] } } }),
    }));

    const result = await getHistoricalPriceDetails([{
      chain: "ethereum",
      address: "0xUNSAFE",
      ts: 1_700_000_000_000,
    }]);

    expect(result.get("ethereum:0xUNSAFE:1700000000000")).toBeNull();
  });
});
