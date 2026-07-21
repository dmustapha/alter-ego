# A2MCP Listing (ASP #6013 serviceList)

The exact service object to write into `serviceList` on the on-chain `agent update`. It is identical
to `buildAgentCard().service` (`src/lib/a2mcp/agent-card.ts`), so the on-chain listing and the served
agent card cannot diverge.

## serviceList service object

```json
{
  "name": "Alter Ego Wallet Analysis",
  "description": "Multi-chain wallet behavior analysis: transaction cadence, gas habits, holdings, and trade patterns, for traders reviewing their own on-chain behavior. Provide 1. one or more wallet addresses 2. the chains to read (ethereum, solana, xlayer).",
  "type": "A2MCP",
  "fee": "1",
  "endpoint": "https://alter-ego-wine-mu.vercel.app/api/a2mcp"
}
```

## Listing checklist (grounded in okx-ai identity-register §Step 2 + §6)

- `name`: 5 to 30 char noun phrase, not the agent name, no price in the name.
- `description`: 2-part (core capability + who it is for, then what the user must provide), no
  em-dashes, no links, no tech-stack, no disclaimers.
- `type`: literal `A2MCP` (API service).
- `fee`: digits only, quoted string, USDT is the default currency (no symbol, no unit in the value).
- `endpoint`: the reachable PROD URL `https://alter-ego-wine-mu.vercel.app/api/a2mcp`, verified 200
  before any on-chain write. NEVER the auth-walled `https://alter-ego-demo.vercel.app/api/a2mcp`
  (that 302-to-SSO wall was rejection Reason 1 in `docs/LISTING-REJECTION-ANALYSIS.md`).

## DEFERRED to deploy stage

The following steps are REQUIRED for the listing but cannot run from this environment now, because
they need both (a) the new `/api/a2mcp` route deployed to PROD and (b) OKX egress
(`web3.okx.com` is TCP-blackholed from this machine, see `docs/X402-CONTRACT.md` §Blocked). The owner
runs them at the deploy stage via the `okx-ai` skill. Nothing here writes on-chain from this repo.

1. Reachability gate: confirm Vercel Deployment Protection is OFF for Production, then
   `curl -sI https://alter-ego-wine-mu.vercel.app/api/a2mcp` returns 200 (or 405), never a 302 to SSO.
2. OKX x402 self-test: `curl -i -X POST https://alter-ego-wine-mu.vercel.app/api/a2mcp -H "content-type: application/json" -d '{"address":"0xabc","chains":["ethereum"]}'`
   returns 402 with a base64 `PAYMENT-REQUIRED` header decoding to the v2 USDT0 / `eip155:196` / 300s
   challenge. (This exercises the real OKX Payment SDK against reachable OKX egress; it fails from
   this machine only because of the network block, not the code.)
3. On-chain `agent update` on ASP #6013: invoke the `okx-ai` skill to write the service object above
   into `serviceList` with `endpoint` = the reachable PROD URL. The skill enforces its own gates
   (pre-flight, confirm card, XLayer-only, never `--chain`). Capture the X Layer transaction hash.
4. Read-back verification: re-fetch the agent, assert `serviceList` is non-empty, the endpoint equals
   the PROD URL, `type` is `A2MCP`, `fee` is digits-only, and the tx hash is confirmed on X Layer
   (chain index 196). Paste the confirmed `serviceList` object and tx hash back into this section.
5. Live protocol probe: run `tests/a2mcp-protocol.spec.ts` against the deployed URL
   (`BASE_URL=https://alter-ego-wine-mu.vercel.app npx playwright test tests/a2mcp-protocol.spec.ts`).

No on-chain write, `onchainos` CLI call, or live Playwright run was performed at this build stage.
