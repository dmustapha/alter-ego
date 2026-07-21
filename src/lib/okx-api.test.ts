/**
 * Tests for buildWalletSignals and deriveTrades.
 * Uses offline fixtures -- no network calls.
 */

import { describe, it, expect } from "vitest";
import { buildWalletSignals, deriveTrades } from "./okx-api";

import ethTxnsRaw from "./__fixtures__/okx-txns-eth.json";
import ethBalancesRaw from "./__fixtures__/okx-balances-eth.json";
import xlayerTxnsRaw from "./__fixtures__/okx-txns-xlayer.json";
import txDetailRaw from "./__fixtures__/okx-txdetail-eth.json";

const ETH_TXNS = ethTxnsRaw.data[0].transactions;
const ETH_BALANCES = ethBalancesRaw.data[0].tokenAssets;
const XLAYER_TXNS = xlayerTxnsRaw.data[0].transactions;
const ETH_DETAIL = txDetailRaw.data[0];

// Fixed nowMs so daysSinceLastTx is deterministic
const NOW_MS = 1785000000000;
// max txTime in eth fixture = 1784554775000
const ETH_MAX_TX_TIME = 1784554775000;
const ETH_MIN_TX_TIME = 1784272487000;

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
    const expected = (NOW_MS - ETH_MAX_TX_TIME) / 86400000;
    expect(signals.daysSinceLastTx).toBeCloseTo(expected, 5);
  });

  it("activeSpanDays equals hand-computed value", () => {
    const expected = (ETH_MAX_TX_TIME - ETH_MIN_TX_TIME) / 86400000;
    expect(signals.activeSpanDays).toBeCloseTo(expected, 5);
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
