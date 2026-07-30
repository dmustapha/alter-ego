import { describe, it, expect } from "vitest";
import { computeBehavioralGrade } from "./grade";
import type { WalletSignals } from "./types";

describe("computeBehavioralGrade", () => {
  it("clean diversified wallet scores high", () => {
    const g = computeBehavioralGrade({
      totalTxns: 120,
      daysSinceLastTx: 2,
      activeSpanDays: 300,
      uniqueTokens: 20,
      uniqueChains: 3,
      swapCount: 60,
      tokensHeld: 20,
      riskTokenCount: 0,
      riskTokenPct: 0,
      topHoldingPct: 15,
      avgGasGwei: 15,
      networkMedianGasGwei: 20,
    } satisfies WalletSignals);
    expect(g.score).toBeGreaterThan(85);
    expect(["S", "A"]).toContain(g.letter);
  });

  it("risky concentrated wallet scores low", () => {
    const g = computeBehavioralGrade({
      totalTxns: 5,
      daysSinceLastTx: 200,
      activeSpanDays: 10,
      uniqueTokens: 2,
      uniqueChains: 1,
      swapCount: 1,
      tokensHeld: 3,
      riskTokenCount: 2,
      riskTokenPct: 66,
      topHoldingPct: 90,
      avgGasGwei: 80,
      networkMedianGasGwei: 20,
    } satisfies WalletSignals);
    expect(g.score).toBeLessThan(45);
    expect(["D", "F"]).toContain(g.letter);
  });
});
