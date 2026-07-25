import { test } from "node:test";
import assert from "node:assert";
import { formatPersona } from "./format-persona.mjs";

const full = {
  totalTxns: 113,
  chains: ["ethereum", "solana", "xlayer"],
  personas: [
    {
      walletLabel: "ETHEREUM SELF",
      archetype: "The Allocator",
      catchphrase: "No single bet owns me. The portfolio does.",
      superpower: "Diversification across large caps",
      kryptonite: "Over-diversification leaves yield on the table",
      amplifyTags: [
        { tag: "Portfolio Diversifier", confidence: "HIGH", count: 3, insight: "You scale into positions methodically." },
      ],
      guardTags: [
        { tag: "Over-Diversified", confidence: "LOW", count: 1, costUsd: 680, insight: "40% sits idle in stablecoins." },
      ],
    },
  ],
  comparison: { userWinRate: 41, topTraderWinRate: 72, gapCostUsd: 31500, worstHabit: "You hold losers 3x longer than winners." },
};

test("includes brand, archetype, and a top amplify + guard tag", () => {
  const r = formatPersona(full, "0xabc");
  assert.ok(r.includes("Alter Ego"), "branded");
  assert.ok(r.includes("The Allocator"), "archetype");
  assert.ok(r.includes("Portfolio Diversifier"), "amplify tag");
  assert.ok(r.includes("Over-Diversified"), "guard tag");
});

test("never emits the literal 'undefined' or 'null'", () => {
  const r = formatPersona(full, "0xabc");
  assert.ok(!/undefined|null/i.test(r), "no undefined/null leaks");
});

test("is bounded for a chat reply (<= 1200 chars)", () => {
  const r = formatPersona(full, "0xabc");
  assert.ok(r.length <= 1200, `length ${r.length} <= 1200`);
});

test("handles missing guardTags (all-healthy wallet) without crashing", () => {
  const noGuard = { ...full, personas: [{ ...full.personas[0], guardTags: [] }] };
  const r = formatPersona(noGuard, "0xabc");
  assert.ok(r.includes("The Allocator"));
  assert.ok(!/undefined/i.test(r));
});

test("handles missing comparison block", () => {
  const noCmp = { ...full, comparison: undefined };
  const r = formatPersona(noCmp, "0xabc");
  assert.ok(r.includes("The Allocator"));
  assert.ok(!/undefined/i.test(r));
});

test("handles empty personas -> safe fallback, never throws", () => {
  const r = formatPersona({ personas: [] }, "0xabc");
  assert.ok(typeof r === "string" && r.length > 0, "non-empty fallback");
  assert.ok(r.includes("Alter Ego"));
  assert.ok(!/undefined/i.test(r));
});

test("handles null/garbage input -> safe fallback, never throws", () => {
  for (const bad of [null, undefined, {}, { personas: null }, "nope", 42]) {
    const r = formatPersona(bad, "0xabc");
    assert.ok(typeof r === "string" && r.length > 0, "always a non-empty string");
    assert.ok(!/undefined|null/i.test(r));
  }
});

test("includes a short address reference so the requester knows what was analyzed", () => {
  const r = formatPersona(full, "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  assert.ok(r.includes("0xd8dA") || r.includes("0xd8da"), "address prefix shown");
});

test("no em-dashes (standing rule)", () => {
  const r = formatPersona(full, "0xabc");
  assert.ok(!r.includes("—"), "no em-dash");
});

test("suppresses placeholder tags and worstHabit ('None detected') from healthy wallets", () => {
  const healthy = {
    personas: [{ archetype: "The Allocator", superpower: "Diversification", kryptonite: "Overconfidence",
      amplifyTags: [{ tag: "Portfolio Diversifier", confidence: "HIGH", insight: "2796 tokens." }],
      guardTags: [{ tag: "None detected" }] }],
    comparison: { worstHabit: "None detected", gapCostUsd: 0 },
  };
  const r = formatPersona(healthy, "0xabc");
  assert.ok(!/none detected/i.test(r), "no placeholder leaks");
  assert.ok(r.includes("Portfolio Diversifier"), "real strength kept");
});
