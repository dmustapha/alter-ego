import { describe, it, expect } from "vitest";
import { classifyPatterns } from "./classifier";
import type { WalletData, WalletSignals } from "./types";

const base = (signals: Partial<WalletSignals>): WalletData => ({
  address: "0x",
  chain: "ethereum",
  chainId: 1,
  totalTxns: 0,
  realizedPnl: 0,
  winRate: 0,
  trades: [],
  approvals: [],
  tokenScans: [],
  avgGasGwei: 0,
  networkMedianGasGwei: 20,
  signals: {
    totalTxns: 0,
    daysSinceLastTx: 0,
    activeSpanDays: 0,
    uniqueTokens: 0,
    uniqueChains: 0,
    swapCount: 0,
    tokensHeld: 0,
    riskTokenCount: 0,
    riskTokenPct: 0,
    topHoldingPct: 0,
    avgGasGwei: 0,
    networkMedianGasGwei: 20,
    ...signals,
  },
});

// ─── AMP-01: Multi-Chain Operator ──────────────────────────────

describe("AMP-01 Multi-Chain Operator", () => {
  it("fires at 2 chains", () => {
    const r = classifyPatterns(base({ uniqueChains: 2 }));
    expect(r.amplify.find((p) => p.id === "AMP-01")).toBeDefined();
  });

  it("does not fire at 1 chain", () => {
    const r = classifyPatterns(base({ uniqueChains: 1 }));
    expect(r.amplify.find((p) => p.id === "AMP-01")).toBeUndefined();
  });

  it("is HIGH confidence at 3+ chains", () => {
    const r = classifyPatterns(base({ uniqueChains: 3 }));
    expect(r.amplify.find((p) => p.id === "AMP-01")?.confidence).toBe("HIGH");
  });

  it("is MEDIUM confidence at exactly 2 chains", () => {
    const r = classifyPatterns(base({ uniqueChains: 2 }));
    expect(r.amplify.find((p) => p.id === "AMP-01")?.confidence).toBe("MEDIUM");
  });
});

// ─── AMP-02: Portfolio Diversifier ─────────────────────────────

describe("AMP-02 Portfolio Diversifier", () => {
  it("fires at 8+ tokens held and topHoldingPct < 40", () => {
    const r = classifyPatterns(base({ tokensHeld: 8, topHoldingPct: 39 }));
    expect(r.amplify.find((p) => p.id === "AMP-02")).toBeDefined();
  });

  it("does not fire at 7 tokens held", () => {
    const r = classifyPatterns(base({ tokensHeld: 7, topHoldingPct: 30 }));
    expect(r.amplify.find((p) => p.id === "AMP-02")).toBeUndefined();
  });

  it("does not fire when topHoldingPct >= 40 even with enough tokens", () => {
    const r = classifyPatterns(base({ tokensHeld: 10, topHoldingPct: 40 }));
    expect(r.amplify.find((p) => p.id === "AMP-02")).toBeUndefined();
  });

  it("is HIGH confidence at 15+ tokens", () => {
    const r = classifyPatterns(base({ tokensHeld: 15, topHoldingPct: 20 }));
    expect(r.amplify.find((p) => p.id === "AMP-02")?.confidence).toBe("HIGH");
  });
});

// ─── AMP-03: Active Trader ──────────────────────────────────────

describe("AMP-03 Active Trader", () => {
  it("fires at 50+ txns and last active within 14 days", () => {
    const r = classifyPatterns(base({ totalTxns: 50, daysSinceLastTx: 14 }));
    expect(r.amplify.find((p) => p.id === "AMP-03")).toBeDefined();
  });

  it("does not fire at 49 txns", () => {
    const r = classifyPatterns(base({ totalTxns: 49, daysSinceLastTx: 5 }));
    expect(r.amplify.find((p) => p.id === "AMP-03")).toBeUndefined();
  });

  it("does not fire when last active > 14 days ago", () => {
    const r = classifyPatterns(base({ totalTxns: 100, daysSinceLastTx: 15 }));
    expect(r.amplify.find((p) => p.id === "AMP-03")).toBeUndefined();
  });

  it("is HIGH confidence at 200+ txns", () => {
    const r = classifyPatterns(base({ totalTxns: 200, daysSinceLastTx: 3 }));
    expect(r.amplify.find((p) => p.id === "AMP-03")?.confidence).toBe("HIGH");
  });
});

// ─── AMP-04: Clean Operator ────────────────────────────────────

describe("AMP-04 Clean Operator", () => {
  it("fires at 3+ tokens held and riskTokenPct < 20", () => {
    const r = classifyPatterns(base({ tokensHeld: 3, riskTokenPct: 19 }));
    expect(r.amplify.find((p) => p.id === "AMP-04")).toBeDefined();
  });

  it("does not fire at 2 tokens held", () => {
    const r = classifyPatterns(base({ tokensHeld: 2, riskTokenPct: 0 }));
    expect(r.amplify.find((p) => p.id === "AMP-04")).toBeUndefined();
  });

  it("does not fire when riskTokenPct >= 20", () => {
    const r = classifyPatterns(base({ tokensHeld: 5, riskTokenPct: 20 }));
    expect(r.amplify.find((p) => p.id === "AMP-04")).toBeUndefined();
  });

  it("is HIGH confidence when riskTokenPct === 0", () => {
    const r = classifyPatterns(base({ tokensHeld: 5, riskTokenPct: 0 }));
    expect(r.amplify.find((p) => p.id === "AMP-04")?.confidence).toBe("HIGH");
  });
});

// ─── AMP-05: Gas Optimizer ─────────────────────────────────────

describe("AMP-05 Gas Optimizer", () => {
  it("fires when avgGasGwei > 0 and at or below median", () => {
    const r = classifyPatterns(base({ avgGasGwei: 15, networkMedianGasGwei: 20 }));
    expect(r.amplify.find((p) => p.id === "AMP-05")).toBeDefined();
  });

  it("fires when avgGasGwei equals median exactly", () => {
    const r = classifyPatterns(base({ avgGasGwei: 20, networkMedianGasGwei: 20 }));
    expect(r.amplify.find((p) => p.id === "AMP-05")).toBeDefined();
  });

  it("does not fire when avgGasGwei is 0", () => {
    const r = classifyPatterns(base({ avgGasGwei: 0, networkMedianGasGwei: 20 }));
    expect(r.amplify.find((p) => p.id === "AMP-05")).toBeUndefined();
  });

  it("does not fire when avgGasGwei exceeds median", () => {
    const r = classifyPatterns(base({ avgGasGwei: 25, networkMedianGasGwei: 20 }));
    expect(r.amplify.find((p) => p.id === "AMP-05")).toBeUndefined();
  });

  it("is always MEDIUM confidence", () => {
    const r = classifyPatterns(base({ avgGasGwei: 10, networkMedianGasGwei: 20 }));
    expect(r.amplify.find((p) => p.id === "AMP-05")?.confidence).toBe("MEDIUM");
  });
});

// ─── GRD-01: Risk-Token Exposure ───────────────────────────────

describe("GRD-01 Risk-Token Exposure", () => {
  it("fires at 3+ risk tokens", () => {
    const r = classifyPatterns(base({ riskTokenCount: 3 }));
    expect(r.guard.find((p) => p.id === "GRD-01")).toBeDefined();
  });

  it("does not fire at 2 risk tokens", () => {
    const r = classifyPatterns(base({ riskTokenCount: 2 }));
    expect(r.guard.find((p) => p.id === "GRD-01")).toBeUndefined();
  });

  it("is HIGH confidence at 8+ risk tokens", () => {
    const r = classifyPatterns(base({ riskTokenCount: 8 }));
    expect(r.guard.find((p) => p.id === "GRD-01")?.confidence).toBe("HIGH");
  });
});

// ─── GRD-02: Concentration Risk ────────────────────────────────

describe("GRD-02 Concentration Risk", () => {
  it("fires when topHoldingPct > 60 and tokensHeld >= 2", () => {
    const r = classifyPatterns(base({ topHoldingPct: 61, tokensHeld: 2 }));
    expect(r.guard.find((p) => p.id === "GRD-02")).toBeDefined();
  });

  it("does not fire when topHoldingPct is exactly 60", () => {
    const r = classifyPatterns(base({ topHoldingPct: 60, tokensHeld: 2 }));
    expect(r.guard.find((p) => p.id === "GRD-02")).toBeUndefined();
  });

  it("does not fire when tokensHeld < 2 even with high concentration", () => {
    const r = classifyPatterns(base({ topHoldingPct: 90, tokensHeld: 1 }));
    expect(r.guard.find((p) => p.id === "GRD-02")).toBeUndefined();
  });

  it("is HIGH confidence when topHoldingPct > 80", () => {
    const r = classifyPatterns(base({ topHoldingPct: 81, tokensHeld: 3 }));
    expect(r.guard.find((p) => p.id === "GRD-02")?.confidence).toBe("HIGH");
  });
});

// ─── GRD-03: Gas Guzzler ───────────────────────────────────────

describe("GRD-03 Gas Guzzler", () => {
  it("fires when avgGasGwei > 2x networkMedianGasGwei", () => {
    const r = classifyPatterns(base({ avgGasGwei: 41, networkMedianGasGwei: 20 }));
    expect(r.guard.find((p) => p.id === "GRD-03")).toBeDefined();
  });

  it("does not fire at exactly 2x median", () => {
    const r = classifyPatterns(base({ avgGasGwei: 40, networkMedianGasGwei: 20 }));
    expect(r.guard.find((p) => p.id === "GRD-03")).toBeUndefined();
  });

  it("does not fire or throw when networkMedianGasGwei is 0 (solana)", () => {
    expect(() => {
      const r = classifyPatterns(base({ avgGasGwei: 999, networkMedianGasGwei: 0 }));
      expect(r.guard.find((p) => p.id === "GRD-03")).toBeUndefined();
    }).not.toThrow();
  });

  it("is HIGH confidence when avgGasGwei > 3x median", () => {
    const r = classifyPatterns(base({ avgGasGwei: 61, networkMedianGasGwei: 20 }));
    expect(r.guard.find((p) => p.id === "GRD-03")?.confidence).toBe("HIGH");
  });
});

// ─── GRD-04: Dormant Wallet ────────────────────────────────────

describe("GRD-04 Dormant Wallet", () => {
  it("fires when inactive > 90 days with prior activity", () => {
    const r = classifyPatterns(base({ daysSinceLastTx: 91, totalTxns: 5 }));
    expect(r.guard.find((p) => p.id === "GRD-04")).toBeDefined();
  });

  it("does not fire at exactly 90 days", () => {
    const r = classifyPatterns(base({ daysSinceLastTx: 90, totalTxns: 5 }));
    expect(r.guard.find((p) => p.id === "GRD-04")).toBeUndefined();
  });

  it("does not fire when totalTxns is 0 (never used)", () => {
    const r = classifyPatterns(base({ daysSinceLastTx: 365, totalTxns: 0 }));
    expect(r.guard.find((p) => p.id === "GRD-04")).toBeUndefined();
  });

  it("is HIGH confidence when inactive > 365 days", () => {
    const r = classifyPatterns(base({ daysSinceLastTx: 366, totalTxns: 10 }));
    expect(r.guard.find((p) => p.id === "GRD-04")?.confidence).toBe("HIGH");
  });
});

// ─── GRD-05: Spam Magnet ───────────────────────────────────────

describe("GRD-05 Spam Magnet", () => {
  it("fires when riskTokenPct > 50 and tokensHeld >= 4", () => {
    const r = classifyPatterns(base({ riskTokenPct: 51, tokensHeld: 4, riskTokenCount: 3 }));
    expect(r.guard.find((p) => p.id === "GRD-05")).toBeDefined();
  });

  it("does not fire when riskTokenPct is exactly 50", () => {
    const r = classifyPatterns(base({ riskTokenPct: 50, tokensHeld: 4, riskTokenCount: 2 }));
    expect(r.guard.find((p) => p.id === "GRD-05")).toBeUndefined();
  });

  it("does not fire when tokensHeld < 4", () => {
    const r = classifyPatterns(base({ riskTokenPct: 80, tokensHeld: 3, riskTokenCount: 3 }));
    expect(r.guard.find((p) => p.id === "GRD-05")).toBeUndefined();
  });

  it("is HIGH confidence when riskTokenPct > 80", () => {
    const r = classifyPatterns(base({ riskTokenPct: 81, tokensHeld: 5, riskTokenCount: 5 }));
    expect(r.guard.find((p) => p.id === "GRD-05")?.confidence).toBe("HIGH");
  });
});

// ─── Mutual exclusion spot-checks ──────────────────────────────

describe("pattern mutual exclusions", () => {
  it("AMP-04 and GRD-05 cannot both fire (riskTokenPct cannot be <20 and >50)", () => {
    // riskTokenPct=10: AMP-04 can fire (if tokensHeld>=3), GRD-05 cannot (pct not > 50)
    const r = classifyPatterns(base({ tokensHeld: 5, riskTokenPct: 10, riskTokenCount: 1 }));
    expect(r.amplify.find((p) => p.id === "AMP-04")).toBeDefined();
    expect(r.guard.find((p) => p.id === "GRD-05")).toBeUndefined();
  });

  it("AMP-05 and GRD-03 cannot both fire for the same gas level", () => {
    // avgGasGwei at 1x median: AMP-05 fires, GRD-03 cannot (needs > 2x)
    const r = classifyPatterns(base({ avgGasGwei: 20, networkMedianGasGwei: 20 }));
    expect(r.amplify.find((p) => p.id === "AMP-05")).toBeDefined();
    expect(r.guard.find((p) => p.id === "GRD-03")).toBeUndefined();
  });
});
