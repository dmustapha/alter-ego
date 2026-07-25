# Master Plan to Resubmit (agent #6013)

The single, complete inventory of everything remaining to get Alter Ego un-rejected
and re-listed on OKX.AI. Nothing is omitted: critical path, supporting work, polish,
the one-shot resubmit sequence, open decisions, and the risk register. No em-dashes
(standing rule). Living document; check items off as they land.

Last reconciled: 2026-07-25. Main HEAD `765f82f`.

---

## 0. Where we are (verified, done)

| Item | State | Proof |
|------|-------|-------|
| Frontend fabricated figures removed | DONE | commit `3931389`, 85 unit tests green |
| Submission copy honesty pass | DONE | commit `245eb9b` (URL, clone path, tx=113, TEE/x402, tracks) |
| OKX resubmit runbook + Plan 8 gate scripts | DONE | commits `a2fbd67`, `765f82f` |
| Production redeployed at honest HEAD | DONE | `alter-ego-wine-mu` no longer serves 4,463/$31,500 |
| Vercel env (OKX creds + x402 payTo + endpoint + DEMO_MODE) | DONE | 7 vars set, `.env.local` backed up 3x and intact |
| Gate 2 decoder matched to real OKX SDK format | DONE | commit `765f82f`, PASSES on live 402 |
| OKX Test 1 (reachability) at deploy level | GREEN | `GET /api/a2mcp` -> 200, no SSO wall |
| OKX Test 2 (x402) at deploy level | GREEN | `POST /api/a2mcp` -> 402 + valid v2 USDT0/eip155:196 challenge |
| Live analyze path (no more 500) | GREEN | serves honest cache (113) under DEMO_MODE |

Key facts learned this session:
- Vercel reaches OKX fine; the old 500 was OKX `429 Too Many Requests`, not a block or
  bad creds. Live capability is real; `DEMO_MODE=true` is chosen for deterministic,
  honest, 500-free judging.
- `serviceList` is still `[]` on-chain. OKX literally has no endpoint to test yet.

---

## 1. CRITICAL PATH (P0) - blocks resubmit

These must all be green, in this order, before OKX re-tests. Registering before the
daemon exists would pass Tests 1/2 but fail Test 3 again and re-earn rejection.

### 1A. Plan 7 - build + deploy the always-on A2A daemon  [the long pole]
Fixes OKX rejection **Reason 3** (task timed out, no response). Full spec:
`docs/superpowers/plans/2026-07-21-a2a-daemon-full.md`. Summary of its 7 tasks:

- [ ] **P7.0 Reconcile** - confirm `/api/a2mcp` returns real data (it does, 113 cache),
      identity files present + session unexpired (~Oct 2026), CLI versions, Mac daemon
      is current sole responder.
- [ ] **P7.1 SPIKE A** - prove `okx-a2a@0.1.9` + `onchainos` install headless on
      `node:24-slim` (Linux). Deliverable `docs/A2A-DAEMON-CLI-INSTALL.md`.
- [ ] **P7.2 SPIKE B (crux)** - observe the real `ai exec` -> `session send` delivery
      flow; choose adapter strategy (Candidate A real provider vs Candidate B
      deterministic `/api/a2mcp` fetch + format + send); measure round-trip under the
      timeout. Deliverable `docs/A2A-AI-ADAPTER-DECISION.md`.
- [ ] **P7.3 Wire the adapter** - TDD `format-persona.mjs` + adapter that turns an
      inbound `a2a-agent-chat` into a real Alter Ego persona reply delivered over XMTP.
- [ ] **P7.4 Dockerfile + Fly.io** - `Dockerfile.daemon`, `fly.daemon.toml` (no
      `[http_service]`, `min_machines_running=1`, volume at `/data`), `entrypoint.sh`
      materializing 4 identity files from Fly secrets. Zero secrets in git.
- [ ] **P7.5 Deploy + prove** - deploy to Fly, STOP the Mac daemon, send a real task +
      the OKX.ai user prompt, prove a non-empty reply within timeout from the cloud
      alone. Deliverable `docs/A2A-DAEMON-PROOF.md`.
- [ ] **P7.6 Retire Mac daemon** - durably disable `com.okx.a2a.plist`; cloud is the
      sole responder; document rollback. Deliverable `docs/A2A-DAEMON-CUTOVER.md`.

Needs from you: a Fly.io host (flyctl is installed). Genuine unknowns are gated spikes
(P7.1, P7.2), not guesses. Candidate B is the timeout-guaranteeing fallback.

### 1B. Register serviceList on-chain  [one command, AFTER 1A]
Fixes **Reason 1** at the registry level. `serviceList` is `[]`; register the reachable
wine-mu A2MCP endpoint. Runnable from this machine (onchainos egress works).

- [ ] Run:
```bash
onchainos agent update --agent-id 6013 --service '[{
  "operation":"create","serviceName":"Alter Ego persona analysis",
  "serviceDescription":"On-chain trading persona + roast battle from wallet history",
  "serviceType":"A2MCP","fee":"1",
  "endpoint":"https://alter-ego-wine-mu.vercel.app/api/a2mcp"}]'
```
- [ ] Verify: `onchainos agent get-agents --agent-ids 6013 | jq '[.. | .serviceList? // empty] | add'`
      shows one A2MCP entry pointing at wine-mu (never `alter-ego-demo`).

### 1C. Plan 8 - run the listing-readiness gates  [AFTER 1A + 1B]
Full spec: `docs/superpowers/plans/2026-07-21-listing-readiness-gate.md`. Scripts are
pre-written under `scripts/gate/`.

- [ ] **Gate 1** `./scripts/gate/gate1-reachability.sh` -> PASS (serviceList non-empty +
      wine-mu 200, no SSO). Fails loud today (empty serviceList) by design.
- [ ] **Gate 2** `./scripts/gate/gate2-x402.sh` -> PASS (402 + v2 challenge; decoder
      already proven against live 402).
- [ ] **Gate 3** `GATE3_RECONCILED=1 node scripts/gate/gate3-a2a.mjs` -> PASS. REQUIRES
      P7.5 first: wire `sendAndAwait` to the daemon's real reply-observation path
      (the scaffold refuses a false pass until then).
- [ ] **Gate 4** product-readiness checklist (differential green vs live, no live 500,
      honest copy, demo present) -> record `docs/listing-gate/gate4-product-readiness.md`.

### 1D. Terminal resubmit  [AFTER all gates green, your approval]
- [ ] All-gates-green precondition check (Plan 8 Task 5 Step 1).
- [ ] Re-run gate1/2/3 back-to-back (guard against drift).
- [ ] `onchainos agent activate --agent-id 6013` (or OKX.ai chat re-review if activate
      is not the verb for a rejected listing).
- [ ] Confirm `approvalDisplayStatus` moves off `5` (rejected). Record
      `docs/listing-gate/RESUBMIT-EVIDENCE.md`.

Standing directive: NO resubmission until every gate is green.

---

## 2. SUPPORTING WORK (P1) - not gate-blocking but needed for a strong listing

### 2A. Reconcile the "paste any wallet live" copy with DEMO_MODE=true
With `DEMO_MODE=true`, the analyze path serves the 3-wallet cache, not a live pull per
pasted address. The Plan 5 line "Paste any wallet address to run the same pipeline live
against OKX" is now aspirational in production.

- [ ] Decide: (a) soften the copy to "the demo loads a real-OKX-derived cached snapshot;
      the live pipeline is wired and rate-limited under load," OR (b) add a graceful
      fallback in `src/app/api/analyze` so live is attempted and demo cache is the
      fallback on OKX 429/5xx (removes the aspirational-claim problem AND the 500 class).
- [ ] If (b): implement try-live-catch-fallback, redeploy, retest a real wallet.
- [ ] Grep check: no copy claims a live-per-address pull that production does not do.

### 2B. Plan 4 - a11y fixes + re-capture landing.png
`docs/images/landing.png` is STALE: it predates the fabricated-figures fix (commit
`3931389` changed the hero + stats bar). README and the DoraHacks submission show it, so
a judge sees a screenshot that contradicts the live app. Spec:
`docs/superpowers/plans/2026-07-20-frontend-a11y-tokenization.md`.

- [ ] Apply the a11y fixes from Plan 4.
- [ ] Re-capture `docs/images/landing.png` (and any other stale shot) against the live
      honest UI at 1920x1080.
- [ ] Verify README screenshots match production.

### 2C. Plan 6 - demo video
The one remaining placeholder in `submission/SUBMISSION-GUIDE.md` (Demo Video slot).
Spec: `docs/superpowers/plans/2026-07-20-demo-rerecord.md`.

- [ ] Pick a demo wallet that trips a GUARD pattern (current cache is all-healthy, so the
      risk half never shows).
- [ ] Record 1920x1080 against the live URL, following the honest flow.
- [ ] Upload to YouTube, paste the link into the submission form.

---

## 3. POLISH / LOOSE ENDS (P2)

- [ ] **Avatar work** - `page.tsx` `<img src="/logo-combined.svg">` + modified
      `public/*.png/ico` + `HANDOFF-AVATAR-FIX.md` are uncommitted and reference a
      broken, untracked SVG. Yours to finish; do not commit or revert until the SVG
      exists. It is stashed out of every deploy so production is unaffected.
- [ ] **Rotate OKX API creds** - the creds appear in plaintext in older handoff docs.
      Rotate post-submission and update the Vercel secrets.
- [ ] **Quarantine dir** - `docs/context/pre-remediation/` holds the stale
      `VERIFY-REPORT.md` (banner-annotated). Leave as historical record.
- [ ] **`docs/listing-gate/`** - gate evidence dir; gitignored/untracked scratch until
      Plan 8 runs produce committed evidence files.

---

## 4. Open decisions (need your call)

1. **x402 payTo** - currently set to the public owner wallet `0xd97c85...6340`. Fine
   while settlement is simulated. If you want a dedicated receiver before live
   settlement, change `X402_PAYTO_ADDRESS` + `A2MCP_PAYTO_ADDRESS` on Vercel and redeploy.
2. **DEMO_MODE posture** - keep `true` (deterministic, honest, no 500s) vs implement 2A(b)
   graceful live-with-fallback. Recommendation: keep `true` for the listing; do 2A(b)
   only if you want the live-per-address claim to be literally true.
3. **AI adapter strategy (P7.2)** - Candidate A (real provider in Docker, faithful to the
   Mac, heavier) vs Candidate B (deterministic fetch+format, timeout-guaranteed). The
   spike measures and decides; default lean is B unless A is trivially fast.
4. **Resubmit path (1D)** - `onchainos agent activate` vs OKX.ai chat re-review. Confirm
   which the platform expects for a rejected listing at resubmit time.

---

## 5. Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `okx-a2a`/`onchainos` do not install headless on Linux | med | high | P7.1 gated spike before Dockerfile; fallback = vendor prebuilt binary |
| AI adapter round-trip exceeds task timeout | med | high | P7.2 measures it; Candidate B deterministic path guarantees sub-timeout |
| Cloud daemon crash-loops on provider auth/passphrase | med | high | P7.2 records exact provider config + secret; entrypoint sets preset bypass |
| OKX 429 rate-limits during OKX's own live test | low | med | Tests 1/2 hit the 402 gate before any OKX call; DEMO_MODE serves cache |
| XMTP double-responder (Mac + cloud) causes dup replies | low | med | P7.6 durably retires the Mac plist; single responder |
| Identity-file session expires (~Oct 2026) | low | high | documented renewal date in P7.6 cutover doc |
| Vercel clobbers `.env.local` funds key on an env op | low | high | 3x backups before every vercel call (standing rule), verified intact |
| Registering wrong URL (`alter-ego-demo` 302) | low | high | register command + Gate 1 both hard-assert wine-mu, reject demo |

---

## 6. One-shot resubmit sequence (once P7 is deployed)

The exact ordered commands to fire on the day, assuming Plan 7 is live:

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
# 1. register the endpoint
onchainos agent update --agent-id 6013 --service '[{"operation":"create","serviceName":"Alter Ego persona analysis","serviceDescription":"On-chain trading persona + roast battle from wallet history","serviceType":"A2MCP","fee":"1","endpoint":"https://alter-ego-wine-mu.vercel.app/api/a2mcp"}]'
# 2. gates
./scripts/gate/gate1-reachability.sh | tee docs/listing-gate/gate1-reachability.md
./scripts/gate/gate2-x402.sh          | tee docs/listing-gate/gate2-x402.md
GATE3_RECONCILED=1 node scripts/gate/gate3-a2a.mjs | tee docs/listing-gate/gate3-a2a.md
# 3. all-green precondition, then resubmit
grep -q '^PASS Gate1' docs/listing-gate/gate1-reachability.md \
 && grep -q '^PASS Gate2' docs/listing-gate/gate2-x402.md \
 && grep -q '^PASS Gate3' docs/listing-gate/gate3-a2a.md \
 && onchainos agent activate --agent-id 6013
# 4. confirm off rejected
onchainos agent get-agents --agent-ids 6013 | jq '{approvalDisplayStatus, serviceList}'
```

---

## 7. Definition of done

Re-listing is DONE when: all four Plan 8 gates are green against live state, the
resubmit action fired, and `approvalDisplayStatus` is no longer `5` (rejected). The P1
supporting work (fresh screenshot, demo video, copy reconciliation) makes the listing
competitive but does not gate the resubmit itself.
