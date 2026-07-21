# Listing-Readiness Gate — Implementation Plan (Plan 8 of 8, TERMINAL)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to run this plan task-by-task. This is a VERIFICATION plan, not a build plan — every task ends in a hard PASS/FAIL assertion. If any assertion FAILS, STOP immediately, do not proceed to the next task, and route back to the owning plan per the routing table in Task 0. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Be the single hard gate before any resubmission of agent #6013 to OKX.AI. Mirror OKX's exact review tests against the LIVE `wine-mu` deployment and the on-chain registration, and only permit the resubmit action when ALL THREE OKX tests plus the product-readiness checklist are green. Dami's directive: NO more submissions until every check here is green and the agent is proven to work. This plan performs zero feature work — only verification and, once fully green, the terminal resubmit action.

**Architecture:** Three evidence-producing gates map 1:1 to OKX's three rejection reasons (see `docs/LISTING-REJECTION-ANALYSIS.md` § "OKX's own three tests"). Gate 1 asserts reachability + on-chain `serviceList` registration (`onchainos agent get-agents` + `curl -sI`). Gate 2 asserts the x402 v2 standard challenge (`curl -i -X POST` + a base64 decode-and-assert script). Gate 3 asserts A2A responsiveness (a real `a2a-agent-chat` task and the OKX.ai user prompt to `communicationAddress`, timed against the platform timeout). A pre-resubmit checklist then confirms the whole product is proven (Plan 1 differential green, live 500 gone, honest copy from Plan 5, demo from Plan 6). Only after every gate is green does the terminal resubmit action fire. Each gate writes its evidence to `docs/listing-gate/` so the pass is auditable and re-runnable.

**Tech Stack:** `onchainos` CLI (agent registry queries + activate/resubmit), `curl` (reachability + x402 probe), Node.js decode/assert scripts (`base64` → JSON validation), the `okx-a2a` daemon + AI adapter (Plan 7 output) reached over XMTP at `communicationAddress`, `bash` with `set -euo pipefail` for fail-loud gating.

## Global Constraints

- **This is a terminal gate. It depends on Plans 1-7 being complete and green.** It must not be run to "see how far we get" — a partial pass is a FAIL. Do not soften any assertion to make a gate pass.
- **NO resubmission until every gate here is green** (Dami's explicit directive). The resubmit action (Task 5) is physically the LAST step and is guarded by an all-gates-green precondition check.
- **Every gate must FAIL LOUDLY and STOP.** Scripts use `set -euo pipefail`; assertions `exit 1` with a human-readable reason on failure. No silent skips, no "warn and continue".
- **Test against the LIVE deployment and the LIVE on-chain state**, never against localhost or a mock. The registered URL is the source of truth — read it from the chain, do not assume it.
- **Authoritative facts (do not re-derive, do not reintroduce wrong values)** — from `docs/LISTING-REJECTION-ANALYSIS.md`:
  - Agent ID: `6013`. Chain: X Layer, `chainIndex: 196`, network literal `eip155:196` (NOT `"xlayer"`).
  - `communicationAddress`: `0x835C02C82a1DCCe73585D23DFe07A939AB971707`. Owner: `0xd97c…6340`.
  - Public reachable base URL: `https://alter-ego-wine-mu.vercel.app`. The auth-walled URL `https://alter-ego-demo.vercel.app` (→ `302` to `vercel.com/sso-api`) must NEVER be what is registered.
  - x402: version **2**; challenge `{ x402Version: 2, resource: { url, description, mimeType: "application/json" }, accepts: [...] }`; delivered base64-encoded in the **`PAYMENT-REQUIRED`** response header on HTTP **`402`**; asset **USDT0** (decimals **6**), NOT USDG / NOT 18dp; `maxTimeoutSeconds: 300`.
  - Byte-exact literals (never rename): `x402Version`, `X-PAYMENT`, `PAYMENT-REQUIRED`.
- No em-dashes in any user-facing copy or docs (standing rule).
- Credentials come only from `process.env` / the `onchainos` keystore — never committed, never printed into evidence files (redact addresses/keys where not already public).
- Evidence directory `docs/listing-gate/` is created by Task 0 and holds one file per gate; these are committed as the audit trail of the green run.

## Upstream Inputs & Branch Caveats

- **Depends on (must be merged and live BEFORE this plan runs):**
  - **Plan 1** (`2026-07-20-genuinely-live-data-layer.md`) — live data spine, security P0, the differential test (`tests/differential.spec.ts`), and the live-500 fix. Consumed by the Task 4 checklist.
  - **Plan 2** (`2026-07-20-a2mcp-conformance.md`) — corrected x402 block + `serviceList` registration of the `wine-mu` URL. Owns Gates 1 and 2.
  - **Plan 3** (`2026-07-20-real-x402-payment.md`) — the `@okxweb3/x402` SDK seller-side 402 issuance. Owns Gate 2.
  - **Plan 5** (`2026-07-20-submission-honesty-pass.md`) — honest copy, reconciled tx counts, correct live/clone URLs. Consumed by the Task 4 checklist.
  - **Plan 6** (`2026-07-20-demo-rerecord.md`) — the re-recorded demo against the live URL. Consumed by the Task 4 checklist.
  - **Plan 7** (A2A daemon, full, always-on) — the `okx-a2a` daemon + AI adapter that answers tasks at `communicationAddress`. Owns Gate 3. Supersedes `docs/superpowers/specs/2026-07-20-presence-daemon-fly-design.md` (Scope B → Scope C).
- **Branch caveat:** run this on the branch/commit where Plans 1-7 are ALL merged (the intended-for-resubmission state). If any of Plans 1-7 is on an unmerged branch, this gate WILL fail at the corresponding task — that is correct behavior, not a bug. Do not stub around a missing dependency.
- **On-chain caveat:** `serviceList` and `approvalDisplayStatus` are live chain state that changes when Plan 2 re-registers. Always read them fresh at gate time (Task 0 reconcile), never from a cached snapshot in the analysis doc.

---

## Task 0: Reconcile — read live state, confirm dependencies, prep evidence dir

**Files:**
- Create: `docs/listing-gate/` (evidence directory)
- Create: `docs/listing-gate/00-reconcile.md` (the live-state snapshot for this gate run)
- Reference: `docs/LISTING-REJECTION-ANALYSIS.md`, `docs/superpowers/plans/00-ROADMAP.md`

**Interfaces:**
- Produces: a fresh, dated snapshot of the on-chain state and dependency status that every later task reads, so the gate run is reproducible and the pass is timestamped.

- [ ] **Step 1: Confirm the `onchainos` CLI is authenticated and on the right account.** The owner of #6013 is `0xd97c…6340`; the CLI must be logged into that account (activate/resubmit will fail otherwise).

```bash
onchainos whoami || onchainos account list
```

Expected: output shows the owner account `0xd97c…6340` (or the login that controls #6013). If not, STOP: log in as the #6013 owner before continuing.

- [ ] **Step 2: Snapshot the live on-chain registration.**

```bash
mkdir -p /Users/MAC/hackathon-toolkit/active/alter-ego/docs/listing-gate
onchainos agent get-agents --agent-ids 6013 | tee docs/listing-gate/00-agent-6013.json
```

Record, in `docs/listing-gate/00-reconcile.md`, the current values of `approvalDisplayStatus`, `onlineStatus`, `serviceList` (full), `communicationAddress`, and `chainIndex`. This is the "before" state for the gate run.

- [ ] **Step 3: Confirm Plans 1-7 are merged into the working tree.** Verify the artifacts each owning plan produces exist on this branch (fail loud if any is missing — the gate cannot pass without them):

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
set -e
test -f tests/differential.spec.ts                         # Plan 1
grep -rq "PAYMENT-REQUIRED" src/app/api/a2mcp || grep -rq "PAYMENT-REQUIRED" src/app  # Plan 2/3 seller 402
grep -rq "@okxweb3/x402" package.json                      # Plan 3 SDK
test -d docs/superpowers/specs && echo "specs present"     # Plan 7 supersede note context
echo "OK: upstream artifacts present"
```

Expected: `OK: upstream artifacts present`. If any check fails, STOP and route to the owning plan (Task 0 routing table below).

- [ ] **Step 4: Record the dependency + routing table** into `docs/listing-gate/00-reconcile.md` so any failure downstream has an owner:

| If this gate fails | Symptom | Route back to | What that plan must fix |
|---|---|---|---|
| Gate 1 (Task 1) | `serviceList` empty OR endpoint is not the `wine-mu` URL OR `curl -sI` returns `302`/non-200 | **Plan 2** (A2MCP conformance) + Vercel deployment-protection setting | Register the reachable `wine-mu` URL in `serviceList`; turn off Vercel SSO/deployment protection on the registered path |
| Gate 2 (Task 2) | Not `402`, missing/undecodable `PAYMENT-REQUIRED`, wrong `x402Version`/network/asset/decimals | **Plan 3** (x402 SDK) feeding **Plan 2** | Rebuild seller-side 402 via `@okxweb3/x402`; USDT0/6dp/v2/eip155:196; register the paid path |
| Gate 3 (Task 3) | Timeout, empty response, or over the platform timeout from `communicationAddress` | **Plan 7** (A2A daemon, full) | Deploy always-on `okx-a2a` daemon + working AI adapter (Scope C) that answers `a2a-agent-chat` + user prompts in time |
| Checklist (Task 4) — differential | Two wallets yield identical/empty analyses, or live `/api/analyze` 500 | **Plan 1** (live data layer) | Fix live data spine / classifier; make the differential test green against the live URL |
| Checklist (Task 4) — copy/URLs | Dishonest claims, wrong live/clone URL, mismatched tx counts | **Plan 5** (submission honesty) | Align all copy/URLs/stats to reality |
| Checklist (Task 4) — demo | No re-recorded demo, or demo shows the old broken flow | **Plan 6** (demo re-record) | Re-record 1920x1080 against the live URL |

- [ ] **Step 5: Commit the reconcile snapshot.**

```bash
git add docs/listing-gate/00-reconcile.md docs/listing-gate/00-agent-6013.json
git commit -m "gate: reconcile live #6013 state + dependency routing before listing-readiness run"
```

- [ ] **Verification:** `docs/listing-gate/00-reconcile.md` exists and records `approvalDisplayStatus`, `serviceList`, `communicationAddress`, and a routing table; Step 1 confirmed CLI is the #6013 owner; Step 3 printed `OK: upstream artifacts present`.

---

## Task 1: GATE 1 — Reachability + on-chain registration (OKX Test 1)

**Files:**
- Create: `docs/listing-gate/gate1-reachability.md` (evidence)
- Create: `scripts/gate/gate1-reachability.sh` (the gated check)
- Reference: `docs/listing-gate/00-agent-6013.json`

**Interfaces:**
- Consumes: the live `onchainos agent get-agents --agent-ids 6013` output.
- Produces: a PASS/FAIL that asserts `serviceList` is non-empty, its `endpoint` is the public `wine-mu` URL, and that URL returns HTTP `200` (not a `302`-to-Vercel-SSO).

- [ ] **Step 1: Write the gate script** `scripts/gate/gate1-reachability.sh`. It reads the endpoint straight from the chain (no hardcoded URL) and asserts both registration and reachability:

```bash
#!/usr/bin/env bash
# Gate 1 — Reachability + registration (OKX Test 1)
set -euo pipefail
cd "$(dirname "$0")/../.."

AGENT_JSON="$(onchainos agent get-agents --agent-ids 6013)"
echo "$AGENT_JSON" > docs/listing-gate/gate1-agent.json

# 1a. serviceList must be NON-EMPTY
LEN="$(echo "$AGENT_JSON" | jq '[.. | .serviceList? // empty] | add | length // 0')"
if [ "$LEN" -eq 0 ]; then
  echo "FAIL Gate1: serviceList is EMPTY on-chain -> route to Plan 2 (register wine-mu URL)"; exit 1
fi

# 1b. extract the registered endpoint and assert it is the public wine-mu host
URL="$(echo "$AGENT_JSON" | jq -r '[.. | .serviceList? // empty] | add | .[].endpoint // empty' | head -n1)"
echo "registered endpoint: $URL"
case "$URL" in
  https://alter-ego-wine-mu.vercel.app*) : ;;
  *) echo "FAIL Gate1: registered endpoint '$URL' is NOT the public wine-mu URL -> route to Plan 2"; exit 1 ;;
esac
case "$URL" in
  *alter-ego-demo.vercel.app*) echo "FAIL Gate1: registered the auth-walled demo URL (302->SSO) -> route to Plan 2"; exit 1 ;;
esac

# 1c. the registered URL must resolve publicly with 200, NOT a 302-to-login
CODE="$(curl -s -o /dev/null -w '%{http_code}' -I "$URL")"
echo "curl -sI $URL -> $CODE"
if [ "$CODE" != "200" ]; then
  echo "FAIL Gate1: registered URL returned $CODE (expected 200; 302 = Vercel SSO wall) -> route to Plan 2 + turn off deployment protection"; exit 1
fi

# 1d. explicitly prove it is not a redirect to a vercel login
LOC="$(curl -s -o /dev/null -w '%{redirect_url}' -I "$URL")"
if echo "$LOC" | grep -qiE 'sso-api|vercel.com/sso|login'; then
  echo "FAIL Gate1: URL redirects to Vercel SSO ($LOC) -> route to Plan 2"; exit 1
fi

echo "PASS Gate1: serviceList non-empty, endpoint=$URL, HTTP 200, no SSO redirect"
```

- [ ] **Step 2: Make it executable and run it.**

```bash
chmod +x scripts/gate/gate1-reachability.sh
./scripts/gate/gate1-reachability.sh | tee docs/listing-gate/gate1-reachability.md
```

Expected: final line `PASS Gate1: ...`. If it prints `FAIL Gate1:` the script exits non-zero — STOP and route to Plan 2 per the reason in the message.

- [ ] **Step 3: Cross-check the endpoint host by hand** (defense in depth — the human confirms the `jq` extraction matched the right field):

```bash
onchainos agent get-agents --agent-ids 6013 | jq '[.. | .serviceList? // empty] | add'
```

Expected: the printed `serviceList` array contains one entry whose `endpoint` is `https://alter-ego-wine-mu.vercel.app/...` and whose type is the A2MCP surface.

- [ ] **Step 4: Commit the evidence + script.**

```bash
git add scripts/gate/gate1-reachability.sh docs/listing-gate/gate1-reachability.md docs/listing-gate/gate1-agent.json
git commit -m "gate: Gate 1 reachability+registration PASS (serviceList non-empty, wine-mu 200)"
```

- [ ] **Verification (hard assertion):** `./scripts/gate/gate1-reachability.sh` exits `0` and its last line begins `PASS Gate1`. `docs/listing-gate/gate1-reachability.md` shows a non-empty `serviceList`, the `wine-mu` endpoint, and `curl -sI ... -> 200`. If ANY of these is false, this gate is RED and resubmission is blocked.

---

## Task 2: GATE 2 — x402 standard validation (OKX Test 2)

**Files:**
- Create: `docs/listing-gate/gate2-x402.md` (evidence)
- Create: `scripts/gate/gate2-x402.sh` (the gated check)
- Create: `scripts/gate/decode-payment-required.mjs` (base64 decode + v2 assert)
- Reference: `docs/LISTING-REJECTION-ANALYSIS.md` § "Corrected x402 facts"

**Interfaces:**
- Consumes: the registered paid URL from Gate 1.
- Produces: a PASS/FAIL that asserts `curl -i -X POST <paid url>` returns HTTP `402` with a base64 `PAYMENT-REQUIRED` header decoding to a valid v2 challenge `{x402Version:2, resource, accepts:[...]}` on `eip155:196` with the USDT0 asset (6 decimals).

- [ ] **Step 1: Write the decode + assert script** `scripts/gate/decode-payment-required.mjs`. It reads the base64 `PAYMENT-REQUIRED` header value on stdin, decodes it, and asserts every required field byte-exactly:

```js
#!/usr/bin/env node
// Decode the PAYMENT-REQUIRED header (base64) and assert the OKX x402 v2 challenge.
// Usage: echo "<base64 header value>" | node scripts/gate/decode-payment-required.mjs
import { readFileSync } from "node:fs";

const b64 = readFileSync(0, "utf8").trim();
if (!b64) { console.error("FAIL Gate2: empty PAYMENT-REQUIRED header"); process.exit(1); }

let challenge;
try {
  challenge = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
} catch (e) {
  console.error("FAIL Gate2: PAYMENT-REQUIRED is not valid base64 JSON:", e.message);
  process.exit(1);
}
console.error("decoded challenge:", JSON.stringify(challenge, null, 2));

const fail = (m) => { console.error("FAIL Gate2:", m, "-> route to Plan 3"); process.exit(1); };

if (challenge.x402Version !== 2) fail(`x402Version is ${challenge.x402Version}, expected 2`);
if (!challenge.resource || typeof challenge.resource !== "object") fail("missing resource object");
if (!challenge.resource.url) fail("missing resource.url");
if (challenge.resource.mimeType !== "application/json") fail(`resource.mimeType is ${challenge.resource.mimeType}, expected application/json`);
if (!Array.isArray(challenge.accepts) || challenge.accepts.length === 0) fail("accepts[] missing or empty");

const a = challenge.accepts[0];
if (a.network !== "eip155:196") fail(`accepts[0].network is ${a.network}, expected eip155:196 (X Layer)`);

// USDT0, 6 decimals — never USDG, never 18dp
const decimals = a.asset?.decimals ?? a.decimals;
if (Number(decimals) !== 6) fail(`asset decimals is ${decimals}, expected 6 (USDT0)`);
const sym = (a.asset?.symbol ?? a.assetSymbol ?? "").toUpperCase();
if (sym && sym !== "USDT0" && sym !== "USDT") fail(`asset symbol is ${sym}, expected USDT0`);
const badUsdg = "0x4ae46a";
const assetAddr = (a.asset?.address ?? a.asset ?? "").toString().toLowerCase();
if (assetAddr.startsWith(badUsdg)) fail("asset is the old USDG address (0x4ae46a...) -> must be USDT0");

// maxTimeoutSeconds (field name is maxTimeoutSeconds, not requiredDeadlineSeconds)
const timeout = a.maxTimeoutSeconds ?? challenge.maxTimeoutSeconds;
if (timeout !== undefined && Number(timeout) !== 300) console.error(`WARN: maxTimeoutSeconds is ${timeout}, spec says 300`);

console.log("PASS Gate2-decode: valid v2 challenge, eip155:196, USDT0/6dp");
```

- [ ] **Step 2: Write the gate script** `scripts/gate/gate2-x402.sh` that POSTs to the registered paid path, asserts `402`, extracts the `PAYMENT-REQUIRED` header, and pipes it to the decoder:

```bash
#!/usr/bin/env bash
# Gate 2 — x402 standard validation (OKX Test 2)
set -euo pipefail
cd "$(dirname "$0")/../.."

# read the registered endpoint from chain (same source as Gate 1)
BASE="$(onchainos agent get-agents --agent-ids 6013 | jq -r '[.. | .serviceList? // empty] | add | .[].endpoint // empty' | head -n1)"
[ -n "$BASE" ] || { echo "FAIL Gate2: no registered endpoint -> route to Plan 2"; exit 1; }
echo "paid endpoint under test: $BASE"

# capture full response (headers + body) of a POST to the paid path
RESP="$(curl -i -s -X POST "$BASE" -H 'content-type: application/json' -d '{"address":"0x0000000000000000000000000000000000000001","chains":["ethereum"]}')"
echo "$RESP" > docs/listing-gate/gate2-raw-response.txt

# 2a. must be HTTP 402
STATUS="$(printf '%s' "$RESP" | head -n1 | tr -d '\r')"
echo "status line: $STATUS"
echo "$STATUS" | grep -q ' 402' || { echo "FAIL Gate2: paid path did not return 402 (got: $STATUS) -> route to Plan 3"; exit 1; }

# 2b. extract the base64 PAYMENT-REQUIRED header (byte-exact name)
HDR="$(printf '%s' "$RESP" | tr -d '\r' | grep -i '^PAYMENT-REQUIRED:' | head -n1 | sed 's/^[Pp][Aa][Yy][Mm][Ee][Nn][Tt]-[Rr][Ee][Qq][Uu][Ii][Rr][Ee][Dd]:[[:space:]]*//')"
[ -n "$HDR" ] || { echo "FAIL Gate2: no PAYMENT-REQUIRED header on the 402 -> route to Plan 3"; exit 1; }

# 2c. decode + assert the v2 challenge
printf '%s' "$HDR" | node scripts/gate/decode-payment-required.mjs

echo "PASS Gate2: 402 + valid base64 PAYMENT-REQUIRED v2 challenge (eip155:196, USDT0/6dp)"
```

- [ ] **Step 3: Make executable and run.**

```bash
chmod +x scripts/gate/gate2-x402.sh
./scripts/gate/gate2-x402.sh | tee docs/listing-gate/gate2-x402.md
```

Expected: last line `PASS Gate2: ...`. Any `FAIL Gate2:` exits non-zero — STOP and route to Plan 3 (feeding Plan 2) per the reason.

- [ ] **Step 4: Manual mirror of OKX's own self-check** (the exact command an OKX reviewer runs), to confirm the script is not masking anything:

```bash
BASE=$(onchainos agent get-agents --agent-ids 6013 | jq -r '[.. | .serviceList? // empty] | add | .[].endpoint // empty' | head -n1)
curl -i -X POST "$BASE" -H 'content-type: application/json' -d '{"address":"0x0000000000000000000000000000000000000001","chains":["ethereum"]}'
```

Expected: `HTTP/… 402`, a `PAYMENT-REQUIRED:` header present, and a body describing the challenge. Eyeball that the network is `eip155:196` and the asset is USDT0.

- [ ] **Step 5: Commit evidence + scripts.**

```bash
git add scripts/gate/gate2-x402.sh scripts/gate/decode-payment-required.mjs docs/listing-gate/gate2-x402.md docs/listing-gate/gate2-raw-response.txt
git commit -m "gate: Gate 2 x402 standard PASS (402 + v2 PAYMENT-REQUIRED, USDT0/eip155:196)"
```

- [ ] **Verification (hard assertion):** `./scripts/gate/gate2-x402.sh` exits `0` with last line `PASS Gate2`. The decoded challenge in `docs/listing-gate/gate2-x402.md` shows `x402Version:2`, `resource`, non-empty `accepts`, `network: eip155:196`, and USDT0 with 6 decimals. If ANY field is wrong, this gate is RED and resubmission is blocked.

---

## Task 3: GATE 3 — A2A responsiveness (OKX Test 3)

**Files:**
- Create: `docs/listing-gate/gate3-a2a.md` (evidence)
- Create: `scripts/gate/gate3-a2a.mjs` (send task + user prompt, measure latency, assert)
- Reference: Plan 7 daemon; `communicationAddress 0x835C02C82a1DCCe73585D23DFe07A939AB971707`

**Interfaces:**
- Consumes: the always-on `okx-a2a` daemon + AI adapter (Plan 7) reachable at `communicationAddress` over XMTP.
- Produces: a PASS/FAIL that asserts a real `a2a-agent-chat` task AND the OKX.ai user prompt each receive a non-empty AI response within the platform timeout (`maxTimeoutSeconds: 300`), with the measured latency recorded.

- [ ] **Step 1: Confirm the daemon is up first** (fail fast before spending a round-trip). The daemon keeps `onlineStatus: 1` and answers tasks; if it is down, Gate 3 cannot pass.

```bash
onchainos agent get-agents --agent-ids 6013 | jq '{onlineStatus, communicationAddress}'
# and, if Plan 7 exposed a health endpoint on the daemon host, hit it:
# curl -sf https://<daemon-host>/health && echo " daemon healthy"
```

Expected: `onlineStatus: 1` and `communicationAddress: "0x835C02C82a1DCCe73585D23DFe07A939AB971707"`. If `onlineStatus` is not `1`, STOP and route to Plan 7.

- [ ] **Step 2: Write the A2A probe** `scripts/gate/gate3-a2a.mjs`. It sends the real OKX.ai user prompt and an `a2a-agent-chat` task envelope to `communicationAddress`, measures elapsed time, and asserts a non-empty on-time reply. Use the project's existing A2A/XMTP send path (the same the `okx-ai` skill uses) — do not invent a transport. If a CLI send exists (`onchainos agent chat` / `onchainos a2a send`), prefer it; else use the daemon's send helper from Plan 7.

```js
#!/usr/bin/env node
// Gate 3 — A2A responsiveness. Sends the OKX.ai user prompt + an a2a-agent-chat
// task to communicationAddress and asserts a real, on-time response.
import { execFileSync } from "node:child_process";

const COMM = "0x835C02C82a1DCCe73585D23DFe07A939AB971707";
const AGENT_ID = "6013";
const TIMEOUT_MS = 300_000; // maxTimeoutSeconds: 300 (platform timeout)
const fail = (m) => { console.error("FAIL Gate3:", m, "-> route to Plan 7"); process.exit(1); };

// Replace this sender with the project's real A2A send command discovered in Step 2.
// It MUST send to COMM and return the counterparty reply text (or throw on timeout).
function sendAndAwait(text, msgType) {
  const start = Date.now();
  let out;
  try {
    out = execFileSync("onchainos", ["agent", "chat", "--agent-id", AGENT_ID, "--to", COMM, "--message", text, "--wait", String(TIMEOUT_MS)], { encoding: "utf8", timeout: TIMEOUT_MS + 5_000 });
  } catch (e) {
    fail(`no response to ${msgType} within ${TIMEOUT_MS}ms (${e.message})`);
  }
  const ms = Date.now() - start;
  return { reply: (out || "").trim(), ms };
}

// Probe A: the exact OKX.ai user prompt from the rejection analysis
const a = sendAndAwait("I would like to use the services of agent ID 6013", "user-prompt");
console.error(`user-prompt reply in ${a.ms}ms:`, a.reply.slice(0, 400));
if (!a.reply) fail("empty reply to the OKX.ai user prompt");
if (a.ms > TIMEOUT_MS) fail(`user-prompt reply took ${a.ms}ms > ${TIMEOUT_MS}ms timeout`);

// Probe B: a real a2a-agent-chat task envelope
const b = sendAndAwait(JSON.stringify({ msgType: "a2a-agent-chat", jobId: `gate-${Date.now()}`, sender: { role: "USER" }, message: "Analyze wallet 0x0000000000000000000000000000000000000001 and describe its trading persona." }), "a2a-agent-chat");
console.error(`a2a-agent-chat reply in ${b.ms}ms:`, b.reply.slice(0, 400));
if (!b.reply) fail("empty reply to a2a-agent-chat task");
if (b.ms > TIMEOUT_MS) fail(`a2a-agent-chat reply took ${b.ms}ms > ${TIMEOUT_MS}ms timeout`);

console.log(`PASS Gate3: user-prompt ${a.ms}ms, a2a-agent-chat ${b.ms}ms, both non-empty and within ${TIMEOUT_MS}ms`);
```

- [ ] **Step 3: Reconcile the sender command with the real transport.** Before running, confirm the `execFileSync("onchainos", [...])` invocation matches this project's actual A2A send interface (check the `okx-ai` skill usage / Plan 7 daemon docs). If the real interface differs, edit the `sendAndAwait` body to use it — the assertion logic (non-empty + within `TIMEOUT_MS`) stays identical. Do NOT weaken the timeout or the non-empty check.

- [ ] **Step 4: Run the probe.**

```bash
node scripts/gate/gate3-a2a.mjs 2>&1 | tee docs/listing-gate/gate3-a2a.md
```

Expected: last line `PASS Gate3: user-prompt <ms>ms, a2a-agent-chat <ms>ms, both non-empty and within 300000ms`. Any `FAIL Gate3:` exits non-zero — STOP and route to Plan 7.

- [ ] **Step 5: Sanity-read the replies.** Confirm the two replies in `docs/listing-gate/gate3-a2a.md` are REAL Alter Ego analysis text (a persona / pattern answer), not a canned "online" heartbeat or an error string. A heartbeat-only reply is a FAIL even if non-empty — mark it and route to Plan 7 (AI adapter not wired).

- [ ] **Step 6: Commit evidence + probe.**

```bash
git add scripts/gate/gate3-a2a.mjs docs/listing-gate/gate3-a2a.md
git commit -m "gate: Gate 3 A2A responsiveness PASS (user-prompt + a2a-agent-chat answered on time)"
```

- [ ] **Verification (hard assertion):** `node scripts/gate/gate3-a2a.mjs` exits `0` with last line `PASS Gate3`. Both replies are non-empty, real analysis text, and measured under 300000ms, with the latencies recorded in the evidence file. If either probe times out, is empty, or returns a heartbeat-only string, this gate is RED and resubmission is blocked.

---

## Task 4: Pre-resubmit CHECKLIST — product-side readiness

**Files:**
- Create: `docs/listing-gate/gate4-product-readiness.md` (evidence)
- Reference: Plans 1, 5, 6 artifacts

**Interfaces:**
- Consumes: the live deployment + the Plan 1/5/6 deliverables.
- Produces: a PASS/FAIL confirming the whole app is proven working end-to-end, not just protocol-conformant, before the agent is put back in front of users.

- [ ] **Step 1: Plan 1 differential test is green against the LIVE URL.** Run the real differential guard (two distinct wallets → different, non-empty analyses) pointed at the live `wine-mu` deploy with `DEMO_MODE` unset (real path):

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
BASE_URL=https://alter-ego-wine-mu.vercel.app npx playwright test tests/differential.spec.ts
```

Expected: PASS. If FAIL, STOP and route to Plan 1.

- [ ] **Step 2: The live 500 is gone.** The pre-rejection state had `/api/analyze` returning 500 on the real path. Confirm a real 200 with populated output:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://alter-ego-wine-mu.vercel.app/api/analyze \
  -H 'content-type: application/json' \
  -d '{"address":"0x0000000000000000000000000000000000000001","chains":["ethereum"]}'
```

Expected: `200` (not `500`). If `500`, STOP and route to Plan 1.

- [ ] **Step 3: Honest copy (Plan 5).** Confirm no dishonest claims, correct live/clone URLs, and reconciled tx counts. Grep the submission/README surfaces for known-bad artifacts and eyeball the copy:

```bash
grep -rniE "alter-ego-demo\.vercel\.app|21,?800|coming soon|TODO|placeholder" README.md docs/ src/app 2>/dev/null || echo "no bad-copy hits"
```

Expected: `no bad-copy hits` (or every hit is confirmed benign). The registered/advertised live URL must be `wine-mu`, never `alter-ego-demo`. If bad copy remains, route to Plan 5.

- [ ] **Step 4: Demo (Plan 6) exists and reflects the working flow.** Confirm the re-recorded demo asset is present and is the live-URL recording, not the old broken take:

```bash
ls -la docs/**/demo* public/**/demo* *.mp4 2>/dev/null || find . -iname "*demo*.mp4" -not -path "./node_modules/*"
```

Expected: the current 1920x1080 demo from Plan 6 is present. If missing or stale, route to Plan 6.

- [ ] **Step 5: Record the checklist result** in `docs/listing-gate/gate4-product-readiness.md` as a table (item | command | result | owning plan if red), then commit:

```bash
git add docs/listing-gate/gate4-product-readiness.md
git commit -m "gate: Gate 4 product readiness PASS (differential green, no live 500, honest copy, demo present)"
```

- [ ] **Verification (hard assertion):** all four steps PASS and are recorded in `gate4-product-readiness.md`. If any is red, resubmission is blocked and the item is routed to its owning plan.

---

## Task 5: TERMINAL resubmit — only after all gates are green

**Files:**
- Create: `docs/listing-gate/RESUBMIT-EVIDENCE.md` (the final green-run manifest)
- Reference: all `docs/listing-gate/gate*.md`

**Interfaces:**
- Consumes: the four green gate evidence files.
- Produces: the actual OKX resubmission (`onchainos agent activate --agent-id 6013` / resubmit via chat) and a manifest linking every gate's PASS evidence. This is the ONLY action in the plan that changes external state, and it is guarded.

- [ ] **Step 1: All-gates-green precondition check** (fail loud if any gate did not pass — this is the physical guard on Dami's "no submission until green" directive):

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
set -e
grep -q "^PASS Gate1" docs/listing-gate/gate1-reachability.md    || { echo "BLOCKED: Gate 1 not green"; exit 1; }
grep -q "^PASS Gate2" docs/listing-gate/gate2-x402.md            || { echo "BLOCKED: Gate 2 not green"; exit 1; }
grep -q "^PASS Gate3" docs/listing-gate/gate3-a2a.md             || { echo "BLOCKED: Gate 3 not green"; exit 1; }
test -f docs/listing-gate/gate4-product-readiness.md            || { echo "BLOCKED: Gate 4 checklist missing"; exit 1; }
echo "ALL GATES GREEN — resubmission permitted"
```

Expected: `ALL GATES GREEN — resubmission permitted`. If it prints `BLOCKED:`, STOP — do NOT resubmit; route to the owning plan for the failed gate.

- [ ] **Step 2: Re-run all three OKX gates one final time back-to-back** (guard against drift between when each gate was first passed and now — chain state or a redeploy could have changed):

```bash
./scripts/gate/gate1-reachability.sh && ./scripts/gate/gate2-x402.sh && node scripts/gate/gate3-a2a.mjs
```

Expected: three consecutive `PASS` lines. If any fails now, STOP and route back — do not resubmit on stale evidence.

- [ ] **Step 3: Write the resubmit evidence manifest** `docs/listing-gate/RESUBMIT-EVIDENCE.md` linking each gate file, the registered `wine-mu` endpoint, the decoded x402 challenge, and the two measured A2A latencies. This is the record that the green state existed at resubmit time.

- [ ] **Step 4: Fire the resubmit action.** Prefer the direct CLI activation; fall back to the OKX.AI chat resubmit if activation is not the correct verb for a rejected listing:

```bash
onchainos agent activate --agent-id 6013
# then re-read status to confirm it moved out of "rejected" into pending/approved review
onchainos agent get-agents --agent-ids 6013 | jq '{approvalDisplayStatus, onlineStatus, serviceList}'
```

If `activate` is not the resubmission path for a rejected listing, resubmit via the OKX.AI chat flow (the `okx-ai` skill: request re-review of agent 6013) and record which path was used.

Expected: `approvalDisplayStatus` moves off `5` (rejected) into a pending/under-review state; `serviceList` stays populated with the `wine-mu` URL.

- [ ] **Step 5: Commit the terminal manifest.**

```bash
git add docs/listing-gate/RESUBMIT-EVIDENCE.md
git commit -m "gate: TERMINAL resubmit of #6013 after all listing-readiness gates green"
```

- [ ] **Verification (hard assertion):** Step 1 printed `ALL GATES GREEN`; Step 2 re-ran three fresh PASSes; the resubmit action executed and `approvalDisplayStatus` is no longer `5`; `RESUBMIT-EVIDENCE.md` links all four gate files. The gate is complete only when the on-chain status confirms the resubmission landed.

---

## Self-Review notes

- **Coverage of OKX's three tests:** Gate 1 (Task 1) = Test 1 reachability + registration (`get-agents` serviceList non-empty + `wine-mu` endpoint + `curl -sI` 200, no SSO redirect). Gate 2 (Task 2) = Test 2 x402 standard (`curl -i -X POST` → 402 + base64 `PAYMENT-REQUIRED` decoded and asserted v2 / eip155:196 / USDT0-6dp). Gate 3 (Task 3) = Test 3 A2A responsiveness (OKX.ai user prompt + `a2a-agent-chat` to `communicationAddress`, non-empty + within 300s, latency measured). Every test is encoded as a fail-loud, evidence-producing task.
- **Hard-gate discipline:** every task ends in a hard assertion that exits non-zero on failure; the terminal resubmit (Task 5) is physically guarded by an all-gates-green precondition AND a final back-to-back re-run, so a stale-evidence resubmit is impossible. This directly enforces Dami's "no submission until every check is green".
- **Reads live state, never assumes:** Gates 1 and 2 read the registered endpoint from the chain at run time rather than hardcoding it, so the gate cannot pass against a URL the platform will not actually call.
- **No feature work / no placeholders:** this plan only verifies and, once green, resubmits. The two spots that must be reconciled to the real interface (Gate 3 sender command in Task 3 Step 3; the resubmit verb in Task 5 Step 4) are explicit reconcile steps with a rule that the assertion logic must not be weakened — not placeholders.
- **Routing on failure:** the Task 0 table routes each possible failure to its owning plan (1/2/3/5/6/7). A red gate never silently degrades the pass; it stops and names the owner.
- **Authoritative-fact fidelity:** all x402 literals (`x402Version`, `PAYMENT-REQUIRED`, `X-PAYMENT`), the network (`eip155:196`), the asset (USDT0/6dp, explicit USDG-address reject), `maxTimeoutSeconds: 300`, the `communicationAddress`, and the `wine-mu` vs `alter-ego-demo` distinction come verbatim from `docs/LISTING-REJECTION-ANALYSIS.md`; none are re-derived.
- **Dependency honesty:** Task 0 Step 3 fails the whole gate if any Plan 1-7 artifact is missing on the branch, so this terminal plan cannot report green on top of an incomplete stack.
