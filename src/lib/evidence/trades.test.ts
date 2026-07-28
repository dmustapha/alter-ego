import { describe, expect, it } from "vitest";
import { normalizeTransactions } from "./normalize";
import { classifyTrades, type TradeSourceDetailAdapter } from "./trades";
import type { NormalizedTransactionEvent, RawTransactionRecord } from "./types";

function event(overrides: Partial<NormalizedTransactionEvent> = {}): NormalizedTransactionEvent {
  return {
    id: "okx-web3:1:0xevent:0",
    walletAddress: "0xwallet",
    chain: { id: "1", name: "ethereum" },
    timestampMs: 1700000000000,
    asset: { address: "0xasset", symbol: "ASSET" },
    direction: { status: "known", value: "inflow" },
    amount: { status: "known", value: 3 },
    priceUsd: { status: "unknown", reason: "unavailable" },
    gasFeeNative: { status: "known", value: 0.01 },
    protocol: { status: "known", value: "swap" },
    provenance: {
      provider: "okx-web3",
      endpoint: "transactions-by-address",
      chainIndex: "1",
      transactionHash: "0xevent",
      retrievedAt: 1700000001000,
      sourceIndex: 0,
    },
    ...overrides,
  };
}

describe("classifyTrades", () => {
  it("classifies only immutable explicit trade legs supplied by the source-detail adapter", () => {
    const sourceEvent = event();
    const before = structuredClone(sourceEvent);
    const adapter: TradeSourceDetailAdapter = (candidate) => candidate.id === sourceEvent.id
      ? {
        eventId: sourceEvent.id,
        evidenceIds: ["okx-web3:transaction-detail:1:0xevent"],
        legs: [
          {
            asset: { address: "0xusdc", symbol: "USDC" },
            direction: "disposed",
            quantity: { status: "known", value: 120 },
            priceUsd: { status: "known", value: 1 },
            priceEvidenceIds: ["price:usdc"],
          },
          {
            asset: { address: "0xasset", symbol: "ASSET" },
            direction: "acquired",
            quantity: { status: "known", value: 3 },
            priceUsd: { status: "known", value: 40 },
            priceEvidenceIds: ["price:asset"],
          },
        ],
        provenance: {
          provider: "okx-web3",
          endpoint: "transaction-detail",
          chainIndex: "1",
          retrievedAt: 1700000002000,
          sourceIndex: 0,
        },
      }
      : null;

    const [trade] = classifyTrades([sourceEvent], adapter, 1700000003000);

    expect(sourceEvent).toEqual(before);
    expect(trade).toMatchObject({
      id: "trade:okx-web3:1:0xevent:0",
      classification: "classified",
      walletAddress: "0xwallet",
      chain: { id: "1", name: "ethereum" },
      timestampMs: { status: "known", value: 1700000000000 },
      evidenceIds: ["okx-web3:1:0xevent:0", "okx-web3:transaction-detail:1:0xevent"],
      provenance: { endpoint: "transaction-detail", retrievedAt: 1700000002000 },
    });
    if (trade.classification === "classified") {
      expect(trade.legs).toHaveLength(2);
      expect(Object.isFrozen(trade.legs)).toBe(true);
      expect(Object.isFrozen(trade.legs[0])).toBe(true);
      expect(Object.isFrozen(trade.legs[0].asset)).toBe(true);
    }
    expect(Object.isFrozen(trade)).toBe(true);
    expect(Object.isFrozen(trade.evidenceIds)).toBe(true);
    expect(Object.isFrozen(trade.provenance)).toBe(true);
  });

  it("leaves directional transfers unknown without explicit trade-detail legs", () => {
    const inflow = event({ id: "event:inflow", direction: { status: "known", value: "inflow" } });
    const outflow = event({ id: "event:outflow", direction: { status: "known", value: "outflow" } });
    const selfTransfer = event({ id: "event:self", protocol: { status: "known", value: "swap" } });
    const ambiguous = event({ id: "event:ambiguous", direction: { status: "unknown", reason: "missing" } });

    const trades = classifyTrades([inflow, outflow, selfTransfer, ambiguous], () => null, 1700000003000);

    expect(trades).toEqual([
      expect.objectContaining({ classification: "unknown", reason: "unavailable", evidenceIds: ["event:inflow"] }),
      expect.objectContaining({ classification: "unknown", reason: "unavailable", evidenceIds: ["event:outflow"] }),
      expect.objectContaining({ classification: "unknown", reason: "unavailable", evidenceIds: ["event:self"] }),
      expect.objectContaining({ classification: "unknown", reason: "unavailable", evidenceIds: ["event:ambiguous"] }),
    ]);
  });

  it("does not treat a swap-router method ID as proof of a trade without explicit detail legs", () => {
    const routerCall: RawTransactionRecord = {
      txHash: "0xrouter-call",
      txTime: "1700000000000",
      from: [{ address: "0xwallet" }],
      to: [{ address: "0xrouter" }],
      amount: "1",
      methodId: "0x38ed1739",
    };
    const [event] = normalizeTransactions([{
      walletAddress: "0xwallet",
      chainIndex: "1",
      transactions: [routerCall],
      retrievedAt: 1700000001000,
    }]);

    const [trade] = classifyTrades([event], () => null, 1700000003000);

    expect(trade).toMatchObject({
      classification: "unknown",
      reason: "unavailable",
      evidenceIds: [event.id],
    });
  });

  it("fails closed for malformed source-detail adapter output", () => {
    const sourceEvent = event();
    const validLegs = [
      { asset: { address: "0xusdc", symbol: "USDC" }, direction: "disposed", quantity: { status: "known", value: 1 }, priceUsd: { status: "known", value: 1 }, priceEvidenceIds: ["price:usdc"] },
      { asset: { address: "0xasset", symbol: "ASSET" }, direction: "acquired", quantity: { status: "known", value: 1 }, priceUsd: { status: "known", value: 1 }, priceEvidenceIds: ["price:asset"] },
    ];
    const invalidDetails: unknown[] = [
      undefined,
      null,
      { eventId: sourceEvent.id, evidenceIds: ["detail:1"], legs: null, provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: 1 } },
      { eventId: sourceEvent.id, evidenceIds: [], legs: validLegs, provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: 1 } },
      { eventId: sourceEvent.id, evidenceIds: [""], legs: validLegs, provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: 1 } },
      { eventId: sourceEvent.id, evidenceIds: ["detail:1"], legs: validLegs, provenance: { provider: "bogus", endpoint: "transaction-detail", retrievedAt: 1 } },
      { eventId: sourceEvent.id, evidenceIds: ["detail:1"], legs: validLegs, provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: -1 } },
      { eventId: sourceEvent.id, evidenceIds: ["detail:1"], legs: [{ ...validLegs[0], asset: { address: "", symbol: "" } }, validLegs[1]], provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: 1 } },
      { eventId: sourceEvent.id, evidenceIds: ["detail:1"], legs: [{ ...validLegs[0], direction: "sent" }, validLegs[1]], provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: 1 } },
      { eventId: sourceEvent.id, evidenceIds: ["detail:1"], legs: [{ ...validLegs[0], quantity: { status: "known", value: Number.NaN } }, validLegs[1]], provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: 1 } },
      { eventId: sourceEvent.id, evidenceIds: ["detail:1"], legs: [{ ...validLegs[0], quantity: { status: "known", value: -1 } }, validLegs[1]], provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: 1 } },
      { eventId: sourceEvent.id, evidenceIds: ["detail:1"], legs: [{ ...validLegs[0], priceUsd: { status: "known", value: Infinity } }, validLegs[1]], provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: 1 } },
      { eventId: sourceEvent.id, evidenceIds: ["detail:1"], legs: [{ ...validLegs[0], quantity: { status: "unknown", reason: "guessed" } }, validLegs[1]], provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: 1 } },
    ];

    for (const detail of invalidDetails) {
      const adapter = () => detail as ReturnType<TradeSourceDetailAdapter>;
      expect(() => classifyTrades([sourceEvent], adapter, 1700000003000)).not.toThrow();
      const [trade] = classifyTrades([sourceEvent], adapter, 1700000003000);
      expect(trade).toMatchObject({ classification: "unknown", reason: "unavailable" });
      expect(Object.isFrozen(trade)).toBe(true);
      expect(Object.isFrozen(trade.evidenceIds)).toBe(true);
      expect(Object.isFrozen(trade.provenance)).toBe(true);
    }
  });

  it("requires explicit price evidence for a known source-supplied trade-leg price", () => {
    const sourceEvent = event();
    const [trade] = classifyTrades([sourceEvent], () => ({
      eventId: sourceEvent.id,
      evidenceIds: ["detail:1"],
      legs: [
        { asset: { address: "0xusdc", symbol: "USDC" }, direction: "disposed", quantity: { status: "known", value: 1 }, priceUsd: { status: "known", value: 1 }, priceEvidenceIds: [] },
        { asset: { address: "0xasset", symbol: "ASSET" }, direction: "acquired", quantity: { status: "known", value: 1 }, priceUsd: { status: "known", value: 1 }, priceEvidenceIds: ["price:asset"] },
      ],
      provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: 1 },
    }), 2);

    expect(trade).toMatchObject({ classification: "unknown", reason: "unavailable" });
  });

  it("preserves mixed-case Solana addresses when matching source-detail evidence", () => {
    const solanaEvent = event({
      id: "okx-web3:501:5oLAnAHash:0",
      walletAddress: "SoLaNaWaLLeTMixedCase",
      chain: { id: "501", name: "solana" },
      asset: { address: "So11111111111111111111111111111111111111112", symbol: "SOL" },
    });
    const detailEventId = "okx-web3:501:5oLAnAHash:0";
    const [trade] = classifyTrades([solanaEvent], (candidate) => candidate.id === detailEventId
      ? {
        eventId: detailEventId,
        evidenceIds: ["detail:SoLaNaWaLLeTMixedCase"],
        legs: [
          { asset: { address: "So11111111111111111111111111111111111111112", symbol: "SOL" }, direction: "acquired", quantity: { status: "known", value: 1 }, priceUsd: { status: "unknown", reason: "unavailable" }, priceEvidenceIds: [] },
          { asset: { address: "USDCMintMixedCase", symbol: "USDC" }, direction: "disposed", quantity: { status: "known", value: 150 }, priceUsd: { status: "known", value: 1 }, priceEvidenceIds: ["price:usdc"] },
        ],
        provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: 1700000002000 },
      }
      : null);

    expect(trade).toMatchObject({
      classification: "classified",
      walletAddress: "SoLaNaWaLLeTMixedCase",
      chain: { id: "501", name: "solana" },
      evidenceIds: ["okx-web3:501:5oLAnAHash:0", "detail:SoLaNaWaLLeTMixedCase"],
    });
    if (trade.classification === "classified") {
      expect(trade.legs[0].asset.address).toBe("So11111111111111111111111111111111111111112");
    }
  });
});
