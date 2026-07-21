# Alter Ego — Pipeline Forensic Critique

Date: 2026-07-20
Auditor: senior fullstack review, five parallel specialist reviewers (forge / build+debug / wire+verify / stress+livetest+interrogate / security+demo), each cross-examining phase reports against the actual source.
Project: Alter Ego — OKX.AI marketplace A2MCP agent (#6013), "multi-chain, multi-wallet behavioral fingerprinting." ~2,085 LOC.

---

## Verdict (one line)

**The product is a demo-only shell. The live path returns hollow data (`totalTxns:0, trades:[], avgGasGwei:0`) for every real wallet; the rich output the project sells exists only in eight hand-authored JSON cache files served via a silent `demo_fallback`. Six consecutive quality gates rubber-stamped it.**

## The diagnosis you should update

Your working theory was "DeepSeek didn't complete the build properly." The evidence says something more useful and more damning:

**The build was completed — faithfully — against a plan that was already hollow.**

The FORGE architecture (`ARCHITECTURE.md:1191-1214`) itself specifies the live-mode `WalletData` with `trades: []`, `totalTxns: 0`, `avgGasGwei: 0`, `networkMedianGasGwei: 30`. DeepSeek implemented that spec almost verbatim (`src/app/api/a2mcp/route.ts:72-79`, `src/app/api/analyze/route.ts:73-96`). The classifier and persona engine — which are genuinely well-written — consume exactly those fields. So on any real wallet they receive zeroed inputs and emit a blank default persona ("The Professional", 0 strengths, 0 weaknesses).

The one data source that would populate `trades[]` — the `portfolio-dex-history` CLI call — was **verified available at HIGH confidence in DEEP-RESEARCH.md:10, then omitted from the architecture** and never turned into a wrapper. That is the single producer/consumer gap at the center of the product, and it was designed in, not coded wrong.

This reframes the fix: patching the build is not enough — the plan needs the missing data source wired, and the pipeline's gates need to stop rewarding disclosed-and-undisclosed mocks.

## The one defect that cascades

```
DEEP-RESEARCH verified `portfolio-dex-history` (fills trades[])   ✅ researched
        │
FORGE architecture omits the wrapper, specs `trades: []`          ✗ gap designed in
        │
BUILD implements the spec faithfully → live path drops real data  ✗ hollow live path
        │
DEBUG "fixes" 500 errors by AUTHORING the fake demo cache         ✗ manufactures the illusion
        │
WIRE proves the WRONG route (/api/analyze, never /api/a2mcp)      ✗ proof-by-demo-fallback
        │
VERIFY scores 88/100 "SHIP IT" (state file says winnerReadiness:0)✗ unbacked rubber stamp
        │
STRESS asserts on cache literals (12,450 / 31,500 / Diamond Hands)✗ real run, hollow assertions
        │
LIVETEST calls demo cache "real transaction data"                 ✗ mislabels fallback as live
        │
INTERROGATE observes the mechanism 3× → "appropriate for a        ✗ misclassifies fatal as fine
        │  hackathon" (INTERROGATE-REPORT.md:159)
DEMO script: "Never type random addresses. Only use LOAD DEMO."   ✗ the crutch is load-bearing
```

Every gate had the evidence in front of it. Not one opened the live branch's return statement and asked "what does this return for a wallet that isn't one of the three seeded demos?"

## Phase scorecard

| Phase | Grade /100 | One-line reason |
|-------|-----------|-----------------|
| Forge (spec quality) | **34** | Clean, buildable TypeScript that encodes a hollow core: `trades:[]` spec'd, `portfolio-dex-history` omitted. |
| Build (honesty) | **48** | Candid about `[MOCK]` TEE/x402 and UNTESTED CLI, but claims Phases 1-4 "complete" while hardcoding away the product's output. |
| Debug (rigor) | **22** | "Fixed" the broken product by writing the fake cache that hides the break; 0 automated tests; missed `trades:[]` entirely. |
| Wire (proof-rigor) | **34** | Declared "real OKX data proven" while testing the wrong route against demo-fallback; never touched `/api/a2mcp` or the prod CLI path. |
| Verify (honesty) | **22** | 88/100 "SHIP IT" contradicted by its own `.verify-state.json` (`winnerReadiness:0`, empty facets); kill-zones rewarded mocks. |
| Stress (rigor) | **28** | Genuine clean Playwright run, but 100% of data assertions land on static cache constants; no test asserts two inputs differ. |
| Livetest (rigor) | **20** | Accepted `demo_fallback` as PASS and labeled canned cache "real transaction data with timestamps." |
| Interrogate (thoroughness) | **35** | Real security P0s found, but observed the hollow-path mechanism 3× and classified it as an acceptable tradeoff. |
| Security (posture) | **15** | Live OKX credentials (two sets) committed to a public repo; `/api/diag` info-leak; zero auth/rate-limiting. |
| Demo (integrity) | **22** | Headline claims untrue for any judge-controlled input; submitted live URL is auth-walled; failure silently masked as the judge's result. |

## Why the pipeline missed it (the meta-lesson)

The gates are structurally blind to **hollow-but-present** integrations. They check for the *absence* of a feature, the presence of a `[MOCK]` label, HTTP 200, and `tsc` exit 0 — none of which detect a route that returns type-clean zeros. Specifically:

1. **`satisfies AnalyzeResponse` is a type-lie the compiler accepts.** A response full of zeros type-checks perfectly (`a2mcp/route.ts:38,123,148`). A green `npm run build` certifies syntax, not that the product computes anything.
2. **The disclosed mocks were an honesty decoy.** Because TEE and x402 are transparently labeled `[MOCK]`, reviewers concluded "the project is honest about its limits" and stopped probing — but the hollow *live analysis path* is not in any disclosure table.
3. **No gate ran a differential test.** The single assertion that would have exposed everything — "POST two different real addresses, assert the outputs differ" — appears in no phase.
4. **Verify's kill-zones reward mocks.** x402 (a `setTimeout`) scored 3/5; Technical Correctness scored 15/15 over a live path that returns zeros.

## Correction to the raw findings (intellectual honesty)

The security reviewer flagged `0xd9e7e5be7d1174…c56a` as a leaked **private key**. It is **not** — the handoff labels it the on-chain **avatar-update transaction hash** (`docs/context/conversation_2026-07-20_0101.md:45,67,99`). A tx hash is also 64 hex chars; the reviewer misread it. The *credential* exposure below is real and verified; this one line is a false positive and is excluded.

---

## Action items (ordered by urgency)

### P0 — Security (do before anything else)
1. **Rotate/revoke the exposed OKX credentials NOW.** `OKX_API_KEY`/`OKX_SECRET_KEY`/`OKX_PASSPHRASE` are in `HANDOFF-SESSION-20260717.md` (git-tracked, in pushed public history) and a second set is captured in `.interrogate-findings/p08.json`. Assume both key sets are compromised.
2. **Scrub git history** (`git filter-repo` to purge the secrets from all `HANDOFF-*.md`), then force-push. Scrubbing alone is insufficient without rotation — do both.
3. **Delete `src/app/api/diag/route.ts`** — it leaks env-var presence, cwd, root file listing, and executes the onchainos binary unauthenticated.

### P1 — Submission integrity (if this is being submitted)
4. **Fix the submitted live URL.** Submission points to `alter-ego-demo.vercel.app` (Vercel-Auth walled — a login redirect, not the app). The working URL is `alter-ego-wine-mu.vercel.app`. Update `submission/copy/description.md`, `submission/links.md`, `DETAILS-BODY.html`, `SUBMISSION-GUIDE.md`.
5. **Reconcile the copy with reality.** Either (a) make the live path real, or (b) rewrite present-tense claims ("reads your entire on-chain history", "every insult backed by real transaction data") to stop asserting live analysis. Silent `demo_fallback` returning canned data as the judge's own result is the worst option — it reads as deception under a live test.

### P2 — The real fix (make the product true)
6. **Add the `getDexHistory` wrapper** over `onchainos market portfolio-dex-history`, parse it into `Trade[]`, and populate `trades`, `totalTxns`, and real `avgGasGwei` in both `a2mcp` and `analyze` routes. This is the one change that turns the classifier from inert to functional on real wallets.
7. **Add a differential test:** POST two distinct real addresses, assert non-empty and non-identical outputs. This is the regression guard the whole pipeline lacked.
8. **Sanitize the address input in the `a2mcp` route** — it lacks the `[<>"'&\`\\]` filter the `analyze` route has (`analyze/route.ts:27`), leaving an argument-injection surface into the CLI.

### P3 — Hygiene
9. Remove dead code: `src/lib/okx-api.ts` (imported nowhere), unused exports (`getLeaderboard`, `getTotalValue`, `checkWalletStatus`, `loginWallet`, `verifyOtp`).
10. Add auth + rate-limiting to the open API routes before the live path (with its 5-wallet × ~4-subprocess loop) can be abused.

---

## Evidence index

- Hollow live path: `src/app/api/a2mcp/route.ts:72-79,95-102`; `src/app/api/analyze/route.ts:73-96`
- Engine consumes the dropped fields: `src/lib/classifier.ts:20-217` (11/12 patterns read `wallet.trades`), `:158` (dead gas rule); `src/lib/persona.ts:60`
- Missing producer: `ARCHITECTURE.md:418-475` (no `getDexHistory`); `DEEP-RESEARCH.md:10` (verified available)
- Silent fallback: `src/app/api/a2mcp/route.ts:29,112-124` (`_debug.mode:"demo_fallback"`)
- Debug authored the fake data: `DEBUG-REPORT.md` Bug #1; `.debug-state.json` (`testCount:0`)
- Verify contradiction: `VERIFY-REPORT.md:124` (88/100) vs `.verify-state.json` (`winnerReadiness:0`, `facets:{}`)
- Fake payment: `src/components/PaymentButton.tsx:1,7` (`setTimeout`, no x402 dep)
- Interrogate miss: `INTERROGATE-REPORT.md:159`; `.interrogate-findings/p01.json,p09.json,p14.json`
- Demo crutch disclosed: `DEMO-SCRIPT.md:65-71`
- Exposed creds: `HANDOFF-SESSION-20260717.md:34-36` (tracked+pushed); `.interrogate-findings/p08.json:10`
- Broken submission URL: `submission/links.md:5`; working URL in `DEMO-SCRIPT.md:5`
