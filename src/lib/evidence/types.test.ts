import { describe, expect, it } from "vitest";
import { COLLECTOR_KINDS } from "./types";
import type {
  BalanceSnapshot,
  EvidenceValue,
  ExecutionCostRecord,
  PositionLot,
  PriceObservation,
  RealizedOutcome,
  TradeClassification,
} from "./types";

if (false) {
  const snapshot = null as unknown as BalanceSnapshot;

  // @ts-expect-error Collector records are immutable.
  snapshot.walletAddress = "0xother-wallet";

  // @ts-expect-error Unknown values only accept the declared reason union.
  const invalidUnknown: EvidenceValue<number> = { status: "unknown", reason: "guessed" };

  // @ts-expect-error Unknown classifications must include an explicit reason.
  const invalidTrade: TradeClassification = {
    id: "trade:unknown:0xevent",
    walletAddress: "0xwallet",
    chain: { id: "1", name: "ethereum" },
    classification: "unknown",
    timestampMs: { status: "known", value: 1700000000000 },
    evidenceIds: ["event:0xevent"],
    provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: 1700000001000 },
  };

  void invalidUnknown;
  void invalidTrade;
}

describe("collector evidence contracts", () => {
  it("models immutable, provenance-linked observations with explicit unknowns", () => {
    const balance: BalanceSnapshot = {
      id: "balance:1:0xwallet:0xasset:1700000000000",
      walletAddress: "0xwallet",
      chain: { id: "1", name: "ethereum" },
      asset: { address: "0xasset", symbol: "USDC" },
      observedAt: 1700000000000,
      balance: { status: "known", value: 125.5 },
      quotedUsd: { status: "unknown", reason: "unavailable" },
      riskToken: { status: "known", value: false },
      evidenceIds: ["event:balance-row:0"],
      provenance: {
        provider: "okx-web3",
        endpoint: "balances-by-address",
        chainIndex: "1",
        retrievedAt: 1700000001000,
        sourceIndex: 0,
      },
    };
    const price: PriceObservation = {
      id: "price:1:0xasset:1700000000000",
      walletAddress: "0xwallet",
      chain: { id: "1", name: "ethereum" },
      asset: { address: "0xasset", symbol: "USDC" },
      requestedAt: 1700000000000,
      returnedAt: { status: "unknown", reason: "unavailable" },
      priceUsd: { status: "unknown", reason: "unavailable" },
      confidence: { status: "unknown", reason: "unavailable" },
      evidenceIds: [balance.id],
      provenance: {
        provider: "defillama",
        endpoint: "historical-prices",
        requestedAt: 1700000000000,
        retrievedAt: 1700000001000,
      },
    };
    const trade: TradeClassification = {
      id: "trade:unknown:0xevent",
      walletAddress: "0xwallet",
      chain: { id: "1", name: "ethereum" },
      classification: "unknown",
      reason: "unavailable",
      timestampMs: { status: "known", value: 1700000000000 },
      evidenceIds: ["event:0xevent"],
      provenance: { provider: "okx-web3", endpoint: "transaction-detail", retrievedAt: 1700000001000 },
    };
    const lot: PositionLot = {
      id: "lot:0xwallet:1:0xasset:0",
      walletAddress: "0xwallet",
      chain: { id: "1", name: "ethereum" },
      asset: { address: "0xasset", symbol: "USDC" },
      openedAt: { status: "unknown", reason: "not-applicable" },
      quantity: { status: "unknown", reason: "unavailable" },
      costBasisUsd: { status: "unknown", reason: "unavailable" },
      evidenceIds: [trade.id, price.id],
      tradeEvidenceIds: [trade.id],
      priceEvidenceIds: [price.id],
      provenance: { provider: "derived", endpoint: "fifo-lot-builder", retrievedAt: 1700000001000 },
    };
    const outcome: RealizedOutcome = {
      id: "outcome:0xwallet:1:0xasset:0",
      walletAddress: "0xwallet",
      chain: { id: "1", name: "ethereum" },
      asset: { address: "0xasset", symbol: "USDC" },
      closedAt: { status: "unknown", reason: "missing" },
      quantity: { status: "unknown", reason: "unavailable" },
      realizedPnlUsd: { status: "unknown", reason: "unavailable" },
      evidenceIds: [trade.id, price.id],
      tradeEvidenceIds: [trade.id],
      priceEvidenceIds: [price.id],
      provenance: { provider: "derived", endpoint: "fifo-outcome-builder", retrievedAt: 1700000001000 },
    };
    const cost: ExecutionCostRecord = {
      id: "cost:1:0xevent",
      walletAddress: "0xwallet",
      chain: { id: "1", name: "ethereum" },
      eventId: "event:0xevent",
      observedAt: { status: "known", value: 1700000000000 },
      gasFeeNative: { status: "unknown", reason: "missing" },
      gasFeeUsd: { status: "unknown", reason: "unavailable" },
      priceEvidenceIds: [],
      evidenceIds: ["event:0xevent"],
      provenance: { provider: "derived", endpoint: "execution-cost-normalizer", retrievedAt: 1700000001000 },
    };

    expect({ balance, price, trade, lot, outcome, cost }).toMatchObject({
      balance: { quotedUsd: { status: "unknown", reason: "unavailable" } },
      trade: { classification: "unknown" },
      cost: { gasFeeNative: { status: "unknown", reason: "missing" } },
    });
  });

  it("exports an immutable list of supported evidence collector kinds", () => {
    expect(COLLECTOR_KINDS).toEqual([
      "balance-snapshot",
      "price-observation",
      "trade-classification",
      "position-lot",
      "realized-outcome",
      "execution-cost",
    ]);
    expect(Object.isFrozen(COLLECTOR_KINDS)).toBe(true);
  });
});
