// src/lib/cache.test.ts
// Integration tests for loadRoastBattle(): verifies live fact-building path,
// deterministic fallback, and in-memory dedup cache behavior.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RoastLine } from "./types";

// Mock generateRoast so tests never hit the LLM and control output precisely.
vi.mock("./roast", async (importOriginal) => {
  const original = await importOriginal<typeof import("./roast")>();
  return {
    ...original,
    generateRoast: vi.fn(),
  };
});

// Mock llm module so persona/grade imports don't need real API keys.
vi.mock("./llm", () => ({
  llmAvailable: vi.fn(() => false),
  llmChat: vi.fn(),
}));

import { generateRoast } from "./roast";
import { loadRoastBattle, clearRoastCache } from "./cache";

const KNOWN_LINES: RoastLine[] = [
  {
    round: 1,
    speaker: "ETHEREUM SELF",
    text: "Test roast line one.",
    onScreenTag: "Portfolio Diversifier",
    onScreenData: "test insight one",
  },
  {
    round: 2,
    speaker: "SOLANA SELF",
    text: "Test roast line two.",
    onScreenTag: "Active Trader",
    onScreenData: "test insight two",
  },
];

describe("loadRoastBattle", () => {
  beforeEach(() => {
    clearRoastCache();
    vi.mocked(generateRoast).mockReset();
    vi.mocked(generateRoast).mockResolvedValue(KNOWN_LINES);
  });

  it("returns {walletA, walletB, lines} with mocked lines and real personas", async () => {
    const battle = await loadRoastBattle();

    expect(battle).toHaveProperty("walletA");
    expect(battle).toHaveProperty("walletB");
    expect(battle).toHaveProperty("lines");

    // Personas should have the expected labels
    expect(battle.walletA.walletLabel).toBe("ETHEREUM SELF");
    expect(battle.walletB.walletLabel).toBe("SOLANA SELF");

    // Lines should be exactly what generateRoast returned
    expect(battle.lines).toEqual(KNOWN_LINES);
  });

  it("persona objects have required fields (archetype, superpower, kryptonite, grade)", async () => {
    const battle = await loadRoastBattle();

    for (const persona of [battle.walletA, battle.walletB]) {
      expect(typeof persona.archetype).toBe("string");
      expect(typeof persona.superpower).toBe("string");
      expect(typeof persona.kryptonite).toBe("string");
      expect(persona.grade).toBeDefined();
      expect(typeof persona.grade.letter).toBe("string");
    }
  });

  it("returns the same object on repeated calls without invoking generateRoast twice", async () => {
    const first = await loadRoastBattle();
    const second = await loadRoastBattle();

    // Same reference means cache returned the stored object
    expect(first).toBe(second);

    // generateRoast must have been called only once across both loadRoastBattle() calls
    expect(vi.mocked(generateRoast)).toHaveBeenCalledTimes(1);
  });

  it("calls generateRoast with a RoastFacts object containing patterns from both chains", async () => {
    await loadRoastBattle();

    expect(vi.mocked(generateRoast)).toHaveBeenCalledTimes(1);
    const [facts] = vi.mocked(generateRoast).mock.calls[0];

    // facts should have eth and sol sides
    expect(facts.eth).toBeDefined();
    expect(facts.sol).toBeDefined();
    expect(typeof facts.eth.archetype).toBe("string");
    expect(typeof facts.sol.archetype).toBe("string");

    // facts.patterns should be non-empty (loaded from real cache files)
    expect(Array.isArray(facts.patterns)).toBe(true);
    expect(facts.patterns.length).toBeGreaterThan(0);

    // numbers whitelist should be a Set
    expect(facts.numbers).toBeInstanceOf(Set);
    expect(facts.numbers.size).toBeGreaterThan(0);
  });

  it("clears the cache and calls generateRoast again after clearRoastCache()", async () => {
    await loadRoastBattle();
    expect(vi.mocked(generateRoast)).toHaveBeenCalledTimes(1);

    clearRoastCache();

    await loadRoastBattle();
    // Should have been called a second time after cache clear
    expect(vi.mocked(generateRoast)).toHaveBeenCalledTimes(2);
  });
});
