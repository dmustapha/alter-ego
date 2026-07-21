# Genuinely-Live Data Layer — Implementation Plan (Plan 1 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Alter Ego's wallet analysis genuinely live and Vercel-viable — real trade data drives the real classifier, and the demo cache becomes the classifier's actual output instead of hand-authored fiction.

**Architecture:** Replace the `spawnSync`/`/tmp`-binary OnchainOS CLI path (non-viable on Vercel serverless) with the async OKX REST client that already exists in `src/lib/okx-api.ts`. Add the one missing endpoint (per-wallet trade history), map its response to the existing `Trade[]` type, feed the existing classifier, and regenerate `src/data/cache/*.json` by running the real classifier in a seed script. A differential test (two distinct wallets → different, non-empty output) becomes the regression guard the whole pipeline lacked.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Node `fetch`, Vitest for unit tests, Playwright (existing) for the differential integration test.

## Global Constraints

- Platform: Vercel serverless — no `spawnSync`, no `/tmp` binary, no blocking calls. All I/O async.
- No em-dashes in any user-facing copy or docs (standing rule).
- OKX REST base: `https://web3.okx.com`; project header `OKX-ACCESS-PROJECT: 4d156bf0c61130f2692d097ecb68dbe4`; auth headers `OKX-ACCESS-KEY / -SIGN / -TIMESTAMP / -PASSPHRASE`; prehash = `timestamp + method + path + body`, HMAC-SHA256, base64.
- Credentials come only from `process.env` (`OKX_API_KEY/OKX_SECRET_KEY/OKX_PASSPHRASE`) — never committed, never in `public/`.
- EVM and Solana addresses require SEPARATE portfolio calls (mixing fails the whole request) — DEEP-RESEARCH gotcha #2.
- The existing `Trade` type in `src/lib/types.ts` is the contract between the data layer and the classifier — do not change its shape without updating the classifier.
- TDD: failing test first, minimal code, commit per task. Prefer recorded JSON fixtures over live network in unit tests.

## Plan decomposition (this is Plan 1 of 6)

1. **Live-data spine (THIS PLAN):** security hotfix + REST trade client + wire into routes + classifier bug-fixes + honest cache regen + differential test.
2. A2MCP conformance (agent card, input schema, 402/X-PAYMENT handshake, ASP `serviceList`).
3. Real x402 payment (`/api/v6/x402/verify` + `/settle`, replace the `setTimeout`).
4. Frontend a11y + design-system tokenization (focus-visible, reduced-motion, contrast, color tokens, re-capture `landing.png`).
5. Submission honesty pass (fix live URLs, clone URL, reconcile tx counts, align copy to reality).
6. Demo re-record (1920x1080 with narration, real rehearsal against the live URL).

Each is independently shippable. This plan must be green before Plan 2 starts.

---

## Task 0: Security hotfix + working baseline (P0, do first)

**Files:**
- Delete: `src/app/api/diag/route.ts`
- Modify: Vercel project env (dashboard/CLI, not a repo file)
- Docs: `docs/SECURITY-ROTATION.md` (Create)

**Interfaces:**
- Produces: a clean baseline (no leaked creds, no info-leak endpoint, working demo) on which the rest of the plan builds.

- [ ] **Step 1: Rotate the exposed OKX credentials.** In the OKX dev portal (`https://web3.okx.com/onchain-os/dev-portal`), revoke `OKX_API_KEY` `64383c9d-…` and the second set `934cc256-…`, and issue a fresh key/secret/passphrase. Record only the *fact* of rotation (not the values) in `docs/SECURITY-ROTATION.md`.

- [ ] **Step 2: Scrub the secrets from git history.**

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
# purge the files that contain the plaintext keys from ALL history
git filter-repo --path HANDOFF-SESSION-20260717.md --path HANDOFF-FIX.md --invert-paths --force
# re-add remote (filter-repo drops it) and force-push
git remote add origin https://github.com/dmustapha/alter-ego.git
git push origin --force --all
```

Expected: `HANDOFF-SESSION-20260717.md` no longer appears in `git log --all -- HANDOFF-SESSION-20260717.md`.

- [ ] **Step 3: Set the fresh creds + DEMO_MODE on Vercel.**

```bash
vercel env add OKX_API_KEY production   # paste fresh value
vercel env add OKX_SECRET_KEY production
vercel env add OKX_PASSPHRASE production
vercel env add DEMO_MODE production      # value: true  (restores the working demo now)
```

Expected: `vercel env ls` shows all four for production.

- [ ] **Step 4: Delete the info-leak endpoint and redeploy.**

```bash
git rm src/app/api/diag/route.ts
git commit -m "security: remove /api/diag info-leak endpoint"
vercel --prod
```

- [ ] **Step 5: Audit `public/` for committed secrets.** The old build wrote credentials into web-served `public/`; those were never audited or removed. Scan and purge.

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
# find any file under public/ carrying a credential pattern
grep -rIlE "OKX_(API|SECRET)|passphrase|[0-9a-f]{32}" public/
```

Delete every secret-bearing file the grep lists, and add its path to the SAME `git filter-repo` pass as Task 0 Step 2 (`--path <file> --invert-paths`) so it is purged from all history, not just the working tree. Add a build assertion that fails the build if `public/` still contains a credential pattern — e.g. in `package.json` `"prebuild"`: `! grep -rIqE "OKX_(API|SECRET)|passphrase|[0-9a-f]{32}" public/`.

Expected: the grep returns no matches after cleanup, and the build asserts a clean `public/`. (Covers Q32.)

- [ ] **Step 6: Verify the baseline.** `curl -s -X POST https://alter-ego-wine-mu.vercel.app/api/analyze -H 'content-type: application/json' -d '{"address":"0xDemo...","chains":["ethereum"]}'` returns HTTP 200 with populated `patterns`/`personas` (not 500). `curl -s https://alter-ego-wine-mu.vercel.app/api/diag` returns 404.

---

## Task 1: OKX REST trade-history endpoint spike (gated)

**Files:**
- Create: `docs/OKX-TRADE-API-CONTRACT.md` (the spike deliverable)
- Reference: `src/lib/okx-api.ts:25-54` (the `okxCall` signer), `DEEP-RESEARCH.md:10,39`

**Interfaces:**
- Produces: `OKX-TRADE-API-CONTRACT.md` documenting the exact endpoint, request body, and JSON response shape for per-wallet trade/dex history — consumed by Task 2.

- [ ] **Step 1: Probe candidate endpoints with the fresh creds.** Using the `okxCall` signing convention, `curl` each candidate for one known-active address on EACH target chain — Ethereum (`chainIndex: 1`), Solana (`501`), and **X Layer (`196`)** (the Genesis target chain) — and record status + body shape per chain. Candidates, in priority order:
  1. `POST /priapi/v5/wallet/agentic/market/portfolio-dex-history` body `{ address, chainIndex }` (agentic surface, matches the CLI `market portfolio-dex-history`).
  2. `GET /api/v5/dex/post-transaction/transactions-by-address?address=<a>&chains=<id>` (public Web3 DEX API).
  3. `POST /priapi/v5/wallet/agentic/asset/wallet-transaction-list` body `{ addresses, chains }`.

Write a throwaway script `scripts/spike-trade-api.mjs` that signs and calls each, prints `status` + first 500 chars of body.

- [ ] **Step 2: Decision rule.** Pick the first candidate that returns 200 with a list of per-token or per-tx records carrying (or letting us derive) at minimum: token symbol/address, chain, USD amount, realized PnL or buy/sell price, and a timestamp. If NONE return usable trade data, STOP and escalate: the "genuinely live trades" path is not available via REST, and the fork falls back to Plan-1B (honest self-consistent demo — see the quality audit's "ship an honest demo" branch). Do not fabricate an endpoint.

- [ ] **Step 3: Document the winner** in `docs/OKX-TRADE-API-CONTRACT.md`: exact method + path, request body, and a real (redacted) sample response with the field-to-`Trade` mapping table (which response field → `Trade.tokenSymbol/chain/pnlPct/pnlUsd/amountUsd/holdDurationDays/action`).

- [ ] **Step 4: Commit** the contract doc and delete the throwaway spike script.

```bash
git add docs/OKX-TRADE-API-CONTRACT.md && git rm scripts/spike-trade-api.mjs
git commit -m "docs: OKX trade-history REST API contract (spike result)"
```

---

## Task 2: `getWalletTrades` REST client + `Trade[]` mapper

**Files:**
- Modify: `src/lib/okx-api.ts` (fix ESM `require`, add `getWalletTrades` + mapper)
- Test: `src/lib/okx-api.test.ts` (Create)
- Fixture: `src/lib/__fixtures__/okx-dex-history.json` (Create — the real redacted response from Task 1 Step 3)
- Reference: `src/lib/types.ts` (`Trade` shape)

**Interfaces:**
- Consumes: the endpoint contract from `docs/OKX-TRADE-API-CONTRACT.md`.
- Produces: `export async function getWalletTrades(address: string, chain: string): Promise<Trade[]>` and `export function mapDexHistoryToTrades(raw: unknown, chain: string): Trade[]`.

- [ ] **Step 1: Fix the ESM crypto import.** In `src/lib/okx-api.ts:18`, replace `const crypto = require("crypto");` with a top-of-file `import { createHmac } from "crypto";` and change the body to `return createHmac("sha256", process.env.OKX_SECRET_KEY || "").update(timestamp + method + path + body).digest("base64");`.

- [ ] **Step 2: Write the failing mapper test.** (Use the real field names from the Task 1 contract; the example below assumes fields `tokenSymbol/chainIndex/pnl/pnlRatio/volumeUsd/holdingTime/type` — replace with the contract's actual names.)

```ts
// src/lib/okx-api.test.ts
import { describe, it, expect } from "vitest";
import { mapDexHistoryToTrades } from "./okx-api";
import raw from "./__fixtures__/okx-dex-history.json";

describe("mapDexHistoryToTrades", () => {
  it("maps a real dex-history response to Trade[] with correct signs", () => {
    const trades = mapDexHistoryToTrades(raw, "ethereum");
    expect(trades.length).toBeGreaterThan(0);
    const loss = trades.find((t) => t.pnlUsd < 0);
    expect(loss).toBeDefined();                 // negative PnL preserved, not sign-stripped
    expect(loss!.chain).toBe("ethereum");
    expect(typeof loss!.holdDurationDays).toBe("number");
    expect(["BUY", "SELL"]).toContain(loss!.action);
  });
});
```

- [ ] **Step 3: Run it, verify it fails.** `npx vitest run src/lib/okx-api.test.ts` → FAIL (`mapDexHistoryToTrades` not exported).

- [ ] **Step 4: Implement the mapper + client** in `src/lib/okx-api.ts` (map exactly per the contract table; preserve negative signs; convert the API's hold-time unit to days). Add:

```ts
export function mapDexHistoryToTrades(raw: any, chain: string): Trade[] {
  const rows = raw?.data?.[0]?.list ?? raw?.data ?? [];   // adjust to contract shape
  return rows.map((r: any): Trade => ({
    tokenSymbol: r.tokenSymbol ?? r.symbol ?? "UNKNOWN",
    chain,
    action: (r.type ?? r.side ?? "").toUpperCase() === "SELL" ? "SELL" : "BUY",
    amountUsd: Number(r.volumeUsd ?? r.amountUsd ?? 0),
    pnlUsd: Number(r.pnl ?? 0),                 // signed
    pnlPct: Number(r.pnlRatio ?? 0) * 100,      // signed
    holdDurationDays: Number(r.holdingTime ?? 0) / 86400,
  }));
}

export async function getWalletTrades(address: string, chain: string): Promise<Trade[]> {
  const res = await okxCall("POST", "/priapi/v5/wallet/agentic/market/portfolio-dex-history",
    { address, chainIndex: chain });            // exact path/body from contract
  return mapDexHistoryToTrades(res, chain);
}
```

Import `Trade` from `./types`.

- [ ] **Step 5: Run it, verify it passes.** `npx vitest run src/lib/okx-api.test.ts` → PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/lib/okx-api.ts src/lib/okx-api.test.ts src/lib/__fixtures__/okx-dex-history.json
git commit -m "feat: real OKX trade-history REST client + Trade mapper (Vercel-viable)"
```

---

## Task 3: Wire real trades into the analysis routes

**Files:**
- Modify: `src/app/api/analyze/route.ts` (replace CLI calls with REST; populate real fields; add config)
- Modify: `src/app/api/a2mcp/route.ts` (same; add the address sanitizer it lacks)
- Delete: `src/lib/onchainos.ts`, `scripts/download-onchainos.js`, `package.json` `prebuild` hook, `bin/`
- Test: `src/app/api/analyze/route.test.ts` (Create)

**Interfaces:**
- Consumes: `getWalletTrades`, `getAllTokenBalances` (from `okx-api.ts`), `classifyPatterns`, `generatePersona`.
- Produces: routes that build `WalletData` with real `trades`, `totalTxns`, and `avgGasGwei`.

- [ ] **Step 1: Add serverless config** to both routes (top of file): `export const runtime = "nodejs"; export const maxDuration = 60;`

- [ ] **Step 2: Replace the live block** in `analyze/route.ts` (currently `:52-103`) so each wallet calls `getWalletTrades(addr.address, chain)` and `getAllTokenBalances`, then sets `trades` to the real array, `totalTxns: trades.length`, and `avgGasGwei` from the balances/tx data (0 only if genuinely unavailable). Parallelize per-wallet with `Promise.all`. Remove all `onchainos.ts` imports.

- [ ] **Step 3: Port the same change to `a2mcp/route.ts`** and add the missing input sanitizer at the top of `POST` (copy `analyze/route.ts:22-28`: length bound + `/[<>"'&\`\\]/` reject). Strip the `_debug` field from the response and its type.

- [ ] **Step 4: Write the route test** (mock `okx-api`): asserts that given a fixture with real trades, the response has non-empty `patterns` and `totalTxns > 0`.

```ts
// src/app/api/analyze/route.test.ts
import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/okx-api", () => ({
  getWalletTrades: vi.fn().mockResolvedValue([
    { tokenSymbol: "PEPE", chain: "ethereum", action: "SELL", amountUsd: 900, pnlUsd: -820, pnlPct: -91, holdDurationDays: 0.02 },
  ]),
  getAllTokenBalances: vi.fn().mockResolvedValue({ data: [] }),
}));
import { POST } from "./route";

describe("POST /api/analyze (live)", () => {
  it("returns non-empty patterns from real trades", async () => {
    const req = new Request("http://x/api/analyze", { method: "POST", body: JSON.stringify({ address: "0xabc", chains: ["ethereum"] }) });
    const res = await POST(req);
    const json = await res.json();
    expect(json.patterns.flatMap((p: any) => [...p.amplify, ...p.guard]).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 5: Run tests, verify pass.** `npx vitest run src/app/api/analyze/route.test.ts` → PASS.

- [ ] **Step 6: Delete the dead CLI path.**

```bash
git rm src/lib/onchainos.ts scripts/download-onchainos.js
# remove the "prebuild" script from package.json manually
git add src/app/api/analyze/route.ts src/app/api/a2mcp/route.ts package.json src/app/api/analyze/route.test.ts
git commit -m "feat: wire real OKX trades into analysis routes; drop non-viable CLI path"
```

---

## Task 4: Fix the broken/dead classifier rules

**Files:**
- Modify: `src/lib/classifier.ts` (AMP-04, AMP-06, GRD-05)
- Test: `src/lib/classifier.test.ts` (Create)

**Interfaces:**
- Consumes: `Trade[]`, `WalletData`.
- Produces: corrected `classifyPatterns` with no always-true / always-false / incoherent rules.

- [ ] **Step 1: Write failing tests** for the three defects the audit found:

```ts
// src/lib/classifier.test.ts — key cases
import { describe, it, expect } from "vitest";
import { classifyPatterns } from "./classifier";
const base = { address:"0x", chain:"ethereum", chainId:1, approvals:[], tokenScans:[], avgGasGwei:0, networkMedianGasGwei:30, totalTxns:0, realizedPnl:0, winRate:0 };

it("AMP-06 does NOT fire when there are zero losses (no false 'disciplined')", () => {
  const trades = Array.from({length:6}, () => ({tokenSymbol:"X",chain:"ethereum",action:"SELL",amountUsd:100,pnlUsd:50,pnlPct:10,holdDurationDays:5}));
  const r = classifyPatterns({ ...base, trades });
  expect(r.amplify.find(p => p.id === "AMP-06")).toBeUndefined();
});

it("GRD-05 ratio stays within [0,1] and needs a shared micro-cap set", () => {
  const trades = [{tokenSymbol:"X",chain:"ethereum",action:"SELL",amountUsd:5000,pnlUsd:-4800,pnlPct:-96,holdDurationDays:1}]; // big-cap loss, no micro-caps
  const r = classifyPatterns({ ...base, trades });
  expect(r.guard.find(p => p.id === "GRD-05")).toBeUndefined(); // must not fire with zero micro-caps
});
```

- [ ] **Step 2: Run, verify fail.** `npx vitest run src/lib/classifier.test.ts` → FAIL.

- [ ] **Step 3: Fix the rules** in `classifier.ts`: (a) AMP-06 (`:104`): guard `if (losingTrades.length === 0) return;` before the `Math.min` drawdown check. (b) GRD-05 (`:185-187`): define one micro-cap set `const micro = trades.filter(t => t.amountUsd < 1000)` and compute `micro.filter(t => t.pnlPct < -90).length / Math.max(micro.length, 1)`, and require `micro.length >= 3` to fire. (c) AMP-04 (`:73`): remove the pattern (its `holdDurationDays` proxy cannot detect "early entry") or gate it behind a real `tokenAgeAtEntryDays` field — remove for now.

- [ ] **Step 4: Run, verify pass.** `npx vitest run src/lib/classifier.test.ts` → PASS.

- [ ] **Step 5: Commit.** `git add src/lib/classifier.ts src/lib/classifier.test.ts && git commit -m "fix: correct AMP-06 false-positive, GRD-05 incoherent ratio, remove dead AMP-04"`

- [ ] **Step 6: Latent-bug catch-all sweep.** The debug phase left residual latent bugs. Run `npx tsc --noEmit` and do a targeted review of `src/lib/classifier.ts`, `src/lib/persona.ts`, and any residual parser code for the bugs debug missed. Create `docs/LATENT-BUGS.md` and log each finding as one row: `id | file:line | symptom | fix-or-defer | rationale`. Fix every entry marked `fix`; leave a one-line justification for every `defer`.

```bash
npx tsc --noEmit
grep -nE "Math\.(min|max)|\.filter\(|\.reduce\(|pnl|winRate|\?\?|\|\| 0" src/lib/classifier.ts src/lib/persona.ts
```

Expected: `tsc --noEmit` clean, and `docs/LATENT-BUGS.md` lists every reviewed bug with a decision. (Covers Q13.)

- [ ] **Step 7: Sign-loss regression test.** Prove no `\$?([\d,.]+)` sign-stripping survived the `onchainos.ts` deletion in the AGGREGATION path (`classifier.ts` / `persona.ts`), not just the Task-2 mapper. Write a failing test where a net-loss wallet yields NEGATIVE `realizedPnl` and `winRate < 50%`.

```ts
// src/lib/classifier.test.ts — append
import { generatePersona } from "./persona";

it("aggregation preserves negative sign end-to-end (no $-regex sign-strip)", () => {
  const trades = [
    { tokenSymbol: "PEPE", chain: "ethereum", action: "SELL", amountUsd: 900, pnlUsd: -820, pnlPct: -91, holdDurationDays: 0.02 },
    { tokenSymbol: "WIF",  chain: "ethereum", action: "SELL", amountUsd: 400, pnlUsd: -310, pnlPct: -77, holdDurationDays: 0.5 },
    { tokenSymbol: "BONK", chain: "ethereum", action: "SELL", amountUsd: 250, pnlUsd:  40, pnlPct:  16, holdDurationDays: 3 },
  ];
  const r = classifyPatterns({ ...base, trades });
  expect(r.realizedPnl).toBeLessThan(0);      // -1090 net, sign preserved through aggregation
  expect(r.winRate).toBeLessThan(50);         // 1 of 3 winners
  const persona = generatePersona({ ...base, trades, realizedPnl: r.realizedPnl, winRate: r.winRate });
  expect(JSON.stringify(persona)).not.toMatch(/\$1,?090\b(?!.*-)/); // loss never rendered as a positive figure
});
```

Run it, fix any aggregation site that strips the sign (search for `\$?([\d,.]+)` / `.replace(/[$,]/` / `Math.abs` on PnL), then verify PASS. (Covers N6 beyond the mapper.)

```bash
npx vitest run src/lib/classifier.test.ts
git add src/lib/classifier.ts src/lib/persona.ts src/lib/classifier.test.ts docs/LATENT-BUGS.md
git commit -m "fix: catch residual latent bugs + sign-loss aggregation regression test (N6, Q13)"
```

---

## Task 5: Regenerate the demo cache from the REAL engine

**Files:**
- Create: `scripts/seed-demo.mjs`
- Regenerate: `src/data/cache/patterns.json`, `personas.json`, `comparison.json`, `roast-lines.json`, `roast-battle.json`, `wallet-*.json`
- Reference: `src/lib/classifier.ts`, `src/lib/persona.ts`

**Interfaces:**
- Consumes: `getWalletTrades`, `classifyPatterns`, `generatePersona`.
- Produces: cache JSON that is the classifier's ACTUAL output for 3 chosen demo wallets — internally consistent, no hand-authored tags.

- [ ] **Step 1: Pick 3 real, characterful demo wallets** (one disciplined EVM, one degen Solana, one mixed) and record their addresses in the script header.

- [ ] **Step 2: Write `scripts/seed-demo.mjs`** that, for each wallet, calls `getWalletTrades` + balances, runs `classifyPatterns` and `generatePersona`, and writes the results to `src/data/cache/*.json` in the exact shapes `src/lib/cache.ts` loads. Compute `comparison.gapCostUsd` as a real formula: `((topWinRate - userWinRate)/100) * totalVolumeUsd` (document the formula in the file), or omit the dollar figure if volume is unavailable. Generate roast lines from a template that interpolates ONLY real figures from the trade data (no invented "$21,800").

- [ ] **Step 3: Run it.** `node scripts/seed-demo.mjs`. Expected: the 6 cache files rewrite; `patterns.json` tags now MATCH `classifier.ts` tag names (e.g. "Patient Accumulator", not "Diamond Hands" on AMP-01).

- [ ] **Step 4: Verify self-consistency.** Grep that the tx count is identical across `wallet-*.json`, `roast-battle.json`, and any stat surface; grep that every roast number appears in the source wallet JSON.

- [ ] **Step 5: Commit.** `git add scripts/seed-demo.mjs src/data/cache/*.json && git commit -m "feat: regenerate demo cache from the real classifier (self-consistent, no fabricated data)"`

---

## Task 6: Differential test — the guard the pipeline lacked

**Files:**
- Create: `tests/differential.spec.ts` (Playwright)
- Modify: `package.json` (add `"test": "vitest run"` and `"test:e2e": "playwright test"`)
- Modify: `playwright.config.ts` (add a `webServer` block so it is CI-runnable)

**Interfaces:**
- Consumes: the live `/api/a2mcp` endpoint.
- Produces: a falsifiable assertion that two distinct real wallets yield different, non-empty analyses.

- [ ] **Step 1: Write the failing differential test.**

```ts
// tests/differential.spec.ts
import { test, expect, request } from "@playwright/test";
const A = "0x<real-wallet-A>", B = "0x<real-wallet-B>"; // two genuinely different traders
test("two distinct wallets produce different, non-empty analyses", async ({ playwright }) => {
  const api = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
  const ra = await (await api.post("/api/a2mcp", { data: { address: A, chains: ["ethereum"] } })).json();
  const rb = await (await api.post("/api/a2mcp", { data: { address: B, chains: ["ethereum"] } })).json();
  const tags = (r: any) => r.patterns.flatMap((p: any) => [...p.amplify, ...p.guard].map((x: any) => x.tag)).sort().join(",");
  expect(tags(ra).length).toBeGreaterThan(0);
  expect(tags(rb).length).toBeGreaterThan(0);
  expect(tags(ra)).not.toEqual(tags(rb));         // the assertion no prior gate made
});
```

- [ ] **Step 2: Add the `webServer` block** to `playwright.config.ts`: `webServer: { command: "npm run build && npm start", url: "http://localhost:3000", reuseExistingServer: !process.env.CI }` and set `use.baseURL`.

- [ ] **Step 3: Run against a live build with DEMO_MODE unset** (real path). `BASE_URL=http://localhost:3000 npx playwright test tests/differential.spec.ts`. Expected: PASS (proves the live engine differentiates real wallets).

- [ ] **Step 4: Commit.** `git add tests/differential.spec.ts playwright.config.ts package.json && git commit -m "test: differential guard — distinct wallets yield distinct non-empty analyses"`

---

## Task 7: API abuse hardening + dead-export cleanup

**Files:**
- Create: `src/lib/ratelimit.ts`
- Modify: `src/app/api/analyze/route.ts`, `src/app/api/a2mcp/route.ts` (apply limiter + caps)
- Modify: `src/lib/okx-api.ts` (remove 5 unused exports)
- Test: `src/lib/ratelimit.test.ts` (Create)
- Docs: `docs/SCOPE-DECISIONS.md` (Create — the phase-timer retention note)

**Interfaces:**
- Consumes: the two open POST routes; `src/lib/okx-api.ts` export surface.
- Produces: `export function rateLimit(ip: string): { ok: boolean; retryAfter: number }` and hardened routes that return 429 on breach and bound the `Promise.all` fan-out.

- [ ] **Step 1: Write the failing limiter test.**

```ts
// src/lib/ratelimit.test.ts
import { describe, it, expect } from "vitest";
import { rateLimit } from "./ratelimit";

describe("rateLimit (per-IP token bucket)", () => {
  it("allows 10 requests then returns 429 on the 11th from one IP", () => {
    const ip = "1.2.3.4";
    for (let i = 0; i < 10; i++) expect(rateLimit(ip).ok).toBe(true);
    const eleventh = rateLimit(ip);
    expect(eleventh.ok).toBe(false);
    expect(eleventh.retryAfter).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it, verify it fails.** `npx vitest run src/lib/ratelimit.test.ts` → FAIL (`rateLimit` not exported).

- [ ] **Step 3: Implement the limiter** in `src/lib/ratelimit.ts` — an in-memory token bucket keyed by IP (10 req/min/IP). Note the production-durable option in a comment.

```ts
// src/lib/ratelimit.ts
// In-memory per-IP token bucket. For production durability across serverless
// instances, swap this Map for @upstash/ratelimit (Redis-backed).
const WINDOW_MS = 60_000;
const LIMIT = 10;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now >= b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= LIMIT) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, retryAfter: 0 };
}
```

- [ ] **Step 4: Run it, verify it passes.** `npx vitest run src/lib/ratelimit.test.ts` → PASS.

- [ ] **Step 5: Apply the limiter + caps to BOTH routes.** At the top of the `POST` handler in `src/app/api/analyze/route.ts` and `src/app/api/a2mcp/route.ts`:

```ts
import { rateLimit } from "@/lib/ratelimit";
// ...
const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
const rl = rateLimit(ip);
if (!rl.ok) {
  return new Response(JSON.stringify({ error: "rate_limited" }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(rl.retryAfter) },
  });
}
```

Enforce the existing ≤5-wallets/request cap (reject with 400 if exceeded) AND add a chains-per-wallet cap (e.g. `MAX_CHAINS = 5`) so the `Promise.all` fan-out is bounded to `wallets * chains` and cannot be inflated by a caller.

- [ ] **Step 6: Write the route 429 test** (mock `okx-api` as in Task 3): the 11th rapid request from one IP returns HTTP 429.

```ts
// src/app/api/analyze/route.test.ts — append
it("returns 429 on the 11th rapid request from one IP", async () => {
  const mk = () => new Request("http://x/api/analyze", {
    method: "POST",
    headers: { "x-forwarded-for": "9.9.9.9" },
    body: JSON.stringify({ address: "0xabc", chains: ["ethereum"] }),
  });
  let last: Response | undefined;
  for (let i = 0; i < 11; i++) last = await POST(mk());
  expect(last!.status).toBe(429);
});
```

Run: `npx vitest run src/app/api/analyze/route.test.ts` → PASS. (Covers F27/P3-10.)

- [ ] **Step 7: Remove the 5 dead exports** from `src/lib/okx-api.ts`. First grep-confirm zero importers, then delete `getLeaderboard`, `getTotalValue`, `checkWalletStatus`, `loginWallet`, `verifyOtp`.

```bash
for f in getLeaderboard getTotalValue checkWalletStatus loginWallet verifyOtp; do
  echo "== $f =="; grep -rn "\b$f\b" src --include="*.ts" --include="*.tsx" | grep -v "okx-api.ts"
done
```

Expected: each grep returns no external importer; then remove the functions. (Covers F26.)

- [ ] **Step 8: Record the phase-timer scope decision.** Create `docs/SCOPE-DECISIONS.md` with a documented DECISION (not a rebuild): the `page.tsx` phase-timer UX (the ~2s / 20s / 58s `setTimeout` chain) is RETAINED as an intentional demo-pacing choice and is deliberately NOT re-architected, because the demo capture (Plan 6) and the screenshots (Plan 4) depend on those exact timings, and re-architecting mid-remediation is high-risk for zero scoring gain. This makes Q7 a conscious scope decision, not an oversight.

- [ ] **Step 9: Commit.**

```bash
git add src/lib/ratelimit.ts src/lib/ratelimit.test.ts src/app/api/analyze/route.ts src/app/api/a2mcp/route.ts src/app/api/analyze/route.test.ts src/lib/okx-api.ts docs/SCOPE-DECISIONS.md
git commit -m "feat: per-IP rate limiting + bounded fan-out on open routes; drop 5 dead exports; document phase-timer retention (F26, F27, Q7)"
```

---

## Self-Review notes

- **Spec coverage:** Every Part-II P2 "make it true" item maps to a task — real trades (T1-T3), classifier fixes (T4), honest cache (T5), Vercel viability via async REST + maxDuration + Promise.all (T3), security P0 (T0), the missing differential test (T6). A2MCP conformance / x402 / a11y / submission / demo are explicitly deferred to Plans 2-6.
- **Known gate:** Task 1 is a real spike; if no REST trade endpoint exists, execution stops and forks to the "honest demo" branch (Plan 1B) rather than fabricating data. This is intentional, not a placeholder.
- **Type consistency:** `getWalletTrades`/`mapDexHistoryToTrades` produce `Trade[]` per `types.ts`; routes consume it; classifier consumes `Trade[]`; seed + differential test consume the route output. Names are consistent across tasks.
- **Assumption to confirm before T1:** target hackathon is OKX.AI Genesis (agent #6013 on the marketplace), not OKX Build X / X Layer. If Build X, the integration priorities change (needs on-chain X Layer activity) and Plan 2 must lead.
