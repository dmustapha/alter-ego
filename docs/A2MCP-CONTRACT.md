# A2MCP Contract (Plan 2 Task 1 spike result)

Date: 2026-07-21. Sources: the `okx-ai` skill (`identity-register.md` §Step 2 service fields + §6
endpoint rules, SKILL §"Inbound envelope activation" table), the `okx-agent-payments-protocol`
skill (402 handshake), `docs/X402-CONTRACT.md` (the OKX Payment SDK seller-side spike, AUTHORITATIVE
for x402 literals), and `docs/LISTING-REJECTION-ANALYSIS.md` (AUTHORITATIVE corrected x402 facts).

This file documents the shapes the endpoint builds to. No field is invented: every one is grounded
in a skill or an authoritative doc above.

## Probe status

No live A2MCP agent-card endpoint was reachable from this machine before the deadline
(`web3.okx.com` is TCP-blackholed here, see `docs/X402-CONTRACT.md` §Blocked). Therefore this
contract is the SKILL-GROUNDED fallback shape. Downstream Item: re-validate the agent-card shape and
the 402 `accepts[]` shape against the live OKX.AI marketplace before final submission (owner: the
submission-honesty pass / whoever has live marketplace egress).

## 1. Agent-card JSON shape (served on `GET /api/a2mcp`)

A static, deterministic document. No wallet, no network, no credentials (the card is PUBLIC).

```json
{
  "name": "Alter Ego",
  "description": "Multi-chain wallet behavior analysis for traders who want to understand their on-chain habits. Provide one or more wallet addresses plus the chains to read.",
  "capabilities": ["wallet-behavior-analysis", "multi-chain-persona", "trade-pattern-classification"],
  "input": { "$schema": "...", "type": "object", "properties": { "addresses": { ... } } },
  "output": { "$schema": "...", "type": "object", "properties": { "wallets": {}, "chains": {}, "totalTxns": {}, "patterns": {}, "personas": {}, "comparison": {} } },
  "pricing": {
    "scheme": "exact",
    "network": "eip155:196",
    "asset": "0x779ded0c9e1022225f8e0630b35a9b54be713736",
    "amount": "1000000",
    "payTo": "<ASP payout address, env-driven>",
    "maxTimeoutSeconds": 300
  },
  "service": {
    "name": "Alter Ego Wallet Analysis",
    "description": "Multi-chain wallet behavior analysis: transaction cadence, gas habits, holdings, and trade patterns, for traders reviewing their own on-chain behavior. Provide 1. one or more wallet addresses 2. the chains to read (ethereum, solana, xlayer).",
    "type": "A2MCP",
    "fee": "1",
    "endpoint": "https://alter-ego-wine-mu.vercel.app/api/a2mcp"
  }
}
```

Field grounding (`identity-register.md` §Step 2 + §6):

- `service.name`: 5 to 30 char noun phrase, not the agent name, no price in the name.
- `service.description`: 2-part, (1) core capability + who it is for, (2) what the user must
  provide. No em-dashes, no links, no tech-stack, no disclaimers, each part <=200 CJK chars.
- `service.type`: literal `A2MCP` for an API service.
- `service.fee`: plain number sent as a quoted string, digits only, USDT is the default currency
  (no symbol, no unit in the value). Here `"1"` (1 USDT0).
- `service.endpoint`: publicly reachable `https://` URL, <=512 chars. The PROD URL
  `https://alter-ego-wine-mu.vercel.app/api/a2mcp`, NEVER the auth-walled `alter-ego-demo`.
- `capabilities[]`: grounded in the real routes and classifier, not aspiration.
- `input` / `output`: hand-written JSON Schemas mirroring `AnalyzeRequest` / `AnalyzeResponse`
  (`src/lib/types.ts`). `output` MUST include `patterns` and `personas` keys.
- `pricing`: the x402 `exact` block; `asset` is the SDK-pinned USDT0 X Layer address,
  `amount` is the fee in USDT0 atomic units (6 decimals): 1 USDT0 = `1000000`.

## 2. The 402 challenge shape (issued by the OKX Payment SDK, NOT hand-rolled)

The seller-side 402 is produced by `enforceX402` in `src/lib/x402/okx-x402.ts` (the OKX Payment SDK
wrapper). The endpoint CALLS it and does not re-derive any field. The exact shape is documented in
`docs/X402-CONTRACT.md` §"v2 challenge shape the SDK emits" and is AUTHORITATIVE there. Summary:

- HTTP `402` carrying a base64-encoded JSON challenge in the `PAYMENT-REQUIRED` response header.
- `{ x402Version: 2, resource: { url, description, mimeType: "application/json" }, accepts: [ <PaymentRequirements> ] }`.
- `accepts[0]` = `{ scheme: "exact", network: "eip155:196", asset: "0x779ded0c9e1022225f8e0630b35a9b54be713736", amount/maxAmountRequired (digits), payTo, maxTimeoutSeconds: 300, extra: { name: "USD₮0", version: "1" } }`.
- Byte-exact literals never renamed: `x402Version`, `X-PAYMENT`, `PAYMENT-REQUIRED`, `PAYMENT-RESPONSE`.

## 3. The two inbound A2A envelope shapes + our ack

Copied verbatim from the `okx-ai` SKILL §"Inbound envelope activation" table.

1. System event: `{ agentId, message: { source: "system", event, jobId, ... } }`.
2. Agent-chat: `{ msgType: "a2a-agent-chat", jobId, sender: { role }, ... }` (fields at top level;
   `sender.role` is the COUNTERPARTY, not us).

Envelope shape wins over any analyze-body detection. On receiving either, this endpoint MUST
recognise the shape (not treat it as an analyze body) and return a well-formed acknowledgement,
deferring the actual task lifecycle to the OKX AI agent runtime (this endpoint is the ASP listing
target, not a task executor in this plan). Our ack:

```json
{ "jobId": "<echoed>", "agentId": "<echoed>", "status": "acknowledged",
  "note": "Task lifecycle handled by the OKX AI agent runtime; this endpoint is the ASP listing target." }
```

No payment is demanded for an envelope ack.

## 4. The ASP #6013 serviceList service object

The exact object written into `serviceList` on the on-chain `agent update` (the on-chain write is
DEFERRED to the deploy stage, see `docs/A2MCP-LISTING.md`). It is identical to
`buildAgentCard().service`, so the card and the on-chain listing cannot diverge:

```json
{
  "name": "Alter Ego Wallet Analysis",
  "description": "Multi-chain wallet behavior analysis: transaction cadence, gas habits, holdings, and trade patterns, for traders reviewing their own on-chain behavior. Provide 1. one or more wallet addresses 2. the chains to read (ethereum, solana, xlayer).",
  "type": "A2MCP",
  "fee": "1",
  "endpoint": "https://alter-ego-wine-mu.vercel.app/api/a2mcp"
}
```

The endpoint is the reachable PROD URL (`alter-ego-wine-mu`), verified 200 before any on-chain
write, NEVER the auth-walled `alter-ego-demo` (`docs/LISTING-REJECTION-ANALYSIS.md` Reason 1).
