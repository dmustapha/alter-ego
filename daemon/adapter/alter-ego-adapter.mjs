// Transport-independent task handler for the A2A responder. Given an inbound task
// (jobId, counterparty, optional wallet address), it fetches the real analysis from
// the ungated /api/analyze, formats a bounded reply, and delivers it via an injected
// `send` (so the same logic works whether delivery is a direct `okx-a2a session send`
// or the daemon's dispatch). Never throws; always delivers exactly one reply per job.

import { formatPersona } from "./format-persona.mjs";
import { reasonReply } from "./agent-reason.mjs";

// Analysis source is the UNGATED endpoint (a2mcp is x402-gated). Under DEMO_MODE the
// server returns the real cached persona regardless of address, so any address yields
// a genuine reply; the address is used for display + the live path when enabled.
export const DEFAULT_ANALYZE_URL = "https://alter-ego-wine-mu.vercel.app/api/analyze";
// A well-formed default so a bare "use agent 6013" prompt still produces a real persona.
export const DEFAULT_DEMO_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const DEFAULT_TIMEOUT_MS = 12_000;

const EVM_RE = /0x[0-9a-fA-F]{40}/;

export function parseAddress(text) {
  const m = typeof text === "string" ? text.match(EVM_RE) : null;
  return m ? m[0] : null;
}

async function fetchAnalysis(address, { fetchImpl, analyzeUrl, timeoutMs }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetchImpl(analyzeUrl ?? DEFAULT_ANALYZE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ addresses: [{ address, chains: ["ethereum"] }] }),
      signal: ctrl.signal,
    });
    if (!res || !res.ok) return { ok: false, json: null };
    const json = await res.json();
    return { ok: true, json };
  } catch {
    return { ok: false, json: null };
  } finally {
    clearTimeout(timer);
  }
}

// deps: { fetchImpl, send, analyzeUrl?, timeoutMs?, seen? }
// task: { jobId, toAgentId, address? }
export async function handleTask(task, deps) {
  const jobId = task && task.jobId ? String(task.jobId) : "";
  const seen = deps.seen; // optional Set for idempotency across a process
  if (seen && jobId && seen.has(jobId)) return { ok: true, jobId, skipped: true };

  const address = (task && task.address && String(task.address).trim()) || DEFAULT_DEMO_ADDRESS;

  const { ok, json } = await fetchAnalysis(address, deps);

  let content;
  if (ok && json) {
    content = await reasonReply(json, {
      address,
      ask: (task && (task.ask || task.text)) || undefined,
      agentId: (task && task.toAgentId) ? String(task.toAgentId) : undefined,
    }).catch(() => formatPersona(json, address));
  } else {
    // Graceful degrade: still answer within the timeout window, never silent-drop.
    content = `Alter Ego is temporarily unable to reach its analysis engine for ${
      address.length > 12 ? address.slice(0, 6) + "..." + address.slice(-4) : address
    }. Please retry shortly, or view the full breakdown at https://alter-ego-wine-mu.vercel.app`;
  }

  try {
    await deps.send({ jobId, toAgentId: task && task.toAgentId, content });
  } catch {
    // delivery failure is surfaced to the caller loop for retry; do not throw
    return { ok: false, jobId, delivered: false };
  }

  if (seen && jobId) seen.add(jobId);
  return { ok, jobId, delivered: true, content };
}
