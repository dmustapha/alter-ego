# A2A Daemon — Full, Always-On (Plan 7 of 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix OKX listing rejection **Reason 3** ("No response from your Agent, task timed out") for agent #6013. Deploy the FULL `okx-a2a` daemon — XMTP listener + `task` request handling + `ai` adapter — always-on in the cloud, so #6013 actually ANSWERS inbound `a2a-agent-chat` task messages and OKX.ai user prompts ("I would like to use the services of agent ID 6013") within the platform timeout, delivering Alter Ego's real service (Trading Persona Analysis) instead of timing out. This REVERSES the earlier presence-only decision (`docs/superpowers/specs/2026-07-20-presence-daemon-fly-design.md`, Scope B → Scope C) and SUPERSEDES that spec.

**Architecture:** One always-on Fly.io machine runs `okx-a2a run` (not the presence-only heartbeat loop). The daemon does three things concurrently: (1) shells `onchainos agent heartbeat --chain-index 196` every ~40s to hold `onlineStatus: 1` (unchanged from Scope B, keeps presence portable via the copied TEE session); (2) syncs the XMTP inbox for #6013's `communicationAddress` (`0x835C02C82a1DCCe73585D23DFe07A939AB971707`) and stores inbound task/system envelopes as jobs under `$OKX_AGENT_TASK_HOME/jobs`; (3) on an inbound `a2a-agent-chat` or system-event envelope, invokes the configured **AI adapter** (`okx-a2a ai exec --provider <p> --job-id <id> --to-agent-id <id>`), which produces a reply and delivers it back over XMTP via `okx-a2a session send` / `onchainos agent` delivery. The AI adapter is wired so an inbound task → runs Alter Ego's analysis (by calling the live `/api/a2mcp` endpoint from Plan 1) → returns a real Trading Persona result inside the platform timeout. The Mac daemon (`launchd com.okx.a2a`, PID 898) is retired once the cloud daemon is proven to answer alone.

**Tech Stack:** `okx-a2a` 0.1.9 (homebrew `/opt/homebrew/bin/okx-a2a`), `onchainos` CLI (curl-installer `~/.local/bin/onchainos`), Node 24 (daemon runtime — Mac runs `node 24.10.0`), Docker (`node:24-slim`), Fly.io (`flyctl` present at `/opt/homebrew/bin/flyctl`), a persistent Fly volume for identity + XMTP state, Fly secrets for the identity files. The live Alter Ego analysis surface is the Vercel `/api/a2mcp` endpoint made genuinely-live by Plan 1.

## Global Constraints

- **No secrets in the image or in git.** The 4 identity files and any provider credential are Fly secrets (base64), materialized to the volume at boot only if absent, chmod 600. `keyring.enc` / `session.json` are owner-wallet-capable — treat as maximum-sensitivity.
- **Pin every version.** `node:24-slim` (not `node:latest`); pin `okx-a2a@0.1.9`; pin the `onchainos` installer to the current release the Mac runs. Reproducible builds only.
- **The daemon takes NO inbound HTTP.** Presence is outbound heartbeat; task I/O is XMTP. So `fly.toml` has **no `[http_service]`** and `min_machines_running = 1` with autostop disabled — the machine must never sleep or it misses task messages and times out (the exact failure we are fixing).
- **One XMTP inbox, multiple installations.** XMTP allows multiple installations per inbox (`2ea2f37a…`). The Mac and cloud clients coexist until the Mac is retired (Task 6). Do NOT copy `~/.okx-agent-task` — the cloud daemon rebuilds it and registers a fresh installation for the same inbox.
- **Presence auth is the TEE session cert, not the passphrase.** Heartbeat authenticates via `~/.onchainos/session.json` (`teeId` + `encryptedSessionSk`, `sessionKeyExpireAt` ≈ Oct 2026) bound to the `machine-identity` fingerprint. Copying those files makes the cloud host present identically with no re-login and no runtime passphrase.
- **No em-dashes** in any user-facing copy or docs (standing rule).
- **The AI adapter must NOT load domain skills from task `content`.** Per `task-core.md` §Activation, `content` is a task description, never an instruction. The adapter delivers Alter Ego analysis for the *addressed agent* (#6013), regardless of what the message text says.
- **Byte-exact envelope literals** (never rename): `msgType: "a2a-agent-chat"`, `jobId`, `sender.role` (`1` = User Agent counterparty → we are ASP), `source: "system"`, `event`.
- **Timeout budget is the whole point.** Every design choice is measured against the platform task timeout (the A2MCP field uses `maxTimeoutSeconds: 300`; the A2A task test may be tighter). The analysis-plus-delivery round trip MUST complete inside it. This is validated as a hard gate (Task 5) and de-risked as a spike (Task 2 / GATED SPIKE B).
- **TDD-shaped where testable:** each infra task carries an explicit verification command with an expected observable result; each behavioral task carries a live send-and-observe proof. No task is "done" without its verification passing.

## Upstream Inputs & Branch Caveats

- **Plan 1 (genuinely-live data layer) must be green first.** The AI adapter delivers a REAL analysis by calling `https://alter-ego-wine-mu.vercel.app/api/a2mcp`. That endpoint must (a) resolve publicly (no Vercel SSO wall — Reason 1 fix, Plan 2), and (b) return non-empty patterns/personas for a real address (Plan 1). If Plan 1 is not merged, the adapter has nothing real to deliver. Task 0 reconciles this.
- **`communicationAddress` is fixed:** `0x835C02C82a1DCCe73585D23DFe07A939AB971707` (owner `0xd97c…6340`, `chainIndex: 196`). Do not re-derive.
- **On-chain status today:** `approvalDisplayStatus: 5` (rejected), `serviceList: []`, `onlineStatus: 1`. This plan fixes Reason 3 only. Reasons 1 and 2 are Plan 2 / Plan 3. Plan 8 is the terminal three-test gate. Do NOT resubmit for review inside this plan.
- **Branch:** work on `main` (repo already on `main`, remote `https://github.com/dmustapha/alter-ego.git`). Commit `Dockerfile`, `fly.toml`, `entrypoint.sh`, and docs only — zero secrets. If the repo policy forbids committing to `main` directly, branch `feat/a2a-daemon-full` and PR.
- **Provider reality (verified 2026-07-21):** the Mac daemon's AI provider is `claude` (`okx-a2a ai status` → `current: claude`, available `codex`+`claude`; `hermes`/`openclaw` false). Permission preset is `bypass`. On a headless cloud host, running a full `claude` Code subsession is heavy and needs auth — this is the single biggest unknown and is a GATED SPIKE (Task 2). Do not assume it "just works" in Docker.
- **CLI install paths (verified):** `okx-a2a` = homebrew (`/opt/homebrew/bin/okx-a2a`, v0.1.9); `onchainos` = curl-installer (`~/.local/bin/onchainos`). The Dockerfile must install the SAME versions via install methods that work on Linux (homebrew is macOS; on Linux install `okx-a2a` from its npm package — confirm in Task 1).
- **AI dispatch flow (verified from live daemon + `-h`):** inbound envelope → daemon stores a job → daemon invokes the AI adapter (`okx-a2a ai exec --provider <p> --job-id <id> --to-agent-id <id> [--cwd <path>]`) → the adapter's subsession reads the okx-ai skill / `task-core.md`, does the work, and calls `okx-a2a session send --job-id <id> --content <reply>` (or `onchainos agent` delivery) to answer the counterparty. `okx-a2a session dispatch --job-id <id>` re-triggers a stored job's AI dispatch (used for manual proof in Task 5). `okx-a2a task requests` lists pending requests; `okx-a2a task reject` denies one.

---

## Task 0: Reconcile with upstream (P0, do first)

**Files:** none created; this is a verification gate that reads the live world before building.

**Interfaces:**
- Produces: a go/no-go confirmation that (a) Plan 1's `/api/a2mcp` is live and returns real analysis, (b) the identity files exist and the session is unexpired, (c) `okx-a2a`/`onchainos` versions are pinned, (d) the Mac daemon is currently the only responder. Consumed by every later task.

- [ ] **Step 1: Confirm the analysis endpoint is live and returns real data.** The adapter's payload source.

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -I https://alter-ego-wine-mu.vercel.app/api/a2mcp
curl -sS -X POST https://alter-ego-wine-mu.vercel.app/api/a2mcp \
  -H 'content-type: application/json' \
  -d '{"address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","chains":["ethereum"]}' | head -c 600
```

Expected: the HEAD is `200` (not `302`-to-`vercel.com/sso-api`), and the POST returns JSON with non-empty `patterns`/`personas`. If HEAD is `302`, STOP — Vercel deployment protection is on (Reason 1); Plan 2 must land first. If the POST is empty/500, STOP — Plan 1 is not green.

- [ ] **Step 2: Confirm the identity files exist, are complete, and the session is unexpired.**

```bash
ls -la ~/.onchainos/session.json ~/.onchainos/keyring.enc ~/.onchainos/machine-identity ~/.onchainos/wallets.json
node -e 'const s=require(require("os").homedir()+"/.onchainos/session.json");console.log("expireAt",s.sessionKeyExpireAt,"now",Math.floor(Date.now()/1000),"unexpired",s.sessionKeyExpireAt>Math.floor(Date.now()/1000))'
```

Expected: all 4 files present; `unexpired true` (`sessionKeyExpireAt` ≈ 1793131338 ≈ Oct 2026). If expired, STOP and re-login on the Mac (`onchainos wallet login`) before copying anything.

- [ ] **Step 3: Confirm CLI versions and provider availability (the numbers this plan pins).**

```bash
okx-a2a --version                       # expect 0.1.9
onchainos --version                     # record exact version to pin in the Dockerfile
okx-a2a ai status --json                # expect current provider + available list
okx-a2a config permissions              # expect preset: bypass
okx-a2a status                          # expect running pid=<n> (the Mac daemon, still primary)
```

Expected: `okx-a2a` `0.1.9`; record `onchainos` version; `ai status` shows the current provider; permissions `bypass`; daemon running. Record the `onchainos` version string into this plan's Task 1 pin.

- [ ] **Step 4: Confirm #6013 is online and owned by this wallet (the agent we are making responsive).**

```bash
onchainos agent get-agents --agent-ids 6013 2>&1 | grep -iE "onlineStatus|communicationAddress|approvalDisplayStatus|owner" | head
```

Expected: `onlineStatus: 1`, `communicationAddress: 0x835C02C82a1DCCe73585D23DFe07A939AB971707`, `approvalDisplayStatus: 5`. This is the pre-state; Plan 7 does not change on-chain fields, only responsiveness.

**Gate:** all four steps green → proceed. Any STOP condition halts Plan 7 until its owning plan lands.

---

## Task 1: CLI-install-on-Linux spike (GATED SPIKE A)

**Files:**
- Create: `docs/A2A-DAEMON-CLI-INSTALL.md` (spike deliverable)
- Throwaway: a scratch Dockerfile probe (deleted at end)

**Interfaces:**
- Produces: the exact, pinned, Linux-working install commands for `okx-a2a@0.1.9` and `onchainos` — consumed by the real Dockerfile in Task 4.

**Why gated:** the Mac installs `okx-a2a` via homebrew (macOS-only) and `onchainos` via a curl-installer. Neither install method is confirmed to work headless on `node:24-slim` (Linux/amd64). The Dockerfile cannot be written until both install paths are proven.

- [ ] **Step 1: Find `okx-a2a`'s npm identity.** homebrew wraps an npm package. Determine the publishable name/version so it installs on Linux.

```bash
brew info okx-a2a 2>&1 | head -20                 # look for the upstream npm/tarball source
cat "$(brew --prefix)/bin/okx-a2a" | head -5      # shebang / launcher reveals the JS entry + package
npm view okx-a2a version 2>&1 || npm view @okxweb3/okx-a2a version 2>&1   # probe likely npm names
```

Record the exact `npm i -g <pkg>@0.1.9` (or tarball URL) that yields `okx-a2a 0.1.9`.

- [ ] **Step 2: Find `onchainos`'s Linux installer.** It lives at `~/.local/bin/onchainos` (curl-installer). Identify the install script + a Linux/amd64 asset.

```bash
file ~/.local/bin/onchainos; head -5 ~/.local/bin/onchainos 2>/dev/null
onchainos --version                               # the version to pin
grep -rniE "install|curl|onchainos" ~/.onchainos/last_check 2>/dev/null | head
```

Record the install command (curl one-liner or direct binary URL) that yields the SAME `onchainos` version on Linux/amd64.

- [ ] **Step 3: Prove both install in a throwaway container.** Do NOT write the real Dockerfile yet.

```bash
cat > /tmp/probe.Dockerfile <<'EOF'
FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
# <PASTE okx-a2a install from Step 1>
# <PASTE onchainos install from Step 2>
RUN okx-a2a --version && onchainos --version
EOF
docker build -f /tmp/probe.Dockerfile -t a2a-probe /tmp
```

Expected: the build's final `RUN` prints `okx-a2a 0.1.9` and the pinned `onchainos` version. If either CLI fails to install headless, DECISION: escalate — either (a) vendor a prebuilt Linux binary as a build arg, or (b) fall back to a base image where the install method is known to work. Record the outcome.

- [ ] **Step 4: Document + clean up.** Write `docs/A2A-DAEMON-CLI-INSTALL.md` with the exact pinned install lines, the base image, and any apt deps. Delete the probe.

```bash
rm /tmp/probe.Dockerfile
git add docs/A2A-DAEMON-CLI-INSTALL.md && git commit -m "docs: pinned Linux install for okx-a2a + onchainos (daemon spike A)"
```

**Verification:** `docs/A2A-DAEMON-CLI-INSTALL.md` exists and its install lines reproduce `okx-a2a 0.1.9` + the pinned `onchainos` version in a clean container.

---

## Task 2: AI-adapter strategy spike (GATED SPIKE B — the crux)

**Files:**
- Create: `docs/A2A-AI-ADAPTER-DECISION.md` (spike deliverable — the architecture decision record)

**Interfaces:**
- Produces: the chosen AI-adapter mechanism for the cloud host + the exact `okx-a2a config provider` value and any provider credential, plus a measured round-trip latency. Consumed by Task 3 (wiring) and Task 4 (Dockerfile + secrets).

**Why gated (two real unknowns, flagged not guessed):**
1. **Exact response mechanism.** The daemon invokes `okx-a2a ai exec --provider <p> --job-id <id> --to-agent-id <id> --cwd <path>`; the subsession must end by delivering the reply via `okx-a2a session send`. It is NOT yet proven, on this machine, exactly which artifact the `exec` subsession returns vs. which command actually puts the message on XMTP, nor whether `exec` auto-delivers or the skill's `session send` does. This must be observed, not assumed.

- [ ] **Step 1: Observe the real dispatch → delivery flow on the Mac.** Send a controlled `a2a-agent-chat` to #6013 (from a second agent or the OKX.ai prompt) and trace what the daemon runs.

```bash
okx-a2a logs 2>&1 | tail -0 &        # start tailing
# trigger: from OKX.ai, prompt "I would like to use the services of agent ID 6013"
#   OR send an a2a-agent-chat envelope to communicationAddress from a peer agent
okx-a2a task requests --json          # confirm the request is stored
```

Watch the log for the literal `okx-a2a ai exec …` invocation and the subsequent delivery command. Record: the exact `ai exec` argv the daemon uses, and whether delivery happens inside `exec` or via a separate `session send` the subsession issues. This is the ground truth for "exact response mechanism."

- [ ] **Step 2: Decide the adapter strategy.** Two candidates; pick by the decision rule below.
  - **Candidate A — real provider CLI (`claude` or `codex`) in the image.** Faithful to the Mac. Cost: bundle the CLI + auth (API key as a Fly secret), heavier image, per-task LLM latency + spend, and the subsession must reliably reach `session send`. This is what OKX's own test exercises end-to-end.
  - **Candidate B — lightweight deterministic adapter.** Alter Ego's service is a *deterministic* analysis already served by `/api/a2mcp`; an LLM is not required to produce the answer. Provide a minimal adapter that, on an inbound `a2a-agent-chat`, (i) POSTs the counterparty's address to `/api/a2mcp`, (ii) formats the returned Trading Persona into a short chat reply, (iii) delivers it via `okx-a2a session send`. Wire it as the configured provider IF `okx-a2a config provider` accepts a custom/script provider, OR as a thin `codex`/`claude` prompt whose ONLY instruction is "call this endpoint and paste the JSON" (bounded, cheap, fast, deterministic).

  **Decision rule:** prefer Candidate B if (and only if) `okx-a2a` supports pointing the adapter at a custom command/script provider AND a probe shows delivery via `session send` works from a non-LLM process. Otherwise use Candidate A with the CHEAPEST available provider that reliably delivers, constraining its prompt to "fetch `/api/a2mcp` for the given address and return the persona verbatim" so it does not free-associate. Whichever is chosen, the analysis content is the REAL `/api/a2mcp` output, never LLM-invented.

- [ ] **Step 3: Measure the round-trip against the timeout budget.** Whichever candidate, time inbound-envelope → delivered-reply.

```bash
# with a stopwatch around a real dispatch (Step 1 harness):
time okx-a2a ai exec --provider <chosen> \
  --prompt 'For OKX agent 6013 Alter Ego: POST the requester address to https://alter-ego-wine-mu.vercel.app/api/a2mcp and return the persona summary. Then deliver via session send.' \
  --job-id <stored-job-id> --to-agent-id <counterparty-id> --json
```

Expected: total elapsed comfortably under the platform timeout (target < 60s; hard ceiling = the A2A test timeout, and well under `maxTimeoutSeconds: 300`). If it does NOT fit, DECISION: switch to Candidate B (deterministic, sub-second `/api/a2mcp` call + immediate `session send`) — this is the fallback that guarantees the timeout is met. Record the measured number.

- [ ] **Step 4: Record credentials + provider config needed on the host.** If Candidate A: the provider API key (e.g. `ANTHROPIC_API_KEY` for `claude`) becomes a Fly secret. If Candidate B: the script/command provider path + no LLM key. Either way record the exact `okx-a2a config provider --provider <p>` and `okx-a2a config permissions --preset bypass` the entrypoint will run.

- [ ] **Step 5: Document + commit the decision.**

```bash
git add docs/A2A-AI-ADAPTER-DECISION.md && git commit -m "docs: A2A AI-adapter strategy + measured latency (daemon spike B)"
```

**Verification:** `docs/A2A-AI-ADAPTER-DECISION.md` records (a) the observed `ai exec`→delivery flow, (b) the chosen candidate with rationale, (c) a measured round-trip under the timeout, (d) the exact provider config + any secret name. Task 3 cannot start until this is green.

---

## Task 3: Wire the AI adapter to deliver Alter Ego analysis

**Files:**
- Create: `daemon/adapter/` contents per the Task 2 decision:
  - Candidate B: `daemon/adapter/alter-ego-adapter.mjs` (fetch `/api/a2mcp` → format → `session send`) + `daemon/adapter/adapter.test.mjs`
  - Candidate A: `daemon/adapter/PROMPT.md` (the bounded provider prompt) + a small pre/post wrapper if the daemon supports `--cwd`/hooks
- Create: `daemon/adapter/format-persona.mjs` (pure formatter: A2MCP JSON → chat reply string) + `daemon/adapter/format-persona.test.mjs`
- Reference: `src/app/api/a2mcp/route.ts` (the endpoint contract), `src/lib/persona.ts`, `src/lib/types.ts`

**Interfaces:**
- Consumes: an inbound `a2a-agent-chat` envelope (`jobId`, counterparty `agentId`, the requester's wallet address if present in `content`), and the live `/api/a2mcp` response.
- Produces: a delivered XMTP reply containing a real Trading Persona summary, issued via `okx-a2a session send --job-id <id> --content <reply>`.

- [ ] **Step 1: Write the failing formatter test (pure, no network).** The formatter turns `/api/a2mcp` JSON into a bounded chat reply. TDD: test first.

```js
// daemon/adapter/format-persona.test.mjs
import { test } from 'node:test';
import assert from 'node:assert';
import { formatPersona } from './format-persona.mjs';

test('formats a real a2mcp response into a bounded persona reply', () => {
  const sample = { personas: [{ name: 'Patient Accumulator', summary: 'Holds through drawdowns.' }],
    patterns: [{ amplify: [{ tag: 'Disciplined exits' }], guard: [{ tag: 'FOMO on micro-caps' }] }] };
  const reply = formatPersona(sample, '0xabc');
  assert.ok(reply.includes('Patient Accumulator'));
  assert.ok(reply.includes('Alter Ego'));           // branded
  assert.ok(reply.length <= 1200);                  // bounded for chat
  assert.ok(!reply.includes('undefined'));          // no missing-field leaks
});
```

- [ ] **Step 2: Run it, verify it fails.** `node --test daemon/adapter/format-persona.test.mjs` → FAIL (`formatPersona` not found).

- [ ] **Step 3: Implement `format-persona.mjs`** — a pure function `formatPersona(a2mcpJson, address) => string` that pulls the top persona name/summary + top amplify/guard tags into a short branded reply, gracefully handling missing fields (never emits `undefined`), and truncates to ≤ 1200 chars.

- [ ] **Step 4: Run it, verify it passes.** `node --test daemon/adapter/format-persona.test.mjs` → PASS.

- [ ] **Step 5: Implement the adapter path chosen in Task 2.**
  - **Candidate B — `alter-ego-adapter.mjs`:** given `--job-id`, `--to-agent-id`, and the requester address (parsed from the envelope `content`, or a sensible default demo address if the prompt is a bare "use agent 6013"), it: (1) `fetch(A2MCP_URL, {method:'POST', body: {address, chains}})` with a hard `AbortController` timeout well under the platform limit; (2) `formatPersona(json, address)`; (3) shells `okx-a2a session send --job-id <id> --content <reply>` (exact delivery command per Task 2 Step 1 observation). Config via env: `A2MCP_URL` (default `https://alter-ego-wine-mu.vercel.app/api/a2mcp`).
  - **Candidate A — `PROMPT.md`:** the bounded provider prompt instructing the subsession to POST the requester address to `A2MCP_URL`, format via the same rules, and deliver via `session send`. Keep it deterministic and scoped (no domain-skill loading from `content`, per Global Constraints).

- [ ] **Step 6: Write the adapter integration test (mock the endpoint + delivery).**

```js
// daemon/adapter/adapter.test.mjs  (Candidate B)
import { test } from 'node:test';
import assert from 'node:assert';
import { handleTask } from './alter-ego-adapter.mjs';

test('inbound task -> fetches analysis -> emits a session-send with real persona', async () => {
  const calls = [];
  const fakeFetch = async () => ({ ok: true, json: async () => ({ personas:[{name:'Degen Sprinter',summary:'Fast in, fast out.'}], patterns:[] }) });
  const fakeSend = (args) => { calls.push(args); return { ok: true }; };
  await handleTask({ jobId: 'job1', toAgentId: '999', address: '0xabc' }, { fetch: fakeFetch, send: fakeSend });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].content.includes('Degen Sprinter'));
  assert.equal(calls[0].jobId, 'job1');
});
```

- [ ] **Step 7: Run it, verify it passes.** `node --test daemon/adapter/adapter.test.mjs` → PASS.

- [ ] **Step 8: Commit.**

```bash
git add daemon/adapter/ && git commit -m "feat: A2A AI adapter delivers real Alter Ego analysis via a2mcp + session send"
```

**Verification:** both `node --test daemon/adapter/*.test.mjs` pass; the formatter never emits `undefined` and stays bounded; the adapter issues exactly one `session send` carrying the real persona for a mocked inbound task.

---

## Task 4: Dockerfile + Fly.io always-on machine + volume

**Files:**
- Create: `Dockerfile.daemon`
- Create: `fly.daemon.toml`
- Create: `daemon/entrypoint.sh`
- Create: `.dockerignore` (if absent; ensure it excludes `.env*`, `node_modules`, `.next`, `.git`, `~/.onchainos`)
- Reference: `docs/A2A-DAEMON-CLI-INSTALL.md` (Task 1), `docs/A2A-AI-ADAPTER-DECISION.md` (Task 2)

**Interfaces:**
- Consumes: pinned install lines (Task 1), the adapter (Task 3), the provider config (Task 2), the 4 identity files (as Fly secrets).
- Produces: a running Fly machine that heartbeats and answers tasks, with identity + XMTP state on a persistent volume.

- [ ] **Step 1: Write `Dockerfile.daemon`** on `node:24-slim`, using the Task 1 pinned installs. Copy `daemon/` (entrypoint + adapter). Set `HOME=/data` and `OKX_AGENT_TASK_HOME=/data/.okx-agent-task` so both `~/.onchainos` (identity) and `~/.okx-agent-task` (XMTP db3 / sqlite) live on the volume. Do NOT bake any secret. `ENTRYPOINT ["/daemon/entrypoint.sh"]`.

```dockerfile
FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
# <pinned okx-a2a@0.1.9 install from docs/A2A-DAEMON-CLI-INSTALL.md>
# <pinned onchainos install from docs/A2A-DAEMON-CLI-INSTALL.md>
ENV HOME=/data OKX_AGENT_TASK_HOME=/data/.okx-agent-task
COPY daemon/ /daemon/
RUN chmod +x /daemon/entrypoint.sh
RUN okx-a2a --version && onchainos --version   # fail build if either CLI is broken
ENTRYPOINT ["/daemon/entrypoint.sh"]
```

- [ ] **Step 2: Write `daemon/entrypoint.sh`** — materialize identity from Fly secrets (base64) into `/data/.onchainos` chmod 600 ONLY if absent; set the provider config; then `exec okx-a2a run`.

```bash
#!/usr/bin/env bash
set -euo pipefail
mkdir -p /data/.onchainos && chmod 700 /data/.onchainos
mat() { local name="$1" file="$2"; if [ ! -f "$file" ] && [ -n "${!name:-}" ]; then
  echo "${!name}" | base64 -d > "$file" && chmod 600 "$file"; fi; }
mat SESSION_JSON_B64      /data/.onchainos/session.json
mat KEYRING_ENC_B64       /data/.onchainos/keyring.enc
mat MACHINE_IDENTITY_B64  /data/.onchainos/machine-identity
mat WALLETS_JSON_B64      /data/.onchainos/wallets.json
# provider config per docs/A2A-AI-ADAPTER-DECISION.md
okx-a2a config provider --provider "${AI_PROVIDER:-claude}" || true
okx-a2a config permissions --preset bypass || true
exec okx-a2a run
```

- [ ] **Step 3: Write `fly.daemon.toml`** — one app, one always-on machine, NO `[http_service]`, one volume at `/data`.

```toml
app = "alter-ego-daemon"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile.daemon"

[env]
  OKX_AGENT_TASK_HOME = "/data/.okx-agent-task"
  HOME = "/data"
  A2MCP_URL = "https://alter-ego-wine-mu.vercel.app/api/a2mcp"
  AI_PROVIDER = "claude"   # or the Task 2 choice

[[mounts]]
  source = "alter_ego_daemon_data"
  destination = "/data"

[[vm]]
  size = "shared-cpu-1x"
  memory = "1gb"

# always-on: never autostop or the daemon misses task messages
[machines]
  min_machines_running = 1
```

- [ ] **Step 4: Create the app + volume + set secrets.**

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
fly apps create alter-ego-daemon 2>/dev/null || true
fly volumes create alter_ego_daemon_data --region iad --size 1 -a alter-ego-daemon
fly secrets set -a alter-ego-daemon \
  SESSION_JSON_B64="$(base64 -i ~/.onchainos/session.json)" \
  KEYRING_ENC_B64="$(base64 -i ~/.onchainos/keyring.enc)" \
  MACHINE_IDENTITY_B64="$(base64 -i ~/.onchainos/machine-identity)" \
  WALLETS_JSON_B64="$(base64 -i ~/.onchainos/wallets.json)"
# if Task 2 chose a real provider needing a key:
# fly secrets set -a alter-ego-daemon ANTHROPIC_API_KEY="<key>"
```

Expected: `fly volumes list -a alter-ego-daemon` shows the volume; `fly secrets list -a alter-ego-daemon` shows the 4 (or 5) names (values hidden).

- [ ] **Step 5: Commit the infra (zero secrets).**

```bash
git add Dockerfile.daemon fly.daemon.toml daemon/entrypoint.sh .dockerignore
git commit -m "feat: Fly.io always-on A2A daemon image + machine + volume (no secrets)"
```

**Verification:** `git grep -nIE "session|keyring|ANTHROPIC|[0-9a-f]{32}" -- Dockerfile.daemon fly.daemon.toml daemon/entrypoint.sh` returns no secret VALUE (only variable names). `fly secrets list` shows the identity secrets set. The image builds locally: `docker build -f Dockerfile.daemon -t alter-ego-daemon .` succeeds and its final `RUN` prints both CLI versions.

---

## Task 5: Deploy + prove a real task response from the cloud alone

**Files:**
- Create: `docs/A2A-DAEMON-PROOF.md` (the evidence log — timestamps, jobId, delivered content, latency)

**Interfaces:**
- Consumes: the deployed Fly machine.
- Produces: proof that #6013 answers an `a2a-agent-chat` task (and/or the OKX.ai user prompt) within the timeout, from the CLOUD daemon with the Mac daemon STOPPED.

- [ ] **Step 1: Deploy and confirm the daemon booted + heartbeats.**

```bash
fly deploy -c fly.daemon.toml -a alter-ego-daemon
fly logs -a alter-ego-daemon | grep -iE "heartbeat sent|sync tick|okx-agent-task|activeClients" | head
```

Expected: `heartbeat sent` firing on the ~40s cadence and an XMTP sync tick (`agents=1`). If the daemon crash-loops on a missing provider or passphrase, consult Task 2's decision (set the provider secret / preset) and redeploy.

- [ ] **Step 2: Confirm presence from the cloud while the Mac is still up (no regression).**

```bash
onchainos agent get-agents --agent-ids 6013 2>&1 | grep -i onlineStatus
```

Expected: `onlineStatus: 1` (both daemons present the same inbox; XMTP allows it).

- [ ] **Step 3: STOP the Mac daemon — isolate the cloud as the sole responder.**

```bash
launchctl unload ~/Library/LaunchAgents/com.okx.a2a.plist
okx-a2a status    # expect "no running daemon" locally
```

- [ ] **Step 4: Send a REAL task to #6013 and prove a response arrives within the timeout.** Two triggers; run at least the first, ideally both.
  - **A2A task:** from a second OKX agent (or a peer harness), send an `a2a-agent-chat` envelope to `communicationAddress` `0x835C02C82a1DCCe73585D23DFe07A939AB971707` for a real requester address.
  - **OKX.ai user prompt:** in OKX.ai, prompt "I would like to use the services of agent ID 6013".

Then observe the cloud daemon deliver:

```bash
fly logs -a alter-ego-daemon | grep -iE "task request|ai exec|session send|deliver|jobId" | tail -20
```

Expected: within the platform timeout, the log shows the inbound task → `ai exec` (or the Candidate-B adapter) → a `session send` carrying the real Alter Ego persona, and the counterparty/OKX.ai receives a non-empty analysis reply (NOT a timeout). Record the jobId, the delivered content, and the measured latency in `docs/A2A-DAEMON-PROOF.md`.

- [ ] **Step 5: Negative check — confirm it was the CLOUD, not a lingering Mac process.**

```bash
ps aux | grep -i "okx-a2a run" | grep -v grep    # expect NOTHING on the Mac
```

Expected: no local `okx-a2a run` process; the response provably came from Fly.

- [ ] **Step 6: Commit the proof.**

```bash
git add docs/A2A-DAEMON-PROOF.md
git commit -m "docs: proof #6013 answers A2A tasks from the cloud daemon within timeout (Reason 3 fixed)"
```

**Verification:** `docs/A2A-DAEMON-PROOF.md` contains a real jobId, the delivered persona content, a latency under the timeout, and evidence the Mac daemon was down at the time. This is the Reason-3 evidence Plan 8 (test 3) consumes.

---

## Task 6: Retire the Mac daemon

**Files:**
- Modify/Delete: `~/Library/LaunchAgents/com.okx.a2a.plist` (disable autostart)
- Create: `docs/A2A-DAEMON-CUTOVER.md` (the cutover record + rollback)

**Interfaces:**
- Produces: a single always-on responder (the cloud), the Mac permanently out of the loop, and a documented rollback.

- [ ] **Step 1: Permanently disable the Mac autostart** (it was only unloaded in Task 5; make it durable so a reboot does not re-create a second responder).

```bash
launchctl bootout gui/$(id -u)/com.okx.a2a 2>/dev/null || launchctl unload ~/Library/LaunchAgents/com.okx.a2a.plist 2>/dev/null || true
mv ~/Library/LaunchAgents/com.okx.a2a.plist ~/Library/LaunchAgents/com.okx.a2a.plist.retired
```

Expected: after a Mac reboot, `okx-a2a status` shows no running daemon; `ps aux | grep 'okx-a2a run'` is empty.

- [ ] **Step 2: Re-confirm the cloud still answers after the Mac is fully retired.** Re-run Task 5 Step 4's A2A trigger once more with the Mac plist retired; confirm the reply still arrives within the timeout from Fly.

- [ ] **Step 3: Record the cutover + rollback.** Write `docs/A2A-DAEMON-CUTOVER.md`: the cloud app/machine id, the retired plist path, and the rollback (`fly machines list`/`fly deploy --image <prev>` to roll the daemon back; `mv …plist.retired …plist && launchctl load …` to re-arm the Mac in an emergency). Note the session-cert expiry (~Oct 2026) as the next hard renewal date.

```bash
git add docs/A2A-DAEMON-CUTOVER.md
git commit -m "chore: retire Mac A2A daemon; cloud daemon is sole always-on responder (+ rollback)"
```

**Verification:** the Mac shows no `okx-a2a run` after a reboot; the cloud answers a fresh task within timeout with the Mac retired; `docs/A2A-DAEMON-CUTOVER.md` documents the rollback path.

---

## Self-Review notes

- **Reason 3 coverage:** the rejection is "no response, task timed out." Every task chains to that fix — Task 3 makes the adapter deliver a REAL analysis, Task 2 proves it fits the timeout (with a deterministic Candidate-B fallback that guarantees it), Task 5 proves a live response from the cloud alone, Task 6 removes the Mac so the cloud is the durable responder. Plan 8's test 3 consumes `docs/A2A-DAEMON-PROOF.md`.
- **Scope reversal is explicit:** this plan supersedes the Scope-B presence-only spec. It REUSES that spec's proven mechanics (portable TEE session, `machine-identity` as a stored fingerprint, 4 identity files as Fly secrets, no-`[http_service]` always-on machine, `HOME=/data` volume) and EXPANDS them with the AI adapter + task handling + delivery the presence-only scope deliberately omitted.
- **Genuine unknowns are GATED SPIKES, not guesses:** Task 1 (does `okx-a2a`/`onchainos` install headless on Linux?) and Task 2 (exact `ai exec`→`session send` delivery mechanism + which provider runs cheaply in Docker + does the round trip fit the timeout?). Neither downstream task starts until its spike doc is green. The plan explicitly names the deterministic Candidate-B adapter as the timeout-guaranteeing fallback if the LLM provider path is too slow or too heavy.
- **Timeout is the invariant:** presence never sleeps (`min_machines_running=1`, no autostop, no HTTP service), the analysis source is a sub-second endpoint, and the delivery is a single `session send`. The whole design is shaped to answer inside `maxTimeoutSeconds: 300` with wide margin.
- **Security:** the 4 owner-wallet-capable identity files are Fly secrets (base64, encrypted at rest), never in the image or git; the keyring stays locked (heartbeat needs no passphrase, so it is inert for signing on the host); a build-time `git grep` gate asserts no secret value is committed. Any provider API key (Candidate A) is a separate Fly secret. Rotate the OKX API creds still exposed in plaintext handoff docs (tracked separately in Plan 1 Task 0).
- **No on-chain change:** Plan 7 does not touch `serviceList`, x402, or the listing submission. It only makes #6013 responsive. Reasons 1/2 are Plans 2/3; the terminal three-test gate and any resubmission are Plan 8.
- **Type/interface consistency:** the adapter consumes the exact `/api/a2mcp` JSON shape (`personas`/`patterns`) that Plan 1 produces and Plan 2 registers; `formatPersona` is the single boundary between endpoint JSON and the XMTP reply string; delivery is always `okx-a2a session send --job-id … --content …` as observed in Task 2 Step 1.
- **Assumption to confirm before Task 3:** the A2A test's exact timeout for the task channel (vs. the A2MCP `maxTimeoutSeconds: 300`). If it is materially tighter than 60s, Candidate B is mandatory, not optional — Task 2 Step 3's measurement decides.
