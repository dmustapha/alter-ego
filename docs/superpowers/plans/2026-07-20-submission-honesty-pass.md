# Submission Honesty Pass — Implementation Plan (Plan 5 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every falsifiable overclaim and broken link from the submission surfaces so a judge who clicks the live URL, clones the repo, opens the JSON, or re-reads two files side by side finds zero contradictions. After Plans 1-4 the app is genuinely live (real OKX REST trades, real classifier output in the cache, A2MCP conformance, real x402 if Plan 3 ran, a11y-fixed UI). This plan makes the *words* match that reality: swap the auth-walled demo URL for the working one everywhere, fix the clone URL, collapse the three conflicting transaction counts to one, and rewrite the TEE / x402 / "all 4 skills integrated" / "endpoints return 200" claims to describe what actually runs, using the existing `## Known Limitations` block as the honesty model.

**Architecture:** This is a documentation-and-copy plan, not a code plan. The unit of work is a *falsifiable claim* on a submission surface. Each task takes one class of claim (URL, clone path, tx count, integration status, live-endpoint status, attestation/payment status), enumerates every file:line it appears on (from the greps already run below), and replaces the exact before-string with an exact after-string that a judge can verify against the live app. Every task's "test" is a concrete verification command (a `grep` that must return zero hits, a `curl -I` that must return 200 not 302, or a uniqueness grep). The source of truth for the ONE transaction number is the regenerated cache from Plan 1 Task 5 (`src/data/cache/wallet-*.json` summed) — this plan reads that number, it does not invent one.

**Tech Stack:** Markdown, HTML (the DoraHacks paste body), `grep`/`curl`/`git` for verification. No app code changes.

## Global Constraints

- **No em-dashes** anywhere in user-facing copy or docs (standing rule). When an existing string already contains an em-dash and you are editing that line, replace the em-dash with " — " spelled as a hyphen with spaces, or restructure the sentence. Do not introduce new em-dashes.
- **Every claim must be judge-verifiable.** If a sentence asserts a number, a status (200/live/integrated/verified), or a capability, either it is true against the deployed app at `https://alter-ego-wine-mu.vercel.app` and the pushed repo at `https://github.com/dmustapha/alter-ego`, or it is reworded to state the real status (simulated / demo / planned). No aspirational present tense.
- **DoraHacks detail-blueprint rules** for `submission/DETAILS-BODY.html` (Dami's agreed format): proof-first, section order hook → problem → solution → how-it-works → features → live-now → tech-stack → alignment → proof-close; Title Case bold headings; paste-ready styled HTML (h2/strong/ul/code); `Live Now` block only lists things that are actually live. Keep the existing structure; only correct the false lines inside it.
- **Target = OKX.AI Genesis (Build X Series) on X Layer, chain index 196.** Copy must map to the four Genesis / X Layer Arena scoring dimensions (each 25%): OnchainOS Integration & Innovation, X Layer Ecosystem Fit, AI Interaction Experience, Product Completeness. Do not claim tracks ("Lifestyle Companion + Social Buzz") that belong to a different program unless they are confirmed present in the target brief; the OKX Build X brief defines X Layer Arena / Skills Arena, not those two tracks. See Task 6.
- **Do not touch app code, cache JSON, or the classifier** in this plan. If a number in the cache is wrong, that is Plan 1's job (already done). This plan only reads the cache to get the canonical tx count and writes it into copy.
- **The one canonical tx number** is whatever `scripts/seed-demo.mjs` (Plan 1 Task 5) produced, read via the verification command in Task 3 Step 1. Every placeholder like `<CANONICAL_TXN>` in this plan is resolved to that single value at execution time and then written literally into every file. Do NOT leave `<CANONICAL_TXN>` in any committed file.
- **Depends on Plans 1-4.** Do not start until Plan 1 (live data + honest cache + differential test) is green, Plan 2 (A2MCP conformance) is green, Plan 4 (a11y + re-captured `landing.png`) is green, and Plan 3 (real x402) is either green or explicitly deferred. The x402 / attestation wording in Task 5 branches on whether Plan 3 shipped.

## Upstream Inputs & Branch Caveats

Task 0 below IS this plan's reconciliation gate: it reads the upstream state and resolves every branch before a single word is edited.

| Upstream artifact read | Possible outcomes | Branch this plan takes |
|------------------------|-------------------|------------------------|
| `src/data/cache/wallet-*.json` (Plan 1 regenerated) | one summed tx count `N` | write `N` everywhere; `<CANONICAL_TXN>` resolves to it; grep proves one unique number |
| Plan 3 state (shipped vs deferred) | x402 real / simulated | real → keep "x402 settlement on X Layer" copy; simulated → reword to "simulated payment (demo)" |
| TEE reality (still mocked) | simulated | reword "TEE-sealed / TEE-bound" → the true attestation status |
| Plans 1-2 wired modules | which OKX skills are actually live | "all 4 skills" → the real count/names only |
| Live URL check (`curl -I`) | `wine-mu` 200 / `demo` 302 auth-wall | replace every `alter-ego-demo` with `alter-ego-wine-mu`; grep returns zero `alter-ego-demo` hits |
| Target brief (`PRD.md:3` + `okx-buildx.md`) | Genesis tracks vs claimed tracks | map copy to the confirmed Genesis / X Layer Arena dimensions; drop unconfirmed track claims |

If any upstream artifact contradicts every documented branch (e.g. Plan 1's cache count is missing), STOP and amend before editing copy.

## Enumerated grep results (run 2026-07-20, the exact hits this plan fixes)

Submission-surface files only (handoff/audit/context docs are NOT submission surfaces and are left as-is; they are historical records).

**`alter-ego-demo.vercel.app` on submission surfaces (5 hits, 4 files):**
- `submission/copy/description.md:34`
- `submission/links.md:5`
- `submission/links.md:8`
- `submission/SUBMISSION-GUIDE.md:31`
- `submission/DETAILS-BODY.html:67`, `:90`

**Clone URL `dmz4pf`:**
- `README.md:166`

**Transaction count on submission surfaces (three different numbers exist repo-wide: 4,463 / 4,051 / 6,134):**
- `submission/copy/description.md:11` (`4,463`)
- `submission/copy/description.md:69` (`4,463`)
- `submission/DETAILS-BODY.html:56` (`4,463`)
- `src/app/page.tsx:157` (`"4,463"`) — this is the live stats bar; Plan 1 made it dynamic from `data.totalTxns`, but the hardcoded fallback string must equal the canonical number. Verify Plan 1 already fixed the `6,134` here; this task confirms the fallback matches.
- (`6,134` and `4,051` do NOT appear on any submission-copy surface after Plan 1; they lived in `page.tsx` stats bar and in audit prose. Confirm zero remaining in Task 3.)

**Live status confirmed at plan-write time:** `curl -I https://alter-ego-wine-mu.vercel.app` → `200`; `https://alter-ego-demo.vercel.app` → `302` (Vercel Auth redirect); `https://alter-ego-wine-mu.vercel.app/api/a2mcp` → `200`.

---

## Task 0: Resolve the canonical facts before editing (P0, do first)

**Files:**
- Read-only: `src/data/cache/wallet-*.json` (canonical tx count), `LIVETEST-REPORT.md` (cross-check), Plan 3 status (`docs/superpowers/plans/` for a `x402` plan file + its green state)
- Produces: a scratch record of the resolved values used by every later task (do NOT commit a scratch file; hold the values in the execution session)

**Interfaces:**
- Produces: `CANONICAL_TXN` (one integer), `X402_STATE` (`real` | `simulated`), `TEE_STATE` (`real` | `simulated`), `SKILLS_LIVE` (the list of OKX modules actually wired after Plans 1-2), `A2MCP_URL` = `https://alter-ego-wine-mu.vercel.app/api/a2mcp`. These feed Tasks 1-6.

- [ ] **Step 1: Read the canonical transaction count from the regenerated cache.**

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
node -e 'const fs=require("fs");const g=require("glob");const files=fs.readdirSync("src/data/cache").filter(f=>/^wallet-.*\.json$/.test(f));let t=0;for(const f of files){const j=JSON.parse(fs.readFileSync("src/data/cache/"+f));t+=(j.trades?.length ?? j.totalTxns ?? 0);}console.log("CANONICAL_TXN="+t);'
```

Record the printed integer as `CANONICAL_TXN`. This is the ONLY transaction number allowed in any copy. (If the cache stores a precomputed `totalTxns` per wallet, sum those instead of `trades.length`; use whichever the seed script wrote as the source of truth.)

- [ ] **Step 2: Confirm the stats-bar fallback already matches.** `grep -n "TRANSACTIONS" src/app/page.tsx` — the fallback literal must equal `CANONICAL_TXN.toLocaleString()`. If Plan 1 left it at `4,463` and the canonical number changed, note the exact replacement for Task 3 Step 4.

- [ ] **Step 3: Resolve `X402_STATE` and `TEE_STATE`.** If Plan 3 (real x402) shipped and is green, `X402_STATE = real`; else `simulated`. `TEE_STATE` is `simulated` unless a plan added real SGX/TDX attestation (none is planned in the roadmap, so expect `simulated`). Record both.

- [ ] **Step 4: Resolve `SKILLS_LIVE`.** From Plan 1 (OKX WALLET + DEX-MARKET REST wired) and Plan 2 (OKX-AI marketplace / A2MCP agent-card live), list which OKX modules are genuinely wired end-to-end and reachable. x402 is in this list only if `X402_STATE = real`. Record the true list — this replaces every "all 4 skills integrated" claim.

- [ ] **Step 5: Confirm the live endpoints actually respond as the copy will claim.**

```bash
curl -sI -o /dev/null -w "app %{http_code}\n" https://alter-ego-wine-mu.vercel.app
curl -sI -o /dev/null -w "a2mcp %{http_code}\n" https://alter-ego-wine-mu.vercel.app/api/a2mcp
curl -s -o /dev/null -w "analyze %{http_code}\n" -X POST https://alter-ego-wine-mu.vercel.app/api/analyze -H 'content-type: application/json' -d '{"address":"0xDemo","chains":["ethereum"]}'
curl -s -o /dev/null -w "roast %{http_code}\n" https://alter-ego-wine-mu.vercel.app/api/roast
curl -s -o /dev/null -w "compare %{http_code}\n" https://alter-ego-wine-mu.vercel.app/api/compare
curl -s -o /dev/null -w "persona %{http_code}\n" https://alter-ego-wine-mu.vercel.app/api/persona
```

**VERIFICATION (gate for this plan):** `app` and `a2mcp` return `200`. For every endpoint the copy claims "(200)", the actual code must be `200`. Any endpoint that is NOT 200 must NOT be claimed as 200 in Task 5 — reword it to its real status. Record the real status of each of the four listed endpoints.

---

## Task 1: Replace the auth-walled live URL with the working one

**Files:**
- `submission/copy/description.md:34`
- `submission/links.md:5`, `:8`
- `submission/SUBMISSION-GUIDE.md:31`
- `submission/DETAILS-BODY.html:67`, `:90`

**Interfaces:**
- Consumes: the confirmed working URL `https://alter-ego-wine-mu.vercel.app` (Task 0 Step 5, returns 200).
- Produces: zero remaining `alter-ego-demo.vercel.app` references on any submission surface.

- [ ] **Step 1: `submission/copy/description.md:34`.**
  - BEFORE: `https://alter-ego-demo.vercel.app`
  - AFTER: `https://alter-ego-wine-mu.vercel.app`

- [ ] **Step 2: `submission/links.md:5`** (also fix the misleading "302 (redirect, healthy)" status — a 302 to a login wall is NOT healthy).
  - BEFORE: `| Live Demo | https://alter-ego-demo.vercel.app | ✅ 302 (redirect, healthy) |`
  - AFTER: `| Live Demo | https://alter-ego-wine-mu.vercel.app | ✅ 200 |`

- [ ] **Step 3: `submission/links.md:8`.**
  - BEFORE: `| Proof Page | https://alter-ego-demo.vercel.app/proof | ✅ |`
  - AFTER: `| Proof Page | https://alter-ego-wine-mu.vercel.app/proof | ✅ 200 |`

- [ ] **Step 4: `submission/SUBMISSION-GUIDE.md:31`.**
  - BEFORE: `| Live Demo | https://alter-ego-demo.vercel.app |`
  - AFTER: `| Live Demo | https://alter-ego-wine-mu.vercel.app |`

- [ ] **Step 5: `submission/DETAILS-BODY.html:67`.**
  - BEFORE: `<li><strong>Live demo:</strong> <a href="https://alter-ego-demo.vercel.app">https://alter-ego-demo.vercel.app</a> — click LOAD DEMO then ANALYZE</li>`
  - AFTER: `<li><strong>Live Demo:</strong> <a href="https://alter-ego-wine-mu.vercel.app">https://alter-ego-wine-mu.vercel.app</a> - click LOAD DEMO then ANALYZE</li>`
  (both the href and the visible text change; em-dash replaced with " - ".)

- [ ] **Step 6: `submission/DETAILS-BODY.html:90`.**
  - BEFORE: `<li><strong>Live URL:</strong> <a href="https://alter-ego-demo.vercel.app">https://alter-ego-demo.vercel.app</a></li>`
  - AFTER: `<li><strong>Live URL:</strong> <a href="https://alter-ego-wine-mu.vercel.app">https://alter-ego-wine-mu.vercel.app</a></li>`

- [ ] **Step 7: VERIFICATION.**

```bash
# zero demo-url hits on submission surfaces
grep -rn "alter-ego-demo" submission/ && echo "FAIL: demo url still present" || echo "PASS: no demo url on submission surfaces"
# the working url now present in each file
for f in submission/copy/description.md submission/links.md submission/SUBMISSION-GUIDE.md submission/DETAILS-BODY.html; do grep -q "alter-ego-wine-mu" "$f" && echo "PASS $f" || echo "FAIL $f"; done
# the working url is genuinely 200
curl -sI -o /dev/null -w "%{http_code}\n" https://alter-ego-wine-mu.vercel.app  # expect 200
```
Expected: first grep prints the PASS branch (no hits), the loop prints PASS for all four files, curl prints `200`.

---

## Task 2: Fix the README clone URL

**Files:**
- `README.md:166`

**Interfaces:**
- Consumes: the real GitHub owner `dmustapha` (confirmed repo `https://github.com/dmustapha/alter-ego`).
- Produces: a clone command a judge can actually run.

- [ ] **Step 1: `README.md:166`.**
  - BEFORE: `git clone https://github.com/dmz4pf/alter-ego.git`
  - AFTER: `git clone https://github.com/dmustapha/alter-ego.git`
  (`dmz4pf` is the local git-config username; the public repo is under `dmustapha`. `HANDOFF.md:66` documents this split — leave HANDOFF.md alone, it is a historical note, but the README must use the clonable path.)

- [ ] **Step 2: VERIFICATION.**

```bash
grep -n "dmz4pf" README.md && echo "FAIL: dmz4pf still in README" || echo "PASS: README clone url fixed"
grep -n "git clone https://github.com/dmustapha/alter-ego.git" README.md && echo "PASS: correct clone url"
# prove the repo is actually reachable at the new path
curl -sI -o /dev/null -w "%{http_code}\n" https://github.com/dmustapha/alter-ego  # expect 200
```
Expected: `dmz4pf` grep returns the PASS branch (no hit in README), the correct-url grep matches, curl returns `200`.

---

## Task 3: Reconcile the transaction count to ONE number everywhere

**Files:**
- `submission/copy/description.md:11`, `:69`
- `submission/DETAILS-BODY.html:56`
- `src/app/page.tsx:157` (fallback literal only; confirm Plan 1's dynamic wiring)

**Interfaces:**
- Consumes: `CANONICAL_TXN` from Task 0 Step 1 (the summed cache count). For the before/after text below, `CANONICAL_TXN` is written literally as the resolved integer with a thousands comma (e.g. if the cache sums to `4463`, write `4,463`; if Plan 1's regen changed it, write the new value). Do NOT commit the token `CANONICAL_TXN`.
- Produces: exactly one distinct transaction figure across all copy and the stats-bar fallback.

- [ ] **Step 1: Resolve the literal.** From Task 0 Step 1 you have the integer. Format it with a comma. Call the formatted string `TXN` (e.g. `4,463`). Every edit below writes `TXN`.

- [ ] **Step 2: `submission/copy/description.md:11`.**
  - BEFORE: `2. **Persona Builder** — Analyzes 4,463 transactions across Ethereum, Solana, and X Layer. Classifies patterns as AMPLIFY (strengths) or GUARD (risks). Assigns archetypes: The Professional, The Degen, etc.`
  - AFTER: `2. **Persona Builder** - Analyzes TXN transactions across Ethereum, Solana, and X Layer. Classifies patterns as AMPLIFY (strengths) or GUARD (risks). Assigns archetypes: The Professional, The Degen, and others.`
  (replace `4,463` with the resolved `TXN`; em-dash → " - "; "etc." kept but the whole line stays honest.)

- [ ] **Step 3: `submission/copy/description.md:69`.**
  - BEFORE: `- **Demo mode**: All data is pre-cached (4,463 transactions across 3 wallets). The OnchainOS CLI integration is structurally complete but operates in demo-bypass mode for deterministic results.`
  - AFTER (this line is also rewritten in Task 5 Step 3 for the CLI claim — apply the tx-count change here and the CLI-claim change there, ending at one final string): `- **Demo mode**: The demo loads a pre-cached snapshot of TXN transactions across 3 wallets, generated by running the real classifier over live OKX REST trade data (see \`scripts/seed-demo.mjs\`). Paste any wallet address to run the same pipeline live against OKX.`
  (Note: if Task 5 Step 3 also edits this line, make the tx-count edit first, then the CLI edit; the AFTER above already folds both. Use this final string.)

- [ ] **Step 4: `submission/DETAILS-BODY.html:56`.**
  - BEFORE: `<li><strong>Multi-chain behavioral fingerprinting:</strong> Ethereum, Solana, X Layer. 4,463 transactions analyzed across the demo wallets.</li>`
  - AFTER: `<li><strong>Multi-Chain Behavioral Fingerprinting:</strong> Ethereum, Solana, X Layer. TXN transactions analyzed across the demo wallets.</li>`

- [ ] **Step 5: `src/app/page.tsx:157` (fallback literal).** Confirm Plan 1 made this dynamic (`data ? data.totalTxns.toLocaleString() : "..."`). The hardcoded fallback must equal `TXN`.
  - BEFORE (if still): `{ n: "4,463", l: "TRANSACTIONS" }`
  - AFTER: `{ n: "TXN", l: "TRANSACTIONS" }`
  (only the fallback literal; do not otherwise touch page.tsx. If Plan 1 already set this to the canonical value, no edit needed — note it as already-correct.)

- [ ] **Step 6: VERIFICATION.**

```bash
# every transaction figure across submission copy + the page fallback is identical.
# collect all distinct comma-formatted counts that appear near "transaction":
grep -rhoE "[0-9],[0-9]{3} transaction|[0-9],[0-9]{3} TRANSACTION|\"[0-9],[0-9]{3}\", l: \"TRANSACTIONS\"" submission/ src/app/page.tsx \
  | grep -oE "[0-9],[0-9]{3}" | sort -u
```
Expected: exactly ONE line (one unique number). More than one line = FAIL.

```bash
# the stale figures are gone from submission surfaces:
grep -rn "6,134\|4,051" submission/ && echo "FAIL: stale count" || echo "PASS: no stale counts on submission surfaces"
```
Expected: PASS branch.

---

## Task 4: Fix the misleading "302 healthy" and other broken-link status claims

**Files:**
- `submission/links.md` (whole table — statuses)
- `submission/SUBMISSION-GUIDE.md:48-53` (pre-submission checklist that asserts endpoint states)

**Interfaces:**
- Consumes: the real endpoint statuses from Task 0 Step 5.
- Produces: a links table and checklist whose every status is the real HTTP code.

- [ ] **Step 1: `submission/links.md` API rows.** The table claims `POST /api/analyze ✅ 200`, `GET /api/roast ✅ 200`, `GET /api/compare ✅ 200`, `GET /api/persona ✅ 200`. For each, replace the `✅ 200` with the actual code from Task 0 Step 5. If all four really are 200, leave them; if any is not, change it (e.g. `⚠️ 405` if a GET route only accepts POST). Also make the API rows show the full URL so a judge can click them:
  - BEFORE: `| API - Analyze | POST /api/analyze | ✅ 200 |`
  - AFTER: `| API - Analyze | POST https://alter-ego-wine-mu.vercel.app/api/analyze | <real status> |`
  (repeat pattern for roast/compare/persona; `<real status>` is the code you measured.)

- [ ] **Step 2: `submission/SUBMISSION-GUIDE.md` checklist line "All 4 API endpoints respond 200".** Only keep this checked if Task 0 Step 5 confirmed all four are 200. If one is not, reword:
  - BEFORE: `- [ ] All 4 API endpoints respond 200`
  - AFTER: `- [ ] All 4 API endpoints respond (analyze 200 POST, roast/compare/persona 200 GET) - verified via curl`
  (state the real verb+code per endpoint so the checklist is not a false blanket claim.)

- [ ] **Step 3: VERIFICATION.**

```bash
# no "302" described as healthy anywhere on submission surfaces
grep -rn "302" submission/ && echo "CHECK: confirm any 302 is not labeled healthy" || echo "PASS: no 302 references"
# every API row now carries the full clickable base url
grep -c "alter-ego-wine-mu.vercel.app/api/" submission/links.md  # expect >= 4
```
Then re-run the six curls from Task 0 Step 5 and confirm each printed code matches the code now written in `links.md`.

---

## Task 5: Rewrite TEE / x402 / "all 4 skills" / attestation claims to match reality

The submission currently states, in present tense, several things that are simulated or not wired. After Plans 1-3 some became true; the rest must be reworded to their real status. The existing `## Known Limitations` block in `description.md:65-74` is the honesty model — extend that honesty into the body copy and into `DETAILS-BODY.html` (which has NO limitations block and reads as fully-live).

**Files:**
- `submission/copy/description.md:5, 9, 17, 19-26, 69-74`
- `submission/DETAILS-BODY.html:38, 50, 60-62, 64-73, 77, 84`
- `submission/sponsor-tracks.md:5-12, 28`
- `README.md:3, 21-22, 57-63, 127-128` (TEE / x402 / marketplace claims)

**Interfaces:**
- Consumes: `X402_STATE`, `TEE_STATE`, `SKILLS_LIVE` from Task 0 Steps 3-4.
- Produces: body copy whose capability claims are all either true-and-verifiable or explicitly labeled simulated/planned. A `## Known Limitations` block added to `DETAILS-BODY.html`.

- [ ] **Step 1: `description.md:5` — "TEE-bound agent" hero claim.** The app runs on Vercel serverless, not in a TEE. `TEE_STATE = simulated`. Reword so "TEE" is described as the intended/attestation-badge feature, not a live property.
  - BEFORE: `Alter Ego is a TEE-bound agent built for the OKX.AI Genesis hackathon. It ingests your complete on-chain history across every wallet and chain, classifies your trading patterns, builds a psychological persona, then pits your Ethereum self against your Solana self in a 5-round roast battle built on real transaction data.`
  - AFTER: `Alter Ego is an on-chain persona agent built for the OKX.AI Genesis hackathon. It ingests your on-chain history across wallets and chains, classifies your trading patterns, builds a psychological persona, then pits your Ethereum self against your Solana self in a 5-round roast battle built on real transaction data. The final snapshot is presented as a TEE-sealed attestation (attestation is simulated in this demo, see Known Limitations).`

- [ ] **Step 2: `description.md:9` — OnchainOS CLI ingestion claim.** After Plan 1 the app uses the OKX REST API (not a `/tmp` CLI binary, which was non-viable on Vercel).
  - BEFORE: `1. **Wallet Ingestion** — Paste any EVM or Solana address. Alter Ego pulls portfolio data, transaction history, and on-chain activity through the OnchainOS CLI layer (WALLET + DEX-MARKET integrations).`
  - AFTER: `1. **Wallet Ingestion** - Paste any EVM or Solana address. Alter Ego pulls portfolio data and trade history through the OKX OnchainOS REST API (WALLET + DEX-MARKET), signed server-side with your project credentials.`

- [ ] **Step 3: `description.md:17` — TEE + x402 snapshot claim.** Branch on `X402_STATE`.
  - BEFORE: `5. **TEE-Sealed Snapshot** — Cryptographic attestation pinned to the agent's identity. Verification badge: ATTESTATION: 0x7f3a...b91e. Available for purchase via x402 micropayments ($0.99/snapshot).`
  - AFTER if `X402_STATE = real`: `5. **Sealed Snapshot** - An attestation pinned to the agent identity (TEE attestation simulated in demo). Purchasable via a real x402 micropayment on X Layer (USDG), $0.99 per snapshot.`
  - AFTER if `X402_STATE = simulated`: `5. **Sealed Snapshot** - An attestation pinned to the agent identity (TEE attestation simulated in demo). The x402 payment gate is wired end-to-end in the UI; live USDG settlement on X Layer is the next milestone (see Known Limitations).`

- [ ] **Step 4: `description.md:19-26` — "All 4 OKX OnchainOS skills integrated".** Replace the blanket claim with the real `SKILLS_LIVE` list. Keep the ones that are genuinely wired as live; move any not-yet-live to a "planned" phrasing.
  - BEFORE (heading + list at :21-26): `All 4 OKX OnchainOS skills integrated and displayed in the app's integration strip:` followed by the WALLET / DEX-MARKET / OKX-AI / X402 bullets, with X402 described as `Micropayment gate for snapshot purchases (USDC on Base)`.
  - AFTER: heading `OKX OnchainOS integrations wired into the app:` and bullets reflecting `SKILLS_LIVE`. Fix the two factual errors regardless: X402 network is **X Layer USDG**, not "USDC on Base" (per `DEEP-RESEARCH.md:20`); and mark each bullet live vs planned. Example when WALLET+DEX-MARKET+OKX-AI are live and x402 is simulated:
    ```
    - **OKX WALLET** (live) - multi-chain address ingestion via the OnchainOS REST API
    - **OKX DEX-MARKET** (live) - cross-chain trade history for the comparison engine
    - **OKX-AI** (live) - listed as an ASP agent on the OKX.AI marketplace, reachable at the A2MCP endpoint
    - **x402** (payment gate wired; live USDG-on-X-Layer settlement planned)
    ```

- [ ] **Step 5: `description.md:69-74` — Known Limitations.** This block is already honest. Apply the tx-count edit from Task 3 Step 3 to line 69, and update line 71's x402 wording to match `X402_STATE`:
  - `:71` BEFORE: `- **x402 payments**: Simulated for demo. Payment flow is structurally complete but operates without real USDC settlement.`
  - `:71` AFTER if `X402_STATE = real`: `- **x402 payments**: Live. Snapshot purchase settles a real USDG micropayment on X Layer via the /api/x402 verify+settle handshake.`  (then this stops being a limitation - move it out of the block and delete the bullet.)
  - `:71` AFTER if `X402_STATE = simulated`: keep the bullet but fix the token/network: `- **x402 payments**: Simulated for demo. The payment gate is wired in the UI; it does not yet settle real USDG on X Layer.`
  - Confirm `:70` TEE bullet already reads "Simulated for demo" (it does) - leave as the honesty model.

- [ ] **Step 6: `DETAILS-BODY.html` — the biggest liability, it has no limitations block and claims full live status.**
  - `:38` "TEE-bound agent": reword the opening `<strong>TEE-bound agent</strong>` to `<strong>on-chain persona agent</strong>` and keep the roast-battle sentence; the attestation is mentioned as sealed snapshot below.
  - `:49` GAP COST "$31,500 in the demo wallet": this dollar figure must exist in the regenerated cache. If Plan 1's `comparison.json` produced a different `gapCostUsd`, replace `$31,500` with that real value; if the cache omits a dollar figure, delete the "- $31,500 in the demo wallet -" clause. VERIFY: `grep -rn "gapCost\|31500\|31,500" src/data/cache/`.
  - `:50` x402 "Pay $0.99 via x402 (USDC on Base)": fix network to `x402 (USDG on X Layer)`; if `X402_STATE = simulated` append ` (payment gate wired; live settlement planned)`.
  - `:60-61` feature bullets: `x402 micropayment gate: 3-state transition (idle → simulating → done)` — the "→" is fine (arrow, not em-dash), but "simulating" already signals demo; if `X402_STATE = simulated`, add `(simulated settlement)`; and fix any "USDC on Base" → "USDG on X Layer".
  - `:64-73` **Live Now block** — this is the proof section; it must only list things that are truly live. Fix:
    - `:69` `4 API endpoints live: POST /api/analyze (200), GET /api/roast (200), GET /api/compare (200), GET /api/persona (200)` — replace each `(200)` with the real code from Task 0 Step 5. If all 200, keep.
    - `:72` `All 4 OKX OnchainOS skills: WALLET, DEX-MARKET, OKX-AI, X402 integrated and verified` — replace with the real `SKILLS_LIVE` list and drop "verified" for anything simulated. E.g. `OKX OnchainOS: WALLET, DEX-MARKET, OKX-AI live; x402 gate wired (live settlement planned)`.
    - `:64-73` add a `<strong>A2MCP endpoint:</strong> <a href="https://alter-ego-wine-mu.vercel.app/api/a2mcp">.../api/a2mcp</a> (200)` bullet — this is a genuine, judge-verifiable live fact after Plan 2 and directly maps to the "AI Interaction" and "OnchainOS Integration" scoring dimensions.
  - `:77` Tech Stack `<code>TEE</code>` and `<code>OKX OnchainOS CLI</code>`: change `OKX OnchainOS CLI` → `OKX OnchainOS REST API`; keep `TEE` but the honesty block below will label it simulated.
  - `:84` `OnchainOS CLI v4.2.4 for all wallet data` → `OKX OnchainOS REST API for all wallet data`. Keep `ERC-8004 agent identity` only if the token was actually minted (roadmap says minted on X Layer — verify tx in context docs; if minted, keep and add the tx hash as proof).
  - **Add a `## Known Limitations` section** to `DETAILS-BODY.html` immediately before `<h2>Proof</h2>`, mirroring `description.md:65-74`:
    ```html
    <h2>Known Limitations</h2>
    <p>This is a hackathon demo. Two capabilities are intentionally simulated and clearly labeled:</p>
    <ul>
      <li><strong>TEE attestation:</strong> simulated. The attestation badge is UI; real SGX/TDX attestation is planned post-hackathon.</li>
      <li><strong>x402 settlement:</strong> the payment gate is wired end-to-end; live USDG-on-X-Layer settlement is the next milestone.</li>
    </ul>
    ```
    (If `X402_STATE = real`, drop the x402 bullet and instead list it in Live Now.)

- [ ] **Step 7: `sponsor-tracks.md`.**
  - `:5` `All 4 OKX OnchainOS skills are integrated` → reword to the real `SKILLS_LIVE` list, matching Task 5 Step 4.
  - `:12` X402 row `USDC on Base` → `USDG on X Layer`; and the "Integration" cell should say "payment gate wired (live settlement planned)" if `X402_STATE = simulated`.
  - `:28` `OKX Integration | All 4 OnchainOS skills integrated + TEE attestation + ERC-8004 metadata` → `OKX Integration | WALLET + DEX-MARKET + OKX-AI wired via OnchainOS REST + A2MCP agent card; TEE attestation simulated; ERC-8004 identity minted on X Layer`.

- [ ] **Step 8: `README.md`.**
  - `:3` `TEE-ready agent (simulated attestation in demo)` — already honest, leave.
  - `:21-22` `It runs inside a TEE (Trusted Execution Environment), so the analysis is verifiable and private. Nobody sees your balances.` — this contradicts `:3`. Reword: `The design target is a TEE (Trusted Execution Environment) so analysis is verifiable and private; attestation is simulated in this demo (see Tech Stack).`
  - `:57-63` OKX AI Marketplace / x402 paragraph: fix `USDC on Base`-style claims to `USDG on X Layer`; if `X402_STATE = simulated`, state the gate is wired and settlement is planned.
  - `:127-128` Tech Stack table rows `Payments | x402 micropayments (USDC on Base)` → `Payments | x402 micropayment gate (USDG on X Layer)` and `Identity | TEE attestation (pre-computed for demo)` — already honest, keep the "pre-computed for demo".
  - `:166` clone URL already fixed in Task 2.

- [ ] **Step 9: VERIFICATION.**

```bash
# no "USDC on Base" left (x402 is USDG on X Layer)
grep -rn "USDC on Base" submission/ README.md && echo "FAIL: wrong x402 network" || echo "PASS: x402 network correct"
# no bare "TEE-bound" present-tense claim on submission surfaces
grep -rn "TEE-bound" submission/ README.md && echo "CHECK: reword remaining TEE-bound" || echo "PASS: no TEE-bound overclaim"
# DETAILS-BODY now has a Known Limitations section
grep -q "Known Limitations" submission/DETAILS-BODY.html && echo "PASS: honesty block in details" || echo "FAIL: no honesty block"
# every (200) claim in DETAILS-BODY matches a real curl (manual cross-check vs Task 0 Step 5)
grep -n "(200)" submission/DETAILS-BODY.html
# "all 4 skills integrated" blanket claim is gone
grep -rn "All 4 OKX OnchainOS skills integrated\|all 4 skills" submission/ README.md && echo "CHECK: reworded?" || echo "PASS: no blanket all-4 claim"
```
Expected: PASS branches; every remaining `(200)` line corresponds to a real 200 from Task 0 Step 5.

---

## Task 6: Verify no brief submission requirement is missing + tracks are correct

**Files:**
- `submission/SUBMISSION-GUIDE.md` (checklist + tracks)
- `submission/sponsor-tracks.md` (track claim)
- `README.md` (mandatory-README-contents per brief section 4)
- Reference: `~/.claude/skills/hackathon-briefs/okx-buildx.md` section 4 (Mandatory Requirements) + section 6 (Scoring)

**Interfaces:**
- Consumes: the brief's mandatory-requirement list.
- Produces: a submission set that satisfies every mandatory brief item, with correct track names.

- [ ] **Step 1: Reconcile the track names.** `DETAILS-BODY.html:28,82` and `sponsor-tracks.md:14` and `SUBMISSION-GUIDE.md:23` all claim tracks **"Lifestyle Companion + Social Buzz"**. The OKX Build X brief defines **X Layer Arena** and **Skills Arena** (Human Track), not those two. Determine the true target from `PRD.md:3` and the roadmap (`OKX.AI Genesis (Build X Series)`). If Genesis really uses "Lifestyle Companion / Social Buzz" tracks, keep them and add a note; if the target is OKX Build X X Layer Arena, replace every "Lifestyle Companion + Social Buzz" with the real arena. Do NOT leave a track name that does not exist in the target program.
  - Verify: `grep -rn "Lifestyle Companion\|Social Buzz\|X Layer Arena\|Skills Arena" submission/` and cross-check against the brief. Reword all track mentions to the confirmed real track.

- [ ] **Step 2: Confirm the four mandatory README contents** (brief section 4.4): project intro, architecture overview, deployment address, OnchainOS skill usage, working mechanics, team members, X Layer ecosystem positioning. The README has intro / architecture / integrations / how-it-works / tech / team pointer. **Check for the two likely gaps:**
  - **Deployment address / Agentic Wallet address with on-chain activity** (brief 4.2 + 4.4): the README must state the project's Agentic Wallet / ERC-8004 identity address on X Layer. If absent, add a short `## On-Chain Identity` section with the wallet/agent address and the mint tx (from context docs: agent #6013, owner wallet `0xd97c85d61337f8e4366bff2d8b482cfc59d76340`, mint tx recorded in `docs/context/`). Verify the address/tx before writing.
  - **X Layer ecosystem positioning** (brief 4.4): confirm the README has a sentence on where Alter Ego fits in the X Layer ecosystem. If missing, add one line to the intro.

- [ ] **Step 3: Confirm the bonus/mandatory demo video link slot exists.** `SUBMISSION-GUIDE.md:32` has `Demo Video | [Upload to YouTube, paste link]`. Plan 6 produces the video; leave the placeholder but confirm it is the only remaining placeholder and is clearly a Plan-6 dependency (note it, do not resolve it here).

- [ ] **Step 4: Update the pre-submission checklist** (`SUBMISSION-GUIDE.md:48-58`) to reflect the fixes: the live-URL item, the endpoint-status item (from Task 4), and add explicit items for "Agentic Wallet address in README" and "tracks match the brief".

- [ ] **Step 5: VERIFICATION.**

```bash
# tracks reconciled to real names (no phantom tracks)
grep -rn "Lifestyle Companion\|Social Buzz" submission/ README.md   # expect zero OR confirmed-real
# README carries a deployment/agentic-wallet address
grep -in "0xd97c85d61337f8e4366bff2d8b482cfc59d76340\|agentic wallet\|deployment address\|on-chain identity" README.md && echo "PASS: identity present" || echo "FAIL: add agentic wallet address"
# every mandatory README content present
for k in "intro\|What Is" "Architecture\|How It Works" "Integrations\|OnchainOS" "Team\|dmustapha" "X Layer"; do grep -qi "$k" README.md && echo "PASS: $k" || echo "FAIL: $k"; done
```
Expected: PASS for each mandatory content check; identity present; no phantom track names.

---

## Task 7: Final self-consistency sweep + commit

**Files:**
- All of `submission/`, `README.md`

**Interfaces:**
- Produces: a single commit; a clean grep board.

- [ ] **Step 1: Full-board verification (all prior tests in one pass).**

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
echo "--- demo url on surfaces ---"; grep -rn "alter-ego-demo" submission/ README.md || echo OK
echo "--- clone url ---"; grep -rn "dmz4pf" README.md || echo OK
echo "--- unique tx count ---"; grep -rhoE "[0-9],[0-9]{3}" submission/copy/description.md submission/DETAILS-BODY.html | sort -u
echo "--- stale counts ---"; grep -rn "6,134\|4,051" submission/ || echo OK
echo "--- wrong x402 network ---"; grep -rn "USDC on Base" submission/ README.md || echo OK
echo "--- honesty block in details ---"; grep -q "Known Limitations" submission/DETAILS-BODY.html && echo OK
echo "--- em-dashes on submission surfaces ---"; grep -rn "—" submission/ || echo OK
echo "--- working url is 200 ---"; curl -sI -o /dev/null -w "%{http_code}\n" https://alter-ego-wine-mu.vercel.app
```
Expected: `OK` for each grep-guard, exactly ONE line under "unique tx count", `200` for the curl, zero em-dashes.

- [ ] **Step 2: Re-render the DETAILS-BODY paste body** in a browser to confirm the HTML still renders (headings, bold, lists, the new Known Limitations block). `open submission/DETAILS-BODY.html`.

- [ ] **Step 3: Quarantine the stale pre-remediation pipeline gate reports.** `VERIFY-REPORT.md` (and its state file `.verify-state.json`, plus any sibling stale gate artifact) still assert a false "88/100 SHIP IT" readiness that contradicts the actual `.verify-state.json` `winnerReadiness: 0` after Plans 1-4. A judge or reader must not inherit that false claim from any submission-referenced path. For each stale gate artifact, either (a) move it out of any submission-referenced path (e.g. into `docs/context/pre-remediation/`), or (b) prepend a top-of-file banner exactly reading `PRE-REMEDIATION HISTORICAL RECORD — superseded, not a submission claim` (spelled with a real hyphen with spaces, no em-dash). Then prove no submission surface cites the false score or links the stale reports.

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
echo "--- stale 88/100 SHIP IT claim not on any submission surface ---"; grep -rniE "88/100|88 / 100|ship it" submission/ README.md && echo "FAIL: stale score/claim on submission surface" || echo "PASS: no stale score on submission surfaces"
echo "--- stale gate reports not linked from submission surfaces ---"; grep -rnE "VERIFY-REPORT\.md|\.verify-state\.json" submission/ README.md && echo "FAIL: stale gate report linked from submission surface" || echo "PASS: stale gate reports not referenced"
echo "--- each stale gate artifact is quarantined (moved out or banner-annotated) ---"; for f in VERIFY-REPORT.md .verify-state.json; do if [ -f "$f" ]; then head -1 "$f" | grep -q "PRE-REMEDIATION HISTORICAL RECORD" && echo "PASS banner: $f" || echo "CHECK: $f still in repo root without banner — move or annotate"; else echo "PASS moved: $f"; fi; done
```
Expected: PASS branch for the score grep (zero hits on submission surfaces), PASS for the link grep (zero hits), and every stale artifact is either moved (file absent from repo root) or carries the banner as its first line.

- [ ] **Step 4: Commit.**

```bash
git add submission/ README.md
git commit -m "docs: submission honesty pass - working live url, real clone path, single tx count, honest TEE/x402/integration claims"
```

---

## Self-Review notes

- **Spec coverage:** Every Plan-5 roadmap bullet maps to a task. (1) URL swap → Task 1 (all 5 hits + the 302-healthy lie in Task 4). (2) clone URL → Task 2. (3) one tx count → Task 0 Step 1 resolves the canonical number, Task 3 writes it everywhere, Task 7 proves uniqueness. (4) TEE / x402 / all-4-skills / endpoints-200 rewrite → Task 5, branching on the real `X402_STATE`/`TEE_STATE`/`SKILLS_LIVE`. (5) no missing brief requirement → Task 6 (mandatory README contents + Agentic Wallet address + track-name reconciliation). The honest `## Known Limitations` block is used as the model and propagated into `DETAILS-BODY.html`, which previously had none.
- **Falsifiability of each "test":** no task is done on assertion. URL fix is gated by a `curl` returning 200 not 302; clone fix by a repo-reachability curl; tx count by a `sort -u` returning one line; integration claims by matching each `(200)` in copy to a live curl; brief coverage by per-key greps. This is the differential-guard discipline from Plan 1 applied to docs.
- **Dependency on truth from Plans 1-4:** the plan explicitly reads the regenerated cache (Task 0 Step 1) rather than hardcoding a number, and branches all payment/attestation wording on whether Plan 3 shipped. It does not assume `4,463` — if Plan 1's regen changed the sum, `TXN` follows the cache. This is why Plan 5 must run after Plans 1-4.
- **Scope boundary:** no app code, cache, or classifier edits. The single `page.tsx:157` touch is only the hardcoded fallback literal, and only if Plan 1 left it stale — otherwise noted as already-correct. All other page.tsx dynamic wiring belongs to Plan 1.
- **Two open judgment calls flagged for the executor, not fabricated here:** (a) the exact real track name (Genesis "Lifestyle Companion/Social Buzz" vs Build X "X Layer Arena/Skills Arena") — Task 6 Step 1 forces a cross-check against `PRD.md:3` + the brief rather than guessing; (b) whether the `$31,500` GAP COST figure survives Plan 1's cache regen — Task 5 Step 6 forces a `grep` of `src/data/cache/` and either replaces it with the real `gapCostUsd` or deletes the clause. Neither is left as a silent overclaim.
- **Left intentionally untouched:** `HANDOFF*.md`, `docs/context/*`, `docs/PIPELINE-*`, `.interrogate-*`, `FIX-PLAN.md`, `INTERROGATE-REPORT.md` — these are historical / working records, not submission surfaces. Rewriting them would erase the audit trail and is out of scope. Only the seven submission surfaces (`README.md` + `submission/*`) are judge-facing.
- **Demo video (Plan 6) is the one remaining placeholder** in `SUBMISSION-GUIDE.md:32`; Task 6 Step 3 confirms it is the only one and defers it to Plan 6 rather than faking a link.
