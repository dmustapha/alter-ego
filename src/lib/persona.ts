import type { PatternResult, Pattern, Persona } from "./types";

const ARCHETYPES: Record<string, { archetype: string; emojiSignature: string }> = {
  "AMP-01": { archetype: "The Professional", emojiSignature: "📊🔒💼" },
  "AMP-02": { archetype: "The Disciplined", emojiSignature: "🎯🛡️📉" },
  "AMP-03": { archetype: "The Sniper", emojiSignature: "🔫🐋💎" },
  "AMP-04": { archetype: "The Early Bird", emojiSignature: "🐦🌅🚀" },
  "AMP-05": { archetype: "Diamond Hands", emojiSignature: "💎🙌🏆" },
  "AMP-06": { archetype: "The Compound", emojiSignature: "📈🔄💰" },
};

const VICES: Record<string, string> = {
  "GRD-01": "Cannot let go of a losing trade. Ever.",
  "GRD-02": "Sells at the first sign of red. Paper hands.",
  "GRD-03": "Pays more in gas than some traders make in profit.",
  "GRD-04": "Approves contracts like they're liking tweets.",
  "GRD-05": "Cannot resist a token under $100K liquidity.",
  "GRD-06": "Has a gift for buying the absolute top.",
};

function generateCatchphrase(dominantAmp: Pattern | null, dominantGrd: Pattern | null): string {
  if (dominantAmp?.id === "AMP-03" && dominantGrd?.id === "GRD-05") {
    return "I buy early, I hold through pain, I exit at the top. Usually.";
  }
  if (dominantAmp?.id === "AMP-01") {
    return "Slow and steady wins. Usually.";
  }
  if (dominantAmp?.id === "AMP-04") {
    return "First one in, hopefully not last one out.";
  }
  return "The market is my mirror. It's not always flattering.";
}

function generateSuperpower(dominantAmp: Pattern | null): string {
  if (!dominantAmp) return "Consistency — somehow still profitable despite everything.";
  return dominantAmp.tag;
}

function generateKryptonite(dominantGrd: Pattern | null): string {
  if (!dominantGrd) return "Overconfidence — thinks every trade is the one.";
  const costStr = dominantGrd.costUsd ? ` — $${dominantGrd.costUsd.toLocaleString()} in losses` : "";
  return `${dominantGrd.tag}${costStr}`;
}

function getTopPattern(patterns: Pattern[]): Pattern | null {
  if (patterns.length === 0) return null;
  // Sort by confidence then count
  const confidenceScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  return patterns.sort((a, b) => {
    const scoreDiff = (confidenceScore[b.confidence] || 0) - (confidenceScore[a.confidence] || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return b.count - a.count;
  })[0];
}

export function generatePersona(result: PatternResult, label: string, pnlTotal: number): Persona {
  const topAmp = getTopPattern(result.amplify);
  const topGrd = getTopPattern(result.guard);

  const archetypeKey = topAmp?.id || "AMP-01";
  const archetypeInfo = ARCHETYPES[archetypeKey] || ARCHETYPES["AMP-01"];

  return {
    walletLabel: label,
    archetype: archetypeInfo.archetype,
    catchphrase: generateCatchphrase(topAmp, topGrd),
    vice: topGrd ? (VICES[topGrd.id] || "Trading without a plan.") : "Overconfidence.",
    superpower: generateSuperpower(topAmp),
    kryptonite: generateKryptonite(topGrd),
    tradingStyle: `${result.amplify.length} strengths, ${result.guard.length} weaknesses`,
    emojiSignature: archetypeInfo.emojiSignature,
    pnlTotal,
    amplifyTags: result.amplify,
    guardTags: result.guard,
  };
}

export function generateCompareInsight(userWinRate: number, topWinRate: number): string {
  const gap = topWinRate - userWinRate;
  if (gap > 20) return "There's a chasm between you and the top. But every trade is a chance to narrow it.";
  if (gap > 10) return "You're closer to the top than you think. Small changes, big results.";
  return "You're trading at a professional level. Now defend that edge.";
}
