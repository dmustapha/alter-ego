import { describe, expect, it } from "vitest";
import { normalizeBalanceSnapshots } from "./balances";

describe("normalizeBalanceSnapshots", () => {
  it("creates immutable cross-chain snapshots with exact balance-source provenance", () => {
    const balances = [
      {
        chainIndex: "1",
        tokenContractAddress: "0xusdc",
        symbol: "USDC",
        balance: "125.5",
        tokenPrice: "1",
        isRiskToken: false,
      },
      {
        chainIndex: "501",
        tokenContractAddress: "So11111111111111111111111111111111111111112",
        symbol: "SOL",
        balance: "3",
        tokenPrice: "150.25",
        isRiskToken: true,
      },
    ];
    const before = structuredClone(balances);

    const [ethereum, solana] = normalizeBalanceSnapshots([
      { walletAddress: "0xwallet", chainIndex: "1", balances: [balances[0]], retrievedAt: 1700000010000 },
      { walletAddress: "SoWalletMixedCase", chainIndex: "501", balances: [balances[1]], retrievedAt: 1700000010000 },
    ]);

    expect(balances).toEqual(before);
    expect(ethereum).toMatchObject({
      id: "okx-web3:balance:1:0xwallet:0xusdc:0:1700000010000",
      walletAddress: "0xwallet",
      chain: { id: "1", name: "ethereum" },
      asset: { address: "0xusdc", symbol: "USDC" },
      observedAt: 1700000010000,
      balance: { status: "known", value: 125.5 },
      quotedUsd: { status: "known", value: 125.5 },
      riskToken: { status: "known", value: false },
      evidenceIds: ["okx-web3:balance-row:1:0xwallet:0:1700000010000"],
      provenance: {
        provider: "okx-web3",
        endpoint: "balances-by-address",
        chainIndex: "1",
        retrievedAt: 1700000010000,
        sourceIndex: 0,
      },
    });
    expect(solana).toMatchObject({
      walletAddress: "SoWalletMixedCase",
      chain: { id: "501", name: "solana" },
      quotedUsd: { status: "known", value: 450.75 },
      riskToken: { status: "known", value: true },
    });
    expect(Object.isFrozen(ethereum)).toBe(true);
    expect(Object.isFrozen(ethereum.chain)).toBe(true);
    expect(Object.isFrozen(ethereum.asset)).toBe(true);
    expect(Object.isFrozen(ethereum.balance)).toBe(true);
    expect(Object.isFrozen(ethereum.evidenceIds)).toBe(true);
    expect(Object.isFrozen(ethereum.provenance)).toBe(true);
  });

  it("keeps malformed balances and blank prices explicitly unknown instead of zero", () => {
    const [malformed, blankPrice, malformedPrice, negativeBalance, negativePrice, missingRisk] = normalizeBalanceSnapshots([{
      walletAddress: "0xwallet",
      chainIndex: "196",
      retrievedAt: 1700000010000,
      balances: [
        { tokenContractAddress: "0xbad", balance: "NaN", tokenPrice: "1", isRiskToken: false },
        { tokenContractAddress: "0xunpriced", balance: "2", tokenPrice: "", isRiskToken: false },
        { tokenContractAddress: "0xbad-price", balance: "2", tokenPrice: "wat", isRiskToken: false },
        { tokenContractAddress: "0xnegative-balance", balance: "-2", tokenPrice: "1", isRiskToken: false },
        { tokenContractAddress: "0xnegative-price", balance: "2", tokenPrice: "-1", isRiskToken: false },
        { tokenContractAddress: "0xrisk", balance: "1", tokenPrice: "5" },
      ],
    }]);

    expect(malformed.balance).toEqual({ status: "unknown", reason: "unavailable" });
    expect(malformed.quotedUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(blankPrice.balance).toEqual({ status: "known", value: 2 });
    expect(blankPrice.quotedUsd).toEqual({ status: "unknown", reason: "missing" });
    expect(malformedPrice.balance).toEqual({ status: "known", value: 2 });
    expect(malformedPrice.quotedUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(negativeBalance.balance).toEqual({ status: "unknown", reason: "unavailable" });
    expect(negativeBalance.quotedUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(negativePrice.balance).toEqual({ status: "known", value: 2 });
    expect(negativePrice.quotedUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(missingRisk.riskToken).toEqual({ status: "unknown", reason: "missing" });
  });

  it("marks conflicting row-chain observations unavailable while retaining canonical source provenance", () => {
    const [snapshot] = normalizeBalanceSnapshots([{
      walletAddress: "0xwallet",
      chainIndex: "1",
      retrievedAt: 1700000010000,
      balances: [{ chainIndex: "501", tokenContractAddress: "0xasset", balance: "1", tokenPrice: "2", isRiskToken: false }],
    }]);

    expect(snapshot.chain).toEqual({ id: "1", name: "ethereum" });
    expect(snapshot.provenance.chainIndex).toBe("1");
    expect(snapshot.balance).toEqual({ status: "unknown", reason: "unavailable" });
    expect(snapshot.quotedUsd).toEqual({ status: "unknown", reason: "unavailable" });
    expect(snapshot.riskToken).toEqual({ status: "unknown", reason: "unavailable" });
  });

  it("keeps an overflowing USD quote explicitly unavailable", () => {
    const [snapshot] = normalizeBalanceSnapshots([{
      walletAddress: "0xwallet",
      chainIndex: "1",
      retrievedAt: 1700000010000,
      balances: [{ tokenContractAddress: "0xlarge", balance: "1e308", tokenPrice: "1e308", isRiskToken: false }],
    }]);

    expect(snapshot.balance).toEqual({ status: "known", value: 1e308 });
    expect(snapshot.quotedUsd).toEqual({ status: "unknown", reason: "unavailable" });
  });

  it("ignores malformed balance source arrays without throwing or fabricating snapshots", () => {
    const malformedSources = [
      { walletAddress: "0xwallet", chainIndex: "1", retrievedAt: 1_700_000_010_000, balances: null },
      { walletAddress: "0xwallet", chainIndex: "1", retrievedAt: 1_700_000_010_000, balances: [null] },
    ];

    expect(() => normalizeBalanceSnapshots(malformedSources as never)).not.toThrow();
    expect(normalizeBalanceSnapshots(malformedSources as never)).toEqual([]);
  });
});
