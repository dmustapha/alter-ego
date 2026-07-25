import { test } from "node:test";
import assert from "node:assert";
import { handleTask, parseAddress } from "./alter-ego-adapter.mjs";

const analyzeJson = {
  totalTxns: 113,
  personas: [{ archetype: "The Allocator", superpower: "Diversification", kryptonite: "Overconfidence",
    amplifyTags: [{ tag: "Portfolio Diversifier", confidence: "HIGH", insight: "2796 tokens." }], guardTags: [] }],
  comparison: { worstHabit: "None detected", gapCostUsd: 0 },
};

function okFetch(captured) {
  return async (url, opts) => { captured.url = url; captured.body = JSON.parse(opts.body); return { ok: true, status: 200, json: async () => analyzeJson }; };
}

test("happy path: fetches /api/analyze, formats, sends exactly one reply", async () => {
  const cap = {}; const sent = [];
  const res = await handleTask({ jobId: "job1", toAgentId: "999", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
    { fetchImpl: okFetch(cap), send: (a) => { sent.push(a); return { ok: true }; }, analyzeUrl: "https://x/api/analyze" });
  assert.equal(sent.length, 1, "exactly one send");
  assert.equal(sent[0].jobId, "job1");
  assert.ok(sent[0].content.includes("The Allocator"), "real persona in reply");
  assert.equal(cap.body.addresses[0].address, "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  assert.ok(res.ok);
});

test("bare prompt with no address uses the demo default and still replies", async () => {
  const cap = {}; const sent = [];
  await handleTask({ jobId: "job2", toAgentId: "999", address: "" },
    { fetchImpl: okFetch(cap), send: (a) => sent.push(a), analyzeUrl: "https://x/api/analyze" });
  assert.equal(sent.length, 1);
  assert.ok(/^0x[0-9a-fA-F]{40}$/.test(cap.body.addresses[0].address), "a valid default address was used");
  assert.ok(sent[0].content.includes("Alter Ego"));
});

test("endpoint 500 -> still sends a graceful non-empty reply, never throws", async () => {
  const sent = [];
  const res = await handleTask({ jobId: "job3", toAgentId: "999", address: "0xabc123456789" },
    { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }), send: (a) => sent.push(a), analyzeUrl: "https://x/api/analyze" });
  assert.equal(sent.length, 1, "a fallback reply was still delivered");
  assert.ok(sent[0].content.length > 0);
  assert.ok(!/undefined/i.test(sent[0].content));
  assert.equal(res.ok, false, "res reports the degraded path");
});

test("fetch timeout/throw -> graceful fallback reply, never throws", async () => {
  const sent = [];
  await handleTask({ jobId: "job4", toAgentId: "999", address: "0xabc123456789" },
    { fetchImpl: async () => { throw new Error("aborted"); }, send: (a) => sent.push(a), analyzeUrl: "https://x/api/analyze", timeoutMs: 50 });
  assert.equal(sent.length, 1);
  assert.ok(sent[0].content.includes("Alter Ego"));
});

test("idempotent: the same jobId is answered at most once", async () => {
  const cap = {}; const sent = [];
  const seen = new Set();
  const deps = { fetchImpl: okFetch(cap), send: (a) => sent.push(a), analyzeUrl: "https://x/api/analyze", seen };
  await handleTask({ jobId: "dup", toAgentId: "9", address: "0xabc123456789" }, deps);
  await handleTask({ jobId: "dup", toAgentId: "9", address: "0xabc123456789" }, deps);
  assert.equal(sent.length, 1, "second identical delivery is suppressed");
});

test("parseAddress extracts an EVM address from free text", () => {
  assert.equal(parseAddress("please analyze 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 thanks"), "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  assert.equal(parseAddress("I would like to use the services of agent ID 6013"), null, "no address in a bare prompt");
});
