#!/usr/bin/env node
// Gate 3 - A2A responsiveness (OKX Test 3).
// Sends the OKX.ai user prompt + an a2a-agent-chat task toward the agent and
// asserts a real, non-empty analysis reply within the platform timeout (300s).
//
// RECONCILE BEFORE RUNNING (Plan 8 Task 3 Step 3):
//   This scaffold uses the real `okx-a2a session send` transport (verified present
//   at /opt/homebrew/bin/okx-a2a), replacing the plan's placeholder
//   `onchainos agent chat`. BUT `okx-a2a session send` queues a dispatch FROM our
//   agent; it does not by itself simulate OKX's inbound external-user test nor
//   return the counterparty reply synchronously. Before the real gate run, wire
//   `sendAndAwait` to the Plan 7 daemon's actual reply-observation path (e.g.
//   `okx-a2a session send --json` to enqueue, then `okx-a2a session query` to read
//   the reply, or the daemon's own health/echo route). Do NOT weaken the two
//   assertions (non-empty AND within TIMEOUT_MS). Until reconciled, this exits with
//   a NOT-READY notice rather than a false PASS.
import { execFileSync } from "node:child_process";

const COMM = "0x835C02C82a1DCCe73585D23DFe07A939AB971707";
const AGENT_ID = "6013";
const TIMEOUT_MS = 300_000; // maxTimeoutSeconds: 300 (platform timeout)
const RECONCILED = process.env.GATE3_RECONCILED === "1";
const fail = (m) => { console.error("FAIL Gate3:", m, "-> route to Plan 7"); process.exit(1); };

if (!RECONCILED) {
  console.error(
    "NOT-READY Gate3: sender not yet reconciled to the Plan 7 daemon reply path.\n" +
    "  1) Build + deploy the Plan 7 A2A daemon (listener at communicationAddress " + COMM + ").\n" +
    "  2) Wire sendAndAwait() below to the daemon's real reply-observation interface.\n" +
    "  3) Re-run with GATE3_RECONCILED=1 once a real reply can be read back.\n" +
    "This intentionally does not emit PASS. See scripts/gate/gate3-a2a.mjs header."
  );
  process.exit(2);
}

// Reconciled sender. Enqueue via the real okx-a2a transport; the reply-read step
// must be filled in against the Plan 7 daemon before flipping GATE3_RECONCILED=1.
function sendAndAwait(text, msgType, jobId) {
  const start = Date.now();
  let out;
  try {
    out = execFileSync(
      "okx-a2a",
      ["session", "send", "--job-id", jobId, "--to-agent-id", AGENT_ID, "--content", text, "--json"],
      { encoding: "utf8", timeout: TIMEOUT_MS + 5_000 }
    );
    // TODO(reconcile): replace `out` with the reply text read back from the daemon
    // (okx-a2a session query on this job, or the daemon reply route). The line below
    // treats the enqueue ack as the reply ONLY as a placeholder and must be replaced.
  } catch (e) {
    fail(`no response to ${msgType} within ${TIMEOUT_MS}ms (${e.message})`);
  }
  const ms = Date.now() - start;
  return { reply: (out || "").trim(), ms };
}

// Probe A: the exact OKX.ai user prompt from the rejection analysis
const a = sendAndAwait("I would like to use the services of agent ID 6013", "user-prompt", `gate-user-${AGENT_ID}`);
console.error(`user-prompt reply in ${a.ms}ms:`, a.reply.slice(0, 400));
if (!a.reply) fail("empty reply to the OKX.ai user prompt");
if (a.ms > TIMEOUT_MS) fail(`user-prompt reply took ${a.ms}ms > ${TIMEOUT_MS}ms timeout`);

// Probe B: a real a2a-agent-chat task envelope
const b = sendAndAwait(
  JSON.stringify({ msgType: "a2a-agent-chat", jobId: `gate-task-${AGENT_ID}`, sender: { role: "USER" }, message: "Analyze wallet 0x0000000000000000000000000000000000000001 and describe its trading persona." }),
  "a2a-agent-chat",
  `gate-task-${AGENT_ID}`
);
console.error(`a2a-agent-chat reply in ${b.ms}ms:`, b.reply.slice(0, 400));
if (!b.reply) fail("empty reply to a2a-agent-chat task");
if (b.ms > TIMEOUT_MS) fail(`a2a-agent-chat reply took ${b.ms}ms > ${TIMEOUT_MS}ms timeout`);

console.log(`PASS Gate3: user-prompt ${a.ms}ms, a2a-agent-chat ${b.ms}ms, both non-empty and within ${TIMEOUT_MS}ms`);
