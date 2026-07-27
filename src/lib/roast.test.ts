// src/lib/roast.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Persona, PatternResult, WalletSignals, Pattern, RoastLine } from "./types";
import {
  buildRoastFacts,
  buildTemplateRoast,
  numericGuard,
  generateRoast,
} from "./roast";

// ─── Mock llm module ────────────────────────────────────────────────────────
vi.mock("./llm", () => ({
  llmAvailable: vi.fn(() => false),
  llmChat: vi.fn(),
}));

import { llmAvailable, llmChat } from "./llm";

// ─── Test fixtures ──────────────────────────────────────────────────────────

function makePattern(overrides: Partial<Pattern>): Pattern {
  return {
    id: "GRD-01",
    tag: "Risk-Token Exposure",
    type: "GUARD",
    confidence: "HIGH",
    evidence: [],
    count: 5,
    insight: "5 risk-flagged tokens held",
    ...overrides,
  };
}

function makeSignals(overrides: Partial<WalletSignals> = {}): WalletSignals {
  return {
    totalTxns: 120,
    daysSinceLastTx: 7,
    activeSpanDays: 200,
    uniqueTokens: 30,
    uniqueChains: 3,
    swapCount: 80,
    tokensHeld: 12,
    riskTokenCount: 5,
    riskTokenPct: 15,
    topHoldingPct: 25,
    avgGasGwei: 22,
    networkMedianGasGwei: 30,
    ...overrides,
  };
}

function makePatternResult(overrides: Partial<PatternResult> = {}): PatternResult {
  return {
    walletAddress: "0xETH",
    chain: "ethereum",
    amplify: [
      makePattern({ id: "AMP-01", tag: "Multi-Chain Operator", type: "AMPLIFY", insight: "active on 3 chains" }),
      makePattern({ id: "AMP-03", tag: "Active Trader", type: "AMPLIFY", insight: "120 txns, last active 7d ago" }),
    ],
    guard: [
      makePattern({ id: "GRD-01", tag: "Risk-Token Exposure", type: "GUARD", insight: "5 risk-flagged tokens held" }),
    ],
    ...overrides,
  };
}

function makePersona(label: string, overrides: Partial<Persona> = {}): Persona {
  return {
    walletLabel: label,
    archetype: "The Nomad",
    catchphrase: "The chain is wherever I need it to be.",
    vice: "Holds tokens flagged risky like they're blue chips.",
    superpower: "Multi-Chain Operator",
    kryptonite: "Risk-Token Exposure",
    tradingStyle: "2 strengths, 1 weakness",
    emojiSignature: "🌐🔗⛓️",
    pnlTotal: 0,
    realizedPnl: null,
    winRate: null,
    grade: { score: 72, letter: "B", components: {} },
    amplifyTags: [
      makePattern({ id: "AMP-01", tag: "Multi-Chain Operator", type: "AMPLIFY", insight: "active on 3 chains" }),
    ],
    guardTags: [
      makePattern({ id: "GRD-01", tag: "Risk-Token Exposure", type: "GUARD", insight: "5 risk-flagged tokens held" }),
    ],
    ...overrides,
  };
}

// ─── buildRoastFacts ─────────────────────────────────────────────────────────

describe("buildRoastFacts", () => {
  it("includes all real numeric signals in the whitelist", () => {
    const personaEth = makePersona("ETHEREUM SELF");
    const personaSol = makePersona("SOLANA SELF");
    const patternsEth = makePatternResult();
    const patternsSol = makePatternResult({ walletAddress: "SOL1", chain: "solana" });
    const signalsEth = makeSignals();
    const signalsSol = makeSignals({ totalTxns: 55, uniqueChains: 2, avgGasGwei: 0 });

    const facts = buildRoastFacts(
      personaEth, personaSol,
      patternsEth, patternsSol,
      signalsEth, signalsSol,
    );

    // Numbers from ETH side should be present
    expect(facts.numbers.has(120)).toBe(true); // totalTxns eth
    expect(facts.numbers.has(3)).toBe(true);   // uniqueChains eth
    expect(facts.numbers.has(7)).toBe(true);   // daysSinceLastTx eth

    // Numbers from SOL side
    expect(facts.numbers.has(55)).toBe(true);  // totalTxns sol
    expect(facts.numbers.has(2)).toBe(true);   // uniqueChains sol

    // Fabricated number must NOT be in whitelist
    expect(facts.numbers.has(9999)).toBe(false);
  });

  it("includes pattern insights from both sides", () => {
    const personaEth = makePersona("ETHEREUM SELF");
    const personaSol = makePersona("SOLANA SELF");
    const patternsEth = makePatternResult();
    const patternsSol = makePatternResult({ walletAddress: "SOL1", chain: "solana" });

    const facts = buildRoastFacts(
      personaEth, personaSol,
      patternsEth, patternsSol,
      makeSignals(), makeSignals(),
    );

    const allInsights = facts.patterns.map((p) => p.insight);
    expect(allInsights).toContain("active on 3 chains");
    expect(allInsights).toContain("5 risk-flagged tokens held");
  });
});

// ─── buildTemplateRoast ──────────────────────────────────────────────────────

describe("buildTemplateRoast", () => {
  function makeFacts() {
    const personaEth = makePersona("ETHEREUM SELF");
    const personaSol = makePersona("SOLANA SELF");
    const patternsEth = makePatternResult();
    const patternsSol = makePatternResult({ walletAddress: "SOL1", chain: "solana" });
    return buildRoastFacts(
      personaEth, personaSol,
      patternsEth, patternsSol,
      makeSignals(), makeSignals(),
    );
  }

  it("returns at least 5 lines", () => {
    const facts = makeFacts();
    const lines = buildTemplateRoast(facts);
    expect(lines.length).toBeGreaterThanOrEqual(5);
  });

  it("every onScreenData is verbatim a real pattern insight from facts", () => {
    const facts = makeFacts();
    const lines = buildTemplateRoast(facts);
    const realInsights = new Set(facts.patterns.map((p) => p.insight));

    for (const line of lines) {
      expect(realInsights.has(line.onScreenData)).toBe(true);
    }
  });

  it("round numbers are sequential starting at 1", () => {
    const facts = makeFacts();
    const lines = buildTemplateRoast(facts);
    lines.forEach((line, i) => {
      expect(line.round).toBe(i + 1);
    });
  });

  it("speakers are only ETHEREUM SELF, SOLANA SELF, or BOTH", () => {
    const facts = makeFacts();
    const lines = buildTemplateRoast(facts);
    const valid = new Set(["ETHEREUM SELF", "SOLANA SELF", "BOTH"]);
    for (const line of lines) {
      expect(valid.has(line.speaker)).toBe(true);
    }
  });

  it("onScreenTag is one of the real pattern tags in facts", () => {
    const facts = makeFacts();
    const lines = buildTemplateRoast(facts);
    const realTags = new Set(facts.patterns.map((p) => p.tag));
    for (const line of lines) {
      expect(realTags.has(line.onScreenTag)).toBe(true);
    }
  });
});

// ─── numericGuard ────────────────────────────────────────────────────────────

describe("numericGuard", () => {
  function makeFacts() {
    const personaEth = makePersona("ETHEREUM SELF");
    const personaSol = makePersona("SOLANA SELF");
    const patternsEth = makePatternResult();
    const patternsSol = makePatternResult({ walletAddress: "SOL1", chain: "solana" });
    return buildRoastFacts(
      personaEth, personaSol,
      patternsEth, patternsSol,
      makeSignals(), makeSignals(),
    );
  }

  it("replaces a line whose text contains a fabricated number (9999)", () => {
    const facts = makeFacts();
    expect(facts.numbers.has(9999)).toBe(false); // confirm 9999 is NOT real

    const line: RoastLine = {
      round: 1,
      speaker: "ETHEREUM SELF",
      text: "You made 9999 trades and still lost money?",
      onScreenTag: "Risk-Token Exposure",
      onScreenData: "5 risk-flagged tokens held",
    };

    const guarded = numericGuard(line, facts);
    // The fabricated "9999" must not appear in the final text
    expect(guarded.text).not.toContain("9999");
  });

  it("preserves a line whose numbers are all in facts", () => {
    const facts = makeFacts();
    // 120 is totalTxns from makeSignals()
    expect(facts.numbers.has(120)).toBe(true);

    const line: RoastLine = {
      round: 2,
      speaker: "SOLANA SELF",
      text: "At least I did 120 txns this year.",
      onScreenTag: "Active Trader",
      onScreenData: "120 txns, last active 7d ago",
    };

    const guarded = numericGuard(line, facts);
    expect(guarded.text).toContain("120");
  });

  it("replaces a line when onScreenData contains a fabricated number", () => {
    const facts = makeFacts();
    expect(facts.numbers.has(42000)).toBe(false);

    const line: RoastLine = {
      round: 3,
      speaker: "ETHEREUM SELF",
      text: "Solid moves.",
      onScreenTag: "Risk-Token Exposure",
      onScreenData: "42000 risk tokens somehow",
    };

    const guarded = numericGuard(line, facts);
    // onScreenData must come from a real insight after replacement
    const realInsights = new Set(facts.patterns.map((p) => p.insight));
    expect(realInsights.has(guarded.onScreenData)).toBe(true);
  });
});

// ─── generateRoast ───────────────────────────────────────────────────────────

describe("generateRoast", () => {
  function makeFacts() {
    const personaEth = makePersona("ETHEREUM SELF");
    const personaSol = makePersona("SOLANA SELF");
    const patternsEth = makePatternResult();
    const patternsSol = makePatternResult({ walletAddress: "SOL1", chain: "solana" });
    return buildRoastFacts(
      personaEth, personaSol,
      patternsEth, patternsSol,
      makeSignals(), makeSignals(),
    );
  }

  beforeEach(() => {
    vi.mocked(llmAvailable).mockReturnValue(false);
    vi.mocked(llmChat).mockReset();
  });

  it("returns template roast when llmAvailable() is false", async () => {
    vi.mocked(llmAvailable).mockReturnValue(false);
    const facts = makeFacts();
    const lines = await generateRoast(facts);
    expect(lines.length).toBeGreaterThanOrEqual(5);
    // Every onScreenData is a real insight (template property)
    const realInsights = new Set(facts.patterns.map((p) => p.insight));
    for (const line of lines) {
      expect(realInsights.has(line.onScreenData)).toBe(true);
    }
  });

  it("runs numericGuard on LLM output and replaces fabricated numbers", async () => {
    vi.mocked(llmAvailable).mockReturnValue(true);

    // LLM returns a line with a fabricated number 9999
    const fakeLines: RoastLine[] = [
      {
        round: 1,
        speaker: "ETHEREUM SELF",
        text: "You made 9999 trades and somehow REKT yourself?",
        onScreenTag: "Risk-Token Exposure",
        onScreenData: "5 risk-flagged tokens held",
      },
    ];
    vi.mocked(llmChat).mockResolvedValue(JSON.stringify({ lines: fakeLines }));

    const facts = makeFacts();
    expect(facts.numbers.has(9999)).toBe(false); // confirm fabricated

    const result = await generateRoast(facts);

    // 9999 must not appear anywhere in the final output
    for (const line of result) {
      expect(line.text).not.toContain("9999");
    }
  });

  it("falls back to template when LLM throws", async () => {
    vi.mocked(llmAvailable).mockReturnValue(true);
    vi.mocked(llmChat).mockRejectedValue(new Error("LLM timeout"));

    const facts = makeFacts();
    const lines = await generateRoast(facts);
    expect(lines.length).toBeGreaterThanOrEqual(5);
    const realInsights = new Set(facts.patterns.map((p) => p.insight));
    for (const line of lines) {
      expect(realInsights.has(line.onScreenData)).toBe(true);
    }
  });

  it("falls back to template when LLM returns invalid JSON", async () => {
    vi.mocked(llmAvailable).mockReturnValue(true);
    vi.mocked(llmChat).mockResolvedValue("not json at all");

    const facts = makeFacts();
    const lines = await generateRoast(facts);
    expect(lines.length).toBeGreaterThanOrEqual(5);
  });
});
