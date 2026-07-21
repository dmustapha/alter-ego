# OKX.AI Listing Rejection — Root-Cause Analysis (Agent #6013)

Date: 2026-07-21
Status on-chain: `approvalDisplayStatus: 5` (Listing rejected, AGAIN), `serviceList: []`, `onlineStatus: 1`, `chainIndex: 196`, `communicationAddress: 0x835C02C82a1DCCe73585D23DFe07A939AB971707`, owner `0xd97c…6340`.

This is the authoritative source of truth for the protocol-conformance corrections. Every plan that touches x402 / A2MCP / A2A must reference these facts (do not re-derive; do not reintroduce the wrong values).

## The three rejection reasons map to three distinct protocol failures

### Reason 1 — "Unable to reach your service endpoint"
Root cause (two compounding faults, both verified 2026-07-21):
- **`serviceList` is empty on-chain.** The agent has NO registered A2MCP service, so the platform has nothing to call.
- **The submitted URL is auth-walled.** `https://alter-ego-demo.vercel.app/api/a2mcp` → `302` to `vercel.com/sso-api` (Vercel deployment protection / SSO). The working, public URL `https://alter-ego-wine-mu.vercel.app/api/a2mcp` → `200`, but it was never registered.
Fix owner: **Plan 2** (register the reachable URL in `serviceList`) + a deployment-protection check.

### Reason 2 — "Has not passed x402 standard validation"
Root cause: the endpoint does not return the OKX-standard x402 v2 challenge, and our plans specify the wrong contract on every field. OKX requires integration via the **OKX Payment SDK** (`@okxweb3/x402-*`), not a hand-rolled 402.
Fix owner: **Plan 3** (corrected + made mandatory) feeding **Plan 2**.

### Reason 3 — "No response from your Agent, task timed out"
Root cause: the **A2A task channel** (XMTP at `communicationAddress`, handled by the `okx-a2a` daemon + AI adapter) did not answer the platform's test message. The daemon was scoped to **presence-only (Scope B)** at session start — heartbeat keeps `onlineStatus: 1`, but nothing runs the AI adapter that delivers a task response. When OKX sent "I would like to use the services of agent ID 6013", it timed out.
Fix owner: **new Plan 7** (full always-on A2A daemon with a working AI adapter).

## Two service surfaces (the agent needs BOTH working)

| Surface | Transport | What it is | Rejection reasons | Fix |
|---------|-----------|------------|-------------------|-----|
| **A2MCP** | HTTP (Vercel `/api/a2mcp`) | Synchronous, x402-gated callable endpoint registered in `serviceList` | 1, 2 | Plan 2 + Plan 3 |
| **A2A** | XMTP (`communicationAddress`) | Async agent/user task chat handled by the `okx-a2a` daemon + AI adapter | 3 | Plan 7 |

## Corrected x402 facts (from OKX `howtomcp`; supersedes DEEP-RESEARCH's USDG)

- **x402 version: 2.** Challenge shape: `{ x402Version: 2, resource: { url, description, mimeType: "application/json" }, accepts: [ ... ] }`.
- **Delivery: base64-encode the challenge into the `PAYMENT-REQUIRED` response header** on an HTTP `402`. Free endpoints return `200` + result; paid endpoints return `402` + `PAYMENT-REQUIRED`.
- **network: `"eip155:196"`** (X Layer), NOT `"xlayer"`.
- **asset: USDT0**, **decimals = 6**, **X Layer address `0x779ded0c9e1022225f8e0630b35a9b54be713736`** (verified from the OKX `howtomcp` doc, 2026-07-21). NOT USDG `0x4ae46a…` and NOT 18 decimals (that was an omnispect-x reference-project error). The Plan 3 SDK spike must re-confirm this address + `decimals()==6` on-chain, but this is the known-correct value.
- **Verified `accepts[0]` entry** (from the OKX doc, use verbatim shape): `{ scheme: "exact", network: "eip155:196", asset: "0x779ded0c9e1022225f8e0630b35a9b54be713736", amount: "10000", payTo: "<ASP X Layer wallet>", maxTimeoutSeconds: 300, extra: { name: "USD₮0", version: "1" } }` (`amount: "10000"` = 0.01 USDT0 at 6 dp; adjust the price as desired). The `extra.name` is the EIP-712 domain name `USD₮0` and `extra.version` is `"1"`.
- **`payTo`** = the ASP payee wallet; **`maxTimeoutSeconds: 300`** (note: field name is `maxTimeoutSeconds`, not `requiredDeadlineSeconds`).
- **OKX Payment SDK: `@okxweb3/x402-*`** (Node.js variant for our Next.js server). It handles issuing the 402 and on-chain verification. Manual fallback (only if the SDK cannot run on Vercel): return a compliant 402 and verify the `X-PAYMENT` header (EIP-3009 signature, amount / nonce / validity, replay protection, settlement). The payer side is already handled by `onchainos payment pay` / `pay-local` (see the okx-agent-payments-protocol skill) — but the LISTING requires the SELLER side (issuing the standard 402), which is the SDK's job.
- **Byte-exact literals** (never rename): `x402Version`, `X-PAYMENT`, `PAYMENT-REQUIRED`.

## OKX's own three tests (this is the listing-readiness gate — Plan 8)

The agent passes review only when ALL THREE pass, verified against the LIVE deployment and the on-chain registration:

1. **Reachability:** the URL in `serviceList` resolves publicly (no Vercel auth wall). `curl -sI <registered-url>` → `200`, not `302`-to-login.
2. **x402 standard:** `curl -i -X POST <registered-url>` on the paid path → `402` with a base64 `PAYMENT-REQUIRED` header decoding to a valid v2 `{x402Version:2, resource, accepts}` (USDT0 / eip155:196). (OKX's exact self-check from `howtomcp`.)
3. **A2A responsiveness:** an OKX.ai user prompt "I would like to use the services of agent ID 6013" (and an `a2a-agent-chat` task envelope to `communicationAddress`) receives a real response from the daemon's AI adapter within the platform timeout, not a timeout.

## Plan changes (what goes where)

- **Plan 2 (A2MCP conformance):** correct the x402 block to the facts above (USDT0/6dp/v2/eip155:196/`PAYMENT-REQUIRED`); register `serviceList` with the reachable `wine-mu` URL; add the OKX `curl -i -X POST` self-check; add a Vercel-deployment-protection-off check.
- **Plan 3 (x402):** remove the "OPTIONAL/stretch" status — it is a MANDATORY listing gate. Rebuild around the `@okxweb3/x402` SDK (spike to pin the seller-side API + USDT0 address). Correct all token/version/network fields. Reorder before submission.
- **NEW Plan 7 (A2A daemon, full):** reverse the presence-only decision. Deploy the full `okx-a2a` daemon (XMTP listener + `task` handling + `ai` adapter) always-on in the cloud, with the AI adapter wired to deliver Alter Ego's analysis, responding to `a2a-agent-chat` + user prompts within the timeout. Supersedes `docs/superpowers/specs/2026-07-20-presence-daemon-fly-design.md` (Scope B → Scope C).
- **NEW Plan 8 (listing-readiness gate, terminal):** the three OKX tests above, run against the live deploy + on-chain registration. NO resubmission until all three are green. This is the hard gate the user requires.
- **Roadmap:** new sequence and the reason→plan mapping; mark x402 mandatory.

## What we got wrong (for the lessons log)
1. Treated x402 as optional; it is a hard listing requirement.
2. Inherited the payment token (USDG, 18dp) from a reference project instead of OKX's spec (USDT0, 6dp).
3. Scoped the A2A daemon to presence-only; the listing needs it to actually answer tasks.
4. Registered/submitted an auth-walled URL and never confirmed the on-chain `serviceList` was populated with a reachable endpoint.
5. Planned to hand-roll x402 instead of the OKX Payment SDK, which is what "x402 standard validation" checks.
