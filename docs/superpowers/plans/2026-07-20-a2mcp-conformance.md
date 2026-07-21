# A2MCP Conformance — Implementation Plan (Plan 2 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. When the plan asks you to speak the OKX.AI A2A / A2MCP / x402 protocol, ALSO invoke the real skills — `okx-ai` (agent card / ERC-8004 identity / ASP `serviceList` / A2A envelopes) and `okx-agent-payments-protocol` (402 → `X-PAYMENT` handshake) — as sub-skills so every field is grounded in the live contract, not this document's paraphrase.

**Goal:** Turn `/api/a2mcp` from "a REST endpoint named a2mcp" (audit finding N5, quality grade 24/100) into a real A2MCP marketplace agent: a machine-readable agent card (capability list + JSON input schema + JSON output schema + pricing/service metadata), a `402` → `X-PAYMENT` payment handshake on the paid analyze call, A2A inbound-envelope parsing on `POST`, and a populated ASP #6013 `serviceList` that points at this endpoint. Serve the REAL analysis output produced by Plan 1, not the hand-authored cache.

**Architecture:** Split the current single-shape `POST` into three surfaces on the same route file, each grounded in the OKX skills:
1. `GET /api/a2mcp` returns the **agent card** — a static, deterministic JSON document (`capabilities[]`, `input` JSON Schema, `output` JSON Schema, `pricing`, `x402` accepts block) built from a new `src/lib/a2mcp/agent-card.ts` module. No wallet, no network, pure function → trivially testable.
2. `POST /api/a2mcp` first classifies the request body by SHAPE (envelope-first, exactly like the `okx-ai` skill's "Inbound envelope activation" table): an A2A system-event envelope (`{agentId, message:{source:"system", event, jobId}}`) or an A2A agent-chat envelope (`{msgType:"a2a-agent-chat", jobId, sender:{role}}`) is acknowledged via a dedicated handler; a plain analyze body (`{address|addresses, chains}`) runs the paid analyze path.
3. The paid analyze path enforces payment: if the request carries no valid `X-PAYMENT` header, respond `402` with a `PAYMENT-REQUIRED` (v2, base64 JSON) challenge whose `accepts[]` is the x402 `exact` scheme on X Layer USDG; if it carries `X-PAYMENT`, verify (stub-verify in this plan, real settlement is Plan 3) then serve the real analysis from Plan 1's `getWalletTrades` → `classifyPatterns` → `generatePersona`.

The agent card's `output` schema is derived directly from `AnalyzeResponse` in `src/lib/types.ts` so card and payload can never drift. A conformance test asserts the served payload validates against the card's own `output` schema — the differential guard Plan 1 introduced, now extended to protocol shape.

**Tech Stack:** Next.js 16 (App Router, `runtime = "nodejs"`), TypeScript, Node `fetch`, Vitest for unit + route tests, `ajv` (add) for JSON-Schema validation in the conformance test only, Playwright (existing) for the live protocol probe. USDG on X Layer for the x402 accepts block.

## Global Constraints

- Platform: Vercel serverless — no `spawnSync`, no `/tmp` binary, no blocking calls. All I/O async. Both handlers set `export const runtime = "nodejs"; export const maxDuration = 60;` (Plan 1 Task 3 already adds this to `a2mcp/route.ts`; do not remove it).
- No em-dashes in any user-facing copy, agent-card `description`, or docs (standing rule). Use "→", commas, or full stops.
- OKX REST base `https://web3.okx.com`; project header `OKX-ACCESS-PROJECT: 4d156bf0c61130f2692d097ecb68dbe4`; auth headers `OKX-ACCESS-KEY / -SIGN / -TIMESTAMP / -PASSPHRASE`; prehash `timestamp + method + path + body`, HMAC-SHA256, base64. Credentials come only from `process.env` — never committed, never in `public/`. (The agent card itself is public and carries NO credentials.)
- Chain: **X Layer, chain index 196**. ERC-8004 agent identity (ASP #6013) is minted on X Layer; identities are XLayer-only (`okx-ai` skill Gate "Chain-fixed" — never pass `--chain` to an `agent` command).
- x402 accepts block pays in **USDG** `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` (18 decimals) on `network: "xlayer"` (chain 196), `scheme: "exact"`, `requiredDeadlineSeconds: 300` (`DEEP-RESEARCH.md:18,20`). These are the SAME literals Plan 3 will settle against; keep them in one shared const so Plan 3 reuses them.
- Externally-defined protocol literals stay byte-for-byte exact wherever the protocol requires them (`okx-agent-payments-protocol` skill Rule 3): the JSON field `x402Version`, the HTTP headers `X-PAYMENT` / `PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` / `WWW-Authenticate: Payment`, and the URL `https://x402.org`. Do not rename these to be "nicer".
- ASP service metadata contract (`okx-ai` skill `identity-register.md` §Step 2 / §6): a service has a **name** (5–30 char noun phrase, no price in the name), a **2-part description** (① core capability + who it is for; ② what the user must provide, each part ≤200 CJK chars, no example prompts / no links / no tech-stack), a **type** of literal `A2MCP` for an API service, a **fee** that is a plain number sent as a **quoted string** in digits only (currency is always USDT by default — no `USDT`/`USDG`/symbol in the value), and an **endpoint** that must be a publicly reachable `https://` URL ≤512 chars (reject `http`/`localhost`/private IPs/placeholders).
- Target hackathon: **OKX.AI Genesis** (ASP agent **#6013** on the OKX.AI marketplace) + DoraHacks Details tab. This plan makes the marketplace-facing endpoint real; agent judges probe the protocol, so shape correctness is scored.
- TDD: failing test first, minimal code, commit per task. Prefer recorded JSON fixtures over live network in unit tests. Do NOT fabricate any protocol field — where the marketplace contract is not fully pinned by the two skills, use a gated spike (Task 1) plus a skill-grounded fallback, and flag any re-validation as a Downstream Item.

## Upstream Inputs & Branch Caveats

This plan depends on Plan 1's output and on a marketplace contract that is only partly pinned by the skills. Read the upstream artifacts FIRST (Task 0), then take the matching branch. Do not start Task 1 until the row you are on is confirmed.

| Upstream artifact read | Possible outcomes | Branch this plan takes |
|---|---|---|
| Plan 1 state (`docs/superpowers/plans/2026-07-20-genuinely-live-data-layer.md` checkboxes) + any `.forge`/pipeline-log entry marking Plan 1 green | (a) Plan 1 GREEN (all tasks checked, differential test passing) · (b) Plan 1 NOT green / partial | (a) Proceed: the paid analyze path serves the real `getWalletTrades` → `classifyPatterns` output. (b) **STOP** — this plan's Task 4/5 have no real payload to serve. Amend the roadmap or finish Plan 1 first. Do not build A2MCP on top of a non-green data layer. |
| `docs/OKX-TRADE-API-CONTRACT.md` (Plan 1 Task 1 spike deliverable) | (a) Real REST trade endpoint EXISTS (doc has a concrete method+path+field mapping) · (b) Doc records the Plan-1B "honest self-consistent demo" fork (no REST trade endpoint found) | (a) The analyze path calls `getWalletTrades` for genuinely live per-wallet analysis. (b) **Plan-1B fork:** the analyze path serves the regenerated-from-real-classifier cache (Plan 1 Task 5) and the agent card's `pricing.mode`/`description` must say "analysis over demo wallets", NOT claim live per-request wallet fetch. Pick the wording in Task 3; do not overclaim live data the endpoint cannot deliver. |
| A2MCP marketplace contract for the exact agent-card fields + inbound-envelope shapes (probe in Task 1, grounded by `okx-ai` + `okx-agent-payments-protocol` skills) | (a) A live probe / marketplace docs CONFIRM the agent-card JSON shape and 402 accepts shape · (b) Only skill-grounded defaults are reachable (no live probe possible before deadline) | (a) Build to the confirmed shape and note the probe evidence in the contract doc. (b) **Build to the skill-grounded fallback shape** documented in Task 1 (agent card = `okx-ai` `identity-register` service fields + a self-described `capabilities`/`input`/`output`/`pricing` JSON; 402 = `okx-agent-payments-protocol` `accepts`-based v2 shape) AND record a **Downstream Item**: "re-validate A2MCP agent-card + 402 shape against the live marketplace before final submission (Plan 5)." Do not invent fields the skills do not mention. |

---

## Task 0: Reconcile with upstream output (gated spike — FIRST, before anything else)

**Files:**
- Read only: `docs/superpowers/plans/2026-07-20-genuinely-live-data-layer.md`, `docs/OKX-TRADE-API-CONTRACT.md`, any `pipeline-log.md` / `.forge` state, `src/lib/okx-api.ts` (does `getWalletTrades` exist and is it exported?), `src/data/cache/*.json` (were they regenerated by Plan 1 Task 5?).
- Create: `docs/A2MCP-UPSTREAM-RECONCILE.md` (the spike deliverable — one short table recording which branch each row above resolved to, with the evidence line).

**Interfaces:**
- Produces: a confirmed branch selection for every row of "Upstream Inputs & Branch Caveats", written to `docs/A2MCP-UPSTREAM-RECONCILE.md`. Consumed by every later task (they read the resolved branch, not the raw upstream).

- [ ] **Step 1: Confirm Plan 1 is green.** Verify Plan 1's Task 6 differential test exists and passes: `ls tests/differential.spec.ts` and `git log --oneline | grep -i "differential guard"`. Run `npx vitest run` and confirm the suite is green. If Plan 1 is not green → STOP, do not proceed to Task 1; record the blocker in `docs/A2MCP-UPSTREAM-RECONCILE.md` and hand back.

- [ ] **Step 2: Read the trade-API contract branch.** Open `docs/OKX-TRADE-API-CONTRACT.md`. Determine: did Plan 1 Task 1 find a real REST trade endpoint (row 2, branch a), or did it fork to Plan-1B honest demo (branch b)? Grep for the decision line: `grep -niE "STOP|Plan-1B|honest demo|no REST trade endpoint|winner|method + path" docs/OKX-TRADE-API-CONTRACT.md`.

- [ ] **Step 3: Confirm the served-payload source.** Check whether `getWalletTrades` is exported from `src/lib/okx-api.ts` (`grep -n "export async function getWalletTrades" src/lib/okx-api.ts`) and whether the cache was regenerated by the real classifier (`git log --oneline -- src/data/cache | grep -i "real classifier"`). Record which payload source Task 4 will serve.

- [ ] **Step 4: Decision gate.** If reality matches a documented branch (a or b) for every row → write `docs/A2MCP-UPSTREAM-RECONCILE.md` with the three resolved rows and their evidence lines, then proceed to Task 1. **If reality matches NO documented branch** (e.g. Plan 1 half-done, or the contract doc missing) → STOP, amend this plan's "Upstream Inputs & Branch Caveats" table to add the real branch, get it confirmed, and only then continue. Do not guess.

- [ ] **Step 5: Commit.**

```bash
git add docs/A2MCP-UPSTREAM-RECONCILE.md
git commit -m "docs: reconcile A2MCP plan with Plan 1 upstream output (branch selection)"
```

---

## Task 1: A2MCP marketplace-contract spike (gated)

**Files:**
- Create: `docs/A2MCP-CONTRACT.md` (the spike deliverable — the agent-card shape + 402 accepts shape + inbound-envelope shapes this plan builds to).
- Reference: `~/.claude/skills/okx-ai/SKILL.md` (§"Inbound envelope activation" table — the two A2A envelope shapes), `~/.claude/skills/okx-ai/references/identity-register.md` (§Step 2 service fields + §6 endpoint rules), `~/.claude/skills/okx-agent-payments-protocol/SKILL.md` (§Step A2/A3-Accepts — the `PAYMENT-REQUIRED` v2 `accepts[]` shape and `X-PAYMENT` replay), `DEEP-RESEARCH.md:18,20` (PaymentRequirements literals + USDG).

**Interfaces:**
- Produces: `docs/A2MCP-CONTRACT.md` documenting (1) the agent-card JSON shape, (2) the `402` `PAYMENT-REQUIRED` challenge shape with the exact `accepts[0]` object, (3) the two inbound A2A envelope shapes and this agent's acknowledgement, (4) the ASP #6013 `serviceList` service object. Consumed by Tasks 2-6.

- [ ] **Step 1: Probe the marketplace, if reachable.** Attempt to read the agent-card shape a real OKX.AI ASP serves. Options in priority order: (1) if there is a known live A2MCP agent endpoint, `curl -s <that endpoint>` (GET) and record the JSON shape; (2) search the `okx-ai` references for any `A2MCP` card example (`grep -rniE "A2MCP|agentCard|agent card|capabilit|inputSchema|outputSchema" ~/.claude/skills/okx-ai/references/`); (3) if neither yields a concrete shape, record "no live probe available → skill-grounded fallback" and continue. Do NOT invent fields not attested by a probe or a skill.

- [ ] **Step 2: Lock the agent-card fallback shape** (skill-grounded — this is what we build if Step 1 finds no live shape). Ground each field:
  - `name`, `description` (2-part, per `identity-register.md` §Step 2 — no em-dashes, no links, no tech-stack), `service.type: "A2MCP"`, `service.fee` (quoted-string digits, USDT default), `service.endpoint` (`https://` public) — these are the ASP `serviceList` fields and MUST match the on-chain listing.
  - `capabilities: string[]` — the human-readable capability list (e.g. `"wallet-behavior-analysis"`, `"multi-chain-persona"`, `"trade-pattern-classification"`). These name what the agent does; ground them in the actual routes/classifier, not aspiration.
  - `input` — a JSON Schema for the analyze request body, derived from `AnalyzeRequest` in `src/lib/types.ts` (`addresses: [{ address, chains }]`, with the `{ address, chains }` shorthand also accepted).
  - `output` — a JSON Schema for `AnalyzeResponse` in `src/lib/types.ts` (`wallets`, `chains`, `totalTxns`, `patterns[]`, `personas[]`, `comparison`).
  - `pricing` — `{ scheme: "exact", network: "xlayer", asset: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8", amount: "<atomic USDG for the fee>", payTo: "<ASP payout address>", requiredDeadlineSeconds: 300 }`. The `amount` is the fee in USDG atomic units (18 decimals); document the conversion from the quoted USDT fee digits.
- [ ] **Step 3: Lock the `402` challenge shape.** Per `okx-agent-payments-protocol` §A2/A3-Accepts, the v2 challenge is a **`PAYMENT-REQUIRED` response header** carrying **base64-encoded JSON** `{ x402Version: 1, accepts: [ <PaymentRequirements> ], resource, ... }`, where `accepts[0]` = the `pricing` object above expressed in x402 `exact` form (`scheme`, `network`, `maxAmountRequired`, `asset`/`paymentTokenAddress`, `payToAddress`/`payTo`, `resource`, `requiredDeadlineSeconds: 300`). Record the exact field names (there is `maxAmountRequired` in the v1 body vs `amount` in v2 per §A4 — document both and pick v2 `PAYMENT-REQUIRED` header as primary since Plan 3 uses `payment pay --payload`). Keep `x402Version`, `PAYMENT-REQUIRED`, `X-PAYMENT` byte-exact.
- [ ] **Step 4: Lock the inbound A2A envelope shapes.** Copy verbatim from `okx-ai` SKILL §"Inbound envelope activation": (1) system event `{agentId, message:{source:"system", event, jobId, ...}}`; (2) agent-chat `{msgType:"a2a-agent-chat", jobId, sender:{role}, ...}`. Document that on receiving either, this endpoint MUST recognise the shape (not treat it as an analyze body) and return a well-formed acknowledgement, deferring the actual task lifecycle to the `okx-ai` skill (this endpoint is a listing target, not a task executor in this plan).
- [ ] **Step 5: Decision gate.** If Step 1 found a live shape that CONTRADICTS the skill-grounded fallback → build to the live shape and note the delta. If only the fallback is reachable → build to the fallback AND add a Downstream Item (see Self-Review notes) to re-validate against the live marketplace before Plan 5. If a required field is specified by NEITHER a probe NOR a skill → STOP and escalate; do not invent it.
- [ ] **Step 6: Commit.**

```bash
git add docs/A2MCP-CONTRACT.md
git commit -m "docs: A2MCP agent-card + 402 + A2A-envelope + serviceList contract (spike result)"
```

---

## Task 2: Agent card module + `GET /api/a2mcp`

**Files:**
- Create: `src/lib/a2mcp/agent-card.ts` (pure builder — no network, no wallet).
- Create: `src/lib/a2mcp/agent-card.test.ts`.
- Modify: `src/app/api/a2mcp/route.ts` (replace the ad-hoc `GET` with the real agent card).
- Reference: `docs/A2MCP-CONTRACT.md` (Task 1), `src/lib/types.ts` (`AnalyzeRequest`, `AnalyzeResponse`).

**Interfaces:**
- Produces:
```ts
// src/lib/a2mcp/agent-card.ts
export interface A2mcpService {
  name: string;                 // 5-30 char noun phrase, no price in name
  description: string;          // 2-part, no em-dashes, no links, no tech-stack
  type: "A2MCP";                // literal, per identity-register §Step 2
  fee: string;                  // quoted-string digits only, USDT default (e.g. "1")
  endpoint: string;             // https:// public, <=512 chars
}
export interface A2mcpPricing {
  scheme: "exact";
  network: "xlayer";
  asset: string;                // USDG 0x4ae46a...2dc8
  amount: string;               // atomic USDG (18 decimals) for `fee`
  payTo: string;                // ASP payout address (env-driven)
  requiredDeadlineSeconds: 300;
}
export interface A2mcpAgentCard {
  name: string;
  description: string;          // no em-dashes
  capabilities: string[];
  input: object;                // JSON Schema for AnalyzeRequest
  output: object;               // JSON Schema for AnalyzeResponse
  pricing: A2mcpPricing;
  service: A2mcpService;        // the ASP serviceList entry, mirrored in the card
}
export function buildAgentCard(): A2mcpAgentCard;
```
- Consumes: `process.env.A2MCP_ENDPOINT_URL`, `process.env.A2MCP_PAYTO_ADDRESS` (both public, no secret); constants from a shared `src/lib/a2mcp/constants.ts` (USDG address, network, deadline).

- [ ] **Step 1: Create the shared constants** `src/lib/a2mcp/constants.ts` (reused by Plan 3):

```ts
export const XLAYER_NETWORK = "xlayer" as const;
export const XLAYER_CHAIN_INDEX = 196 as const;
export const USDG_ADDRESS = "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8" as const; // 18 decimals
export const USDG_DECIMALS = 18 as const;
export const X402_DEADLINE_SECONDS = 300 as const;
```

- [ ] **Step 2: Write the failing agent-card test.** Ground every assertion in `docs/A2MCP-CONTRACT.md`:

```ts
// src/lib/a2mcp/agent-card.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { buildAgentCard } from "./agent-card";
import { USDG_ADDRESS } from "./constants";

describe("buildAgentCard", () => {
  beforeEach(() => {
    process.env.A2MCP_ENDPOINT_URL = "https://alter-ego-wine-mu.vercel.app/api/a2mcp";
    process.env.A2MCP_PAYTO_ADDRESS = "0x000000000000000000000000000000000000dEaD";
  });

  it("exposes capabilities, input schema, output schema, and pricing", () => {
    const c = buildAgentCard();
    expect(c.capabilities.length).toBeGreaterThan(0);
    // input schema names the analyze body fields
    expect(JSON.stringify(c.input)).toContain("addresses");
    // output schema names the AnalyzeResponse fields
    const out = JSON.stringify(c.output);
    expect(out).toContain("patterns");
    expect(out).toContain("personas");
  });

  it("prices in USDG on xlayer with a 300s deadline (x402 exact)", () => {
    const c = buildAgentCard();
    expect(c.pricing.scheme).toBe("exact");
    expect(c.pricing.network).toBe("xlayer");
    expect(c.pricing.asset.toLowerCase()).toBe(USDG_ADDRESS);
    expect(c.pricing.requiredDeadlineSeconds).toBe(300);
    expect(/^\d+$/.test(c.pricing.amount)).toBe(true); // atomic units, digits only
  });

  it("mirrors the ASP serviceList entry with a valid A2MCP service (no em-dash, https endpoint)", () => {
    const c = buildAgentCard();
    expect(c.service.type).toBe("A2MCP");
    expect(/^\d+$/.test(c.service.fee)).toBe(true);          // quoted digits, USDT default
    expect(c.service.endpoint.startsWith("https://")).toBe(true);
    expect(c.service.name.length).toBeGreaterThanOrEqual(5);
    expect(c.service.name.length).toBeLessThanOrEqual(30);
    expect(c.description.includes("—")).toBe(false);     // no em-dash
  });
});
```

- [ ] **Step 3: Run it, verify it fails.** `npx vitest run src/lib/a2mcp/agent-card.test.ts` → FAIL (`buildAgentCard` not exported).

- [ ] **Step 4: Implement `buildAgentCard`.** Fill every field from `docs/A2MCP-CONTRACT.md`; keep the copy honest per the Task-0 branch (if Plan-1B honest-demo, the description says "analysis over demo wallets" not "live per-request fetch"). Convert `fee` USDT digits to `pricing.amount` atomic USDG using `USDG_DECIMALS`. The `input`/`output` are hand-written JSON Schemas mirroring `AnalyzeRequest`/`AnalyzeResponse` (do not import a runtime schema lib here; keep it a plain object literal so the card is a static document).

- [ ] **Step 5: Run it, verify it passes.** `npx vitest run src/lib/a2mcp/agent-card.test.ts` → PASS.

- [ ] **Step 6: Wire the card into `GET`.** Replace the ad-hoc `GET` in `src/app/api/a2mcp/route.ts` with:

```ts
import { buildAgentCard } from "@/lib/a2mcp/agent-card";
export async function GET() {
  return NextResponse.json(buildAgentCard());
}
```

- [ ] **Step 7: Commit.**

```bash
git add src/lib/a2mcp/agent-card.ts src/lib/a2mcp/agent-card.test.ts src/lib/a2mcp/constants.ts src/app/api/a2mcp/route.ts
git commit -m "feat(a2mcp): real agent card (capabilities + input/output schema + pricing) on GET"
```

---

## Task 3: `402` → `X-PAYMENT` handshake helpers

**Files:**
- Create: `src/lib/a2mcp/payment.ts` (challenge builder + header check).
- Create: `src/lib/a2mcp/payment.test.ts`.
- Reference: `docs/A2MCP-CONTRACT.md` §402 shape, `okx-agent-payments-protocol` §A2/A3-Accepts, `src/lib/a2mcp/constants.ts`.

**Interfaces:**
- Produces:
```ts
// src/lib/a2mcp/payment.ts
export interface PaymentRequirements {
  scheme: "exact";
  network: "xlayer";
  maxAmountRequired: string;    // atomic USDG
  asset: string;                // USDG address
  payTo: string;
  resource: string;             // the endpoint URL
  requiredDeadlineSeconds: number;
}
// Build the base64-encoded JSON body for the PAYMENT-REQUIRED header (x402 v2).
export function buildPaymentRequiredHeader(resource: string): string;
// Build a 402 NextResponse carrying the PAYMENT-REQUIRED header (byte-exact header name).
export function paymentRequired(resource: string): Response;
// True when the caller supplied a usable X-PAYMENT header (presence + shape only in this plan;
// real verify/settle is Plan 3).
export function hasValidPayment(req: Request): boolean;
```
- Consumes: `constants.ts`, `process.env.A2MCP_PAYTO_ADDRESS`, `process.env.A2MCP_FEE_ATOMIC` (atomic USDG for the fee; default derived from the card).

- [ ] **Step 1: Write the failing payment test.**

```ts
// src/lib/a2mcp/payment.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { buildPaymentRequiredHeader, paymentRequired, hasValidPayment } from "./payment";
import { USDG_ADDRESS } from "./constants";

const RES = "https://alter-ego-wine-mu.vercel.app/api/a2mcp";

describe("x402 handshake", () => {
  beforeEach(() => {
    process.env.A2MCP_PAYTO_ADDRESS = "0x000000000000000000000000000000000000dEaD";
    process.env.A2MCP_FEE_ATOMIC = "1000000000000000000"; // 1 USDG (18 decimals)
  });

  it("encodes a v2 PAYMENT-REQUIRED challenge with the exact USDG/xlayer accepts entry", () => {
    const b64 = buildPaymentRequiredHeader(RES);
    const decoded = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    expect(decoded.x402Version).toBe(1);
    const a = decoded.accepts[0];
    expect(a.scheme).toBe("exact");
    expect(a.network).toBe("xlayer");
    expect(a.asset.toLowerCase()).toBe(USDG_ADDRESS);
    expect(a.requiredDeadlineSeconds).toBe(300);
    expect(/^\d+$/.test(a.maxAmountRequired)).toBe(true);
  });

  it("returns a 402 carrying the byte-exact PAYMENT-REQUIRED header", () => {
    const res = paymentRequired(RES);
    expect(res.status).toBe(402);
    expect(res.headers.get("PAYMENT-REQUIRED")).toBeTruthy();
  });

  it("detects the presence of an X-PAYMENT header", () => {
    const withPay = new Request(RES, { method: "POST", headers: { "X-PAYMENT": "eyJ4NDAyIjp0cnVlfQ==" } });
    const without = new Request(RES, { method: "POST" });
    expect(hasValidPayment(withPay)).toBe(true);
    expect(hasValidPayment(without)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, verify it fails.** `npx vitest run src/lib/a2mcp/payment.test.ts` → FAIL.

- [ ] **Step 3: Implement the helpers.** `buildPaymentRequiredHeader` builds `{ x402Version: 1, accepts: [PaymentRequirements], resource }` and returns `Buffer.from(JSON.stringify(...)).toString("base64")`. `paymentRequired` returns `new Response(JSON.stringify({ error: "payment required" }), { status: 402, headers: { "content-type": "application/json", "PAYMENT-REQUIRED": buildPaymentRequiredHeader(resource) } })` (header name byte-exact). `hasValidPayment` returns `!!req.headers.get("X-PAYMENT")` — presence-only in this plan; add a `// Plan 3: replace with POST /api/v6/x402/verify` comment so real settlement is not silently skipped. Do NOT claim settlement here.

- [ ] **Step 4: Run it, verify it passes.** `npx vitest run src/lib/a2mcp/payment.test.ts` → PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/a2mcp/payment.ts src/lib/a2mcp/payment.test.ts
git commit -m "feat(a2mcp): 402 -> X-PAYMENT handshake helpers (x402 exact/USDG/xlayer, verify deferred to Plan 3)"
```

---

## Task 4: A2A envelope parsing + paid analyze on `POST`

**Files:**
- Create: `src/lib/a2mcp/envelope.ts` (shape classifier + A2A ack builder).
- Create: `src/lib/a2mcp/envelope.test.ts`.
- Modify: `src/app/api/a2mcp/route.ts` (the `POST` now: 1. classify shape → A2A ack or analyze; 2. enforce 402; 3. serve real analysis).
- Test: `src/app/api/a2mcp/route.test.ts` (Create — route-level).
- Reference: `okx-ai` SKILL §"Inbound envelope activation", Plan 1's wired analyze logic in `analyze/route.ts`, `docs/A2MCP-CONTRACT.md`.

**Interfaces:**
- Produces:
```ts
// src/lib/a2mcp/envelope.ts
export type Inbound =
  | { kind: "a2a-system"; agentId: string; event: string; jobId: string }
  | { kind: "a2a-chat"; jobId: string; senderRole: string }
  | { kind: "analyze"; addresses: Array<{ address: string; chains: string[] }> }
  | { kind: "empty" };
export function classifyInbound(body: unknown): Inbound;   // envelope shape wins, per okx-ai skill
export function a2aAck(inbound: Extract<Inbound, { kind: "a2a-system" | "a2a-chat" }>): object;
```
- Consumes: `getWalletTrades` + `classifyPatterns` + `generatePersona` (via Plan 1's wiring), `hasValidPayment` / `paymentRequired` (Task 3), the address sanitizer Plan 1 Task 3 Step 3 adds.

- [ ] **Step 1: Write the failing envelope test.** Ground the shapes verbatim in the `okx-ai` skill table:

```ts
// src/lib/a2mcp/envelope.test.ts
import { describe, it, expect } from "vitest";
import { classifyInbound, a2aAck } from "./envelope";

describe("classifyInbound (envelope shape wins)", () => {
  it("recognises an A2A system event", () => {
    const r = classifyInbound({ agentId: "6013", message: { source: "system", event: "JOB_CREATED", jobId: "j1" } });
    expect(r.kind).toBe("a2a-system");
    if (r.kind === "a2a-system") { expect(r.jobId).toBe("j1"); expect(r.event).toBe("JOB_CREATED"); }
  });
  it("recognises an A2A agent-chat envelope", () => {
    const r = classifyInbound({ msgType: "a2a-agent-chat", jobId: "j2", sender: { role: "USER_AGENT" } });
    expect(r.kind).toBe("a2a-chat");
    if (r.kind === "a2a-chat") { expect(r.senderRole).toBe("USER_AGENT"); }
  });
  it("treats a plain analyze body as analyze, not envelope", () => {
    expect(classifyInbound({ address: "0xabc", chains: ["ethereum"] }).kind).toBe("analyze");
    expect(classifyInbound({ addresses: [{ address: "0xabc", chains: ["ethereum"] }] }).kind).toBe("analyze");
  });
  it("returns empty for a bodyless request", () => {
    expect(classifyInbound({}).kind).toBe("empty");
  });
  it("acks an A2A envelope with a well-formed response", () => {
    const ack = a2aAck({ kind: "a2a-system", agentId: "6013", event: "JOB_CREATED", jobId: "j1" }) as any;
    expect(ack.jobId).toBe("j1");
    expect(typeof ack.status).toBe("string");
  });
});
```

- [ ] **Step 2: Run it, verify it fails.** `npx vitest run src/lib/a2mcp/envelope.test.ts` → FAIL.

- [ ] **Step 3: Implement `classifyInbound` + `a2aAck`.** Order matters (envelope-first, per the skill): check `message?.source === "system"` → `a2a-system`; else `msgType === "a2a-agent-chat"` → `a2a-chat`; else `addresses[]` or `address` present → `analyze`; else `empty`. `a2aAck` returns `{ jobId, agentId, status: "acknowledged", note: "Task lifecycle handled by the OKX AI agent runtime; this endpoint is the ASP listing target." }` (no em-dash). Do NOT attempt the task lifecycle here — that belongs to the `okx-ai` skill; this endpoint only proves it recognises the shape.

- [ ] **Step 4: Rewrite the `POST` handler** in `src/app/api/a2mcp/route.ts`:
  1. Parse the body (`await req.json().catch(() => ({}))`), run `classifyInbound`.
  2. `a2a-system` / `a2a-chat` → return `NextResponse.json(a2aAck(inbound))`. (No payment for envelope acks.)
  3. `empty` → return the agent-card `GET` payload as a showcase (or the honest-demo cache per the Task-0 branch), NOT a 500.
  4. `analyze` → run the address sanitizer (length bound + `/[<>"'&\`\\]/` reject, copied from `analyze/route.ts` per Plan 1 Task 3 Step 3). Then enforce payment: `if (!hasValidPayment(req)) return paymentRequired(resourceUrl);`.
  5. Paid → serve the REAL analysis: build `WalletData` via `getWalletTrades` + balances (per the Task-0 branch — live fetch, or honest-demo cache), run `classifyPatterns` + `generatePersona`, return `AnalyzeResponse`. Strip any `_debug` field from the response and its type (Plan 1 Task 3 Step 3 also removes it).

- [ ] **Step 5: Write the route test** (mock `okx-api` and payment):

```ts
// src/app/api/a2mcp/route.test.ts
import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/okx-api", () => ({
  getWalletTrades: vi.fn().mockResolvedValue([
    { id:"1", timestamp:1, token:"0x", tokenSymbol:"PEPE", chain:"ethereum", type:"SELL", amount:1, amountUsd:900, price:1, pnlUsd:-820, pnlPct:-91, holdDurationDays:0.02 },
  ]),
  getAllTokenBalances: vi.fn().mockResolvedValue({ data: [] }),
}));
import { POST, GET } from "./route";

const URL = "http://x/api/a2mcp";
describe("POST /api/a2mcp", () => {
  it("acks an A2A system envelope without demanding payment", async () => {
    const res = await POST(new Request(URL, { method:"POST", body: JSON.stringify({ agentId:"6013", message:{ source:"system", event:"JOB_CREATED", jobId:"j1" } }) }));
    expect(res.status).toBe(200);
    expect((await res.json()).jobId).toBe("j1");
  });
  it("returns 402 with PAYMENT-REQUIRED when an analyze call lacks X-PAYMENT", async () => {
    const res = await POST(new Request(URL, { method:"POST", body: JSON.stringify({ address:"0xabc", chains:["ethereum"] }) }));
    expect(res.status).toBe(402);
    expect(res.headers.get("PAYMENT-REQUIRED")).toBeTruthy();
  });
  it("serves real patterns when the analyze call carries X-PAYMENT", async () => {
    const res = await POST(new Request(URL, { method:"POST", headers:{ "X-PAYMENT":"eyJ4NDAyIjp0cnVlfQ==" }, body: JSON.stringify({ address:"0xabc", chains:["ethereum"] }) }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.patterns.flatMap((p:any)=>[...p.amplify, ...p.guard]).length).toBeGreaterThan(0);
    expect(JSON.stringify(json)).not.toContain("_debug");
  });
  it("GET returns an agent card with capabilities", async () => {
    const json = await (await GET()).json();
    expect(Array.isArray(json.capabilities)).toBe(true);
  });
});
```

- [ ] **Step 6: Run tests, verify pass.** `npx vitest run src/app/api/a2mcp/route.test.ts src/lib/a2mcp/envelope.test.ts` → PASS.

- [ ] **Step 7: Commit.**

```bash
git add src/lib/a2mcp/envelope.ts src/lib/a2mcp/envelope.test.ts src/app/api/a2mcp/route.ts src/app/api/a2mcp/route.test.ts
git commit -m "feat(a2mcp): A2A envelope parsing + payment-gated analyze serving real classifier output"
```

---

## Task 5: Conformance test — payload validates against the card's own output schema

**Files:**
- Create: `src/lib/a2mcp/conformance.test.ts`.
- Modify: `package.json` (add `ajv` to `devDependencies`).
- Reference: `buildAgentCard().output`, the `POST` analyze payload.

**Interfaces:**
- Consumes: `buildAgentCard` (the `output` JSON Schema) + the paid `POST` response.
- Produces: a falsifiable assertion that what the agent SERVES conforms to what its card ADVERTISES. This is the protocol-shape extension of Plan 1's differential guard.

- [ ] **Step 1: Add `ajv`.** `npm i -D ajv` (JSON-Schema validator, dev-only, used in tests).

- [ ] **Step 2: Write the failing conformance test** (mock `okx-api` as in Task 4):

```ts
// src/lib/a2mcp/conformance.test.ts
import { describe, it, expect, vi } from "vitest";
import Ajv from "ajv";
vi.mock("@/lib/okx-api", () => ({
  getWalletTrades: vi.fn().mockResolvedValue([
    { id:"1", timestamp:1, token:"0x", tokenSymbol:"PEPE", chain:"ethereum", type:"SELL", amount:1, amountUsd:900, price:1, pnlUsd:-820, pnlPct:-91, holdDurationDays:0.02 },
  ]),
  getAllTokenBalances: vi.fn().mockResolvedValue({ data: [] }),
}));
import { POST } from "@/app/api/a2mcp/route";
import { buildAgentCard } from "./agent-card";

describe("A2MCP conformance", () => {
  it("the served analyze payload validates against the card's advertised output schema", async () => {
    process.env.A2MCP_ENDPOINT_URL = "https://x/api/a2mcp";
    process.env.A2MCP_PAYTO_ADDRESS = "0x000000000000000000000000000000000000dEaD";
    const res = await POST(new Request("http://x/api/a2mcp", { method:"POST", headers:{ "X-PAYMENT":"eyJ4NDAyIjp0cnVlfQ==" }, body: JSON.stringify({ address:"0xabc", chains:["ethereum"] }) }));
    const payload = await res.json();
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(buildAgentCard().output as object);
    const ok = validate(payload);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });
});
```

- [ ] **Step 3: Run it, verify it fails first, then passes** once the `output` schema in Task 2 matches the real payload. If it fails on a real mismatch, fix the SCHEMA to match `AnalyzeResponse` (the served shape is the source of truth), not the payload. `npx vitest run src/lib/a2mcp/conformance.test.ts`.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/a2mcp/conformance.test.ts package.json package-lock.json
git commit -m "test(a2mcp): conformance guard - served payload validates against advertised output schema"
```

---

## Task 6: Populate ASP #6013 `serviceList` + live protocol probe

**Files:**
- Create: `docs/A2MCP-LISTING.md` (the exact `serviceList` service object + the update procedure + the confirmed on-chain `agent update` tx hash and read-back `serviceList`).
- Create: `tests/a2mcp-protocol.spec.ts` (Playwright — live GET card + 402 probe).
- Modify: `playwright.config.ts` (reuse the `webServer` block Plan 1 Task 6 adds; no change if already present).
- Reference: `okx-ai` skill (identity update / `serviceList`), `buildAgentCard().service`.

**Interfaces:**
- Consumes: `buildAgentCard().service` (the single source of truth for the on-chain service fields), the live `/api/a2mcp` endpoint.
- Produces: (1) `docs/A2MCP-LISTING.md` with the copy-exact service object put on ASP #6013 (name, 2-part description, `type:"A2MCP"`, quoted-string fee, `https://` endpoint) PLUS the X Layer transaction hash of the confirmed on-chain `agent update` and the on-chain-confirmed `serviceList` read back from the registry; (2) a Playwright probe asserting the live endpoint's protocol shape.
- **On-chain-write guarantee:** the on-chain `agent update` (Step 4) that writes `serviceList` → prod endpoint is a REQUIRED, VERIFIED deliverable of this task, not just documentation. It guarantees at least ONE genuine on-chain write on X Layer (chain 196) independent of whether optional Plan 3 (x402 settlement) ships. Task 6 is not complete until the tx hash is captured and the read-back verification (Step 5) passes.

- [ ] **Step 1: Emit the listing doc.** From `buildAgentCard().service`, write `docs/A2MCP-LISTING.md` containing the exact `{ name, description, type: "A2MCP", fee, endpoint }` object and a checklist: endpoint is the PROD URL (`alter-ego-wine-mu.vercel.app/api/a2mcp`, not the auth-walled `alter-ego-demo`), fee is digits-only, description has both parts and no em-dash/links/tech-stack. Note that the actual on-chain `agent update` is performed by invoking the `okx-ai` skill (it enforces pre-flight, the confirm card, and XLayer-only), NOT by a raw CLI call in this repo.

- [ ] **Step 2: Write the failing live protocol probe.**

```ts
// tests/a2mcp-protocol.spec.ts
import { test, expect } from "@playwright/test";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
test("GET /api/a2mcp returns a conformant agent card", async ({ request }) => {
  const card = await (await request.get(`${BASE}/api/a2mcp`)).json();
  expect(Array.isArray(card.capabilities)).toBe(true);
  expect(card.pricing.network).toBe("xlayer");
  expect(card.service.type).toBe("A2MCP");
});
test("POST analyze without X-PAYMENT returns 402 + PAYMENT-REQUIRED", async ({ request }) => {
  const res = await request.post(`${BASE}/api/a2mcp`, { data: { address: "0xabc", chains: ["ethereum"] } });
  expect(res.status()).toBe(402);
  expect(res.headers()["payment-required"]).toBeTruthy();
});
test("POST an A2A system envelope is acknowledged (200, jobId echoed)", async ({ request }) => {
  const res = await request.post(`${BASE}/api/a2mcp`, { data: { agentId: "6013", message: { source: "system", event: "JOB_CREATED", jobId: "probe-1" } } });
  expect(res.status()).toBe(200);
  expect((await res.json()).jobId).toBe("probe-1");
});
```

- [ ] **Step 3: Run against a live build.** `BASE_URL=http://localhost:3000 npx playwright test tests/a2mcp-protocol.spec.ts` → PASS. Then, if PROD is deployed, run once more with `BASE_URL=https://alter-ego-wine-mu.vercel.app`.

- [ ] **Step 4: Perform the on-chain update (REQUIRED, VERIFIED — not just docs).** Invoke the `okx-ai` skill's interactive flow to run `agent update asp` on ASP #6013, writing the service object from `docs/A2MCP-LISTING.md` into `serviceList` with `endpoint` = the PROD URL (`https://alter-ego-wine-mu.vercel.app/api/a2mcp`). The skill enforces its own gates (pre-flight, confirm card, XLayer-only, never `--chain`). This is the guaranteed on-chain write; do NOT downgrade it to a runbook. Capture the resulting **X Layer transaction hash** the skill returns. Record only the tx hash + the fact of the update (NOT credentials) in `docs/A2MCP-LISTING.md` alongside the service object. If the marketplace agent-card shape from the Task 1 probe differs from what we built, resolve the Downstream Item now before submitting.

- [ ] **Step 5: Verify the on-chain write (assert, do not assume).** Re-fetch the agent from the registry and assert the write landed:

```bash
onchainos agent get-agents --agent-ids 6013
```

Assert all of: (a) `serviceList` is non-empty; (b) the service `endpoint` equals the PROD URL `https://alter-ego-wine-mu.vercel.app/api/a2mcp` (not the auth-walled `alter-ego-demo`); (c) the service `type` is `A2MCP` and `fee` is digits-only; (d) the Step-4 tx hash is confirmed on X Layer (chain index 196) — check via the OKX explorer / `onchainos` tx status, not just presence. Paste the on-chain-confirmed `serviceList` object and the confirmed tx hash into `docs/A2MCP-LISTING.md`. If any assertion fails → the on-chain write did NOT land; STOP, re-run Step 4, do not mark Task 6 complete. This read-back is what makes the write a verified deliverable: at least ONE genuine on-chain write is now proven regardless of whether optional Plan 3 ships.

- [ ] **Step 6: Commit.**

```bash
git add docs/A2MCP-LISTING.md tests/a2mcp-protocol.spec.ts playwright.config.ts
git commit -m "feat(a2mcp): ASP #6013 serviceList on-chain update (verified tx) + listing doc + live protocol probe"
```

---

## Self-Review notes

- **Spec coverage:** Every N5 sub-claim maps to a task: agent card with capability + input schema + output schema + pricing (T2), `402` → `X-PAYMENT` handshake (T3), A2A envelope parsing for both documented shapes (T4), ASP #6013 `serviceList` populated on-chain (T6). The conformance test (T5) is the protocol-shape analogue of Plan 1's differential guard: it fails the moment served payload and advertised card drift. x402 real settlement is explicitly deferred to Plan 3 (`hasValidPayment` is presence-only with an in-code `// Plan 3` marker so it cannot be mistaken for real verification).
- **Guaranteed on-chain write (covers the "zero guaranteed on-chain writes" scoring weakness):** Task 6 Step 4 performs the ASP #6013 `agent update` (`serviceList` → prod endpoint) as a REQUIRED, VERIFIED deliverable, and Step 5 re-fetches (`onchainos agent get-agents --agent-ids 6013`) and asserts the write landed with the tx hash confirmed on X Layer (chain 196). This guarantees at least ONE genuine on-chain write independent of whether optional Plan 3 (x402 settlement) ships, so the OKX.AI Genesis / X Layer submission is never in a zero-on-chain-writes state.
- **Upstream gating is real, not decorative:** Task 0 is a genuine gate. If Plan 1 is not green, or the trade-API contract forked to Plan-1B honest-demo, the branch selected in `docs/A2MCP-UPSTREAM-RECONCILE.md` changes what Task 4 serves and what Task 2/3 advertise (live-fetch vs honest-demo copy, no overclaim). If reality matches no documented branch, the plan STOPS and is amended before Task 1.
- **No invented protocol fields:** Task 1 is a gated spike. Every agent-card, 402, envelope, and service field is grounded in `okx-ai` (`identity-register` §Step 2 service fields, §"Inbound envelope activation" table) or `okx-agent-payments-protocol` (§A2/A3-Accepts, §A4 accepts shape) or `DEEP-RESEARCH.md` (USDG address, PaymentRequirements literals). Where the live marketplace card shape cannot be probed before deadline, the plan builds to the skill-grounded fallback AND records a Downstream Item.
- **Downstream Items (for the pipeline ledger / Plan 5):**
  1. Re-validate the A2MCP agent-card shape and the `402` `accepts[]` shape against the live OKX.AI marketplace before final submission — this plan built to the skill-grounded fallback if no live probe was available (Task 1 Step 5). Owner: Plan 5 (submission honesty) / whoever has live marketplace access.
  2. Replace `hasValidPayment` presence-check with real `POST /api/v6/x402/verify` + `/settle` — owner: Plan 3.
  3. Confirm the ASP #6013 endpoint URL in the on-chain listing points at the PROD URL, not the auth-walled `alter-ego-demo` — owner: Plan 5.
- **Type consistency:** `buildAgentCard().output` is a JSON Schema mirror of `AnalyzeResponse` (`src/lib/types.ts`); the `POST` analyze path returns `AnalyzeResponse`; the conformance test (T5) compiles the schema and validates the payload, so any type drift fails a test. `A2mcpService` mirrors the exact ASP `serviceList` fields, so the card and the on-chain listing (T6) cannot diverge.
- **Honesty guard:** the `POST` no longer 500s on an empty body (returns the card/showcase), the `_debug` leak is stripped, and no field claims live per-request data if the Task-0 branch is Plan-1B. This keeps the endpoint consistent with the honest `description.md` limitations block that Plan 5 will finalize.
- **Constraints honored:** `runtime="nodejs"` + `maxDuration=60` (Vercel-viable), no em-dashes in card copy, credentials only from `process.env` (the card is public and credential-free), X Layer 196 + USDG `0x4ae46a...2dc8`, ASP #6013, target OKX.AI Genesis. Protocol literals (`x402Version`, `PAYMENT-REQUIRED`, `X-PAYMENT`) kept byte-exact.
- **Assumption to confirm before T1:** that the OKX.AI marketplace accepts an HTTP GET on the registered endpoint URL as the agent-card fetch (vs a dedicated card path). If the marketplace expects a different card-discovery mechanism, Task 2's `GET` wiring and Task 6's listing endpoint must adjust; this is the primary risk the Task 1 probe exists to retire.
