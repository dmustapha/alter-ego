import { describe, expect, it } from "vitest";
import { collectExecutionCosts } from "./costs";
import { collectPriceObservations } from "./prices";
import type { NormalizedTransactionEvent, PriceObservation } from "./types";

function event(overrides: Partial<NormalizedTransactionEvent> = {}): NormalizedTransactionEvent {
  return {
    id: "event:eth:1",
    walletAddress: "0xwallet",
    chain: { id: "1", name: "ethereum" },
    timestampMs: 1_700_000_000_000,
    asset: { address: "0xasset", symbol: "USDC" },
    direction: { status: "known", value: "outflow" },
    amount: { status: "known", value: 1 },
    priceUsd: { status: "unknown", reason: "unavailable" },
    gasFeeNative: { status: "known", value: 0.01 },
    gasFeeUnit: {
      representation: "native-decimal",
      asset: { address: null, symbol: "ETH" },
      decimals: 18,
    },
    protocol: { status: "unknown", reason: "unavailable" },
    provenance: {
      provider: "okx-web3",
      endpoint: "transactions-by-address",
      chainIndex: "1",
      transactionHash: "0xhash",
      retrievedAt: 1_700_000_000_100,
      sourceIndex: 0,
    },
    ...overrides,
  };
}

function nativePrice(overrides: Partial<PriceObservation> = {}): PriceObservation {
  return {
    id: "price:eth:1",
    walletAddress: "0xwallet",
    chain: { id: "1", name: "ethereum" },
    asset: { address: null, symbol: "ETH" },
    requestedAt: 1_700_000_000_000,
    returnedAt: { status: "known", value: 1_700_000_000_010 },
    priceUsd: { status: "known", value: 2_000 },
    confidence: { status: "known", value: 0.99 },
    evidenceIds: ["event:eth:1"],
    provenance: {
      provider: "defillama",
      endpoint: "historical-prices",
      retrievedAt: 1_700_000_000_100,
      requestedAt: 1_700_000_000_000,
      sourceAssetId: "coingecko:ethereum",
    },
    ...overrides,
  };
}

describe("collectExecutionCosts", () => {
  it("emits a frozen per-event native fee with matching native-price provenance", () => {
    const [cost] = collectExecutionCosts([event()], [nativePrice()], 1_700_000_001_000);

    expect(cost).toMatchObject({
      id: "cost:event:eth:1",
      walletAddress: "0xwallet",
      chain: { id: "1", name: "ethereum" },
      nativeAsset: { address: null, symbol: "ETH" },
      eventId: "event:eth:1",
      observedAt: { status: "known", value: 1_700_000_000_000 },
      gasFeeNative: { status: "known", value: 0.01 },
      gasFeeUsd: { status: "known", value: 20 },
      priceEvidenceIds: ["price:eth:1"],
      evidenceIds: ["event:eth:1", "price:eth:1"],
      provenance: {
        provider: "derived",
        endpoint: "execution-cost-normalizer",
        chainIndex: "1",
        retrievedAt: 1_700_000_001_000,
      },
    });
    expect(Object.isFrozen(cost)).toBe(true);
    expect(Object.isFrozen(cost.gasFeeNative)).toBe(true);
    expect(Object.isFrozen(cost.priceEvidenceIds)).toBe(true);
  });

  it("keeps malformed fees explicitly unknown rather than treating them as zero", () => {
    const [cost] = collectExecutionCosts([
      event({ gasFeeNative: { status: "known", value: Number.NaN } }),
    ], [nativePrice()]);

    expect(cost.gasFeeNative).toEqual({ status: "unknown", reason: "unavailable" });
    expect(cost.gasFeeUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(cost.priceEvidenceIds).toEqual([]);
  });

  it("rejects a fee conversion when its native-unit provenance is incompatible with the chain", () => {
    const [cost] = collectExecutionCosts([event({
      gasFeeUnit: {
        representation: "native-decimal",
        asset: { address: null, symbol: "SOL" },
        decimals: 9,
      },
    })], [nativePrice()]);

    expect(cost.gasFeeNative).toEqual({ status: "known", value: 0.01 });
    expect(cost.gasFeeUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(cost.priceEvidenceIds).toEqual([]);
  });

  it("rejects a fee conversion when its declared native decimals do not match the chain", () => {
    const [cost] = collectExecutionCosts([event({
      gasFeeUnit: {
        representation: "native-decimal",
        asset: { address: null, symbol: "ETH" },
        decimals: 9,
      },
    })], [nativePrice()]);

    expect(cost.gasFeeUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(cost.priceEvidenceIds).toEqual([]);
  });

  it("refuses cross-chain native fee aggregation until every fee has its matching conversion", () => {
    const solana = event({
      id: "event:sol:1",
      chain: { id: "501", name: "solana" },
      gasFeeNative: { status: "known", value: 0.00001 },
    });
    const costs = collectExecutionCosts([event(), solana], [nativePrice()]);

    expect(costs).toHaveLength(2);
    expect(costs[0].gasFeeUsd).toEqual({ status: "known", value: 20 });
    expect(costs[1].gasFeeNative).toEqual({ status: "known", value: 0.00001 });
    expect(costs[1].gasFeeUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(costs[1].priceEvidenceIds).toEqual([]);
  });

  it("rejects prices that do not exactly match the event chain, native asset, and timestamp", () => {
    const mismatched = nativePrice({
      asset: { address: "0xwrapped", symbol: "WETH" },
      requestedAt: 1_700_000_000_001,
    });
    const [cost] = collectExecutionCosts([event()], [mismatched]);

    expect(cost.gasFeeUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(cost.priceEvidenceIds).toEqual([]);
  });

  it("rejects a stale native price even when its requested timestamp matches the fee event", () => {
    const [cost] = collectExecutionCosts([event()], [nativePrice({
      returnedAt: { status: "known", value: 1_700_000_300_001 },
    })]);

    expect(cost.gasFeeUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(cost.priceEvidenceIds).toEqual([]);
  });

  it("rejects a native price collected for a different wallet", () => {
    const [cost] = collectExecutionCosts([event()], [nativePrice({ walletAddress: "0xother" })]);

    expect(cost.gasFeeUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(cost.priceEvidenceIds).toEqual([]);
  });

  it("rejects a native price not linked to the fee event", () => {
    const [cost] = collectExecutionCosts([event()], [nativePrice({ evidenceIds: ["event:other"] })]);

    expect(cost.gasFeeUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(cost.priceEvidenceIds).toEqual([]);
  });

  it("converts a fee using a matching native price emitted by the price collector", async () => {
    const prices = await collectPriceObservations([
      {
        walletAddress: "0xwallet",
        chain: { id: "1", name: "ethereum" },
        asset: { address: null, symbol: "ETH" },
        requestedAt: 1_700_000_000_000,
        evidenceIds: ["event:eth:1"],
      },
    ], async () => new Map([["coingecko:ethereum:1700000000000", {
      requestedAt: 1_700_000_000_000,
      returnedAt: 1_700_000_000_000,
      priceUsd: 2_000,
      confidence: 0.99,
    }]]));

    const [cost] = collectExecutionCosts([event()], prices);

    expect(cost.gasFeeUsd).toEqual({ status: "known", value: 20 });
    expect(cost.priceEvidenceIds).toEqual([prices[0].id]);
  });

  it("keeps an overflowing fee conversion explicitly unknown", () => {
    const [cost] = collectExecutionCosts([
      event({ gasFeeNative: { status: "known", value: Number.MAX_VALUE } }),
    ], [nativePrice({ priceUsd: { status: "known", value: Number.MAX_VALUE } })]);

    expect(cost.gasFeeUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(cost.priceEvidenceIds).toEqual([]);
  });

  it.each<readonly [string, Partial<PriceObservation["provenance"]>]>([
    ["wrong provider", { provider: "derived" }],
    ["wrong endpoint", { endpoint: "transaction-detail" }],
    ["missing source asset", { sourceAssetId: undefined }],
    ["wrong source asset", { sourceAssetId: "coingecko:solana" }],
    ["mismatched provenance timestamp", { requestedAt: 1_700_000_000_001 }],
  ])("fails closed for a %s price provenance", (_label, provenance) => {
    const [cost] = collectExecutionCosts([event()], [nativePrice({
      provenance: { ...nativePrice().provenance, ...provenance },
    })]);

    expect(cost.gasFeeUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(cost.priceEvidenceIds).toEqual([]);
  });

  it("fails closed when an event chain id and name are not a canonical pair", () => {
    const [cost] = collectExecutionCosts([event({ chain: { id: "1", name: "solana" } })], [nativePrice()]);

    expect(cost.nativeAsset).toEqual({ address: null, symbol: null });
    expect(cost.gasFeeUsd).toEqual({ status: "unknown", reason: "unavailable" });
  });
});
