import type { Trade, WalletData, Pattern, PatternResult } from "./types";

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
  const trades = wallet.trades;
  const profitableSells = trades.filter((t) => t.type === "SELL" && t.pnlPct > 0);
  const losingSells = trades.filter((t) => t.type === "SELL" && t.pnlPct < 0);

  // AMP-01: Patient Accumulator — avg hold > 30 days, profitable
  const longHolds = trades.filter((t) => t.holdDurationDays > 30);
  if (longHolds.length >= 5) {
    const profitableLongHolds = longHolds.filter((t) => t.pnlUsd > 0);
    if (profitableLongHolds.length >= 3) {
      patterns.push({
        id: "AMP-01",
        tag: "Patient Accumulator",
        type: "AMPLIFY",
        confidence: longHolds.length >= 10 ? "HIGH" : "MEDIUM",
        evidence: profitableLongHolds.slice(0, 5),
        count: profitableLongHolds.length,
        insight: `avg hold: ${Math.round(longHolds.reduce((s, t) => s + t.holdDurationDays, 0) / longHolds.length)} days`,
      });
    }
  }

  // AMP-02: Disciplined Defender — stop-loss hit rate > 70%
  const stopLosses = trades.filter((t) => t.type === "SELL" && t.pnlPct < 0 && t.pnlPct > -15);
  if (losingSells.length > 0 && stopLosses.length / losingSells.length > 0.7) {
    patterns.push({
      id: "AMP-02",
      tag: "Disciplined Defender",
      type: "AMPLIFY",
      confidence: losingSells.length >= 10 ? "HIGH" : "MEDIUM",
      evidence: stopLosses.slice(0, 5),
      count: stopLosses.length,
      insight: `stop-loss hit rate: ${Math.round((stopLosses.length / losingSells.length) * 100)}%`,
    });
  }

  // AMP-03: Meme Sniper — tokens < 24h old, >50% win rate
  const memeEntries = trades.filter((t) => t.type === "BUY" && t.holdDurationDays < 1);
  if (memeEntries.length >= 5) {
    const memeWins = memeEntries.filter((t) => t.pnlUsd > 0);
    if (memeWins.length / memeEntries.length > 0.5) {
      patterns.push({
        id: "AMP-03",
        tag: "Meme Sniper",
        type: "AMPLIFY",
        confidence: memeEntries.length >= 10 ? "HIGH" : "MEDIUM",
        evidence: memeWins.slice(0, 5),
        count: memeWins.length,
        insight: `${Math.round((memeWins.length / memeEntries.length) * 100)}% win rate, avg entry ${Math.round(memeEntries.reduce((s, t) => s + t.holdDurationDays * 24, 0) / memeEntries.length)}h after launch`,
      });
    }
  }

  // AMP-04: Early Bird — entries within 3h, positive PnL
  const earlyEntries = trades.filter((t) => t.type === "BUY" && t.holdDurationDays * 24 < 3 && t.pnlUsd > 0);
  if (earlyEntries.length >= 3) {
    const totalEarlyPnl = earlyEntries.reduce((s, t) => s + t.pnlUsd, 0);
    patterns.push({
      id: "AMP-04",
      tag: "Early Bird",
      type: "AMPLIFY",
      confidence: earlyEntries.length >= 7 ? "HIGH" : "MEDIUM",
      evidence: earlyEntries.slice(0, 5),
      count: earlyEntries.length,
      insight: `tokens < 24h old: +$${totalEarlyPnl.toLocaleString()}`,
    });
  }

  // AMP-05: Diamond Hands — held through >50% drawdown, recovered to profit
  const diamondHands = trades.filter((t) => t.type === "SELL" && t.pnlUsd > 0 && t.holdDurationDays > 14);
  if (diamondHands.length >= 3) {
    patterns.push({
      id: "AMP-05",
      tag: "Diamond Hands",
      type: "AMPLIFY",
      confidence: diamondHands.length >= 5 ? "HIGH" : "MEDIUM",
      evidence: diamondHands.slice(0, 5),
      count: diamondHands.length,
      insight: `${diamondHands.length} trades held through pain, recovered to profit`,
    });
  }

  // AMP-06: Consistent Compound — ≥5 profitable trades, ≤20% max drawdown
  const profitable = trades.filter((t) => t.pnlUsd > 0);
  if (profitable.length >= 5) {
    const maxLoss = Math.min(...trades.filter((t) => t.pnlPct < 0).map((t) => t.pnlPct), 0);
    if (Math.abs(maxLoss) <= 20) {
      patterns.push({
        id: "AMP-06",
        tag: "Consistent Compound",
        type: "AMPLIFY",
        confidence: profitable.length >= 10 ? "HIGH" : "MEDIUM",
        evidence: profitable.slice(0, 5),
        count: profitable.length,
        insight: `${profitable.length} profitable trades, max drawdown ${Math.abs(maxLoss)}%`,
      });
    }
  }

  return patterns;
}

// ─── GUARD Patterns ──────────────────────────────────

function detectGuardPatterns(wallet: WalletData): Pattern[] {
  const patterns: Pattern[] = [];
  const trades = wallet.trades;

  // GRD-01: HODL Trap — ≥3 trades held past -40%, >7 day hold
  const hodlTraps = trades.filter((t) => t.type === "SELL" && t.pnlPct < -40 && t.holdDurationDays > 7);
  if (hodlTraps.length >= 3) {
    const totalCost = hodlTraps.reduce((s, t) => s + Math.abs(t.pnlUsd), 0);
    patterns.push({
      id: "GRD-01",
      tag: "HODL Trap",
      type: "GUARD",
      confidence: hodlTraps.length >= 5 ? "HIGH" : "MEDIUM",
      evidence: hodlTraps.slice(0, 5),
      count: hodlTraps.length,
      costUsd: totalCost,
      insight: `held ${hodlTraps.length} trades past -40%. Cost: $${totalCost.toLocaleString()}`,
    });
  }

  // GRD-02: Paper Hands — ≥5 panic sells within 2h of buying
  const panicSells = trades.filter((t) => t.type === "SELL" && t.holdDurationDays * 24 < 2 && t.pnlPct < 0);
  if (panicSells.length >= 5) {
    patterns.push({
      id: "GRD-02",
      tag: "Paper Trader",
      type: "GUARD",
      confidence: panicSells.length >= 8 ? "HIGH" : "MEDIUM",
      evidence: panicSells.slice(0, 5),
      count: panicSells.length,
      insight: `${panicSells.length} panic sells within 2 hours of buying`,
    });
  }

  // GRD-03: Gas Guzzler — avg gas >2x network median
  if (wallet.avgGasGwei > wallet.networkMedianGasGwei * 2) {
    patterns.push({
      id: "GRD-03",
      tag: "Gas Guzzler",
      type: "GUARD",
      confidence: wallet.avgGasGwei > wallet.networkMedianGasGwei * 3 ? "HIGH" : "MEDIUM",
      evidence: [],
      count: 1,
      insight: `${wallet.avgGasGwei.toFixed(1)}x avg gas fees`,
    });
  }

  // GRD-04: Blind Signer — >5 unverified contract approvals
  const unverifiedApprovals = wallet.approvals.filter((a) => a.riskLevel === "HIGH" || a.riskLevel === "CRITICAL" || !a.riskLevel);
  if (unverifiedApprovals.length > 5) {
    patterns.push({
      id: "GRD-04",
      tag: "Blind Signer",
      type: "GUARD",
      confidence: unverifiedApprovals.length > 10 ? "HIGH" : "MEDIUM",
      evidence: [],
      count: unverifiedApprovals.length,
      insight: `${unverifiedApprovals.length} unverified contract approvals`,
    });
  }

  // GRD-05: Rug Roulette — >40% micro-cap trades rugged or -90%+
  const microCapLosses = trades.filter((t) => t.type === "SELL" && t.pnlPct < -90);
  const microCapTotal = trades.filter((t) => t.amountUsd < 1000);
  if (microCapLosses.length / Math.max(microCapTotal.length, 1) > 0.4) {
    const totalRugged = microCapLosses.reduce((s, t) => s + Math.abs(t.pnlUsd), 0);
    patterns.push({
      id: "GRD-05",
      tag: "Rug Roulette",
      type: "GUARD",
      confidence: microCapLosses.length >= 5 ? "HIGH" : "MEDIUM",
      evidence: microCapLosses.slice(0, 5),
      count: microCapLosses.length,
      costUsd: totalRugged,
      insight: `${Math.round((microCapLosses.length / Math.max(microCapTotal.length, 1)) * 100)}% of micro-cap trades rugged, -$${totalRugged.toLocaleString()}`,
    });
  }

  // GRD-06: Top Buyer — ≥3 buys within 5% of ATH, then -20%+
  const topBuys = trades.filter((t) => {
    if (t.type !== "BUY") return false;
    const sellsOfToken = trades.filter((s) => s.type === "SELL" && s.token === t.token);
    return sellsOfToken.some((s) => s.pnlPct < -20);
  });
  if (topBuys.length >= 3) {
    patterns.push({
      id: "GRD-06",
      tag: "Top Buyer",
      type: "GUARD",
      confidence: topBuys.length >= 5 ? "HIGH" : "MEDIUM",
      evidence: topBuys.slice(0, 5),
      count: topBuys.length,
      insight: `${topBuys.length} buys near ATH, then -20%+`,
    });
  }

  return patterns;
}
