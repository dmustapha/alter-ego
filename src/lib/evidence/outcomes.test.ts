import { describe, expect, it } from "vitest";
import { buildRealizedOutcomes } from "./outcomes";
import { canonicalNativeAsset } from "./native-assets";
import type { ClassifiedTrade, EvidenceAsset, PriceObservation, TradeClassification } from "./types";

const chain = { id: "1", name: "ethereum" };

function trade(
  id: string,
  timestampMs: number,
  legs: ClassifiedTrade["legs"],
  walletAddress = "0xwallet",
): ClassifiedTrade {
  return {
    id,
    walletAddress,
    chain,
    classification: "classified",
    timestampMs: { status: "known", value: timestampMs },
    legs,
    evidenceIds: [`source:${id}:trade`, `source:${id}:price`],
    provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: timestampMs },
  };
}

function acquired(
  quantity: number,
  price: number | null,
  priceEvidenceIds = ["price:acquisition"],
  asset: EvidenceAsset = { address: "0xasset", symbol: "ASSET" },
) {
  return {
    asset,
    direction: "acquired" as const,
    quantity: { status: "known" as const, value: quantity },
    priceUsd: price === null
      ? { status: "unknown" as const, reason: "unavailable" as const }
      : { status: "known" as const, value: price },
    priceEvidenceIds,
  };
}

function disposed(
  quantity: number,
  price: number,
  priceEvidenceIds = ["price:disposal"],
  asset: EvidenceAsset = { address: "0xasset", symbol: "ASSET" },
) {
  return {
    asset,
    direction: "disposed" as const,
    quantity: { status: "known" as const, value: quantity },
    priceUsd: { status: "known" as const, value: price },
    priceEvidenceIds,
  };
}

function observations(input: readonly TradeClassification[]): readonly PriceObservation[] {
  return input.flatMap((candidate) => candidate && candidate.classification === "classified" && Array.isArray(candidate.legs) ? candidate.legs.flatMap((leg) =>
    leg && leg.priceUsd && leg.priceUsd.status === "known" && Array.isArray(leg.priceEvidenceIds) ? leg.priceEvidenceIds.map((id: string): PriceObservation => {
      const native = leg.asset.address === null ? canonicalNativeAsset(candidate.chain) : null;
      return {
        id,
        walletAddress: candidate.walletAddress,
        chain: candidate.chain,
        asset: leg.asset,
        requestedAt: candidate.timestampMs.status === "known" ? candidate.timestampMs.value : null,
        returnedAt: candidate.timestampMs.status === "known" ? { status: "known", value: candidate.timestampMs.value } : { status: "unknown", reason: "unavailable" },
        priceUsd: leg.priceUsd,
        confidence: { status: "known", value: 1 },
        evidenceIds: [candidate.evidenceIds[0]],
        provenance: {
          provider: "defillama",
          endpoint: "historical-prices",
          retrievedAt: 4_000,
          requestedAt: candidate.timestampMs.status === "known" ? candidate.timestampMs.value : undefined,
          sourceAssetId: native?.sourceAssetId ?? `${candidate.chain.name}:${leg.asset.address}`,
        },
      };
    }) : [],
  ) : []);
}

function outcomes(input: readonly TradeClassification[] | readonly unknown[], retrievedAt = 4_000) {
  return buildRealizedOutcomes(input, observations(input as readonly TradeClassification[]), retrievedAt);
}

describe("buildRealizedOutcomes", () => {
  it("derives PnL only from resolved observations that match each trade's wallet, chain, asset, time, and source", () => {
    const buy = trade("trade:bound-buy", 2_000, [acquired(1, 10, ["price:bound-buy"])]);
    const sell = trade("trade:bound-sell", 3_000, [disposed(1, 15, ["price:bound-sell"])]);
    const resolved = observations([buy, sell]);

    expect(buildRealizedOutcomes([buy, sell], resolved, 4_000).outcomes).toEqual([
      expect.objectContaining({ realizedPnlUsd: { status: "known", value: 5 } }),
    ]);

    const invalidObservations = [
      resolved.map((value) => value.id === "price:bound-buy" ? { ...value, walletAddress: "0xother" } : value),
      resolved.map((value) => value.id === "price:bound-buy" ? { ...value, chain: { id: "501", name: "solana" } } : value),
      resolved.map((value) => value.id === "price:bound-buy" ? { ...value, asset: { address: "0xother", symbol: "ASSET" } } : value),
      resolved.map((value) => value.id === "price:bound-buy" ? { ...value, returnedAt: { status: "known" as const, value: 2_000 + 300_001 } } : value),
      resolved.map((value) => value.id === "price:bound-buy" ? { ...value, provenance: { ...value.provenance, sourceAssetId: "ethereum:0xother" } } : value),
      resolved.map((value) => value.id === "price:bound-buy" ? { ...value, evidenceIds: ["source:other"] } : value),
    ];

    for (const values of invalidObservations) {
      expect(buildRealizedOutcomes([buy, sell], values, 4_000).outcomes).toEqual([]);
    }
  });

  it("refuses fabricated price IDs and supports canonical native assets only with a matching native observation", () => {
    const native = { address: null, symbol: "ETH" };
    const buy = trade("trade:native-buy", 2_000, [acquired(1, 10, ["price:forged"], native)]);
    const sell = trade("trade:native-sell", 3_000, [disposed(1, 15, ["price:native-sell"], native)]);
    const resolved = observations([buy, sell]).filter((value) => value.id !== "price:forged");

    expect(buildRealizedOutcomes([buy, sell], resolved, 4_000).outcomes).toEqual([]);

    const nativePrices = observations([buy, sell]);
    expect(buildRealizedOutcomes([buy, sell], nativePrices, 4_000).outcomes).toEqual([
      expect.objectContaining({ realizedPnlUsd: { status: "known", value: 5 } }),
    ]);
  });

  it("matches priced classified trades FIFO and preserves trade and price evidence", () => {
    const buy = trade("trade:buy", 2_000, [acquired(2, 10)]);
    const sell = trade("trade:sell", 3_000, [disposed(2, 15)]);

    const result = outcomes([sell, buy]);

    expect(result.outcomes).toEqual([expect.objectContaining({
      asset: { address: "0xasset", symbol: "ASSET" },
      quantity: { status: "known", value: 2 },
      realizedPnlUsd: { status: "known", value: 10 },
      tradeEvidenceIds: ["trade:buy", "trade:sell"],
      priceEvidenceIds: ["price:acquisition", "price:disposal"],
    })]);
    expect(result.lots).toEqual([]);
    expect(result.assumptions).toContain("FIFO matching is applied independently per wallet, chain, and asset.");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.outcomes)).toBe(true);
    expect(Object.isFrozen(result.outcomes[0])).toBe(true);
  });

  it("keeps a partial close and the remaining FIFO lot distinct", () => {
    const buy = trade("trade:buy", 2_000, [acquired(3, 10)]);
    const sell = trade("trade:sell", 3_000, [disposed(1, 14)]);

    const result = outcomes([buy, sell]);

    expect(result.outcomes[0]).toMatchObject({
      quantity: { status: "known", value: 1 },
      realizedPnlUsd: { status: "known", value: 4 },
    });
    expect(result.lots).toEqual([expect.objectContaining({
      quantity: { status: "known", value: 2 },
      costBasisUsd: { status: "known", value: 10 },
      tradeEvidenceIds: ["trade:buy"],
      priceEvidenceIds: ["price:acquisition"],
    })]);
  });

  it("never matches lots across selected wallets", () => {
    const otherWalletBuy = trade("trade:other-wallet-buy", 2_000, [acquired(1, 10)], "0xother");
    const sell = trade("trade:wallet-sell", 3_000, [disposed(1, 15)]);

    const result = outcomes([otherWalletBuy, sell]);

    expect(result.outcomes).toEqual([]);
    expect(result.lots).toEqual([expect.objectContaining({ walletAddress: "0xother" })]);
    expect(result.insufficient).toEqual([expect.objectContaining({
      tradeEvidenceIds: ["trade:wallet-sell"],
      reason: "unavailable",
    })]);
  });

  it("treats a price without an explicit price-evidence ID as insufficient", () => {
    const buy = trade("trade:unproven-price-buy", 2_000, [acquired(1, 10, [])]);
    const sell = trade("trade:unproven-price-sell", 3_000, [disposed(1, 15, [])]);

    const result = outcomes([buy, sell]);

    expect(result.outcomes).toEqual([]);
    expect(result.insufficient).toEqual(expect.arrayContaining([expect.objectContaining({
      reason: "unavailable",
      priceEvidenceIds: [],
      tradeEvidenceIds: ["trade:unproven-price-buy", "trade:unproven-price-sell"],
    })]));
  });

  it("keeps an open lot's cost basis unknown when its numeric price has no evidence", () => {
    const buy = trade("trade:unproven-open-price", 2_000, [acquired(1, 10, [])]);

    const result = outcomes([buy]);

    expect(result.lots).toEqual([expect.objectContaining({
      costBasisUsd: { status: "unknown", reason: "unavailable" },
      priceEvidenceIds: [],
    })]);
    expect(result.insufficient).toEqual([expect.objectContaining({
      tradeEvidenceIds: ["trade:unproven-open-price"],
      priceEvidenceIds: [],
      reason: "unavailable",
    })]);
  });

  it("fails closed for classified trades with missing source evidence or malformed provenance", () => {
    const validTrade = trade("trade:valid", 2_000, [acquired(1, 10)]);
    const malformed = [
      { ...validTrade, id: "trade:no-source-evidence", evidenceIds: [] },
      { ...validTrade, id: "trade:bad-provenance", provenance: { provider: "derived", endpoint: "fifo-outcome-builder", retrievedAt: -1 } },
    ];

    expect(() => outcomes(malformed as never)).not.toThrow();
    expect(outcomes(malformed as never)).toMatchObject({
      lots: [],
      outcomes: [],
      insufficient: [
        expect.objectContaining({ tradeEvidenceIds: ["trade:no-source-evidence"] }),
        expect.objectContaining({ tradeEvidenceIds: ["trade:bad-provenance"] }),
      ],
    });
  });

  it("uses trade IDs as a deterministic FIFO tiebreaker for equal timestamps", () => {
    const buy = trade("trade:a-buy", 2_000, [acquired(1, 10)]);
    const sell = trade("trade:b-sell", 2_000, [disposed(1, 15)]);

    const forward = outcomes([buy, sell]);
    const reversed = outcomes([sell, buy]);

    expect(forward.outcomes).toEqual(reversed.outcomes);
    expect(forward.outcomes[0]).toMatchObject({ realizedPnlUsd: { status: "known", value: 5 } });
  });

  it("does not match same-symbol assets without canonical addresses", () => {
    const addresslessUsdc = { address: null, symbol: "USDC" };
    const buy = trade("trade:addressless-buy", 2_000, [acquired(1, 10, ["price:buy"], addresslessUsdc)]);
    const sell = trade("trade:addressless-sell", 3_000, [disposed(1, 15, ["price:sell"], addresslessUsdc)]);

    const result = outcomes([buy, sell]);

    expect(result.outcomes).toEqual([]);
    expect(result.lots).toEqual([]);
    expect(result.insufficient).toEqual(expect.arrayContaining([
      expect.objectContaining({ tradeEvidenceIds: ["trade:addressless-buy"], reason: "unavailable" }),
      expect.objectContaining({ tradeEvidenceIds: ["trade:addressless-sell"], reason: "unavailable" }),
    ]));
  });

  it("does not match same-symbol assets with blank addresses", () => {
    const blankAddressUsdc = { address: "", symbol: "USDC" };
    const buy = trade("trade:blank-address-buy", 2_000, [acquired(1, 10, ["price:buy"], blankAddressUsdc)]);
    const sell = trade("trade:blank-address-sell", 3_000, [disposed(1, 15, ["price:sell"], blankAddressUsdc)]);

    const result = outcomes([buy, sell]);

    expect(result.outcomes).toEqual([]);
    expect(result.lots).toEqual([]);
    expect(result.insufficient).toEqual(expect.arrayContaining([
      expect.objectContaining({ tradeEvidenceIds: ["trade:blank-address-buy"], reason: "unavailable" }),
      expect.objectContaining({ tradeEvidenceIds: ["trade:blank-address-sell"], reason: "unavailable" }),
    ]));
  });

  it("rejects an invalid derived retrieval timestamp", () => {
    const buy = trade("trade:buy", 2_000, [acquired(1, 10)]);

    expect(() => outcomes([buy], Number.NaN)).not.toThrow();
    expect(outcomes([buy], Number.NaN).lots).toEqual([]);
    expect(outcomes([buy], Number.NaN).insufficient).toEqual([
      expect.objectContaining({ reason: "unavailable", tradeEvidenceIds: ["trade:buy"] }),
    ]);
  });

  it("returns explicit insufficient evidence for an unpriced lot instead of calculating PnL", () => {
    const buy = trade("trade:unpriced-buy", 2_000, [acquired(1, null)]);
    const sell = trade("trade:sell", 3_000, [disposed(1, 15)]);

    const result = outcomes([buy, sell]);

    expect(result.outcomes).toEqual([]);
    expect(result.insufficient).toEqual([expect.objectContaining({
      reason: "unavailable",
      tradeEvidenceIds: ["trade:unpriced-buy", "trade:sell"],
      priceEvidenceIds: ["price:acquisition", "price:disposal"],
    })]);
    expect(result.excludedEvents).toContain("source:trade:unpriced-buy:price");
  });

  it("retains unclosed lots and exposes unknown classifications as excluded evidence", () => {
    const buy = trade("trade:open", 2_000, [acquired(1, 10)]);
    const unknown: TradeClassification = {
      id: "trade:unknown",
      walletAddress: "0xwallet",
      chain,
      classification: "unknown",
      reason: "unavailable",
      timestampMs: { status: "known", value: 2_500 },
      evidenceIds: ["event:unknown"],
      provenance: { provider: "derived", endpoint: "trade-classifier", retrievedAt: 2_500 },
    };

    const result = outcomes([unknown, buy]);

    expect(result.outcomes).toEqual([]);
    expect(result.lots).toEqual([expect.objectContaining({
      quantity: { status: "known", value: 1 },
      tradeEvidenceIds: ["trade:open"],
      priceEvidenceIds: ["price:acquisition"],
    })]);
    expect(result.insufficient).toEqual([expect.objectContaining({
      tradeEvidenceIds: ["trade:unknown"],
      priceEvidenceIds: [],
      excludedEvidenceIds: ["event:unknown"],
      reason: "unavailable",
    })]);
  });

  it("fails closed for malformed runtime input", () => {
    expect(() => outcomes([null, { classification: "classified" }] as never)).not.toThrow();
    expect(outcomes([null, { classification: "classified" }] as never).insufficient)
      .toHaveLength(2);
  });

  it("rejects malformed price-evidence IDs without throwing or deriving an outcome", () => {
    const validTrade = trade("trade:valid", 2_000, [acquired(1, 10)]);
    const malformedLegs = [
      { ...acquired(1, 10), priceEvidenceIds: undefined },
      { ...acquired(1, 10), priceEvidenceIds: "price:not-an-array" },
    ];
    const malformedTrades = malformedLegs.map((legs, index) => ({
      ...validTrade,
      id: `trade:malformed:${index}`,
      legs: [legs],
    }));

    expect(() => outcomes(malformedTrades as never)).not.toThrow();
    expect(outcomes(malformedTrades as never)).toMatchObject({
      lots: [],
      outcomes: [],
      insufficient: [
        expect.objectContaining({ reason: "unavailable", tradeEvidenceIds: ["trade:malformed:0"] }),
        expect.objectContaining({ reason: "unavailable", tradeEvidenceIds: ["trade:malformed:1"] }),
      ],
    });
  });
});
