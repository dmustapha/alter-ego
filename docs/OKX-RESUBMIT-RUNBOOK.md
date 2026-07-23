# OKX Resubmit Runbook (agent #6013)

The single ordered path from the current state to a clean resubmission. Every step
is gated: do not advance until the prior step's verify block passes. No em-dashes
(standing rule). Authoritative facts come from `docs/LISTING-REJECTION-ANALYSIS.md`
and the live on-chain read, not from memory.

## Current state (verified 2026-07-22)

- On-chain `serviceList` is `[]` (empty). The agent has no registered endpoint, so
  OKX could not reach it. This is the primary rejection.
- Rejection remark covers all three OKX tests: (1) endpoint unreachable, (2) x402
  standard not passed, (3) A2A task timed out with no response.
- The live `wine-mu` deploy is STALE: `POST /api/a2mcp` returns HTTP 200 with the old
  fabricated cache (`totalTxns: 4463`, `gapCostUsd: 31500`, fake PnL). It does NOT
  return a 402. All honesty fixes (cache regen to 113, x402 gate, copy pass) are
  local commits only; production is a pre-Plan-1 build.
- `onchainos` CLI (v4.2.4) reaches the chain fine from this machine. Only
  `web3.okx.com` (the app data API + dev portal) is TCP-blackholed locally, which is
  why live `/api/analyze` must run its OKX calls from Vercel, not this laptop.

## Why this order

Registering the endpoint before the deploy is truthful would re-earn the same
rejection (OKX would test a lying, 200-not-402 endpoint). The A2A daemon must exist
before Test 3 can pass. So: make production true, prove it reachable and 402, stand
up the daemon, register, then gate and resubmit.

---

## Step 1: Redeploy wine-mu at current HEAD  [needs your Vercel auth]

The keystone. Flips production from the fabricated pre-Plan-1 build to the honest
current HEAD.

### 1a. Guard `.env.local` before any vercel command (funds-key clobber rule)

`vercel link` / `vercel env pull` can overwrite `.env.local`. Move it out first,
restore after.

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
cp -p .env.local /tmp/alter-ego.env.local.bak 2>/dev/null && echo "backed up .env.local" || echo "no .env.local present"
```

### 1b. Deploy (you run this via the `!` prefix so auth is interactive)

```bash
! cd /Users/MAC/hackathon-toolkit/active/alter-ego && vercel --prod
```

### 1c. Restore `.env.local` immediately after

```bash
[ -f /tmp/alter-ego.env.local.bak ] && cp -p /tmp/alter-ego.env.local.bak .env.local && echo "restored" || echo "nothing to restore"
```

### Verify (do not advance until both pass)

```bash
# demo path must now report the real cache sum, not 4463
curl -s -X POST https://alter-ego-wine-mu.vercel.app/api/a2mcp \
  -H 'content-type: application/json' \
  -d '{"msgType":"a2a-agent-chat","jobId":"verify","message":"x"}' | grep -o '"totalTxns":[0-9]*'
# expect: "totalTxns":113   (FAIL if 4463)
```

Note: whether `/api/a2mcp` returns 402 vs 200 here depends on Step 2 (the paid path
needs `X402_PAYTO_ADDRESS` set). Confirm the 402 in Step 2's verify, not here.

---

## Step 2: Set OKX + x402 env vars on Vercel  [needs your secrets]

Without these, live `/api/analyze` runs in live mode with unset credentials and
silently returns empty (`totalTxns: 0`), and the x402 gate has no payTo so it cannot
issue a real 402.

### Required env vars (Production scope)

| Var | Purpose | Value source |
|-----|---------|--------------|
| `OKX_API_KEY` | OnchainOS REST auth | OKX dev portal (your secret) |
| `OKX_SECRET_KEY` | OnchainOS REST signing | OKX dev portal (your secret) |
| `OKX_PASSPHRASE` | OnchainOS REST auth | OKX dev portal (your secret) |
| `X402_PAYTO_ADDRESS` | 402 challenge payTo | your X Layer receive address |
| `A2MCP_PAYTO_ADDRESS` | agent-card pricing payTo | same as above (or dedicated) |
| `A2MCP_ENDPOINT_URL` | agent-card self URL | `https://alter-ego-wine-mu.vercel.app/api/a2mcp` |
| `DEMO_MODE` | keep demo flow deterministic for judges | `true` (recommended for the listing) |

Committed defaults already correct, override only if needed: `X402_PRICE=$1`,
`X402_AMOUNT_ATOMIC=1000000` (1 USDT0 at 6dp), `X402_FEE_USDT=1`, x402 token USDT0
`0x779ded0c9e1022225f8e0630b35a9b54be713736` on `eip155:196`.

### Set them (you run via `!`, interactive)

```bash
! cd /Users/MAC/hackathon-toolkit/active/alter-ego && vercel env add X402_PAYTO_ADDRESS production
# repeat per var, then redeploy so they take effect:
! cd /Users/MAC/hackathon-toolkit/active/alter-ego && vercel --prod
```

Re-run the `.env.local` guard (1a / 1c) around any `vercel env` call.

### Verify: the paid path now issues a standard 402

```bash
curl -i -s -X POST https://alter-ego-wine-mu.vercel.app/api/a2mcp \
  -H 'content-type: application/json' \
  -d '{"msgType":"a2a-agent-chat","jobId":"probe","message":"analyze 0x0000000000000000000000000000000000000001"}' \
  | grep -iE '^HTTP|^PAYMENT-REQUIRED'
# expect: HTTP/2 402  AND a PAYMENT-REQUIRED: <base64> header
```

If `DEMO_MODE=true` is intentional for judges, confirm the paid A2MCP surface still
returns 402 for unpaid task calls (the payment gate is separate from demo data). If
the gate is bypassed under demo mode, that is a code decision to resolve before
registering.

---

## Step 3: Build + deploy the Plan 7 A2A daemon  [code build, then a host]

The only remaining code gap. OKX Test 3 sends a task and the OKX.ai user prompt to
`communicationAddress 0x835C02C82a1DCCe73585D23DFe07A939AB971707` over XMTP and needs
a real, non-empty analysis reply within 300s. There is currently no always-on
listener there, so Test 3 times out.

- Plan file: `docs/superpowers/plans/2026-07-21-a2a-daemon-full.md`
- Scope: always-on `okx-a2a` daemon + AI adapter that answers `a2a-agent-chat` task
  envelopes and the literal user prompt "I would like to use the services of agent ID
  6013" with real Alter Ego persona analysis (not a heartbeat).
- Deploy target: a persistent host (Fly.io), not Vercel serverless (the listener must
  stay connected to XMTP).

### Verify

```bash
onchainos agent get-agents --agent-ids 6013 | jq '{onlineStatus, communicationAddress}'
# expect onlineStatus: 1 once the daemon is up
```

Full response proof comes from Gate 3 in Step 5.

---

## Step 4: Register the serviceList on-chain  [runnable from here, CLI egress works]

`serviceList` is `[]` today. Register the reachable wine-mu A2MCP endpoint. This is
the fix for OKX Test 1. Never register `alter-ego-demo` (auth-walled 302).

```bash
onchainos agent update --agent-id 6013 --service '[{
  "operation":"create",
  "serviceName":"Alter Ego persona analysis",
  "serviceDescription":"On-chain trading persona + roast battle from wallet history",
  "serviceType":"A2MCP",
  "fee":"1",
  "endpoint":"https://alter-ego-wine-mu.vercel.app/api/a2mcp"
}]'
```

### Verify

```bash
onchainos agent get-agents --agent-ids 6013 | jq '[.. | .serviceList? // empty] | add'
# expect one entry, endpoint = https://alter-ego-wine-mu.vercel.app/api/a2mcp, type A2MCP
```

---

## Step 5: Run Plan 8 gates, then resubmit  [terminal, guarded]

Plan: `docs/superpowers/plans/2026-07-21-listing-readiness-gate.md`. Scripts are
pre-written under `scripts/gate/` (see Step-2/3/4 must be done first, or they FAIL by
design). Run in order, stop on the first FAIL and route per the plan's Task 0 table.

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
./scripts/gate/gate1-reachability.sh | tee docs/listing-gate/gate1-reachability.md   # Test 1
./scripts/gate/gate2-x402.sh          | tee docs/listing-gate/gate2-x402.md          # Test 2
node scripts/gate/gate3-a2a.mjs       | tee docs/listing-gate/gate3-a2a.md           # Test 3
```

Product-readiness checklist (differential green vs live, no live 500, honest copy,
demo present) then the all-gates-green precondition, then the terminal resubmit:

```bash
onchainos agent activate --agent-id 6013
onchainos agent get-agents --agent-ids 6013 | jq '{approvalDisplayStatus, onlineStatus, serviceList}'
# expect approvalDisplayStatus off 5 (rejected) into pending/under-review
```

NO resubmission until every gate is green (standing directive). The resubmit is the
only external-state change in this runbook and is physically guarded by the
all-gates-green precondition in Plan 8 Task 5.

---

## Blocked-vs-runnable summary

| Step | Runnable from here now | Needs you |
|------|------------------------|-----------|
| 1 Redeploy | no | Vercel auth (`! vercel --prod`) |
| 2 Env vars | no | OKX + x402 secrets |
| 3 Daemon build | yes (code) | a Fly.io host + deploy |
| 4 serviceList register | yes (CLI egress works) | your go-ahead (mutates chain) |
| 5 Gates + resubmit | yes to run gates | your go-ahead on the terminal resubmit |
