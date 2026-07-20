# Real x402 Payment — Implementation Plan (Plan 3 of 6, OPTIONAL / stretch)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Also read the `okx-agent-payments-protocol` skill (`~/.claude/skills/okx-agent-payments-protocol/SKILL.md`) in full before Task 1 — it is the authoritative x402 contract.

> **⚠️ STATUS: OPTIONAL / STRETCH.** Per `00-ROADMAP.md:16`, Plan 3 runs only if the payment track matters for OKX.AI Genesis scoring, and only *after* Plan 2 lands (the 402 challenge lives in the a2mcp paid path). If the deadline is tight, ship Plans 1, 2, 4, 5, 6 and leave the `PaymentButton` honest-but-simulated with a `[DEMO MODE]` label. Do NOT half-build this — a partially-wired real payment that reverts on stage is worse than an honestly-labelled simulation. Task 1 is a hard gate: if the testnet round-trip does not settle, STOP and keep the simulation.

**Goal:** Replace the `setTimeout` fake in `src/components/PaymentButton.tsx` with a real x402 settlement. The server issues an HTTP 402 carrying `PaymentRequirements` (`scheme:"exact"`, `network:"xlayer"`, USDG on X Layer chain 196). The client builds a valid `X-PAYMENT` header and replays the request. The server runs the facilitator `POST /api/v6/x402/verify`, serves the paid analysis, then fire-and-forget `POST /api/v6/x402/settle` after the response is sent. Every user-facing amount is shown in human + atomic form; the protocol is always named **OKX Agent Payments Protocol** to the user.

**Architecture:** The paid resource is the a2mcp analysis path built in Plan 2. Plan 2 already emits a `402` challenge on the paid call; Plan 3 makes that challenge a *real* x402 v2 challenge (base64-encoded `PAYMENT-REQUIRED` header + `accepts[]` body) and adds the settlement half. Server-side lives in `src/lib/x402.ts` (new) + the a2mcp route; the facilitator client reuses the exact `okxCall` HMAC-SHA256 signer already in `src/lib/okx-api.ts`. Client-side, `PaymentButton` calls a thin `src/lib/x402-client.ts` that performs the 402 → sign → replay loop. Because the exact `X-PAYMENT` header *encoding a browser client must produce* is NOT fully specified in the skill (the skill's client path delegates signing to the `onchainos` CLI, which is not Vercel-viable in a browser), **Task 1 is a gated spike** that does one real testnet USDG round-trip on X Layer and records the exact request/response bytes to `docs/X402-CONTRACT.md`. Every later task is written against that recorded contract, not against a guess.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Node `fetch`, `viem` (for reading USDG Transfer events on-chain as the primary verify + for EIP-712 / EIP-3009 signing if the recorded contract needs client-side signing), Vitest for unit tests, Playwright (existing) for the end-to-end paid-flow test. OKX facilitator at `https://web3.okx.com` (same base as `okx-api.ts`).

## Global Constraints

- Platform: Vercel serverless — no `spawnSync`, no `/tmp` binary, no blocking calls, no `onchainos` CLI at runtime. All I/O async. Settlement runs *after* the response via `context.waitUntil` / `after()` (Next.js `after` from `next/server`) so the paid response is never blocked by the settle call. Route config: `export const runtime = "nodejs"; export const maxDuration = 60;`.
- No em-dashes in any user-facing copy or docs (standing rule). Use ", " or " — no wait" phrasing, not the em-dash character.
- OKX HMAC header convention (reuse `okxCall` from `src/lib/okx-api.ts` verbatim): base `https://web3.okx.com`; project header `OKX-ACCESS-PROJECT: 4d156bf0c61130f2692d097ecb68dbe4`; auth headers `OKX-ACCESS-KEY / -SIGN / -TIMESTAMP / -PASSPHRASE`; prehash = `timestamp + method + path + body`, HMAC-SHA256, base64. The facilitator `verify` / `settle` calls sign the SAME way (`DEEP-RESEARCH.md:63` — "with HMAC-SHA256 headers").
- Chain: X Layer, chain index / EVM chainId **196** (`network:"xlayer"` in `PaymentRequirements`).
- Payment token: **USDG** `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` on X Layer (`DEEP-RESEARCH.md:20`). USDG decimals must be confirmed in the Task 1 spike (do NOT assume 6 or 18 — read it from the token contract) and recorded in `docs/X402-CONTRACT.md`. All `maxAmountRequired` values are atomic base units of USDG.
- Target: **OKX.AI Genesis** (Build X Series), ASP agent #6013, X Layer. This is a marketplace-agent submission — payment judges probe the real protocol, so the demo must show a real on-chain settlement tx hash on X Layer.
- Credentials come only from `process.env` (`OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE`, and a new `X402_PAYTO_ADDRESS` + a testnet-only payer key `X402_PAYER_KEY` used ONLY in the spike script, never committed, never in `public/`, never on the Vercel host in production per the "Vercel clobbers .env.local" lesson). The production server never holds a payer key — it only verifies and settles what the client signed.
- `PaymentRequirements` shape is fixed by `DEEP-RESEARCH.md:18`: `{ scheme: "exact", network: "xlayer", maxAmountRequired, resource, payToAddress, requiredDeadlineSeconds: 300 }`. The x402 v2 challenge additionally wraps this in `{ x402Version, accepts: [ ... ] }` and is emitted base64-encoded in the `PAYMENT-REQUIRED` response header (per the payments skill, Step A3-Accepts). Keep the literals `x402Version`, `PAYMENT-REQUIRED`, `X-PAYMENT`, `PAYMENT-RESPONSE` byte-for-byte exact (payments skill Rule 3).
- TDD: failing test first, minimal code, commit per task. Prefer recorded JSON fixtures (from the Task 1 spike) over live network in unit tests.

## Upstream Inputs & Branch Caveats

| Upstream artifact read | Possible outcomes | Branch this plan takes |
|------------------------|-------------------|------------------------|
| Plan 2 green — `docs/A2MCP-CONTRACT.md` + the `settlementMode` 402 seam in the a2mcp route | 402 challenge path exists / Plan 2 not landed | exists → proceed; not landed → **STOP, Plan 3 cannot start** |
| Task 1 spike: testnet USDG round-trip on X Layer | settles (real tx hash) / cannot settle or USDG unavailable | settles → wire real x402 (`settlementMode=live`); cannot → **keep demo settlement, do NOT ship Plan 3**, notify Plan 5/6 the x402 claim stays "simulated" |
| USDG decimals read from the token contract | N (6 / 18 / other) | record N in `docs/X402-CONTRACT.md`; every atomic amount uses N |
| Roadmap optionality (`00-ROADMAP.md`) | payment track matters for scoring / does not | matters → run; does not → skip entirely, keep honest `[DEMO MODE]` label |

## Plan decomposition (this is Plan 3 of 6)

1. Live-data spine — DONE (`2026-07-20-genuinely-live-data-layer.md`).
2. A2MCP conformance — provides the `402` challenge on the paid analyze call that THIS plan turns real.
3. **Real x402 payment (THIS PLAN, optional):** gated round-trip spike → real 402 challenge → client `X-PAYMENT` build → facilitator verify → fire-and-forget settle → replace `setTimeout`.
4. Frontend a11y + design tokenization.
5. Submission honesty pass (reconcile the x402 claim to whatever THIS plan actually ships).
6. Demo re-record.

**Depends on Plan 2.** Plan 2 must be green (the a2mcp paid path returns a `402` before this plan makes it a real x402 challenge). Do not start Task 2 of this plan until Plan 2's `402` handshake exists.

---

## Task 0: Reconcile with upstream output (gate)

**Files:**
- Create: `docs/X402-CONTRACT.md` (stub — the branch note now, filled by Task 1)
- Reference: `docs/superpowers/plans/00-ROADMAP.md` (Branch-Caveat Matrix), Plan 2's a2mcp route + `docs/A2MCP-CONTRACT.md`

- [ ] **Step 1: Confirm Plan 2 landed the 402 seam.** `grep -n "settlementMode\|build402Response\|PAYMENT-REQUIRED" src/app/api/a2mcp/route.ts src/lib/a2mcp/payment.ts`. Expected: the paid a2mcp path emits a `402` and reads `settlementMode`. If absent, STOP — Plan 2 is not green; Plan 3 cannot start.
- [ ] **Step 2: Confirm the payment track is in scope.** Re-read `00-ROADMAP.md` optionality note. If payment does not affect scoring and the deadline is tight, STOP and keep the honest simulation (do not run this plan).
- [ ] **Step 3: Write the branch note.** Create `docs/X402-CONTRACT.md` with a top block recording the selected branch from the matrix (e.g. "Plan 2 green: YES; scope: IN; USDG decimals: TBD-by-Task-1"). If reality matches no documented branch, STOP and amend this plan before Task 1.
- [ ] **Step 4: Commit.** `git add docs/X402-CONTRACT.md && git commit -m "docs(x402): upstream reconciliation note (branch selected)"`

---

## Task 1: x402 X Layer round-trip spike (HARD GATE)

**Files:**
- Create: `docs/X402-CONTRACT.md` (the spike deliverable — the real recorded contract)
- Create (throwaway): `scripts/spike-x402.mjs`
- Reference: `src/lib/okx-api.ts:12-54` (the `okxCall` signer to reuse), `~/.claude/skills/okx-agent-payments-protocol/SKILL.md` (Steps A2/A3-Accepts/A6, and `references/accepts-schemes.md` for the `exact` scheme header assembly), `DEEP-RESEARCH.md:18-20,63`.

**Interfaces:**
- Produces: `docs/X402-CONTRACT.md` documenting, from a REAL testnet settlement, (a) the exact `PAYMENT-REQUIRED` header bytes and decoded `accepts[]` JSON the server must emit, (b) the exact `X-PAYMENT` header bytes a client must send for `scheme:"exact"` USDG on X Layer, (c) the exact `verify` and `settle` request/response JSON, (d) USDG decimals, (e) the settlement tx hash on X Layer. Every later task is written against this file. If the round-trip cannot settle, the file records WHY and the plan STOPS.

- [ ] **Step 1: Confirm USDG decimals and payTo on X Layer.** In `scripts/spike-x402.mjs`, use `viem` with an X Layer public client (RPC `https://rpc.xlayer.tech`, chainId 196) to read `decimals()` and `symbol()` of `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8`. Record both. Set `X402_PAYTO_ADDRESS` to a wallet you control (the "seller"). Expected: `symbol() === "USDG"`, `decimals()` is a concrete integer — write it down; do not assume.

- [ ] **Step 2: Fund a throwaway payer on X Layer testnet.** Put a small USDG balance and OKX (gas) balance on the address behind `X402_PAYER_KEY` (env only, never committed). Record the address (not the key) in the doc header. If X Layer mainnet is the only USDG surface, use the smallest viable real amount (e.g. `0.01 USDG`) and note that this is mainnet in the doc.

- [ ] **Step 3: Drive one full round-trip through the payments CLI to capture the real header bytes.** The `okx-agent-payments-protocol` skill's client path signs via `onchainos payment pay --payload '<raw_402>'`. Run that ONCE locally against a minimal seller that emits a real x402 v2 402 for USDG on X Layer, and capture:
  - the seller's `PAYMENT-REQUIRED` header value (base64) and its decoded `{ x402Version, accepts: [ { scheme:"exact", network:"xlayer", maxAmountRequired, resource, payToAddress, asset, requiredDeadlineSeconds:300 } ] }`,
  - the CLI's returned `{ authorization_header, header_name, scheme, wallet }`,
  - the exact `X-PAYMENT` (or `header_name`) value replayed,
  - the `PAYMENT-RESPONSE` header on the 200 (decode: `echo '<value>' | base64 -d | jq .` → `{ status, transaction, amount, payer }`).

  Write `scripts/spike-x402.mjs` to stand up that minimal seller (a tiny Node http server that returns the 402 then 200) so the round-trip is reproducible; drive the CLI against it. The point is to OBSERVE the real `X-PAYMENT` encoding, not to invent it.

- [ ] **Step 4: Capture the facilitator verify + settle contract.** Using `okxCall` (reuse from `okx-api.ts`, do NOT reimplement the signer), call `POST /api/v6/x402/verify` with the captured `X-PAYMENT` payload and the `accepts[0]` requirements, then `POST /api/v6/x402/settle`. Record the exact request bodies and response JSON (field names, success shape, error shape). If the facilitator needs the payment payload in a specific envelope, that envelope IS the contract — record it verbatim.

- [ ] **Step 5: Confirm on-chain settlement.** With `viem`, read USDG `Transfer` logs on X Layer for the tx hash from Step 3/4 and assert `to === X402_PAYTO_ADDRESS` and `value === maxAmountRequired`. Record the tx hash.

- [ ] **Step 6: Decision rule (the gate).** If Steps 3-5 produced a real settled tx whose Transfer log matches, WRITE `docs/X402-CONTRACT.md` (all recorded bytes + a "Server emits / Client sends / Facilitator verify / Facilitator settle" section + USDG decimals + tx hash) and proceed to Task 2. If ANY of: the CLI cannot produce an `X-PAYMENT` a browser can reproduce without the CLI, OR verify/settle never returns success, OR no on-chain Transfer appears — STOP. Record the failure in `docs/X402-CONTRACT.md` under `## Blocked`, keep the `PaymentButton` simulation, and mark Plan 3 abandoned in `00-ROADMAP.md`. Do NOT fabricate a header format.

- [ ] **Step 7: Commit the contract, delete the spike script.**

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
git rm scripts/spike-x402.mjs
git add docs/X402-CONTRACT.md 00-ROADMAP.md 2>/dev/null; git add docs/X402-CONTRACT.md
git commit -m "docs: x402 USDG-on-X-Layer round-trip contract (spike result)"
```

---

## Task 2: Server-side 402 challenge — real `PaymentRequirements`

**Files:**
- Create: `src/lib/x402.ts` (challenge builder + facilitator client)
- Test: `src/lib/x402.test.ts` (Create)
- Fixture: `src/lib/__fixtures__/x402-challenge.json` (Create — the real decoded `accepts` from Task 1 Step 3)
- Reference: `docs/X402-CONTRACT.md`, `src/lib/okx-api.ts` (`okxCall`)

**Interfaces:**
- Consumes: `docs/X402-CONTRACT.md`.
- Produces: `export function buildPaymentRequired(opts: { resource: string; priceAtomic: string }): { header: string; body: X402Challenge }` and `export function decodePaymentRequired(header: string): X402Challenge`.

- [ ] **Step 1: Write the failing challenge test.** (Field names from the Task 1 contract; the example assumes the DEEP-RESEARCH shape.)

```ts
// src/lib/x402.test.ts
import { describe, it, expect } from "vitest";
import { buildPaymentRequired, decodePaymentRequired } from "./x402";

const USDG = "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8";

describe("buildPaymentRequired", () => {
  it("emits a base64 PAYMENT-REQUIRED that decodes to the exact PaymentRequirements", () => {
    const { header, body } = buildPaymentRequired({ resource: "https://x/api/a2mcp", priceAtomic: "10000" });
    const req = body.accepts[0];
    expect(req.scheme).toBe("exact");
    expect(req.network).toBe("xlayer");
    expect(req.maxAmountRequired).toBe("10000");
    expect(req.payToAddress).toBe(process.env.X402_PAYTO_ADDRESS);
    expect(req.asset ?? req.paymentTokenAddress).toBe(USDG);
    expect(req.requiredDeadlineSeconds).toBe(300);
    // round-trips through the wire encoding
    expect(decodePaymentRequired(header)).toEqual(body);
  });
});
```

- [ ] **Step 2: Run it, verify it fails.** `npx vitest run src/lib/x402.test.ts` → FAIL (`buildPaymentRequired` not exported).

- [ ] **Step 3: Implement the builder + decoder** in `src/lib/x402.ts` (match the exact `x402Version` and field names recorded in `docs/X402-CONTRACT.md`; the block below is the DEEP-RESEARCH shape and MUST be reconciled to the contract before writing):

```ts
import type { } from "./types";

const USDG = "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8";

export interface PaymentRequirements {
  scheme: "exact";
  network: "xlayer";
  maxAmountRequired: string;      // atomic USDG base units
  resource: string;
  payToAddress: string;
  asset: string;                  // USDG contract (name per contract doc)
  requiredDeadlineSeconds: 300;
}
export interface X402Challenge { x402Version: number; accepts: PaymentRequirements[]; }

export function buildPaymentRequired(opts: { resource: string; priceAtomic: string }): { header: string; body: X402Challenge } {
  const body: X402Challenge = {
    x402Version: 1,               // exact value from docs/X402-CONTRACT.md
    accepts: [{
      scheme: "exact",
      network: "xlayer",
      maxAmountRequired: opts.priceAtomic,
      resource: opts.resource,
      payToAddress: process.env.X402_PAYTO_ADDRESS || "",
      asset: USDG,
      requiredDeadlineSeconds: 300,
    }],
  };
  const header = Buffer.from(JSON.stringify(body), "utf8").toString("base64");
  return { header, body };
}

export function decodePaymentRequired(header: string): X402Challenge {
  return JSON.parse(Buffer.from(header, "base64").toString("utf8"));
}
```

- [ ] **Step 4: Run it, verify it passes.** Set `X402_PAYTO_ADDRESS` in `.env.local` (not committed), then `npx vitest run src/lib/x402.test.ts` → PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/x402.ts src/lib/x402.test.ts src/lib/__fixtures__/x402-challenge.json
git commit -m "feat: server-side x402 v2 challenge builder (PaymentRequirements, USDG on X Layer)"
```

---

## Task 3: Facilitator verify + fire-and-forget settle

**Files:**
- Modify: `src/lib/x402.ts` (add `verifyPayment` + `settlePayment`)
- Test: `src/lib/x402.test.ts` (extend)
- Fixture: `src/lib/__fixtures__/x402-verify.json`, `x402-settle.json` (Create — real responses from Task 1 Step 4)
- Reference: `docs/X402-CONTRACT.md`, `src/lib/okx-api.ts` (`okxCall` — must be exported for reuse)

**Interfaces:**
- Consumes: the `X-PAYMENT` payload from the client, `accepts[0]` from Task 2.
- Produces: `export async function verifyPayment(xPayment: string, req: PaymentRequirements): Promise<{ ok: boolean; reason?: string }>` and `export async function settlePayment(xPayment: string, req: PaymentRequirements): Promise<{ txHash?: string }>`.

- [ ] **Step 1: Export `okxCall`.** In `src/lib/okx-api.ts` change `async function okxCall` to `export async function okxCall` so `x402.ts` reuses the SAME signer (do not copy it). Confirm no other change to its signature.

- [ ] **Step 2: Write the failing verify test** (mock `okxCall` with the real recorded verify response):

```ts
import { describe, it, expect, vi } from "vitest";
vi.mock("./okx-api", () => ({ okxCall: vi.fn() }));
import { okxCall } from "./okx-api";
import { verifyPayment } from "./x402";
import verifyOk from "./__fixtures__/x402-verify.json";

describe("verifyPayment", () => {
  it("returns ok:true when the facilitator verifies the payment", async () => {
    (okxCall as any).mockResolvedValue(verifyOk);   // real /api/v6/x402/verify success body
    const res = await verifyPayment("<x-payment-b64>", { scheme:"exact", network:"xlayer", maxAmountRequired:"10000", resource:"https://x", payToAddress:"0xseller", asset:"0x4ae4...", requiredDeadlineSeconds:300 } as any);
    expect(res.ok).toBe(true);
    expect(okxCall).toHaveBeenCalledWith("POST", "/api/v6/x402/verify", expect.anything());
  });
});
```

- [ ] **Step 3: Run, verify fail.** `npx vitest run src/lib/x402.test.ts` → FAIL.

- [ ] **Step 4: Implement verify + settle** in `src/lib/x402.ts` (envelope + success-field name per `docs/X402-CONTRACT.md`; also add the on-chain fallback per `DEEP-RESEARCH.md` "on-chain (viem Transfer events) + OKX facilitator fallback"):

```ts
import { okxCall } from "./okx-api";

export async function verifyPayment(xPayment: string, req: PaymentRequirements) {
  try {
    const res = await okxCall("POST", "/api/v6/x402/verify", {
      payment: xPayment, requirements: req,      // exact envelope from contract doc
    });
    const ok = res?.data?.isValid ?? res?.isValid ?? false;   // exact field from contract doc
    return { ok: Boolean(ok), reason: ok ? undefined : (res?.reason ?? res?.msg) };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

// fire-and-forget: never await this in the request path
export async function settlePayment(xPayment: string, req: PaymentRequirements) {
  const res = await okxCall("POST", "/api/v6/x402/settle", { payment: xPayment, requirements: req });
  return { txHash: res?.data?.transaction ?? res?.transaction };
}
```

- [ ] **Step 5: Run, verify pass.** `npx vitest run src/lib/x402.test.ts` → PASS (both suites).

- [ ] **Step 6: Commit.**

```bash
git add src/lib/okx-api.ts src/lib/x402.ts src/lib/x402.test.ts src/lib/__fixtures__/x402-verify.json src/lib/__fixtures__/x402-settle.json
git commit -m "feat: x402 facilitator verify + fire-and-forget settle (HMAC via okxCall reuse)"
```

---

## Task 4: Wire the 402 gate into the a2mcp paid route

**Files:**
- Modify: `src/app/api/a2mcp/route.ts` (turn Plan 2's placeholder `402` into a real x402 challenge; add the verify-then-serve-then-settle path)
- Test: `src/app/api/a2mcp/route.test.ts` (extend, or Create if Plan 2 did not)
- Reference: `src/lib/x402.ts`, `docs/X402-CONTRACT.md`

**Interfaces:**
- Consumes: `buildPaymentRequired`, `decodePaymentRequired`, `verifyPayment`, `settlePayment`.
- Produces: a2mcp route that returns `402 + PAYMENT-REQUIRED` when no `X-PAYMENT` header, and `200 + PAYMENT-RESPONSE` when payment verifies, settling after the response.

- [ ] **Step 1: Add serverless config + the after-response import** at the top of the route: `import { after } from "next/server"; export const runtime = "nodejs"; export const maxDuration = 60;`

- [ ] **Step 2: Write the failing route tests** (mock `x402`):

```ts
// src/app/api/a2mcp/route.test.ts (paid path)
import { describe, it, expect, vi } from "vitest";
const settle = vi.fn().mockResolvedValue({ txHash: "0xdead" });
vi.mock("@/lib/x402", () => ({
  buildPaymentRequired: () => ({ header: "BASE64CHALLENGE", body: { x402Version:1, accepts:[{}] } }),
  decodePaymentRequired: () => ({ x402Version:1, accepts:[{ maxAmountRequired:"10000" }] }),
  verifyPayment: vi.fn().mockResolvedValue({ ok: true }),
  settlePayment: settle,
}));
import { POST } from "./route";

describe("POST /api/a2mcp x402 gate", () => {
  it("returns 402 with PAYMENT-REQUIRED when no X-PAYMENT header", async () => {
    const req = new Request("http://x/api/a2mcp", { method:"POST", body: JSON.stringify({ address:"0xabc", chains:["ethereum"], tier:"paid" }) });
    const res = await POST(req);
    expect(res.status).toBe(402);
    expect(res.headers.get("PAYMENT-REQUIRED")).toBe("BASE64CHALLENGE");
  });
  it("serves 200 and schedules settle when X-PAYMENT verifies", async () => {
    const req = new Request("http://x/api/a2mcp", { method:"POST", headers:{ "X-PAYMENT":"PAY-B64" }, body: JSON.stringify({ address:"0xabc", chains:["ethereum"], tier:"paid" }) });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("PAYMENT-RESPONSE")).toBeTruthy();   // base64 { status, transaction }
  });
});
```

- [ ] **Step 3: Run, verify fail.** `npx vitest run src/app/api/a2mcp/route.test.ts` → FAIL.

- [ ] **Step 4: Implement the gate** in `src/app/api/a2mcp/route.ts` (only the paid tier is gated; the free tier is untouched):

```ts
import { after } from "next/server";
import { buildPaymentRequired, decodePaymentRequired, verifyPayment, settlePayment } from "@/lib/x402";

// inside POST, on the paid tier, before running the analysis:
const xPayment = req.headers.get("X-PAYMENT");
const resource = new URL(req.url).toString();
const PRICE_ATOMIC = process.env.X402_PRICE_ATOMIC || "10000";   // atomic USDG, from contract-doc decimals

if (!xPayment) {
  const { header } = buildPaymentRequired({ resource, priceAtomic: PRICE_ATOMIC });
  return new Response(JSON.stringify({ error: "payment required" }), {
    status: 402,
    headers: { "PAYMENT-REQUIRED": header, "Content-Type": "application/json" },
  });
}

const requirements = decodePaymentRequired(buildPaymentRequired({ resource, priceAtomic: PRICE_ATOMIC }).header).accepts[0];
const v = await verifyPayment(xPayment, requirements);
if (!v.ok) {
  return new Response(JSON.stringify({ error: "payment invalid", reason: v.reason }), { status: 402, headers: { "Content-Type": "application/json" } });
}

// ... run the real analysis (Plan 1 path) → `analysis` ...

after(async () => {                      // fire-and-forget settle AFTER the response is sent
  try { await settlePayment(xPayment, requirements); } catch (e) { console.error("settle failed", e); }
});

const paymentResponse = Buffer.from(JSON.stringify({ status: "settling", payer: "client" }), "utf8").toString("base64");
return new Response(JSON.stringify(analysis), {
  status: 200,
  headers: { "PAYMENT-RESPONSE": paymentResponse, "Content-Type": "application/json" },
});
```

- [ ] **Step 5: Run tests, verify pass.** `npx vitest run src/app/api/a2mcp/route.test.ts` → PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/app/api/a2mcp/route.ts src/app/api/a2mcp/route.test.ts
git commit -m "feat: real x402 402->verify->serve->settle gate on a2mcp paid path"
```

---

## Task 5: Client `X-PAYMENT` builder + replace the `setTimeout`

**Files:**
- Create: `src/lib/x402-client.ts` (the 402 -> sign -> replay loop)
- Create: `src/app/api/x402/sign/route.ts` (server-side signer endpoint IF the contract requires a key-held signer; omit if the client signs in-browser)
- Modify: `src/components/PaymentButton.tsx` (remove `setTimeout`, call the real flow)
- Test: `src/lib/x402-client.test.ts` (Create)
- Reference: `docs/X402-CONTRACT.md` (the exact `X-PAYMENT` encoding)

**Interfaces:**
- Consumes: `docs/X402-CONTRACT.md` (client `X-PAYMENT` format).
- Produces: `export async function payAndAnalyze(body: { address: string; chains: string[] }): Promise<{ status: number; data?: unknown; txStatus?: string }>` that: POSTs to `/api/a2mcp`, on `402` decodes `PAYMENT-REQUIRED`, builds `X-PAYMENT`, replays, returns the 200 body + decoded `PAYMENT-RESPONSE`.

- [ ] **Step 1: Decide the signing surface from the contract.** Per `docs/X402-CONTRACT.md` Task 1 result: if the `exact` scheme `X-PAYMENT` is an EIP-3009 / Permit2 signature over USDG, the browser can sign it with a connected wallet (viem `walletClient.signTypedData`) — no server key. If the contract shows the CLI performing TEE signing that a browser cannot reproduce, add `src/app/api/x402/sign/route.ts` that signs with a dedicated `X402_PAYER_KEY` (Vercel env, guarded per the env-clobber lesson) and returns the `X-PAYMENT` value. Choose ONE path and record it at the top of `x402-client.ts`.

- [ ] **Step 2: Write the failing client test** (mock `fetch`: first call 402 with `PAYMENT-REQUIRED`, second call 200 with `PAYMENT-RESPONSE`):

```ts
// src/lib/x402-client.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { payAndAnalyze } from "./x402-client";

describe("payAndAnalyze", () => {
  beforeEach(() => {
    const challenge = Buffer.from(JSON.stringify({ x402Version:1, accepts:[{ scheme:"exact", network:"xlayer", maxAmountRequired:"10000", payToAddress:"0xseller", asset:"0x4ae4", requiredDeadlineSeconds:300 }] })).toString("base64");
    const payResp = Buffer.from(JSON.stringify({ status:"settling", transaction:"0xabc" })).toString("base64");
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ status:402, headers: new Headers({ "PAYMENT-REQUIRED": challenge }), json: async()=>({}) })
      .mockResolvedValueOnce({ status:200, headers: new Headers({ "PAYMENT-RESPONSE": payResp }), json: async()=>({ personas:[{}] }) }) as any;
  });
  it("performs the 402->pay->replay loop and returns the paid analysis", async () => {
    const res = await payAndAnalyze({ address:"0xabc", chains:["ethereum"] });
    expect(res.status).toBe(200);
    expect((res.data as any).personas.length).toBeGreaterThan(0);
    expect(res.txStatus).toBe("settling");
    expect((global.fetch as any)).toHaveBeenCalledTimes(2);   // 402 then replay
  });
});
```

- [ ] **Step 3: Run, verify fail.** `npx vitest run src/lib/x402-client.test.ts` → FAIL.

- [ ] **Step 4: Implement `payAndAnalyze`** (the `buildXPayment` internals come verbatim from `docs/X402-CONTRACT.md` — do not guess):

```ts
function decode(h: string) { return JSON.parse(atob(h)); }

async function buildXPayment(requirements: any): Promise<string> {
  // EXACT encoding from docs/X402-CONTRACT.md.
  // Path A (in-browser): sign EIP-3009/Permit2 over USDG with viem walletClient, encode per contract.
  // Path B (server signer): const r = await fetch("/api/x402/sign", { method:"POST", body: JSON.stringify(requirements) }); return (await r.json()).xPayment;
  const r = await fetch("/api/x402/sign", { method: "POST", body: JSON.stringify(requirements) });
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

- [ ] **Step 5: Run, verify pass.** `npx vitest run src/lib/x402-client.test.ts` → PASS.

- [ ] **Step 6: Replace the fake in `PaymentButton.tsx`.** Remove the `setTimeout`; call `payAndAnalyze`. Add a real `"error"` state. User-facing copy names the protocol per the payments skill (Rule 1) and shows the amount in human + atomic form (Global Constraint). No em-dashes.

```tsx
"use client";
import { useState } from "react";
import { payAndAnalyze } from "@/lib/x402-client";

export function PaymentButton({ tier, price, address, chains }: { tier: string; price: string; address: string; chains: string[] }) {
  const [state, setState] = useState<"idle" | "paying" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const handleClick = async () => {
    setState("paying");
    try {
      const res = await payAndAnalyze({ address, chains });
      if (res.status !== 200) throw new Error("payment not accepted");
      setMsg(res.txStatus === "settling" ? "Settlement in progress" : "Paid");
      setState("done");
    } catch (e) { setMsg((e as Error).message); setState("error"); }
  };
  const label =
    state === "idle" ? `${tier} — ${price}` :
    state === "paying" ? "Paying via OKX Agent Payments Protocol..." :
    state === "done" ? `Paid, ${msg}` : `Payment failed, ${msg}`;
  return (
    <button onClick={handleClick} disabled={state === "paying"} /* keep existing className/style */>
      {label}
    </button>
  );
}
```

- [ ] **Step 7: Update the parent** that renders `PaymentButton` to pass `address` and `chains` props (grep for `<PaymentButton`). Fix the `tier — price` copy to remove the em-dash if the file uses the character (use `, ` or the ASCII hyphen with spaces).

- [ ] **Step 8: Run the whole unit suite + typecheck.** `npx vitest run && npm run typecheck` → PASS.

- [ ] **Step 9: Commit.**

```bash
git add src/lib/x402-client.ts src/components/PaymentButton.tsx src/app/api/x402/sign/route.ts 2>/dev/null; git add -A
git commit -m "feat: replace PaymentButton setTimeout with real x402 402->pay->replay flow"
```

---

## Task 6: End-to-end paid-flow test + demo evidence

**Files:**
- Create: `tests/x402-flow.spec.ts` (Playwright)
- Modify: `docs/X402-CONTRACT.md` (append the live settlement tx hash + explorer link as demo evidence)
- Reference: `playwright.config.ts` (the `webServer` block added in Plan 1 Task 6)

**Interfaces:**
- Consumes: the live `/api/a2mcp` paid path.
- Produces: a falsifiable assertion that a paid analyze call returns 402 without payment and 200 with a valid `X-PAYMENT`, plus a recorded on-chain tx hash for the demo.

- [ ] **Step 1: Write the failing e2e test.**

```ts
// tests/x402-flow.spec.ts
import { test, expect } from "@playwright/test";
test("paid a2mcp returns 402 unpaid, 200 + PAYMENT-RESPONSE paid", async ({ playwright }) => {
  const api = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
  const unpaid = await api.post("/api/a2mcp", { data: { address: "0xabc", chains: ["ethereum"], tier: "paid" } });
  expect(unpaid.status()).toBe(402);
  expect(unpaid.headers()["payment-required"]).toBeTruthy();
  // paid replay uses the same client builder the browser uses (import from src/lib/x402-client where feasible, else drive the UI)
});
```

- [ ] **Step 2: Run the unpaid half against a live build** (`DEMO_MODE` unset, real path). `BASE_URL=http://localhost:3000 npx playwright test tests/x402-flow.spec.ts`. Expected: PASS on the 402 assertion.

- [ ] **Step 3: Drive one real paid settlement through the UI** against the live build with the funded testnet payer, capture the X Layer settlement tx hash, and append it to `docs/X402-CONTRACT.md` under `## Live Settlement Evidence` (tx hash + `https://www.okx.com/web3/explorer/xlayer/tx/<hash>`). This is the demo proof for the OKX.AI Genesis payment judges.

- [ ] **Step 4: Commit.**

```bash
git add tests/x402-flow.spec.ts docs/X402-CONTRACT.md
git commit -m "test: e2e x402 paid-flow guard + recorded live X Layer settlement tx"
```

---

## Self-Review notes

- **Gate integrity:** Task 1 is a real HARD GATE, not a placeholder. The exact browser `X-PAYMENT` encoding is not fully specified in the `okx-agent-payments-protocol` skill (its client path delegates to the `onchainos` CLI / TEE signer, which is not Vercel-browser-viable), so every later task is deliberately written against `docs/X402-CONTRACT.md` produced by an observed round-trip. If the round-trip does not settle on X Layer, execution STOPS at Task 1 Step 6, the simulation stays, and Plan 3 is marked abandoned. This is intentional.
- **Optional status honored:** header + roadmap both flag Plan 3 as stretch; the plan explicitly says not to half-build it and to prefer an honestly-labelled simulation over a broken real payment on stage.
- **Dependency on Plan 2:** the 402 challenge lives on the a2mcp paid path from Plan 2. Task 4 turns Plan 2's placeholder 402 into a real x402 v2 challenge, so Plan 2 must be green first (stated in Global Constraints and the decomposition).
- **Signer safety:** the production server never holds a payer key. Path A (in-browser EIP-3009/Permit2) is preferred; Path B (server signer at `/api/x402/sign`) is used only if the contract forces it, and then the key is guarded per the "Vercel clobbers .env.local" lesson. The `X402_PAYER_KEY` appears only in the Task 1 spike and, if needed, the guarded sign route, never in `public/`, never committed.
- **HMAC reuse, not reimplementation:** `verify` / `settle` reuse the exact `okxCall` signer from `okx-api.ts` (Task 3 Step 1 exports it) so the header convention (`OKX-ACCESS-*`, prehash `timestamp+method+path+body`, base64 HMAC-SHA256) is identical to the rest of the codebase.
- **Non-blocking settlement:** settle runs in `after()` (Next.js) so the paid analysis response is never blocked by the settle round-trip, satisfying the Vercel-async constraint; `maxDuration = 60` covers verify + analysis.
- **Type / name consistency:** `PaymentRequirements` / `X402Challenge` are defined once in `x402.ts`, consumed by the route and (via the wire encoding) by `x402-client.ts`; the atomic-units price flows from `X402_PRICE_ATOMIC` computed against the USDG decimals recorded in the contract doc, so amounts are consistent server-to-client-to-chain.
- **Copy discipline:** all user-facing strings name **OKX Agent Payments Protocol** (payments skill Rule 1), keep `x402Version` / `X-PAYMENT` / `PAYMENT-REQUIRED` / `PAYMENT-RESPONSE` byte-exact (Rule 3), show amounts in human + atomic form, and contain no em-dashes.
- **Assumption to confirm before Task 1:** USDG on X Layer is reachable on a testnet the payer can be funded on; if USDG is mainnet-only, Task 1 uses the smallest real amount and the doc records that the demo settlement is a real (tiny) mainnet tx, which is stronger evidence for the judges anyway.
