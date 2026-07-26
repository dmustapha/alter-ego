import type { WalletData, Pattern, PatternResult } from "./types";

export function classifyPatterns(wallet: WalletData): PatternResult {
  const allPatterns: Pattern[] = [
    ...detectAmplifyPatterns(wallet),
    ...detectGuardPatterns(wallet),
  ];
  return {
    walletAddress: wallet.address,
    chain: wallet.chain,
    amplify: allPatterns.filter((p) => p.type === "AMPLIFY"),
    guard: allPatterns.filter((p) => p.type === "GUARD"),
  };
}

// ─── AMPLIFY Patterns ────────────────────────────────

function detectAmplifyPatterns(wallet: WalletData): Pattern[] {
  const patterns: Pattern[] = [];
  const s = wallet.signals;

  // AMP-01: Multi-Chain Operator
  if (s.uniqueChains >= 2) {
    patterns.push({
      id: "AMP-01",
      tag: "Multi-Chain Operator",
      type: "AMPLIFY",
      confidence: s.uniqueChains >= 3 ? "HIGH" : "MEDIUM",
      evidence: [],
      count: s.uniqueChains,
      insight: `active on ${s.uniqueChains} chains`,
    });
  }

  // AMP-02: Portfolio Diversifier
  if (s.tokensHeld >= 8 && s.topHoldingPct < 40) {
    patterns.push({
      id: "AMP-02",
      tag: "Portfolio Diversifier",
      type: "AMPLIFY",
      confidence: s.tokensHeld >= 15 ? "HIGH" : "MEDIUM",
      evidence: [],
      count: s.tokensHeld,
      insight: `${s.tokensHeld} tokens, top position ${Math.round(s.topHoldingPct)}%`,
    });
  }

  // AMP-03: Active Trader
  if (s.totalTxns >= 50 && s.daysSinceLastTx <= 14) {
    patterns.push({
      id: "AMP-03",
      tag: "Active Trader",
      type: "AMPLIFY",
      confidence: s.totalTxns >= 200 ? "HIGH" : "MEDIUM",
      evidence: [],
      count: s.totalTxns,
      insight: `${s.totalTxns} txns, last active ${Math.round(s.daysSinceLastTx)}d ago`,
    });
  }

  // AMP-04: Clean Operator
  if (s.tokensHeld >= 3 && s.riskTokenPct < 20) {
    patterns.push({
      id: "AMP-04",
      tag: "Clean Operator",
      type: "AMPLIFY",
      confidence: s.riskTokenPct === 0 ? "HIGH" : "MEDIUM",
      evidence: [],
      count: s.tokensHeld,
      insight: `${Math.round(s.riskTokenPct)}% risk-flagged tokens`,
    });
  }

  // AMP-05: Gas Optimizer
  if (s.avgGasGwei > 0 && s.avgGasGwei <= s.networkMedianGasGwei) {
    patterns.push({
      id: "AMP-05",
      tag: "Gas Optimizer",
      type: "AMPLIFY",
      confidence: "MEDIUM",
      evidence: [],
      count: 1,
      insight: `avg gas ${s.avgGasGwei.toFixed(2)} gwei, at or below median`,
    });
  }

  return patterns;
}

// ─── GUARD Patterns ──────────────────────────────────

function detectGuardPatterns(wallet: WalletData): Pattern[] {
  const patterns: Pattern[] = [];
  const s = wallet.signals;

  // GRD-01: Risk-Token Exposure
  if (s.riskTokenCount >= 3) {
    patterns.push({
      id: "GRD-01",
      tag: "Risk-Token Exposure",
      type: "GUARD",
      confidence: s.riskTokenCount >= 8 ? "HIGH" : "MEDIUM",
      evidence: [],
      count: s.riskTokenCount,
      insight: `${s.riskTokenCount} risk-flagged tokens held`,
    });
  }

  // GRD-02: Concentration Risk
  if (s.topHoldingPct > 60 && s.tokensHeld >= 2) {
    patterns.push({
      id: "GRD-02",
      tag: "Concentration Risk",
      type: "GUARD",
      confidence: s.topHoldingPct > 80 ? "HIGH" : "MEDIUM",
      evidence: [],
      count: 1,
      insight: `top position is ${Math.round(s.topHoldingPct)}% of holdings`,
    });
  }

  // GRD-03: Gas Guzzler - guard against divide-by-zero for solana (median = 0)
  if (s.networkMedianGasGwei > 0 && s.avgGasGwei > s.networkMedianGasGwei * 2) {
    patterns.push({
      id: "GRD-03",
      tag: "Gas Guzzler",
      type: "GUARD",
      confidence: s.avgGasGwei > s.networkMedianGasGwei * 3 ? "HIGH" : "MEDIUM",
      evidence: [],
      count: 1,
      insight: `avg gas ${s.avgGasGwei.toFixed(2)} gwei, ${(s.avgGasGwei / s.networkMedianGasGwei).toFixed(1)}x median`,
    });
  }

  // GRD-04: Dormant Wallet
  if (s.daysSinceLastTx > 90 && s.totalTxns > 0) {
    patterns.push({
      id: "GRD-04",
      tag: "Dormant Wallet",
      type: "GUARD",
      confidence: s.daysSinceLastTx > 365 ? "HIGH" : "MEDIUM",
      evidence: [],
      count: 1,
      insight: `no activity for ${Math.round(s.daysSinceLastTx)} days`,
    });
  }

  // GRD-05: Spam Magnet
  if (s.riskTokenPct > 50 && s.tokensHeld >= 4) {
    patterns.push({
      id: "GRD-05",
      tag: "Spam Magnet",
      type: "GUARD",
      confidence: s.riskTokenPct > 80 ? "HIGH" : "MEDIUM",
      evidence: [],
      count: s.riskTokenCount,
      insight: `${Math.round(s.riskTokenPct)}% of holdings are risk-flagged`,
    });
  }

  return patterns;
}
