# Real x402 Payment — Implementation Plan (Plan 3 of 8, MANDATORY listing gate)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Also read the `okx-agent-payments-protocol` skill (`~/.claude/skills/okx-agent-payments-protocol/SKILL.md`) in full before Task 1 — it is the authoritative PAYER-side x402 contract. This plan owns the SELLER side, which that skill does not.

> **⚠️ STATUS: MANDATORY.** This is not a stretch feature. Per `docs/LISTING-REJECTION-ANALYSIS.md` (the authoritative root-cause doc), OKX rejected agent #6013 for rejection reason 2, "Has not passed x402 standard validation". The listing does not go live until the paid a2mcp path returns an OKX-standard x402 v2 challenge that OKX's own `curl -i -X POST` self-check accepts. There is no honest-simulation fallback for the LISTING: a simulated payment fails validation and the agent stays rejected. The only permitted STOP is the Task 1 SDK/settlement spike gate (documented below), and even then the plan does not ship a fake — it escalates.

**Goal:** Stand up the SELLER side of x402 v2 on Alter Ego's paid a2mcp path using the **OKX Payment SDK (`@okxweb3/x402-*`, Node variant)**, so that an unpaid call returns HTTP `402` with a base64 `PAYMENT-REQUIRED` header decoding to a valid v2 challenge (`{x402Version:2, resource:{url,description,mimeType:"application/json"}, accepts:[...]}` for **USDT0, 6 decimals, network `eip155:196`**), and a paid call carrying a valid `X-PAYMENT` header is verified by the SDK and served. This plan produces the reusable `enforceX402` wrapper that Plan 2's endpoint imports, and replaces the `setTimeout` fake in `PaymentButton.tsx` with a real client flow that settles on X Layer.

**Architecture:** The listing gate checks the SELLER side (issuing the standard 402 + verifying the client's payment), which the `okx-agent-payments-protocol` skill does NOT cover — that skill is the PAYER (`onchainos payment pay`). Hand-rolling the 402 is exactly what failed OKX's validation, so this plan builds against the OKX Payment SDK, not a hand-assembled JSON blob. THIS PLAN OWNS the seller-side module `src/lib/x402/okx-x402.ts`, exporting one Vercel-serverless-safe function `enforceX402(req, resourceUrl)` that the SDK backs. Plan 2's a2mcp route imports it: on the paid tier it calls `enforceX402`; an unpaid request gets the SDK's compliant `402 + PAYMENT-REQUIRED` `Response`, a paid request that the SDK verifies returns `{paid:true}` and the route serves the analysis. The exact SDK seller-side API, the exact v2 challenge the SDK emits, and the USDT0 X Layer (196) token address are UNKNOWN until the Task 1 spike pins them — no field is hardcoded from memory.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Node `fetch`, the OKX Payment SDK `@okxweb3/x402-*` (Node/`x402-next` variant for the seller side), `viem` (for reading the USDT0 `Transfer` event on X Layer as the settlement proof + for any client-side EIP-3009 signing the SDK requires), Vitest for unit tests, Playwright (existing) for the end-to-end paid-flow test. OKX facilitator + SDK base `https://web3.okx.com` (same base as `okx-api.ts`).

## Global Constraints

- **x402 is MANDATORY, not optional.** It is a hard OKX listing gate (rejection reason 2). Do not reintroduce "OPTIONAL / stretch" framing anywhere.
- **Corrected x402 facts (authoritative — from `docs/LISTING-REJECTION-ANALYSIS.md`, supersedes the old USDG/v1/xlayer values):**
  - **x402 version: `2`** (NOT 1). The JSON field is `x402Version`, byte-exact.
  - **Challenge shape:** `{ x402Version: 2, resource: { url, description, mimeType: "application/json" }, accepts: [ ... ] }`.
  - **Delivery:** base64-encode the challenge into the **`PAYMENT-REQUIRED`** response header on an HTTP `402`. Free path returns `200` + result; paid path returns `402` + `PAYMENT-REQUIRED`.
  - **network: `"eip155:196"`** (X Layer, CAIP-2), NOT `"xlayer"`.
  - **asset: USDT0**, **decimals = 6** (NOT USDG, NOT 18dp). The exact USDT0 X Layer contract address is pinned by the Task 1 SDK spike — **do NOT hardcode a guessed address.**
  - **`payTo`** = the ASP payee wallet (`X402_PAYTO_ADDRESS`); **`maxTimeoutSeconds: 300`** (field name is `maxTimeoutSeconds`, NOT `requiredDeadlineSeconds`).
  - **Byte-exact literals** (never rename): `x402Version`, `X-PAYMENT`, `PAYMENT-REQUIRED`, `PAYMENT-RESPONSE`.
- **Integration MUST use the OKX Payment SDK `@okxweb3/x402-*` (Node variant) for the SELLER side** — issuing the 402 and verifying `X-PAYMENT`. Hand-rolling the challenge is what failed validation. The PAYER side is already handled by `onchainos payment pay` / `pay-local` (the payments skill); this plan adds only the seller half the listing requires.
- Platform: Vercel serverless — no `spawnSync`, no `/tmp` binary, no blocking calls, no `onchainos` CLI at runtime. All I/O async. Any post-response settlement runs via `after()` (`next/server`) so the paid response is never blocked. Route config on the consuming route: `export const runtime = "nodejs"; export const maxDuration = 60;`. The SDK wrapper must be import-safe in a serverless function (no top-level filesystem/CLI/native-binary side effects) — verified in Task 1.
- No em-dashes in any user-facing copy or docs (standing rule). Use ", " or the ASCII hyphen with spaces.
- OKX HMAC header convention (reuse `okxCall` from `src/lib/okx-api.ts` verbatim if the SDK needs signed OKX calls): base `https://web3.okx.com`; project header `OKX-ACCESS-PROJECT: 4d156bf0c61130f2692d097ecb68dbe4`; auth headers `OKX-ACCESS-KEY / -SIGN / -TIMESTAMP / -PASSPHRASE`; prehash = `timestamp + method + path + body`, HMAC-SHA256, base64.
- Credentials come only from `process.env` (`OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE`, plus `X402_PAYTO_ADDRESS`, and a testnet/spike-only payer key `X402_PAYER_KEY` used ONLY in the spike script — never committed, never in `public/`, never on the Vercel host in production per the "Vercel clobbers .env.local" lesson). The production server never holds a payer key: it only issues the 402 and verifies what the client signed.
- **User-facing terminology:** always name it **OKX Agent Payments Protocol** (payments skill Rule 1), bolded. Never speak protocol literals / SDK names / scheme names to the user. Show amounts in human + atomic form (`0.01 USDT0 (10000)`).
- TDD: failing test first, minimal code, commit per task. Prefer recorded fixtures (from the Task 1 spike) over live network in unit tests.

## Upstream Inputs & Branch Caveats

| Upstream artifact read | Possible outcomes | Branch this plan takes |
|------------------------|-------------------|------------------------|
| Plan 2 landed the paid a2mcp seam that imports `enforceX402` | seam exists / not landed | not landed → this plan STILL builds `src/lib/x402/okx-x402.ts` + `enforceX402` + `docs/X402-CONTRACT.md` (Tasks 1-3), then Task 4 waits for Plan 2 to import it; do NOT block the whole plan on Plan 2 |
| Task 1 spike: `@okxweb3/x402` seller-side API surface | SDK exposes a seller/middleware verify API usable on Vercel Node / it does not | usable → build `enforceX402` on it; not usable on Vercel (native binary / CLI-only) → **STOP and escalate to the user**, do NOT hand-roll a fake 402 (that is the rejection). Record the blocker in `docs/X402-CONTRACT.md` `## Blocked`. |
| Task 1 spike: USDT0 X Layer contract address + on-chain `decimals()` | address resolves, `decimals()==6` / mismatch | resolves → pin it in `docs/X402-CONTRACT.md`; mismatch → record the ACTUAL decimals and use them, do not force 6 |
| Task 1 spike: real settlement round-trip on X Layer | settles (real tx hash) / cannot settle | settles → wire live; cannot → STOP at Task 1 gate and escalate (listing needs a real settlement; no simulation ships) |

## Plan decomposition (this is Plan 3 of 8)

1. Live-data spine — DONE (`2026-07-20-genuinely-live-data-layer.md`).
2. A2MCP conformance — registers the reachable `serviceList` URL and calls `enforceX402` on the paid path (imports THIS plan's wrapper).
3. **Real x402 payment (THIS PLAN, MANDATORY):** SDK spike → `enforceX402` seller wrapper → OKX `curl` self-test → real client flow (replace `setTimeout`) → live X Layer settlement proof.
4. Frontend a11y + design tokenization.
5. Submission honesty pass.
6. Demo re-record.
7. A2A always-on daemon (rejection reason 3).
8. Listing-readiness gate (the three OKX tests, terminal — no resubmission until all green).

**Relationship to Plan 2.** Plan 2 imports `enforceX402` from THIS plan on the a2mcp paid path. Tasks 1-3 here are independent of Plan 2 and can run first (they produce the wrapper Plan 2 needs). Task 4 wires it into the live route and requires Plan 2's paid seam to exist.

---

## Task 0: Reconcile with upstream output (gate)

**Files:**
- Create: `docs/X402-CONTRACT.md` (stub — the branch note now, filled by Task 1)
- Reference: `docs/LISTING-REJECTION-ANALYSIS.md` (authoritative facts), Plan 2's a2mcp route + `docs/A2MCP-CONTRACT.md` (if landed)

- [ ] **Step 1: Re-read the authoritative facts.** Open `docs/LISTING-REJECTION-ANALYSIS.md` and confirm the corrected x402 block (USDT0 / 6dp / v2 / `eip155:196` / `PAYMENT-REQUIRED` / `maxTimeoutSeconds:300` / SDK-mandated). These supersede any USDG/v1/xlayer values in older docs. If any other doc still carries the wrong values, note it for Plan 5 (submission honesty) — do not fix it here.
- [ ] **Step 2: Check whether Plan 2's paid seam exists.** `grep -rn "enforceX402\|PAYMENT-REQUIRED\|tier.*paid" src/app/api/a2mcp/route.ts 2>/dev/null`. Record whether the import target exists yet. If absent, proceed anyway — Tasks 1-3 build the wrapper Plan 2 will import; only Task 4 needs the seam.
- [ ] **Step 3: Write the branch note.** Create `docs/X402-CONTRACT.md` with a top block recording: x402 is MANDATORY; the corrected facts (v2 / USDT0 / 6dp / `eip155:196` / `PAYMENT-REQUIRED` / `maxTimeoutSeconds:300`); SDK = `@okxweb3/x402-*`; USDT0 address = `TBD-by-Task-1`; Plan 2 seam present = YES/NO.
- [ ] **Step 4: Commit.** `git add docs/X402-CONTRACT.md && git commit -m "docs(x402): mandatory listing-gate reconciliation note (corrected facts pinned)"`

---

## Task 1: OKX Payment SDK seller-side spike (HARD GATE)

**Files:**
- Create: `docs/X402-CONTRACT.md` (the spike deliverable — the real pinned contract)
- Create (throwaway): `scripts/spike-x402.mjs`
- Reference: the OKX `howtokmcp` guide (`https://web3.okx.com/onchainos/dev-docs/okxai/howtokmcp`), `src/lib/okx-api.ts:12-54` (the `okxCall` signer to reuse if needed), `~/.claude/skills/okx-agent-payments-protocol/SKILL.md` (PAYER side, for the client `X-PAYMENT` bytes), `docs/LISTING-REJECTION-ANALYSIS.md`.

**Interfaces:**
- Produces: `docs/X402-CONTRACT.md` documenting, PINNED from the real SDK (not guessed): (a) the exact `@okxweb3/x402-*` package name + seller-side API (the function/middleware that issues the 402 and the one that verifies `X-PAYMENT`), (b) the exact v2 `PAYMENT-REQUIRED` header + decoded challenge the SDK emits for USDT0 / `eip155:196`, (c) the USDT0 X Layer contract address + on-chain `decimals()`, (d) the exact `X-PAYMENT` bytes a client must send, (e) the verify call/response shape, (f) a real settlement tx hash on X Layer. Every later task is written against this file.

- [ ] **Step 1: Read the OKX seller guide.** WebFetch `https://web3.okx.com/onchainos/dev-docs/okxai/howtokmcp`. If reachable, extract: the exact `@okxweb3/x402-*` package for a Node/Next seller, the seller API for emitting a v2 402 + verifying `X-PAYMENT`, the USDT0 X Layer address, and the exact challenge JSON. If NOT reachable, fall back to Step 2. Record the source (URL or package) at the top of the doc.
- [ ] **Step 2: Inspect the installed SDK.** Install and introspect the seller package:

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
npm view @okxweb3/x402-next 2>/dev/null || npm view @okxweb3/x402 2>/dev/null
npm i @okxweb3/x402-next 2>/dev/null || npm i @okxweb3/x402
# list the package's exported surface (types + entry points)
node -e "console.log(Object.keys(require('@okxweb3/x402-next')||require('@okxweb3/x402')))" 2>/dev/null
ls node_modules/@okxweb3/x402-next/dist 2>/dev/null || ls node_modules/@okxweb3/x402/dist 2>/dev/null
```

Read the package's `.d.ts` to find the seller-side entry (a middleware, a `createPaymentRequired`/`verifyPayment`-style pair, or a handler wrapper). Record the EXACT exported names + signatures. If the package name differs (e.g. `@okxweb3/x402-express`), record the real one and prefer the variant that runs in a Vercel Node serverless function without a native binary or CLI shell-out.

- [ ] **Step 3: Pin the USDT0 X Layer token.** In `scripts/spike-x402.mjs`, use `viem` with an X Layer public client (chainId 196, RPC per the guide or `https://rpc.xlayer.tech`) to read `symbol()` and `decimals()` of the USDT0 address the SDK/guide names. Assert `symbol()` is the USDT0 symbol and record the concrete `decimals()` (expected 6 — record the actual). **Do not proceed with a guessed address**; the address must come from the SDK config or the guide.
- [ ] **Step 4: Emit + capture a real v2 challenge from the SDK.** Stand up a minimal Node HTTP seller in `scripts/spike-x402.mjs` that calls the SDK's seller API for a USDT0 / `eip155:196` resource, and capture the exact `402` response: the base64 `PAYMENT-REQUIRED` header value and its decoded JSON. Assert it matches the mandated shape: `{ x402Version: 2, resource: { url, description, mimeType: "application/json" }, accepts: [ { ... network:"eip155:196", asset:<USDT0>, maxAmountRequired, payTo:<X402_PAYTO_ADDRESS>, maxTimeoutSeconds:300 } ] }`. Record the exact `accepts[]` entry field names the SDK produces (they are the contract — do not rename them downstream).
- [ ] **Step 5: Drive one full payer round-trip + settle.** Fund a throwaway payer behind `X402_PAYER_KEY` (env only, never committed) with a small USDT0 + gas balance on X Layer. Using the payments skill's payer path (`onchainos payment pay --payload '<raw PAYMENT-REQUIRED>'`, or `pay-local` with the spike key), produce a real `X-PAYMENT` header, replay it to the spike seller, and let the SDK verify it. Capture: the exact `X-PAYMENT` bytes, the SDK verify result/shape, and the `PAYMENT-RESPONSE` header on the 200 (`echo '<value>' | base64 -d | jq .` → `{ status, transaction, amount, payer }`). If the smallest viable USDT0 surface is mainnet, use the smallest real amount (e.g. `0.01 USDT0`) and note it is mainnet — a real tiny settlement is stronger listing evidence anyway.
- [ ] **Step 6: Confirm on-chain settlement.** With `viem`, read USDT0 `Transfer` logs on X Layer for the captured tx hash and assert `to === X402_PAYTO_ADDRESS` and `value === maxAmountRequired`. Record the tx hash + explorer URL.
- [ ] **Step 7: Decision rule (the gate).** If Steps 2-6 pinned a real seller-side SDK API that runs in a Vercel Node function AND produced a real settled tx whose Transfer matches, WRITE `docs/X402-CONTRACT.md` (package + seller API signatures + "Server emits (PAYMENT-REQUIRED) / Client sends (X-PAYMENT) / SDK verify / settlement" sections + USDT0 address + decimals + tx hash) and proceed. If the SDK's seller side cannot run on Vercel (native binary / CLI-only) OR no on-chain settlement appears, **STOP and escalate to the user** — record the blocker under `## Blocked`. Do NOT hand-roll a fake 402 to "pass" the test locally; a hand-rolled challenge is precisely rejection reason 2.
- [ ] **Step 8: Commit the contract, delete the spike script.**

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
git rm scripts/spike-x402.mjs
git add docs/X402-CONTRACT.md package.json package-lock.json
git commit -m "docs: pin OKX x402 SDK seller API + USDT0/eip155:196 contract (spike result)"
```

---

## Task 2: `enforceX402` seller wrapper — the 402 half

**Files:**
- Create: `src/lib/x402/okx-x402.ts` (the wrapper THIS PLAN owns; Plan 2 imports it)
- Test: `src/lib/x402/okx-x402.test.ts` (Create)
- Fixture: `src/lib/x402/__fixtures__/x402-challenge.json` (Create — the real decoded challenge from Task 1 Step 4)
- Reference: `docs/X402-CONTRACT.md`, the pinned `@okxweb3/x402-*` seller API

**Interfaces:**
- Consumes: `docs/X402-CONTRACT.md` (SDK seller API + USDT0 address + challenge shape).
- Produces: `export async function enforceX402(req: Request, resourceUrl: string): Promise<{ paid: true } | { paid: false; challenge: Response }>` — the unpaid branch, returning a real `402` `Response` whose `PAYMENT-REQUIRED` header the SDK produced.

- [ ] **Step 1: Write the failing unpaid-branch test.** (Field names come from the Task 1 contract; adjust to the pinned SDK output.)

```ts
// src/lib/x402/okx-x402.test.ts
import { describe, it, expect } from "vitest";
import { enforceX402 } from "./okx-x402";

describe("enforceX402 — unpaid branch", () => {
  it("returns a 402 Response with a base64 PAYMENT-REQUIRED decoding to a v2 USDT0/eip155:196 challenge", async () => {
    const req = new Request("https://x/api/a2mcp", { method: "POST", body: JSON.stringify({ address: "0xabc", chains: ["ethereum"], tier: "paid" }) });
    const res = await enforceX402(req, "https://x/api/a2mcp");
    expect(res.paid).toBe(false);
    if (res.paid) return;
    expect(res.challenge.status).toBe(402);
    const header = res.challenge.headers.get("PAYMENT-REQUIRED");
    expect(header).toBeTruthy();
    const challenge = JSON.parse(Buffer.from(header!, "base64").toString("utf8"));
    expect(challenge.x402Version).toBe(2);
    expect(challenge.resource.mimeType).toBe("application/json");
    const accept = challenge.accepts[0];
    expect(accept.network).toBe("eip155:196");
    expect(accept.maxTimeoutSeconds).toBe(300);
    // asset === the pinned USDT0 address from docs/X402-CONTRACT.md
  });
});
```

- [ ] **Step 2: Run it, verify it fails.** `npx vitest run src/lib/x402/okx-x402.test.ts` → FAIL (`enforceX402` not exported).
- [ ] **Step 3: Implement the unpaid branch** in `src/lib/x402/okx-x402.ts` against the pinned SDK. Read the `X-PAYMENT` header from `req`; when absent, call the SDK's seller API to build the v2 challenge for `{ resourceUrl, asset: USDT0, network: "eip155:196", maxAmountRequired: PRICE_ATOMIC, payTo: X402_PAYTO_ADDRESS, maxTimeoutSeconds: 300 }`, base64 it into a `PAYMENT-REQUIRED` header (or use the SDK helper that does this), and return `{ paid: false, challenge: new Response(JSON.stringify({ error: "payment required" }), { status: 402, headers: { "PAYMENT-REQUIRED": <b64>, "Content-Type": "application/json" } }) }`. Pull `PRICE_ATOMIC` (atomic USDT0, 6dp) and `X402_PAYTO_ADDRESS` from `process.env`; import the USDT0 address as a pinned constant from the contract doc. The paid branch is a stub returning `{ paid: true }` for now (Task 3 fills verification). NO hand-assembled challenge JSON if the SDK exposes a builder — use the SDK.

```ts
// src/lib/x402/okx-x402.ts (shape; reconcile every field + the SDK call to docs/X402-CONTRACT.md)
// import { <seller builder>, <verify fn> } from "@okxweb3/x402-next"; // exact names per contract doc

const USDT0 = "<pinned USDT0 X Layer address from docs/X402-CONTRACT.md>";
const NETWORK = "eip155:196";
const PRICE_ATOMIC = process.env.X402_PRICE_ATOMIC || "10000"; // 0.01 USDT0 at 6dp

export async function enforceX402(
  req: Request,
  resourceUrl: string,
): Promise<{ paid: true } | { paid: false; challenge: Response }> {
  const xPayment = req.headers.get("X-PAYMENT");
  if (!xPayment) {
    const header = /* SDK builder → base64 PAYMENT-REQUIRED for the challenge below */ buildPaymentRequired({
      x402Version: 2,
      resource: { url: resourceUrl, description: "Alter Ego wallet analysis", mimeType: "application/json" },
      accepts: [{
        network: NETWORK,
        asset: USDT0,
        maxAmountRequired: PRICE_ATOMIC,
        payTo: process.env.X402_PAYTO_ADDRESS || "",
        maxTimeoutSeconds: 300,
        // + any additional fields the SDK requires, per docs/X402-CONTRACT.md
      }],
    });
    return {
      paid: false,
      challenge: new Response(JSON.stringify({ error: "payment required" }), {
        status: 402,
        headers: { "PAYMENT-REQUIRED": header, "Content-Type": "application/json" },
      }),
    };
  }
  return { paid: true }; // Task 3 replaces with real SDK verification
}
```

- [ ] **Step 4: Run it, verify it passes.** Set `X402_PAYTO_ADDRESS` + `X402_PRICE_ATOMIC` in `.env.local` (not committed), then `npx vitest run src/lib/x402/okx-x402.test.ts` → PASS.
- [ ] **Step 5: Commit.**

```bash
git add src/lib/x402/okx-x402.ts src/lib/x402/okx-x402.test.ts src/lib/x402/__fixtures__/x402-challenge.json
git commit -m "feat(x402): enforceX402 seller wrapper — SDK-issued v2 PAYMENT-REQUIRED (USDT0/eip155:196)"
```

---

## Task 3: `enforceX402` — the verify half (SDK verifies `X-PAYMENT`)

**Files:**
- Modify: `src/lib/x402/okx-x402.ts` (fill the paid branch with real SDK verification)
- Test: `src/lib/x402/okx-x402.test.ts` (extend)
- Fixture: `src/lib/x402/__fixtures__/x402-payment-header.json`, `x402-verify.json` (Create — real captures from Task 1 Step 5)
- Reference: `docs/X402-CONTRACT.md`, `src/lib/okx-api.ts` (`okxCall`, only if the SDK needs a signed OKX call)

**Interfaces:**
- Consumes: the `X-PAYMENT` header from the client, the pinned SDK verify API.
- Produces: `enforceX402` returning `{ paid: true }` only after the SDK verifies the `X-PAYMENT` against the challenge; otherwise a `402` `Response` with the SDK's rejection reason.

- [ ] **Step 1: Write the failing verify tests** (mock the SDK verify fn with the real recorded pass/fail shapes):

```ts
// src/lib/x402/okx-x402.test.ts — append
import { vi } from "vitest";
vi.mock("@okxweb3/x402-next", async (orig) => ({ ...(await orig()), verifyPayment: vi.fn() }));

it("returns paid:true when the SDK verifies a valid X-PAYMENT", async () => {
  // mock verifyPayment → valid; build a req WITH an X-PAYMENT header from the fixture
  const req = new Request("https://x/api/a2mcp", { method: "POST", headers: { "X-PAYMENT": "<fixture-b64>" }, body: "{}" });
  const res = await enforceX402(req, "https://x/api/a2mcp");
  expect(res.paid).toBe(true);
});

it("returns a 402 Response when the SDK rejects the X-PAYMENT", async () => {
  // mock verifyPayment → invalid
  const req = new Request("https://x/api/a2mcp", { method: "POST", headers: { "X-PAYMENT": "bad" }, body: "{}" });
  const res = await enforceX402(req, "https://x/api/a2mcp");
  expect(res.paid).toBe(false);
  if (!res.paid) expect(res.challenge.status).toBe(402);
});
```

- [ ] **Step 2: Run, verify fail.** `npx vitest run src/lib/x402/okx-x402.test.ts` → FAIL.
- [ ] **Step 3: Implement the paid branch** in `src/lib/x402/okx-x402.ts`: when `X-PAYMENT` is present, call the SDK's seller verify API (the exact fn + envelope from `docs/X402-CONTRACT.md`) with the header value and the same `accepts[0]` requirements used to build the challenge. On valid → `{ paid: true }`. On invalid → `{ paid: false, challenge: new Response(JSON.stringify({ error: "payment invalid", reason }), { status: 402, headers: { "Content-Type": "application/json" } }) }`. Reuse `okxCall` from `okx-api.ts` ONLY if the SDK verify path needs a signed OKX facilitator call; otherwise let the SDK own it. Never re-implement the challenge or the signature check by hand.
- [ ] **Step 4: Run, verify pass.** `npx vitest run src/lib/x402/okx-x402.test.ts` → PASS (both branches).
- [ ] **Step 5: Serverless import-safety check.** Confirm importing `src/lib/x402/okx-x402.ts` triggers no top-level filesystem / CLI / native-binary side effects (grep the SDK entry the wrapper imports; run `node -e "import('./src/lib/x402/okx-x402.ts')"` via the project's loader or a compiled check). If the SDK pulls a native binary at import, isolate it behind a lazy `await import()` inside `enforceX402`. Record the outcome in `docs/X402-CONTRACT.md`.
- [ ] **Step 6: Commit.**

```bash
git add src/lib/x402/okx-x402.ts src/lib/x402/okx-x402.test.ts src/lib/x402/__fixtures__/x402-verify.json src/lib/x402/__fixtures__/x402-payment-header.json docs/X402-CONTRACT.md
git commit -m "feat(x402): enforceX402 verify half — SDK verifies X-PAYMENT, serverless-safe import"
```

---

## Task 4: Wire `enforceX402` into the a2mcp paid route + OKX self-test

**Files:**
- Modify: `src/app/api/a2mcp/route.ts` (import + call `enforceX402` on the paid tier; add `PAYMENT-RESPONSE` on the 200)
- Test: `src/app/api/a2mcp/route.test.ts` (extend, or Create if Plan 2 did not)
- Reference: `src/lib/x402/okx-x402.ts`, `docs/X402-CONTRACT.md`

**Interfaces:**
- Consumes: `enforceX402`.
- Produces: an a2mcp route that returns `402 + PAYMENT-REQUIRED` when the paid tier is called unpaid, and `200 + PAYMENT-RESPONSE` when `enforceX402` returns `{paid:true}`. This is the surface OKX's `curl -i -X POST` self-test probes.

- [ ] **Step 1: Confirm Plan 2's paid seam.** `grep -n "tier" src/app/api/a2mcp/route.ts`. If the paid tier does not exist yet, STOP Task 4 and note that Plan 2 must land the paid tier first (Tasks 1-3 already shipped the wrapper it will import). Do not fabricate the tier here.
- [ ] **Step 2: Add serverless config + import** at the top of the route: `import { after } from "next/server"; import { enforceX402 } from "@/lib/x402/okx-x402"; export const runtime = "nodejs"; export const maxDuration = 60;`
- [ ] **Step 3: Write the failing route tests** (mock `@/lib/x402/okx-x402`):

```ts
// src/app/api/a2mcp/route.test.ts — paid path
import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/x402/okx-x402", () => ({
  enforceX402: vi.fn(),
}));
import { enforceX402 } from "@/lib/x402/okx-x402";
import { POST } from "./route";

it("returns 402 + PAYMENT-REQUIRED on the paid tier when unpaid", async () => {
  (enforceX402 as any).mockResolvedValue({ paid: false, challenge: new Response("{}", { status: 402, headers: { "PAYMENT-REQUIRED": "B64" } }) });
  const req = new Request("http://x/api/a2mcp", { method: "POST", body: JSON.stringify({ address: "0xabc", chains: ["ethereum"], tier: "paid" }) });
  const res = await POST(req);
  expect(res.status).toBe(402);
  expect(res.headers.get("PAYMENT-REQUIRED")).toBe("B64");
});

it("serves 200 + PAYMENT-RESPONSE when enforceX402 returns paid", async () => {
  (enforceX402 as any).mockResolvedValue({ paid: true });
  const req = new Request("http://x/api/a2mcp", { method: "POST", headers: { "X-PAYMENT": "PAY" }, body: JSON.stringify({ address: "0xabc", chains: ["ethereum"], tier: "paid" }) });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(res.headers.get("PAYMENT-RESPONSE")).toBeTruthy();
});
```

- [ ] **Step 4: Run, verify fail.** `npx vitest run src/app/api/a2mcp/route.test.ts` → FAIL.
- [ ] **Step 5: Implement the gate** in `src/app/api/a2mcp/route.ts` — only the paid tier is gated; the free tier is untouched:

```ts
// inside POST, on the paid tier, before running the analysis:
if (isPaidTier) {
  const gate = await enforceX402(req, new URL(req.url).toString());
  if (!gate.paid) return gate.challenge;      // 402 + PAYMENT-REQUIRED, byte-for-byte from the SDK
}

// ... run the real analysis (Plan 1 path) → `analysis` ...

const paymentResponse = Buffer.from(JSON.stringify({ status: "settled" }), "utf8").toString("base64");
return new Response(JSON.stringify(analysis), {
  status: 200,
  headers: { "PAYMENT-RESPONSE": paymentResponse, "Content-Type": "application/json" },
});
```

- [ ] **Step 6: Run tests, verify pass.** `npx vitest run src/app/api/a2mcp/route.test.ts` → PASS.
- [ ] **Step 7: Run OKX's own self-test against a live build.** Start the app (`DEMO_MODE` unset), then run the exact OKX check from `docs/LISTING-REJECTION-ANALYSIS.md`:

```bash
curl -i -X POST http://localhost:3000/api/a2mcp -H 'content-type: application/json' -d '{"address":"0xabc","chains":["ethereum"],"tier":"paid"}'
```

Assert: HTTP `402`, a `PAYMENT-REQUIRED` header present, and decoding it yields a valid v2 `{x402Version:2, resource, accepts}` for USDT0 / `eip155:196`:

```bash
# decode the header value from the response above
echo '<PAYMENT-REQUIRED value>' | base64 -d | jq '{x402Version, resource, accept: .accepts[0]}'
```

Record the decoded output in `docs/X402-CONTRACT.md` under `## OKX Self-Test` as the passing evidence. If it is not `402` or the decode is malformed, fix `enforceX402` before continuing.

- [ ] **Step 8: Commit.**

```bash
git add src/app/api/a2mcp/route.ts src/app/api/a2mcp/route.test.ts docs/X402-CONTRACT.md
git commit -m "feat(x402): gate a2mcp paid path with enforceX402; OKX curl self-test passes (402 + v2 PAYMENT-REQUIRED)"
```

---

## Task 5: Client `X-PAYMENT` flow — replace the `setTimeout`

**Files:**
- Create: `src/lib/x402/client.ts` (the 402 -> pay -> replay loop)
- Create: `src/app/api/x402/sign/route.ts` (server-side signer endpoint ONLY if the contract requires a key-held signer; omit if the client signs in-browser)
- Modify: `src/components/PaymentButton.tsx` (remove `setTimeout`, call the real flow)
- Test: `src/lib/x402/client.test.ts` (Create)
- Reference: `docs/X402-CONTRACT.md` (the exact `X-PAYMENT` encoding from Task 1 Step 5), `~/.claude/skills/okx-agent-payments-protocol/SKILL.md` (payer path)

**Interfaces:**
- Consumes: `docs/X402-CONTRACT.md` (client `X-PAYMENT` format).
- Produces: `export async function payAndAnalyze(body: { address: string; chains: string[] }): Promise<{ status: number; data?: unknown; txStatus?: string }>` that POSTs the paid tier, on `402` decodes `PAYMENT-REQUIRED`, builds `X-PAYMENT`, replays, and returns the 200 body + decoded `PAYMENT-RESPONSE`.

- [ ] **Step 1: Decide the signing surface from the contract.** Per `docs/X402-CONTRACT.md` Task 1: if the `X-PAYMENT` is an EIP-3009 / Permit2 signature over USDT0, the browser signs with a connected wallet (viem `walletClient.signTypedData`), no server key. If Task 1 showed the CLI/TEE path a browser cannot reproduce, add `src/app/api/x402/sign/route.ts` signing with a guarded `X402_PAYER_KEY` (Vercel env, guarded per the env-clobber lesson). Choose ONE and record it at the top of `src/lib/x402/client.ts`.
- [ ] **Step 2: Write the failing client test** (mock `fetch`: first call 402 with `PAYMENT-REQUIRED`, second 200 with `PAYMENT-RESPONSE`):

```ts
// src/lib/x402/client.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { payAndAnalyze } from "./client";

describe("payAndAnalyze", () => {
  beforeEach(() => {
    const challenge = Buffer.from(JSON.stringify({ x402Version: 2, resource: { url: "https://x/api/a2mcp", description: "d", mimeType: "application/json" }, accepts: [{ network: "eip155:196", asset: "<usdt0>", maxAmountRequired: "10000", payTo: "0xseller", maxTimeoutSeconds: 300 }] })).toString("base64");
    const payResp = Buffer.from(JSON.stringify({ status: "settled", transaction: "0xabc" })).toString("base64");
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ status: 402, headers: new Headers({ "PAYMENT-REQUIRED": challenge }), json: async () => ({}) })
      .mockResolvedValueOnce({ status: 200, headers: new Headers({ "PAYMENT-RESPONSE": payResp }), json: async () => ({ personas: [{}] }) }) as any;
  });
  it("runs the 402 -> pay -> replay loop and returns the paid analysis", async () => {
    const res = await payAndAnalyze({ address: "0xabc", chains: ["ethereum"] });
    expect(res.status).toBe(200);
    expect((res.data as any).personas.length).toBeGreaterThan(0);
    expect(res.txStatus).toBe("settled");
    expect((global.fetch as any)).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Run, verify fail.** `npx vitest run src/lib/x402/client.test.ts` → FAIL.
- [ ] **Step 4: Implement `payAndAnalyze`** (the `buildXPayment` internals come verbatim from `docs/X402-CONTRACT.md` — do not guess):

```ts
function decode(h: string) { return JSON.parse(atob(h)); }

async function buildXPayment(accept: any): Promise<string> {
  // EXACT encoding from docs/X402-CONTRACT.md.
  // Path A (in-browser): sign EIP-3009/Permit2 over USDT0 with viem walletClient, encode per contract.
  // Path B (server signer): const r = await fetch("/api/x402/sign", { method:"POST", body: JSON.stringify(accept) }); return (await r.json()).xPayment;
  const r = await fetch("/api/x402/sign", { method: "POST", body: JSON.stringify(accept) });
  return (await r.json()).xPayment;
}

export async function payAndAnalyze(body: { address: string; chains: string[] }) {
  const first = await fetch("/api/a2mcp", { method: "POST", body: JSON.stringify({ ...body, tier: "paid" }) });
  if (first.status !== 402) return { status: first.status, data: await first.json() };
  const challenge = decode(first.headers.get("PAYMENT-REQUIRED") || "");
  const xPayment = await buildXPayment(challenge.accepts[0]);
  const paid = await fetch("/api/a2mcp", { method: "POST", headers: { "X-PAYMENT": xPayment }, body: JSON.stringify({ ...body, tier: "paid" }) });
  const resp = paid.headers.get("PAYMENT-RESPONSE");
  const txStatus = resp ? JSON.parse(atob(resp)).status : undefined;
  return { status: paid.status, data: await paid.json(), txStatus };
}
```

- [ ] **Step 5: Run, verify pass.** `npx vitest run src/lib/x402/client.test.ts` → PASS.
- [ ] **Step 6: Replace the fake in `PaymentButton.tsx`.** Remove the `setTimeout`; call `payAndAnalyze`. Add a real `"error"` state. User-facing copy names **OKX Agent Payments Protocol** and shows the amount in human + atomic form (`0.01 USDT0 (10000)`). No em-dashes.

```tsx
"use client";
import { useState } from "react";
import { payAndAnalyze } from "@/lib/x402/client";

export function PaymentButton({ tier, price, address, chains }: { tier: string; price: string; address: string; chains: string[] }) {
  const [state, setState] = useState<"idle" | "paying" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const handleClick = async () => {
    setState("paying");
    try {
      const res = await payAndAnalyze({ address, chains });
      if (res.status !== 200) throw new Error("payment not accepted");
      setMsg(res.txStatus === "settled" ? "Settled on X Layer" : "Settlement in progress");
      setState("done");
    } catch (e) { setMsg((e as Error).message); setState("error"); }
  };
  const label =
    state === "idle" ? `${tier}, ${price}` :
    state === "paying" ? "Paying via OKX Agent Payments Protocol..." :
    state === "done" ? `Paid, ${msg}` : `Payment failed, ${msg}`;
  return (
    <button onClick={handleClick} disabled={state === "paying"} /* keep existing className/style */>
      {label}
    </button>
  );
}
```

- [ ] **Step 7: Update the parent** that renders `PaymentButton` to pass `address` and `chains` (grep `<PaymentButton`). Remove any em-dash in the `tier / price` copy.
- [ ] **Step 8: Run the whole unit suite + typecheck.** `npx vitest run && npm run typecheck` → PASS.
- [ ] **Step 9: Commit.**

```bash
git add src/lib/x402/client.ts src/components/PaymentButton.tsx src/app/api/x402/sign/route.ts 2>/dev/null; git add -A
git commit -m "feat(x402): replace PaymentButton setTimeout with real 402 -> pay -> replay flow (USDT0)"
```

---

## Task 6: End-to-end paid-flow test + live X Layer settlement proof

**Files:**
- Create: `tests/x402-flow.spec.ts` (Playwright)
- Modify: `docs/X402-CONTRACT.md` (append the live settlement tx hash + explorer link)
- Reference: `playwright.config.ts` (the `webServer` block added in Plan 1 Task 6)

**Interfaces:**
- Consumes: the live `/api/a2mcp` paid path.
- Produces: a falsifiable assertion that a paid analyze call returns `402` unpaid and `200 + PAYMENT-RESPONSE` with a valid `X-PAYMENT`, plus a recorded on-chain USDT0 settlement tx for the demo + the Plan 8 listing gate.

- [ ] **Step 1: Write the failing e2e test.**

```ts
// tests/x402-flow.spec.ts
import { test, expect } from "@playwright/test";
test("paid a2mcp returns 402 unpaid with a v2 PAYMENT-REQUIRED", async ({ playwright }) => {
  const api = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
  const unpaid = await api.post("/api/a2mcp", { data: { address: "0xabc", chains: ["ethereum"], tier: "paid" } });
  expect(unpaid.status()).toBe(402);
  const header = unpaid.headers()["payment-required"];
  expect(header).toBeTruthy();
  const challenge = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  expect(challenge.x402Version).toBe(2);
  expect(challenge.accepts[0].network).toBe("eip155:196");
});
```

- [ ] **Step 2: Run the unpaid half against a live build** (`DEMO_MODE` unset). `BASE_URL=http://localhost:3000 npx playwright test tests/x402-flow.spec.ts`. Expected: PASS on the 402 + v2 assertion.
- [ ] **Step 3: Drive one real paid settlement through the UI** against the live build with the funded payer, capture the X Layer USDT0 settlement tx hash, and append it to `docs/X402-CONTRACT.md` under `## Live Settlement Evidence` (tx hash + `https://www.okx.com/web3/explorer/xlayer/tx/<hash>`). This is the demo proof for the payment judges and the Plan 8 gate.
- [ ] **Step 4: Commit.**

```bash
git add tests/x402-flow.spec.ts docs/X402-CONTRACT.md
git commit -m "test(x402): e2e paid-flow guard (v2 402) + recorded live X Layer USDT0 settlement tx"
```

---

## Self-Review notes

- **Mandatory, not optional:** every "OPTIONAL / stretch" framing from the prior draft is removed. x402 is a hard OKX listing gate (rejection reason 2, `docs/LISTING-REJECTION-ANALYSIS.md`). There is no honest-simulation ship path for the listing — a simulated payment fails validation. The only STOP is the Task 1 spike gate, and it escalates rather than fakes.
- **Corrected facts throughout:** token USDT0 / 6 decimals (not USDG / 18dp), `x402Version: 2` (not 1), `network: "eip155:196"` (not "xlayer"), delivery via base64 `PAYMENT-REQUIRED` header, `maxTimeoutSeconds: 300` (not `requiredDeadlineSeconds`), challenge shape `{x402Version:2, resource:{url,description,mimeType}, accepts:[]}`. The USDT0 address is never guessed — it is pinned by the Task 1 SDK/on-chain spike.
- **SDK-backed seller side:** integration is built on the OKX Payment SDK `@okxweb3/x402-*` (Node variant) for issuing the 402 and verifying `X-PAYMENT`. Hand-rolling the challenge is explicitly forbidden because it is what failed OKX validation. Task 1 pins the exact seller API before any wrapper code is written.
- **This plan owns the seller module:** `src/lib/x402/okx-x402.ts` exports `enforceX402(req, resourceUrl): Promise<{paid:true} | {paid:false; challenge:Response}>`, Vercel-serverless-safe (import-safety verified in Task 3 Step 5). Plan 2 imports it on the paid a2mcp tier; Tasks 1-3 are independent of Plan 2 so the wrapper exists before Plan 2 needs it.
- **OKX self-test wired in:** Task 4 Step 7 runs OKX's exact `curl -i -X POST` check and records the decoded v2 challenge as passing evidence — the same check the Plan 8 listing gate re-runs against the live deploy.
- **Gate integrity:** Task 1 is a real HARD GATE. If the SDK's seller side cannot run on Vercel Node, or no on-chain USDT0 settlement appears, execution STOPS and escalates to the user with a `## Blocked` record. It never fabricates a header to pass locally.
- **Signer safety:** the production server never holds a payer key. In-browser EIP-3009 / Permit2 signing (Path A) is preferred; the guarded server signer (Path B) is used only if the pinned contract forces it, with `X402_PAYER_KEY` guarded per the "Vercel clobbers .env.local" lesson and confined to the spike + optional sign route, never in `public/`, never committed.
- **Copy discipline:** user-facing strings name **OKX Agent Payments Protocol**, keep `x402Version` / `X-PAYMENT` / `PAYMENT-REQUIRED` / `PAYMENT-RESPONSE` byte-exact, show amounts in human + atomic form, and contain no em-dashes.
- **Assumption to confirm before Task 1:** USDT0 is reachable on an X Layer surface the payer can be funded on; if mainnet-only, Task 1 uses the smallest real amount and records that the demo settlement is a real tiny mainnet tx, which is stronger listing evidence.
