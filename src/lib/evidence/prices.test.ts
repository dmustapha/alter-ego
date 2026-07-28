import { describe, expect, it } from "vitest";
import type { HistoricalPriceDetail } from "../defillama";
import { collectPriceObservations, type HistoricalPriceLookup } from "./prices";

const lookup: HistoricalPriceLookup = async (requests) => new Map([
  ["ethereum:0xAsset:1700000000000", {
    requestedAt: requests[0].ts,
    returnedAt: 1_699_999_999_000,
    priceUsd: 2275.21,
    confidence: 0.99,
  }],
]);

describe("collectPriceObservations", () => {
  it("preserves requested keys, returned values, confidence, and immutable provenance", async () => {
    const [observation] = await collectPriceObservations([
      {
        walletAddress: "0xwallet",
        chain: { id: "1", name: "ethereum" },
        asset: { address: "0xAsset", symbol: "WETH" },
        requestedAt: 1700000000000,
        evidenceIds: ["event:1"],
      },
    ], lookup, 1700000001000);

    expect(observation).toMatchObject({
      walletAddress: "0xwallet",
      chain: { id: "1", name: "ethereum" },
      asset: { address: "0xAsset", symbol: "WETH" },
      requestedAt: 1700000000000,
      returnedAt: { status: "known", value: 1_699_999_999_000 },
      priceUsd: { status: "known", value: 2275.21 },
      confidence: { status: "known", value: 0.99 },
      evidenceIds: ["event:1"],
      provenance: {
        provider: "defillama",
        endpoint: "historical-prices",
        retrievedAt: 1700000001000,
        requestedAt: 1700000000000,
      },
    });
    expect(Object.isFrozen(observation)).toBe(true);
    expect(Object.isFrozen(observation.provenance)).toBe(true);
  });

  it("keeps an unavailable lookup explicitly unknown instead of assigning a zero price", async () => {
    const observations = await collectPriceObservations([
      {
        walletAddress: "wallet",
        chain: { id: "501", name: "solana" },
        asset: { address: "So111", symbol: "SOL" },
        requestedAt: 1_700_000_000_000,
        evidenceIds: [],
      },
    ], async () => new Map(), 1700000001);

    expect(observations[0].priceUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(observations[0].returnedAt).toEqual({ status: "unknown", reason: "unavailable" });
    expect(observations[0].confidence).toEqual({ status: "unknown", reason: "unavailable" });
  });

  it("looks up canonical native assets while preserving the native evidence asset and source identifier", async () => {
    let requested = [] as Parameters<HistoricalPriceLookup>[0];
    const [observation] = await collectPriceObservations([
      {
        walletAddress: "wallet",
        chain: { id: "1", name: "ethereum" },
        asset: { address: null, symbol: "ETH" },
        requestedAt: 1_700_000_000_000,
        evidenceIds: ["event:eth:1"],
      },
    ], async (requests) => {
      requested = requests;
      return new Map([["coingecko:ethereum:1700000000000", {
        requestedAt: 1_700_000_000_000,
        returnedAt: 1_700_000_000_000,
        priceUsd: 2_000,
        confidence: 0.99,
      }]]);
    }, 1_700_000_000_100);

    expect(requested).toEqual([{ chain: "coingecko", address: "ethereum", ts: 1_700_000_000_000 }]);
    expect(observation).toMatchObject({
      chain: { id: "1", name: "ethereum" },
      asset: { address: null, symbol: "ETH" },
      priceUsd: { status: "known", value: 2_000 },
      provenance: { sourceAssetId: "coingecko:ethereum" },
    });
  });

  it("keeps low-confidence returned prices explicitly unknown while retaining source confidence", async () => {
    const observations = await collectPriceObservations([
      {
        walletAddress: "wallet",
        chain: { id: "1", name: "ethereum" },
        asset: { address: "0xlow", symbol: "LOW" },
        requestedAt: 1_700_000_000_000,
        evidenceIds: [],
      },
    ], async () => new Map([["ethereum:0xlow:1700000000000", {
        requestedAt: 1_700_000_000_000,
        returnedAt: 1_700_000_001_000,
      priceUsd: 15,
      confidence: 0.4,
    }]]), 1_700_000_002_000);

    expect(observations[0].priceUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(observations[0].returnedAt).toEqual({ status: "known", value: 1_700_000_001_000 });
    expect(observations[0].confidence).toEqual({ status: "known", value: 0.4 });
  });

  it("treats malformed injected detail fields as unavailable instead of known non-finite values", async () => {
    const observations = await collectPriceObservations([
      {
        walletAddress: "wallet",
        chain: { id: "1", name: "ethereum" },
        asset: { address: "0xbad", symbol: "BAD" },
        requestedAt: 1700000000,
        evidenceIds: [],
      },
    ], async () => new Map([["ethereum:0xbad:1700000000", {
      requestedAt: 1700000000,
      returnedAt: Number.NaN,
      priceUsd: Number.POSITIVE_INFINITY,
      confidence: undefined,
    } as unknown as HistoricalPriceDetail]]), 1700000002);

    expect(observations[0].returnedAt).toEqual({ status: "unknown", reason: "unavailable" });
    expect(observations[0].priceUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(observations[0].confidence).toEqual({ status: "unknown", reason: "unavailable" });
  });

  it.each([
    ["confidence above one", { returnedAt: 1, priceUsd: 10, confidence: 1.01 }],
    ["negative confidence", { returnedAt: 1, priceUsd: 10, confidence: -0.01 }],
    ["negative price", { returnedAt: 1, priceUsd: -10, confidence: 0.99 }],
    ["negative timestamp", { returnedAt: -1, priceUsd: 10, confidence: 0.99 }],
  ])("treats %s in injected detail as unavailable", async (_label, invalidDetail) => {
    const observations = await collectPriceObservations([
      {
        walletAddress: "wallet",
        chain: { id: "1", name: "ethereum" },
        asset: { address: "0xbad", symbol: "BAD" },
        requestedAt: 1700000000,
        evidenceIds: [],
      },
    ], async () => new Map([["ethereum:0xbad:1700000000", {
      requestedAt: 1700000000,
      ...invalidDetail,
    } as HistoricalPriceDetail]]), 1700000002);

    expect(observations[0].returnedAt).toEqual({ status: "unknown", reason: "unavailable" });
    expect(observations[0].priceUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(observations[0].confidence).toEqual({ status: "unknown", reason: "unavailable" });
  });

  it("emits unknown observations for malformed runtime requests or lookup results instead of throwing", async () => {
    const observations = await collectPriceObservations([
      {
        walletAddress: "wallet",
        chain: { id: "1", name: "ethereum" },
        asset: { address: "0xasset", symbol: "ASSET" },
        requestedAt: 1_700_000_000_000,
        evidenceIds: [],
      },
      { walletAddress: 42 },
    ] as unknown as readonly Parameters<typeof collectPriceObservations>[0][number][], async () => ({}) as never);

    expect(observations).toHaveLength(2);
    expect(observations[0].priceUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(observations[1]).toMatchObject({
      walletAddress: "unknown",
      chain: { id: "unknown", name: "unknown" },
      priceUsd: { status: "unknown", reason: "unavailable" },
    });
  });

  it("requires millisecond request and returned timestamps within the source-price delta", async () => {
    const observations = await collectPriceObservations([
      {
        walletAddress: "wallet",
        chain: { id: "1", name: "ethereum" },
        asset: { address: "0xasset", symbol: "ASSET" },
        requestedAt: 1_700_000_000_000,
        evidenceIds: [],
      },
      {
        walletAddress: "wallet",
        chain: { id: "1", name: "ethereum" },
        asset: { address: "0xseconds", symbol: "SECONDS" },
        requestedAt: 1_700_000_000,
        evidenceIds: [],
      },
    ], async () => new Map([
      ["ethereum:0xasset:1700000000000", {
        requestedAt: 1_700_000_000_000,
        returnedAt: 1_700_000_600_001,
        priceUsd: 10,
        confidence: 0.99,
      }],
    ]), 1_700_000_700_000);

    expect(observations[0].returnedAt).toEqual({ status: "known", value: 1_700_000_600_001 });
    expect(observations[0].priceUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(observations[1].requestedAt).toBeNull();
    expect(observations[1].priceUsd).toEqual({ status: "unknown", reason: "unavailable" });
  });

  it("rejects a source timestamp later than collector retrieval even when it is near the request", async () => {
    const [observation] = await collectPriceObservations([{
      walletAddress: "wallet",
      chain: { id: "1", name: "ethereum" },
      asset: { address: "0xasset", symbol: "ASSET" },
      requestedAt: 1_700_000_000_000,
      evidenceIds: [],
    }], async () => new Map([["ethereum:0xasset:1700000000000", {
      requestedAt: 1_700_000_000_000,
      returnedAt: 1_700_000_001_000,
      priceUsd: 10,
      confidence: 0.99,
    }]]), 1_700_000_000_500);

    expect(observation.returnedAt).toEqual({ status: "unknown", reason: "unavailable" });
    expect(observation.priceUsd).toEqual({ status: "unknown", reason: "unavailable" });
  });

  it("fails closed for unsafe numeric source price details", async () => {
    const request = {
      walletAddress: "wallet",
      chain: { id: "1", name: "ethereum" },
      asset: { address: "0xasset", symbol: "ASSET" },
      requestedAt: 1_700_000_000_000,
      evidenceIds: [],
    };
    const [observation] = await collectPriceObservations([request], async () => new Map([
      ["ethereum:0xasset:1700000000000", {
        requestedAt: request.requestedAt,
        returnedAt: request.requestedAt,
        priceUsd: Number.MAX_VALUE,
        confidence: 0.99,
      }],
    ]));

    expect(observation.priceUsd).toEqual({ status: "unknown", reason: "unavailable" });
  });

  it("rejects a future collector retrieval time and does not trust its request", async () => {
    const [observation] = await collectPriceObservations([{
      walletAddress: "wallet",
      chain: { id: "1", name: "ethereum" },
      asset: { address: "0xasset", symbol: "ASSET" },
      requestedAt: Date.now() + 30_000,
      evidenceIds: [],
    }], async () => new Map(), Date.now() + 60_000);

    expect(observation.requestedAt).toBeNull();
    expect(observation.priceUsd).toEqual({ status: "unknown", reason: "unavailable" });
  });
});
