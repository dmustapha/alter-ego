# X402 Seller-Side Contract (Plan 3 Task 1 spike result)

Date: 2026-07-21. Source: direct introspection of the installed OKX Payment SDK + on-chain reads. x402 is a MANDATORY OKX listing gate (rejection reason 2). Every later task is written against this file.

## Status: PARTIAL PASS, one half BLOCKED by a local network block (see `## Blocked`)

- SDK viability + correct wiring + USDT0 pinning: PROVEN.
- Live 402 emission + real settlement round-trip: BLOCKED locally because `web3.okx.com` (the OKX facilitator host) is unreachable from this dev machine right now (TCP blackholed, `tls=0.000000s`). Not a code fault. Owner decision pending (see bottom).

## Packages (pinned, real)

| Package | Version | Role |
|---|---|---|
| `@okxweb3/x402-next` | 0.1.1 | Next.js App Router seller wrappers (`withX402`, `paymentProxy`) |
| `@okxweb3/x402-core` | ~0.1.0 | `x402ResourceServer`, `OKXFacilitatorClient`, types, header codecs |
| `@okxweb3/x402-evm` | 0.2.1 | `ExactEvmScheme` (server + client), `toClientEvmSigner`, baked token map |
| `@okxweb3/x402-fetch` | 0.1.0 | Payer wrapper `wrapFetchWithPaymentFromConfig` |
| `viem` | ^2.39 | on-chain reads / EIP-3009 signing (dep of x402-evm) |

All are pure JS/TS (viem-based). No native binary, no CLI shell-out, no `/tmp` binary → Vercel Node serverless-safe by construction. (The only raw-Node import failure is `@okxweb3/x402-next` pulling `next/server`, which resolves fine inside Next.js — production route runs inside Next.)

## Seller-side API (SELLER = issues 402 + verifies X-PAYMENT)

Canonical setup (from the x402-next README, verified against the `.d.ts`):

```ts
import { withX402, x402ResourceServer } from "@okxweb3/x402-next";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";

const facilitator = new OKXFacilitatorClient({
  apiKey: process.env.OKX_API_KEY!, secretKey: process.env.OKX_SECRET_KEY!,
  passphrase: process.env.OKX_PASSPHRASE!, syncSettle: true, // wait for on-chain confirm
});
const server = new x402ResourceServer(facilitator).register("eip155:196", new ExactEvmScheme());

export const POST = withX402(
  handler,
  { accepts: { scheme: "exact", network: "eip155:196", payTo: PAYTO, price: "$0.01" },
    description: "Alter Ego wallet analysis" },
  server,
);
```

Lower-level (used to build the plan's `enforceX402(req, resourceUrl)` adapter without `withX402`, and by the spike):
- `server.buildPaymentRequirements({ scheme, network, payTo, price, maxTimeoutSeconds })` → `PaymentRequirements[]` (requires `server.initialize()` first — fetches facilitator `/supported`).
- `server.createPaymentRequiredResponse(requirements, resourceInfo)` → the v2 `PaymentRequired` object.
- `server.processPaymentRequest(payloadOrNull, resourceConfig, resourceInfo)` → `{ success, requiresPayment?, verificationResult?, settlementResult? }`.
- `server.verifyPayment(payload, requirements)` / `server.settlePayment(payload, requirements)`.
- Header codecs from `@okxweb3/x402-core/http`: `encodePaymentRequiredHeader` / `decodePaymentSignatureHeader` (decode client X-PAYMENT) / `encodePaymentResponseHeader` / `decodePaymentResponseHeader`.

## Facilitator (verify + settle — no payer key on the seller)

`OKXFacilitatorClient({ apiKey, secretKey, passphrase, baseUrl?, syncSettle? })`
- Base URL default: `https://web3.okx.com`. Paths: `/facilitator/supported`, `/facilitator/verify`, `/facilitator/settle`, `/facilitator/settle/status`.
- HMAC-SHA256 signed with the SAME OKX creds already in `.env.local` (`OKX_API_KEY/SECRET_KEY/PASSPHRASE`).
- `syncSettle: true` → facilitator waits for on-chain confirmation, returns `status:"success"` (no polling). Default false → `status:"pending"`.
- `SettleResponse`: `{ success, status?: "pending"|"success"|"timeout", transaction, network, amount?, payer? }`.

The seller NEVER holds a payer key — it only issues the 402 and asks the facilitator to verify/settle what the client signed.

## USDT0 token — BAKED INTO THE SDK and confirmed ON-CHAIN

`@okxweb3/x402-evm` `ExactDefaultAssetInfo["eip155:196"]`:
- address: `0x779ded0c9e1022225f8e0630b35a9b54be713736`
- symbol: `USD₮0`, decimals: `6`
- EIP-712 domain: `name: "USD₮0"` (`USD₮0`), `version: "1"`

Confirmed live via X Layer RPC (`https://rpc.xlayer.tech`, chain 196): `symbol() == "USD₮0"`, `decimals() == 6`. So `price: "$0.01"` auto-resolves to USDT0, `amount == "10000"` (0.01 at 6dp). No address is guessed — it comes from the SDK and matches `docs/LISTING-REJECTION-ANALYSIS.md`.

## v2 challenge shape the SDK emits (from schemas + createPaymentRequiredResponse)

```json
{
  "x402Version": 2,
  "resource": { "url": "<resourceUrl>", "description": "Alter Ego wallet analysis", "mimeType": "application/json" },
  "accepts": [
    { "scheme": "exact", "network": "eip155:196",
      "asset": "0x779ded0c9e1022225f8e0630b35a9b54be713736",
      "amount": "10000", "payTo": "<X402_PAYTO_ADDRESS>",
      "maxTimeoutSeconds": 300, "extra": { "name": "USD₮0", "version": "1" } }
  ]
}
```
Delivered base64-encoded in the `PAYMENT-REQUIRED` response header on a 402 (`encodePaymentRequiredHeader`). Byte-exact literals: `x402Version`, `X-PAYMENT`, `PAYMENT-REQUIRED`, `PAYMENT-RESPONSE`.

## Payer-side (spike only — the client that pays)

```ts
import { wrapFetchWithPaymentFromConfig } from "@okxweb3/x402-fetch";
import { ExactEvmScheme, toClientEvmSigner } from "@okxweb3/x402-evm";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { xLayer } from "viem/chains";

const account = privateKeyToAccount(process.env.X402_PAYER_KEY);
const pub = createPublicClient({ chain: xLayer, transport: http() });
const signer = toClientEvmSigner(account, pub);
const fetchWithPay = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: "eip155:196", client: new ExactEvmScheme(signer) }],
});
```
Gasless EIP-3009 / Permit2: the payer signs typed data; the facilitator's relayer settles on-chain. The payer needs USDT0 balance; gas is covered by the relayer (fund a little OKB anyway as insurance).

## On-chain reads confirmed

- USDT0 `symbol()` = `USD₮0`, `decimals()` = 6 on X Layer (chain 196), via `https://rpc.xlayer.tech`.

## Blocked

- `web3.okx.com` and `www.okx.com` are unreachable from this dev machine (TCP blackholed, `tls=0.000000s`, 15-20s timeout), while unrelated HTTPS hosts respond in <1s. This blocks: `server.initialize()` (facilitator `/supported`), so it blocks BOTH a live 402 emission AND a real settlement round-trip from this machine.
- This is a NEW IP-level block (Plan 1 captured live fixtures from `web3.okx.com` earlier today). Environmental, not a code/SDK fault.
- Consequence: the "real settlement round-trip" half of the Task 1 HARD GATE cannot be produced locally right now. It CAN be produced (a) from any environment that can reach `web3.okx.com` (Vercel egress, a VPN, a different network), or (b) at the Plan 3 Task 4 / Task 6 / Plan 8 stage which already run the OKX self-test + live settlement against the deployed Vercel endpoint.

## Gate outcome — PROCEED (owner decision, 2026-07-21)

Dami's call: proceed to build now, prove settlement on Vercel.

- SDK-runs-on-Vercel-Node: PASS (pure JS, no native binary; `withX402` is a Next handler wrapper).
- USDT0 pinned + 6dp on-chain: PASS.
- Facts match `docs/LISTING-REJECTION-ANALYSIS.md`: PASS (SDK bakes them in).
- Real settlement proof: DEFERRED to the Vercel deploy stage (Plan 3 Task 4 OKX curl self-test + Task 6 live settlement + Plan 8 listing gate), where OKX egress works. NOT a simulation — a real tx, just produced from a reachable environment.

Therefore Plan 3 Tasks 2-3 (`enforceX402`) and Plan 2 (agent card / envelope / route / serviceList) are built now against the SDK's real shapes (unit-testable with mocked facilitator). The deferred live proof re-runs `scripts/spike-x402.mjs` (kept, not deleted — it is the real settlement-proof harness) plus the route-level OKX self-test once deployed.

## Deferred-proof harness

`scripts/spike-x402.mjs` — drives the real SDK end to end (pins USDT0 on-chain, emits a real v2 402 via the facilitator, runs one payer round-trip + on-chain settlement). Blocked ONLY by local OKX unreachability. Re-run from Vercel egress / a VPN / a reachable network with `X402_PAYER_KEY` funded to capture the real settlement tx for Plan 3 Task 6 / Plan 8.
