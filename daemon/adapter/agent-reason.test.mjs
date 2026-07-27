// daemon/adapter/agent-reason.test.mjs
// Run with: node --test daemon/adapter/agent-reason.test.mjs
import { test } from "node:test";
import assert from "node:assert";
import { reasonReply } from "./agent-reason.mjs";

const analyzeJson = {
  wallets: 1,
  chains: ["ethereum"],
  totalTxns: 75,
  patterns: [
    {
      walletAddress: "0xabc",
      chain: "ethereum",
      amplify: [{ tag: "Diamond Hands", confidence: "HIGH", insight: "Holds through volatility." }],
      guard: [{ tag: "FOMO Buyer", confidence: "MEDIUM", insight: "Buys at peaks." }],
    },
  ],
  personas: [
    {
      walletLabel: "ETHEREUM SELF",
      archetype: "The Diamond Holder",
      catchphrase: "Never sell",
      vice: "FOMO",
      superpower: "Patience",
      kryptonite: "Market panic",
      tradingStyle: "long-term",
      emojiSignature: "💎",
      pnlTotal: 5000,
      realizedPnl: 5000,
      winRate: 70,
      grade: { score: 85, letter: "A", components: {} },
      amplifyTags: [{ id: "AMP-02", tag: "Diamond Hands", type: "AMPLIFY", confidence: "HIGH", evidence: [], count: 8, insight: "Holds through volatility." }],
      guardTags: [{ id: "GRD-02", tag: "FOMO Buyer", type: "GUARD", confidence: "MEDIUM", evidence: [], count: 4, insight: "Buys at peaks.", costUsd: 150 }],
    },
  ],
  comparison: null,
};

// Helper: mock fetch to simulate LLM success
function makeLlmFetch(content) {
  return async (_url, _opts) => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  });
}

// Helper: mock fetch to simulate LLM failure
function makeFailFetch(status = 500) {
  return async (_url, _opts) => ({
    ok: false,
    status,
    json: async () => ({}),
  });
}

// Save original fetch and env
const originalFetch = globalThis.fetch;
const originalKey = process.env.LLM_API_KEY;
const originalGroqKey = process.env.GROQ_API_KEY;

function setKey(key) {
  process.env.LLM_API_KEY = key;
  process.env.GROQ_API_KEY = "";
}

function clearKey() {
  process.env.LLM_API_KEY = "";
  process.env.GROQ_API_KEY = "";
}

function restoreKey() {
  process.env.LLM_API_KEY = originalKey || "";
  process.env.GROQ_API_KEY = originalGroqKey || "";
  globalThis.fetch = originalFetch;
}

test("returns LLM text when key is set and LLM succeeds", async () => {
  setKey("test-key-123");
  globalThis.fetch = makeLlmFetch("Diamond Hands tag confirms strong holding behavior.");

  const result = await reasonReply(analyzeJson, { ask: "How does this wallet behave?" });

  assert.strictEqual(result, "Diamond Hands tag confirms strong holding behavior.");
  restoreKey();
});

test("returns grounded fallback containing archetype when no API key is set", async () => {
  clearKey();

  const result = await reasonReply(analyzeJson, {});

  assert.ok(result.includes("The Diamond Holder"), `fallback should include archetype, got: ${result}`);
  restoreKey();
});

test("grounded fallback includes a real tag when LLM is unavailable", async () => {
  clearKey();

  const result = await reasonReply(analyzeJson, {});

  const hasAmpTag = result.includes("Diamond Hands");
  const hasGuardTag = result.includes("FOMO Buyer");
  assert.ok(hasAmpTag || hasGuardTag, `fallback should include a tag, got: ${result}`);
  restoreKey();
});

test("returns grounded fallback when LLM call fails, never throws", async () => {
  setKey("test-key-456");
  globalThis.fetch = makeFailFetch(503);

  let result;
  let threw = false;
  try {
    result = await reasonReply(analyzeJson, { ask: "Analyze wallet" });
  } catch {
    threw = true;
  }

  assert.strictEqual(threw, false, "should not throw on LLM failure");
  assert.ok(typeof result === "string" && result.length > 0, "should return non-empty string");
  assert.ok(result.includes("The Diamond Holder"), `fallback should include archetype, got: ${result}`);
  restoreKey();
});

test("returns grounded fallback when fetch throws (network error), never throws", async () => {
  setKey("test-key-789");
  globalThis.fetch = async () => { throw new Error("Network error"); };

  let result;
  let threw = false;
  try {
    result = await reasonReply(analyzeJson, { ask: "Who is this?" });
  } catch {
    threw = true;
  }

  assert.strictEqual(threw, false, "should not throw on fetch rejection");
  assert.ok(typeof result === "string" && result.length > 0, "should return non-empty string");
  restoreKey();
});

test("output does not contain em-dash in grounded fallback", async () => {
  clearKey();

  const result = await reasonReply(analyzeJson, {});

  assert.ok(!result.includes("—"), `output must not include em-dash, got: ${result}`);
  restoreKey();
});

test("never throws on empty analysis", async () => {
  clearKey();

  let result;
  let threw = false;
  try {
    result = await reasonReply({}, {});
  } catch {
    threw = true;
  }

  assert.strictEqual(threw, false, "should not throw on empty analysis");
  assert.ok(typeof result === "string", "should return string");
  restoreKey();
});

test("output bounded to 1200 chars even if LLM returns huge text", async () => {
  setKey("test-key-abc");
  globalThis.fetch = makeLlmFetch("Z".repeat(5000));

  const result = await reasonReply(analyzeJson, {});

  assert.ok(result.length <= 1200, `output should be bounded, got ${result.length} chars`);
  restoreKey();
});
