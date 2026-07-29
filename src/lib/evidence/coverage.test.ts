import { describe, expect, it } from "vitest";
import { summarizeCoverage } from "./coverage";
import type { NormalizedTransactionEvent } from "./types";

const nowMs = 1_800_000_000_000;

function event(overrides: Partial<NormalizedTransactionEvent> = {}): NormalizedTransactionEvent {
  return {
    id: "event-1",
    walletAddress: "0xwallet",
    chain: { id: "1", name: "ethereum" },
    timestampMs: nowMs - 2 * 24 * 60 * 60 * 1000,
    asset: { address: "0xasset", symbol: "ASSET" },
    direction: { status: "known", value: "outflow" },
    amount: { status: "known", value: 4 },
    priceUsd: { status: "known", value: 10 },
    gasFeeNative: { status: "unknown", reason: "unavailable" },
    protocol: { status: "unknown", reason: "unavailable" },
    provenance: {
      provider: "okx-web3",
      endpoint: "transactions-by-address",
      chainIndex: "1",
      transactionHash: "0xhash",
      retrievedAt: nowMs,
      sourceIndex: 0,
    },
    ...overrides,
  };
}

describe("summarizeCoverage", () => {
  it("scores only observed direction, amount, and price fields for one wallet", () => {
    const result = summarizeCoverage([
      event(),
      event({
        id: "event-2",
        chain: { id: "196", name: "xlayer" },
        direction: { status: "unknown", reason: "missing" },
        amount: { status: "unknown", reason: "missing" },
        priceUsd: { status: "unknown", reason: "unavailable" },
      }),
    ], { nowMs });

    expect(result).toMatchObject({
      walletAddress: "0xwallet",
      chainIds: ["1", "196"],
      eventCount: 2,
      knownDirectionCount: 1,
      knownAmountCount: 1,
      knownPriceCount: 1,
      score: 0.5,
    });
  });

  it("reports collector coverage separately from transaction-field coverage", () => {
    const result = summarizeCoverage([event()], {
      nowMs,
      collectedKinds: ["balance-snapshot", "price-observation"],
    } as never);

    expect(result).toMatchObject({
      score: 1,
      transactionFieldCoverage: { score: 1, eventCount: 1 },
      collectorCoverage: {
        collectedKinds: ["balance-snapshot", "price-observation"],
        score: 2 / 6,
      },
    });
  });

  it("ignores unknown collector kinds instead of reporting them as coverage", () => {
    const result = summarizeCoverage([event()], {
      nowMs,
      collectedKinds: ["price-observation", "invented-collector"],
    } as never);

    expect(result.collectorCoverage).toEqual({
      collectedKinds: ["price-observation"],
      score: 1 / 6,
    });
  });

  it("reports recency from the newest timestamp and exposes missing recency", () => {
    const current = summarizeCoverage([event()], { nowMs });
    const recent = summarizeCoverage([event({ timestampMs: nowMs - 14 * 24 * 60 * 60 * 1000 })], { nowMs });
    const stale = summarizeCoverage([event({ timestampMs: nowMs - 31 * 24 * 60 * 60 * 1000 })], { nowMs });
    const unknown = summarizeCoverage([event({ timestampMs: null })], { nowMs });
    const future = summarizeCoverage([event({ timestampMs: nowMs + 1 })], { nowMs });

    expect(current).toMatchObject({ newestEventAt: nowMs - 2 * 24 * 60 * 60 * 1000, ageMs: 2 * 24 * 60 * 60 * 1000, recency: "current" });
    expect(recent.recency).toBe("recent");
    expect(stale.recency).toBe("stale");
    expect(unknown).toMatchObject({ newestEventAt: null, ageMs: null, recency: "unknown" });
    expect(future).toMatchObject({ newestEventAt: null, ageMs: null, recency: "unknown" });
  });
});
