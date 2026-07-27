// src/lib/roast.ts
// Roast-battle generator: builds grounded facts, deterministic template, and
// LLM-powered roast with a numeric guard that forbids any fabricated number.

import type { Persona, PatternResult, WalletSignals, Pattern, RoastLine } from "./types";
import { llmAvailable, llmChat } from "./llm";

// ─── RoastFacts ──────────────────────────────────────────────────────────────

export interface SideFacts {
  label: string;        // "ETHEREUM SELF" | "SOLANA SELF"
  archetype: string;
  superpower: string;
  kryptonite: string;
}

export interface RoastFacts {
  eth: SideFacts;
  sol: SideFacts;
  /** Flat list of all patterns from both sides (for insight/tag lookups). */
  patterns: Pattern[];
  /**
   * Whitelist of every real numeric value that may be cited.
   * Values are stored as-rounded (Math.round) to match what classifiers emit.
   */
  numbers: Set<number>;
}

// ─── buildRoastFacts ─────────────────────────────────────────────────────────

export function buildRoastFacts(
  personaEth: Persona,
  personaSol: Persona,
  patternsEth: PatternResult,
  patternsSol: PatternResult,
  signalsEth: WalletSignals,
  signalsSol: WalletSignals,
): RoastFacts {
  const allPatterns = [
    ...patternsEth.amplify,
    ...patternsEth.guard,
    ...patternsSol.amplify,
    ...patternsSol.guard,
  ];

  const numbers = new Set<number>();

  function addSignals(s: WalletSignals): void {
    const raw = [
      s.totalTxns,
      s.daysSinceLastTx,
      s.activeSpanDays,
      s.uniqueTokens,
      s.uniqueChains,
      s.swapCount,
      s.tokensHeld,
      s.riskTokenCount,
      s.riskTokenPct,
      s.topHoldingPct,
      s.avgGasGwei,
      s.networkMedianGasGwei,
    ];
    for (const v of raw) {
      // include zero too -- but round to avoid float drift
      numbers.add(v); // exact value
      numbers.add(Math.round(v));
      // also add the one-decimal form rounded so "22.00" matches 22
      numbers.add(Math.round(v * 10) / 10);
    }
  }

  addSignals(signalsEth);
  addSignals(signalsSol);

  // Also harvest numbers that appear literally in pattern insights
  for (const p of allPatterns) {
    const matches = p.insight.match(/\d+(\.\d+)?/g) ?? [];
    for (const m of matches) {
      numbers.add(Math.round(parseFloat(m)));
      numbers.add(parseFloat(m)); // keep exact too
    }
  }

  return {
    eth: {
      label: personaEth.walletLabel,
      archetype: personaEth.archetype,
      superpower: personaEth.superpower,
      kryptonite: personaEth.kryptonite,
    },
    sol: {
      label: personaSol.walletLabel,
      archetype: personaSol.archetype,
      superpower: personaSol.superpower,
      kryptonite: personaSol.kryptonite,
    },
    patterns: allPatterns,
    numbers,
  };
}

// ─── Deterministic template helpers ─────────────────────────────────────────

/**
 * Pick a pattern whose insight and tag will anchor a template line.
 * Cycles through the flat list by line index to vary the output.
 */
function pickPattern(facts: RoastFacts, idx: number): Pattern {
  const pool = facts.patterns.length > 0 ? facts.patterns : [FALLBACK_PATTERN];
  return pool[idx % pool.length];
}

const FALLBACK_PATTERN: Pattern = {
  id: "GRD-01",
  tag: "Risk-Token Exposure",
  type: "GUARD",
  confidence: "LOW",
  evidence: [],
  count: 0,
  insight: "no data available",
};

// Template line factories -- text contains NO numbers beyond what's in facts.
// Each factory receives the chosen pattern and both side-facts.
type TemplateFactory = (p: Pattern, facts: RoastFacts, round: number) => RoastLine;

const TEMPLATE_FACTORIES: TemplateFactory[] = [
  (p, facts, round) => ({
    round,
    speaker: "ETHEREUM SELF",
    text: `${facts.eth.archetype}? More like ${facts.eth.kryptonite} central. You call that a superpower?`,
    onScreenTag: p.tag,
    onScreenData: p.insight,
  }),
  (p, facts, round) => ({
    round,
    speaker: "SOLANA SELF",
    text: `At least my ${facts.sol.superpower} does not look like panic trading. ${facts.eth.kryptonite} is showing.`,
    onScreenTag: p.tag,
    onScreenData: p.insight,
  }),
  (p, facts, round) => ({
    round,
    speaker: "ETHEREUM SELF",
    text: `My ${facts.eth.superpower} aged well. Your ${facts.sol.kryptonite} did not.`,
    onScreenTag: p.tag,
    onScreenData: p.insight,
  }),
  (p, facts, round) => ({
    round,
    speaker: "SOLANA SELF",
    text: `${facts.sol.archetype} sees what ${facts.eth.archetype} missed on-chain.`,
    onScreenTag: p.tag,
    onScreenData: p.insight,
  }),
  (p, _facts, round) => ({
    round,
    speaker: "BOTH",
    text: `We are the same wallet, different chains -- both haunted by our own ${p.tag}.`,
    onScreenTag: p.tag,
    onScreenData: p.insight,
  }),
  (p, facts, round) => ({
    round,
    speaker: "ETHEREUM SELF",
    text: `${facts.eth.kryptonite} is not a vibe. It is a liability.`,
    onScreenTag: p.tag,
    onScreenData: p.insight,
  }),
];

// ─── buildTemplateRoast ──────────────────────────────────────────────────────

export function buildTemplateRoast(facts: RoastFacts): RoastLine[] {
  const lines: RoastLine[] = [];
  for (let i = 0; i < TEMPLATE_FACTORIES.length; i++) {
    const factory = TEMPLATE_FACTORIES[i];
    const pattern = pickPattern(facts, i);
    lines.push(factory(pattern, facts, i + 1));
  }
  return lines;
}

// ─── numericGuard ────────────────────────────────────────────────────────────

/**
 * Extracts every number from `line.text` and `line.onScreenData`.
 * If ANY extracted number (as rounded value) is NOT in facts.numbers,
 * replace the entire line with the corresponding deterministic template line.
 */
export function numericGuard(line: RoastLine, facts: RoastFacts): RoastLine {
  const textToCheck = `${line.text} ${line.onScreenData}`;
  const numMatches = textToCheck.match(/\d+(\.\d+)?/g) ?? [];

  for (const m of numMatches) {
    const asFloat = parseFloat(m);
    const asRounded = Math.round(asFloat);
    if (!facts.numbers.has(asFloat) && !facts.numbers.has(asRounded)) {
      // Fabricated number detected -- replace with safe template line
      const patternIdx = (line.round - 1) % Math.max(facts.patterns.length, 1);
      const pattern = pickPattern(facts, patternIdx);
      const factory = TEMPLATE_FACTORIES[(line.round - 1) % TEMPLATE_FACTORIES.length];
      const replacement = factory(pattern, facts, line.round);
      return replacement;
    }
  }

  return line;
}

// ─── generateRoast ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are writing a roast battle between two versions of the same crypto wallet on different chains.
Rules:
- Output a JSON object with a "lines" array of 5-6 objects.
- Each object has: round (integer 1..6), speaker ("ETHEREUM SELF" or "SOLANA SELF" or "BOTH"), text (string), onScreenTag (string), onScreenData (string).
- text must be short, punchy, under 140 characters, roast tone.
- onScreenTag must be one of the pattern tags listed in the FACTS.
- onScreenData must be copied VERBATIM from the corresponding pattern insight in the FACTS.
- CRITICAL: reference ONLY numbers and facts present in the FACTS object. Never invent any number, percentage, token count, date, or dollar figure.
- Each line MUST weave in a specific real figure from FACTS.numbers OR a real pattern tag/insight from FACTS. Generic quips with no grounded detail are not allowed.
- Be genuinely witty and cutting (roast-battle energy), not bland. Punch at the specific behavior the numbers reveal.
- No em-dash character. No ellipsis. Keep it punchy.`;

function buildUserPrompt(facts: RoastFacts): string {
  const patternLines = facts.patterns
    .map((p) => `  tag: "${p.tag}", insight: "${p.insight}"`)
    .join("\n");

  return `FACTS:
ETHEREUM SELF: archetype=${facts.eth.archetype}, superpower=${facts.eth.superpower}, kryptonite=${facts.eth.kryptonite}
SOLANA SELF: archetype=${facts.sol.archetype}, superpower=${facts.sol.superpower}, kryptonite=${facts.sol.kryptonite}
Patterns:
${patternLines}

Write the roast battle JSON now.`;
}

function isValidRoastLine(obj: unknown): obj is RoastLine {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.round === "number" &&
    typeof o.speaker === "string" &&
    typeof o.text === "string" &&
    typeof o.onScreenTag === "string" &&
    typeof o.onScreenData === "string"
  );
}

export async function generateRoast(facts: RoastFacts): Promise<RoastLine[]> {
  if (!llmAvailable()) {
    return buildTemplateRoast(facts);
  }

  try {
    const raw = await llmChat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(facts) },
      ],
      { json: true, timeoutMs: 6000 },
    );

    const parsed = JSON.parse(raw) as { lines?: unknown[] };
    const linesRaw = Array.isArray(parsed?.lines) ? parsed.lines : [];
    if (linesRaw.length === 0) {
      return buildTemplateRoast(facts);
    }

    const validLines = linesRaw.filter(isValidRoastLine);
    if (validLines.length === 0) {
      return buildTemplateRoast(facts);
    }

    // Run numeric guard over every LLM line
    const guarded = validLines.map((line) => numericGuard(line, facts));
    return guarded;
  } catch {
    return buildTemplateRoast(facts);
  }
}
