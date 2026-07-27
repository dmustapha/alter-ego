/**
 * Tests for buildWalletSignals and deriveTrades.
 * Uses offline fixtures -- no network calls.
 */

import { describe, it, expect, vi } from "vitest";
import { buildWalletSignals, deriveTrades } from "./okx-api";

import ethTxnsRaw from "./__fixtures__/okx-txns-eth.json";
import ethBalancesRaw from "./__fixtures__/okx-balances-eth.json";
import xlayerTxnsRaw from "./__fixtures__/okx-txns-xlayer.json";
import txDetailRaw from "./__fixtures__/okx-txdetail-eth.json";

const ETH_TXNS = ethTxnsRaw.data[0].transactions;
const ETH_BALANCES = ethBalancesRaw.data[0].tokenAssets;
const XLAYER_TXNS = xlayerTxnsRaw.data[0].transactions;
const ETH_DETAIL = txDetailRaw.data[0];

// Fixed nowMs so daysSinceLastTx is deterministic.
// eth fixture txTime range: max 1784554775000, min 1784272487000 (used in the literals below).
const NOW_MS = 1785000000000;

describe("buildWalletSignals -- eth fixture", () => {
  const signals = buildWalletSignals(ETH_TXNS, ETH_BALANCES, [ETH_DETAIL], "1", NOW_MS);

  it("totalTxns === 50", () => {
    expect(signals.totalTxns).toBe(50);
  });

  it("uniqueChains === 1", () => {
    expect(signals.uniqueChains).toBe(1);
  });

  it("tokensHeld === 40", () => {
    expect(signals.tokensHeld).toBe(40);
  });

  it("daysSinceLastTx equals hand-computed value", () => {
    // (1785000000000 - 1784554775000) / 86400000 = 5.15306712962963
    expect(signals.daysSinceLastTx).toBeCloseTo(5.15306712962963, 5);
  });

  it("activeSpanDays equals hand-computed value", () => {
    // (1784554775000 - 1784272487000) / 86400000 = 3.2672222222222222
    expect(signals.activeSpanDays).toBeCloseTo(3.2672222222222222, 5);
  });

  it("uniqueTokens is union of txn and balance contract addresses", () => {
    // 11 from txns + 39 from balances = 48 in union (no overlap in this fixture)
    expect(signals.uniqueTokens).toBe(48);
  });

  it("swapCount counts txns with non-native tokenContractAddress", () => {
    expect(signals.swapCount).toBe(20);
  });

  it("avgGasGwei is computed from details", () => {
    // gasPrice = 151673437 wei => 0.151673437 gwei
    expect(signals.avgGasGwei).toBeCloseTo(0.151673437, 5);
  });

  it("networkMedianGasGwei for chain 1 is 20", () => {
    expect(signals.networkMedianGasGwei).toBe(20);
  });
});

describe("buildWalletSignals -- xlayer fixture", () => {
  const signals = buildWalletSignals(XLAYER_TXNS, [], [], "196", NOW_MS);

  it("totalTxns === 13", () => {
    expect(signals.totalTxns).toBe(13);
  });

  it("uniqueChains === 1 (all 196)", () => {
    expect(signals.uniqueChains).toBe(1);
  });

  it("networkMedianGasGwei for chain 196 is 0.05", () => {
    expect(signals.networkMedianGasGwei).toBe(0.05);
  });
});

describe("buildWalletSignals -- empty inputs", () => {
  it("returns all-zero signals with no throw", () => {
    const signals = buildWalletSignals([], [], [], "1", NOW_MS);
    expect(signals.totalTxns).toBe(0);
    expect(signals.daysSinceLastTx).toBe(0);
    expect(signals.activeSpanDays).toBe(0);
    expect(signals.uniqueTokens).toBe(0);
    expect(signals.uniqueChains).toBe(0);
    expect(signals.swapCount).toBe(0);
    expect(signals.tokensHeld).toBe(0);
    expect(signals.riskTokenCount).toBe(0);
    expect(signals.riskTokenPct).toBe(0);
    expect(signals.topHoldingPct).toBe(0);
    expect(signals.avgGasGwei).toBe(0);
    // networkMedianGasGwei is a per-chain constant, not a per-wallet signal
    expect(signals.networkMedianGasGwei).toBe(20);
  });
});

describe("deriveTrades", () => {
  const WALLET = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";

  it("marks incoming tx (wallet in 'to') as BUY", () => {
    // First txn: from 0x5684..., to 0xd8da... => BUY
    const trades = deriveTrades([ETH_TXNS[0]], WALLET, "1");
    expect(trades[0].type).toBe("BUY");
  });

  it("marks outgoing tx (wallet in 'from') as SELL", () => {
    const outgoing = ETH_TXNS.find(
      (t: { from: Array<{ address: string }> }) => t.from[0].address === WALLET
    );
    expect(outgoing).toBeDefined();
    const trades = deriveTrades([outgoing!], WALLET, "1");
    expect(trades[0].type).toBe("SELL");
  });

  it("sets pnlUsd to 0 (deprecated Path B)", () => {
    const trades = deriveTrades([ETH_TXNS[0]], WALLET, "1");
    expect(trades[0].pnlUsd).toBe(0);
  });

  it("maps chain index 1 to 'ethereum'", () => {
    const trades = deriveTrades([ETH_TXNS[0]], WALLET, "1");
    expect(trades[0].chain).toBe("ethereum");
  });

  it("sets timestamp from txTime", () => {
    const trades = deriveTrades([ETH_TXNS[0]], WALLET, "1");
    expect(trades[0].timestamp).toBe(Number(ETH_TXNS[0].txTime));
  });
});

describe("getWalletTxnsPagedWith", () => {
  it("loops cursor until empty or maxPages", async () => {
    const pages = [
      { data: [{ cursor: "c1", transactions: Array(50).fill({ txHash: "0x1" }) }] },
      { data: [{ cursor: "",   transactions: Array(20).fill({ txHash: "0x2" }) }] },
    ];
    let i = 0;
    const caller = vi.fn(async () => pages[i++]);
    const { getWalletTxnsPagedWith } = await import("./okx-api");
    const txns = await getWalletTxnsPagedWith(caller, "0xabc", "1", 6);
    expect(txns.length).toBe(70);
    expect(caller).toHaveBeenCalledTimes(2);
  });
});

describe("okxPublicCall throttle", () => {
  it("serialises concurrent callers with at least MIN_INTERVAL_MS between calls", async () => {
    // Use a tiny interval so the test is fast but still measurable.
    const INTERVAL = 20;
    vi.stubEnv("OKX_MIN_INTERVAL_MS", String(INTERVAL));

    // Fresh module instance so _chain and _lastCallAt start clean.
    vi.resetModules();
    const { getWalletBalances } = await import("./okx-api");

    const okResponse = {
      data: [{ tokenAssets: [] }],
    };
    const callTimestamps: number[] = [];

    // Mock global fetch to record when each OKX HTTP call actually fires.
    const fetchMock = vi.fn(async () => {
      callTimestamps.push(Date.now());
      return {
        ok: true,
        text: async () => JSON.stringify(okResponse),
      } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    // Fire 3 concurrent callers -- they must all resolve but spaced apart.
    const N = 3;
    await Promise.all([
      getWalletBalances("0xaaa", "1"),
      getWalletBalances("0xbbb", "1"),
      getWalletBalances("0xccc", "1"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(N);
    expect(callTimestamps).toHaveLength(N);

    // Each consecutive call must be at least INTERVAL ms after the previous one.
    for (let i = 1; i < callTimestamps.length; i++) {
      const gap = callTimestamps[i] - callTimestamps[i - 1];
      expect(gap).toBeGreaterThanOrEqual(INTERVAL - 2); // 2ms tolerance for timer jitter
    }

    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  }, 10_000);
});
