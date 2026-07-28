import { describe, expect, it } from "vitest";
import { normalizeTransactions } from "./normalize";

describe("normalizeTransactions", () => {
  it("creates immutable, chain-specific evidence without changing source records", () => {
    const wallet = "0xwallet";
    const transactions = [
      {
        txHash: "0xeth",
        txTime: "1700000000000",
        from: [{ address: wallet, amount: "2.5" }],
        to: [{ address: "0xrecipient", amount: "2.5" }],
        amount: "2.5",
        symbol: "ETH",
        tokenContractAddress: "0xasset",
        txFee: "0.01",
      },
      {
        txHash: "solhash",
        txTime: "1700000001000",
        from: [{ address: "Source111", amount: "3" }],
        to: [{ address: wallet, amount: "3" }],
        amount: "3",
        symbol: "SOL",
      },
    ];
    const before = structuredClone(transactions);

    const [ethereum, solana] = normalizeTransactions([
      { walletAddress: wallet, chainIndex: "1", transactions: [transactions[0]], retrievedAt: 1700000010000 },
      { walletAddress: wallet, chainIndex: "501", transactions: [transactions[1]], retrievedAt: 1700000010000 },
    ]);

    expect(transactions).toEqual(before);
    expect(ethereum).toMatchObject({
      id: "okx-web3:1:0xeth:0",
      chain: { id: "1", name: "ethereum" },
      timestampMs: 1700000000000,
      direction: { status: "known", value: "outflow" },
      amount: { status: "known", value: 2.5 },
      asset: { address: "0xasset", symbol: "ETH" },
      provenance: {
        provider: "okx-web3",
        endpoint: "transactions-by-address",
        chainIndex: "1",
        transactionHash: "0xeth",
        sourceIndex: 0,
      },
    });
    expect(solana).toMatchObject({
      chain: { id: "501", name: "solana" },
      direction: { status: "known", value: "inflow" },
      provenance: { transactionHash: "solhash" },
    });
    expect(Object.isFrozen(ethereum)).toBe(true);
    expect(Object.isFrozen(ethereum.provenance)).toBe(true);
  });

  it("keeps missing observations explicitly unknown instead of fabricating zeroes", () => {
    const [event] = normalizeTransactions([{
      walletAddress: "0xwallet",
      chainIndex: "196",
      retrievedAt: 1700000010000,
      transactions: [{ txHash: "0xmissing", txTime: "", from: [], to: [], amount: "", symbol: "" }],
    }]);

    expect(event.direction).toEqual({ status: "unknown", reason: "missing" });
    expect(event.amount).toEqual({ status: "unknown", reason: "missing" });
    expect(event.priceUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(event.gasFeeNative).toEqual({ status: "unknown", reason: "missing" });
    expect(event.protocol).toEqual({ status: "unknown", reason: "unavailable" });
    expect(event.timestampMs).toBeNull();
  });

  it.each([
    ["seconds", "1700000000", "unavailable"],
    ["negative", "-1700000000000", "unavailable"],
    ["future", "1700000010001", "unavailable"],
  ])("rejects %s transaction timestamps instead of normalizing them as milliseconds", (_label, txTime, reason) => {
    const [event] = normalizeTransactions([{
      walletAddress: "0xwallet",
      chainIndex: "1",
      retrievedAt: 1_700_000_010_000,
      transactions: [{ txHash: "0xtime", txTime }],
    }]);

    expect(event.timestampMs).toBeNull();
    expect(event.provenance.rawTimestamp).toBe(txTime);
    expect(event.provenance.timestampReason).toBe(reason);
  });

  it.each([
    ["exponent", "1e-18"],
    ["unsafe integer", "9007199254740993"],
    ["over-precise decimal", "0.1234567890123456"],
  ])("fails closed for %s numeric input while preserving its raw value", (_label, amount) => {
    const [event] = normalizeTransactions([{
      walletAddress: "0xwallet",
      chainIndex: "1",
      retrievedAt: 1_700_000_010_000,
      transactions: [{ txHash: "0xamount", txTime: "1700000000000", amount }],
    }]);

    expect(event.amount).toEqual({ status: "unknown", reason: "unavailable", raw: amount });
  });

  it("rejects an event when its source retrieval time is in the future", () => {
    const [event] = normalizeTransactions([{
      walletAddress: "0xwallet",
      chainIndex: "1",
      retrievedAt: Date.now() + 60_000,
      transactions: [{ txHash: "0xfuture-source", txTime: "1700000000000" }],
    }]);

    expect(event.timestampMs).toBeNull();
    expect(event.provenance.timestampReason).toBe("unavailable");
  });

  it("rejects silently rounded fractional amounts and fees while retaining their source strings", () => {
    const [event] = normalizeTransactions([{
      walletAddress: "0xwallet",
      chainIndex: "1",
      retrievedAt: 1_700_000_010_000,
      transactions: [{
        txHash: "0xprecision",
        txTime: "1700000000000",
        amount: "0.10000000000000001",
        txFee: "0.000003288128440723",
      }],
    }]);

    expect(event.amount).toEqual({ status: "unknown", reason: "unavailable", raw: "0.10000000000000001" });
    expect(event.gasFeeNative).toEqual({ status: "unknown", reason: "unavailable", raw: "0.000003288128440723" });
  });
});
