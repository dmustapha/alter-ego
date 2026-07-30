import { describe, expect, it } from "vitest";
import { buildWalletBehaviorProfile } from "./profiles";
import type { BalanceSnapshot, ClassifiedTrade, ExecutionCostRecord, RealizedOutcome, WalletCoverageSummary } from "./types";

const coverage: WalletCoverageSummary = {
  walletAddress: "0xwallet", chainIds: ["1"], eventCount: 2,
  knownDirectionCount: 2, knownAmountCount: 2, knownPriceCount: 2, score: 1,
  transactionFieldCoverage: { eventCount: 2, knownDirectionCount: 2, knownAmountCount: 2, knownPriceCount: 2, score: 1 },
  collectorCoverage: { collectedKinds: ["balance-snapshot"], score: 1 / 6 },
  newestEventAt: 1_700_000_000_000, ageMs: 0, recency: "current",
};

function balance(id: string, quotedUsd: number): BalanceSnapshot {
  return {
    id, walletAddress: "0xwallet", chain: { id: "1", name: "ethereum" }, asset: { address: id, symbol: id }, observedAt: 1_700_000_000_000,
    balance: { status: "known", value: quotedUsd }, quotedUsd: { status: "known", value: quotedUsd }, riskToken: { status: "known", value: false },
    evidenceIds: ["event:1"], provenance: { provider: "okx-web3", endpoint: "balances-by-address", chainIndex: "1", retrievedAt: 1_700_000_000_000 },
  };
}

function outcome(id: string, pnl: number): RealizedOutcome {
  return {
    id, walletAddress: "0xwallet", chain: { id: "1", name: "ethereum" }, asset: { address: "0xasset", symbol: "ASSET" },
    openedAt: { status: "known", value: 1_699_999_000_000 }, closedAt: { status: "known", value: 1_700_000_000_000 }, quantity: { status: "known", value: 1 }, realizedPnlUsd: { status: "known", value: pnl },
    evidenceIds: ["event:1"], tradeEvidenceIds: ["trade:1"], priceEvidenceIds: ["price:1"],
    provenance: { provider: "derived", endpoint: "fifo-outcome-builder", chainIndex: "1", retrievedAt: 1_700_000_000_000 },
  };
}

function cost(id: string, usd: number): ExecutionCostRecord {
  return {
    id, walletAddress: "0xwallet", chain: { id: "1", name: "ethereum" }, nativeAsset: { address: null, symbol: "ETH" }, eventId: "event:1",
    observedAt: { status: "known", value: 1_700_000_000_000 }, gasFeeNative: { status: "known", value: 0.01 }, gasFeeUsd: { status: "known", value: usd },
    priceEvidenceIds: ["price:gas"], evidenceIds: ["event:1"], provenance: { provider: "derived", endpoint: "execution-cost-normalizer", chainIndex: "1", retrievedAt: 1_700_000_000_000 },
  };
}

function trade(id: string): ClassifiedTrade {
  return {
    id, walletAddress: "0xwallet", chain: { id: "1", name: "ethereum" }, classification: "classified", timestampMs: { status: "known", value: 1_700_000_000_000 }, evidenceIds: ["event:1"],
    legs: [
      { asset: { address: "0xasset", symbol: "ASSET" }, direction: "acquired", quantity: { status: "known", value: 10 }, priceUsd: { status: "known", value: 1 }, priceEvidenceIds: ["price:1"] },
      { asset: { address: "0xasset", symbol: "ASSET" }, direction: "disposed", quantity: { status: "known", value: 5 }, priceUsd: { status: "known", value: 1 }, priceEvidenceIds: ["price:1"] },
    ], provenance: { provider: "okx-web3", endpoint: "transaction-detail", chainIndex: "1", retrievedAt: 1_700_000_000_000 },
  };
}

describe("buildWalletBehaviorProfile", () => {
  it("derives concentration from source-linked balances for one wallet", () => {
    const profile = buildWalletBehaviorProfile({ coverage, balances: [balance("0xa", 80), balance("0xb", 20)] });

    expect(profile.metrics).toContainEqual(expect.objectContaining({
      name: "concentration", value: { status: "known", value: 0.8 }, observationCount: 2,
    }));
    expect(Object.isFrozen(profile)).toBe(true);
  });

  it("marks concentration unknown instead of discarding a balance with an unavailable quote", () => {
    const incomplete = { ...balance("0xmissing", 20), quotedUsd: { status: "unknown" as const, reason: "unavailable" as const } };
    const profile = buildWalletBehaviorProfile({ coverage, balances: [balance("0xa", 80), balance("0xb", 20), incomplete] });

    expect(profile.metrics).toContainEqual(expect.objectContaining({ name: "concentration", value: { status: "unknown", reason: "unavailable" } }));
    expect(profile.limitations).toContain("concentration excluded incomplete balance evidence.");
  });

  it("derives risk exposure only from quoted balances with an explicit risk flag", () => {
    const risky = { ...balance("0xrisk", 25), riskToken: { status: "known" as const, value: true } };
    const profile = buildWalletBehaviorProfile({ coverage, balances: [risky, balance("0xsafe", 75)] });

    expect(profile.metrics).toContainEqual(expect.objectContaining({
      name: "risk-exposure", value: { status: "known", value: 0.25 }, observationCount: 2,
    }));
  });

  it("summarizes only known realized outcomes from the profiled wallet", () => {
    const profile = buildWalletBehaviorProfile({ coverage, outcomes: [outcome("outcome:1", 4), outcome("outcome:2", -1)] });

    expect(profile.metrics).toContainEqual(expect.objectContaining({
      name: "realized-outcome", value: { status: "known", value: 3 }, observationCount: 2,
    }));
  });

  it("sums source-linked USD execution costs without treating unavailable costs as zero", () => {
    const profile = buildWalletBehaviorProfile({ coverage, costs: [cost("cost:1", 1.5), cost("cost:2", 0.5)] });

    expect(profile.metrics).toContainEqual(expect.objectContaining({
      name: "execution-cost", value: { status: "known", value: 2 }, observationCount: 2,
    }));
  });

  it("derives turnover only from classified trade-leg quantities", () => {
    const profile = buildWalletBehaviorProfile({ coverage, trades: [trade("trade:1")] });

    expect(profile.metrics).toContainEqual(expect.objectContaining({
      name: "turnover", value: { status: "known", value: 0.5 }, observationCount: 2,
    }));
  });

  it("marks turnover unknown when any classified trade leg lacks quantity evidence", () => {
    const incomplete = { ...trade("trade:incomplete"), legs: [...trade("trade:incomplete").legs, { ...trade("trade:incomplete").legs[0], quantity: { status: "unknown" as const, reason: "unavailable" as const } }] };
    const profile = buildWalletBehaviorProfile({ coverage, trades: [trade("trade:complete"), incomplete] });

    expect(profile.metrics).toContainEqual(expect.objectContaining({ name: "turnover", value: { status: "unknown", reason: "unavailable" } }));
    expect(profile.limitations).toContain("turnover excluded incomplete trade evidence.");
  });

  it("derives holding horizon only from outcomes with explicit opening and closing times", () => {
    const profile = buildWalletBehaviorProfile({ coverage, outcomes: [outcome("outcome:horizon", 1)] });

    expect(profile.metrics).toContainEqual(expect.objectContaining({
      name: "holding-horizon", value: { status: "known", value: 1_000_000 }, observationCount: 1,
    }));
  });

  it("marks outcome metrics unknown when an outcome lacks linked price evidence", () => {
    const unlinked = { ...outcome("outcome:unlinked", 2), priceEvidenceIds: [] };
    const profile = buildWalletBehaviorProfile({ coverage, outcomes: [outcome("outcome:valid", 1), unlinked] });

    expect(profile.metrics).toContainEqual(expect.objectContaining({ name: "realized-outcome", value: { status: "unknown", reason: "unavailable" } }));
    expect(profile.metrics).toContainEqual(expect.objectContaining({ name: "holding-horizon", value: { status: "unknown", reason: "unavailable" } }));
    expect(profile.limitations).toContain("outcome metrics excluded incomplete outcome evidence.");
  });

  it("rejects evidence from another selected wallet instead of aggregating it", () => {
    const foreign = { ...balance("0xforeign", 10), walletAddress: "0xother" };

    expect(() => buildWalletBehaviorProfile({ coverage, balances: [balance("0xlocal", 10), foreign] })).toThrow("one wallet");
  });

  it("rejects balance evidence from a chain outside the profile scope", () => {
    const foreignChain = { ...balance("0xforeign-chain", 10), chain: { id: "196", name: "xlayer" } };

    expect(() => buildWalletBehaviorProfile({ coverage, balances: [balance("0xlocal", 10), foreignChain] })).toThrow("profile chains");
  });

  it("marks a metric unknown when its balance provenance is noncanonical", () => {
    const malformed = { ...balance("0xmalformed", 20), provenance: { ...balance("0xmalformed", 20).provenance, retrievedAt: 0 } };
    const profile = buildWalletBehaviorProfile({ coverage, balances: [balance("0xa", 80), balance("0xb", 20), malformed] });

    expect(profile.metrics).toContainEqual(expect.objectContaining({ name: "concentration", value: { status: "unknown", reason: "unavailable" } }));
    expect(profile.limitations).toContain("concentration excluded invalid balance provenance.");
  });

  it("calculates confidence from source coverage, recency, and sample size", () => {
    const staleCoverage = { ...coverage, recency: "stale" as const };
    const profile = buildWalletBehaviorProfile({ coverage: staleCoverage, balances: [balance("0xa", 80), balance("0xb", 20)] });
    const concentration = profile.metrics.find((metric) => metric.name === "concentration");

    expect(concentration).toMatchObject({ confidence: 0.25, sourceCoverage: 1 });
  });
});
