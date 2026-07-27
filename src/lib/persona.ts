import type { PatternResult, Pattern, Persona, BehavioralGrade } from "./types";
import type { PnlResult } from "./pnl";

const ARCHETYPES: Record<string, { archetype: string; emojiSignature: string }> = {
  "AMP-01": { archetype: "The Nomad", emojiSignature: "🌐🔗⛓️" },
  "AMP-02": { archetype: "The Allocator", emojiSignature: "📊🧺💼" },
  "AMP-03": { archetype: "The Operator", emojiSignature: "⚡📈🔁" },
  "AMP-04": { archetype: "The Minimalist", emojiSignature: "🧹✨🛡️" },
  "AMP-05": { archetype: "The Efficient", emojiSignature: "⛽🎯💨" },
};

const VICES: Record<string, string> = {
  "GRD-01": "Holds tokens flagged risky like they're blue chips.",
  "GRD-02": "All the eggs, one basket, no hedge.",
  "GRD-03": "Pays more in gas than some traders make in profit.",
  "GRD-04": "Went quiet. The chain still remembers.",
  "GRD-05": "A magnet for airdrop spam and honeypots.",
};

function generateCatchphrase(dominantAmp: Pattern | null, dominantGrd: Pattern | null): string {
  if (dominantAmp?.id === "AMP-01") {
    return "The chain is wherever I need it to be.";
  }
  if (dominantAmp?.id === "AMP-02") {
    return "No single bet owns me. The portfolio does.";
  }
  if (dominantAmp?.id === "AMP-03" && dominantGrd?.id === "GRD-05") {
    return "Moving fast, but the spam found me anyway.";
  }
  if (dominantAmp?.id === "AMP-03") {
    return "High volume, low noise. That's the goal.";
  }
  if (dominantAmp?.id === "AMP-04") {
    return "If it looks risky, it probably is. I skip it.";
  }
  if (dominantAmp?.id === "AMP-05") {
    return "Patient on gas, precise on timing.";
  }
  return "The market is my mirror. It's not always flattering.";
}

function getTopPattern(patterns: Pattern[]): Pattern | null {
  if (patterns.length === 0) return null;
  const confidenceScore: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  return [...patterns].sort((a, b) => {
    const scoreDiff = (confidenceScore[b.confidence] ?? 0) - (confidenceScore[a.confidence] ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return b.count - a.count;
  })[0];
}

const ZERO_GRADE: BehavioralGrade = { score: 0, letter: "F", components: {} };

export function generatePersona(
  result: PatternResult,
  label: string,
  grade: BehavioralGrade,
  pnl: Pick<PnlResult, "realizedPnl" | "winRate">
): Persona {
  const topAmp = getTopPattern(result.amplify);
  const topGrd = getTopPattern(result.guard);

  const archetypeKey = topAmp?.id ?? "AMP-01";
  const archetypeInfo = ARCHETYPES[archetypeKey] ?? ARCHETYPES["AMP-01"];

  return {
    walletLabel: label,
    archetype: archetypeInfo.archetype,
    catchphrase: generateCatchphrase(topAmp, topGrd),
    vice: topGrd ? (VICES[topGrd.id] ?? "Trading without a plan.") : "Overconfidence.",
    superpower: topAmp?.tag ?? "Consistency",
    kryptonite: topGrd ? topGrd.tag : "Overconfidence",
    tradingStyle: `${result.amplify.length} strengths, ${result.guard.length} weaknesses`,
    emojiSignature: archetypeInfo.emojiSignature,
    pnlTotal: pnl.realizedPnl ?? 0,
    realizedPnl: pnl.realizedPnl,
    winRate: pnl.winRate,
    grade,
    amplifyTags: result.amplify,
    guardTags: result.guard,
  };
}

export { ZERO_GRADE };

export function generateCompareInsight(userWinRate: number, topWinRate: number): string {
  const gap = topWinRate - userWinRate;
  if (gap > 20) return "There's a chasm between you and the top. But every trade is a chance to narrow it.";
  if (gap > 10) return "You're closer to the top than you think. Small changes, big results.";
  return "You're trading at a professional level. Now defend that edge.";
}
