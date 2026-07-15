# Technical Spike — Alter Ego

## Verified Patterns (copy these into Architecture Doc)

| Component | Pattern | Source URL | Confidence |
|-----------|---------|-----------|:---:|
| Wallet auth | `onchainos wallet login <email>` → OTP verify → TEE session key | INTEGRATION-DEEP-DIVE.md §2.1 | HIGH |
| Multi-address portfolio | `onchainos portfolio all-balances --address <addr> --chains "xlayer,solana,ethereum" --filter 1` | INTEGRATION-DEEP-DIVE.md §2.2 | HIGH |
| Leaderboard | `onchainos leaderboard list --chain <chain> --time-frame 3 --sort-by 1` | INTEGRATION-DEEP-DIVE.md §1.1 | HIGH |
| DEX history | `onchainos market portfolio-dex-history` (logged-in) or `--address <addr>` | INTEGRATION-DEEP-DIVE.md §1.2 | HIGH |
| PnL overview | `onchainos market portfolio-overview` → winRate, realizedPnl, top3Tokens | INTEGRATION-DEEP-DIVE.md §1.2 | HIGH |
| Security scan | `onchainos security token-scan --tokens "1:0xtoken1,501:0xtoken2"` → riskLevel, labels | INTEGRATION-DEEP-DIVE.md §2.3 | HIGH |
| Approval check | `onchainos security approvals --address <addr>` → ERC-20/Permit2 approvals | INTEGRATION-DEEP-DIVE.md §2.3 | HIGH |
| Smart money | `onchainos tracker activities --tracker-type smart_money --trade-type 1` | INTEGRATION-DEEP-DIVE.md §1.3 | HIGH |
| ASP registration | `onchainos agent create asp` (interactive, zero-cost, OKX covers fees) | INTEGRATION-DEEP-DIVE.md §3.1 | HIGH |
| ERC-8004 identity | ERC-721 on X Layer: Identity Registry + Reputation Registry + Validation Registry | EIP-8004 spec | HIGH |
| x402 demo mode | `X402_DEMO_MODE=true` → unconditional `next()` bypass in Hono middleware | omnispect-x/src/middleware/x402.ts:104-110 | HIGH |
| x402 PaymentRequirements | `{ scheme: "exact", network: "xlayer", maxAmountRequired, resource, payToAddress, requiredDeadlineSeconds: 300 }` | omnispect-x/src/middleware/x402.ts:112-143 | HIGH |
| x402 facilitator | POST `/api/v6/x402/verify` and `/api/v6/x402/settle` with HMAC-SHA256 headers | omnispect-x/src/middleware/x402.ts:52-62 | HIGH |
| USDG token on X Layer | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` (chain 196) | omnispect-x/src/config.ts:34 | HIGH |

## Verified Gotchas (critical for code correctness)

| # | Gotcha | Source | Impact |
|---|--------|--------|--------|
| 1 | All numeric return fields are Strings — must `parseFloat()` before sorting/comparing | INTEGRATION-DEEP-DIVE | Pattern classifier math |
| 2 | EVM + Solana addresses need SEPARATE `portfolio` calls — mixing fails entire request | INTEGRATION-DEEP-DIVE §2.2 | Multi-wallet ingestion |
| 3 | `leaderboard list --wallet-type` is SINGLE VALUE only (not comma-separated) | INTEGRATION-DEEP-DIVE §1.1 | Leaderboard queries |
| 4 | Portfolio `--chains` max 50 IDs per call | INTEGRATION-DEEP-DIVE §2.2 | Chain list construction |
| 5 | Security scans work WITHOUT wallet login — can audit any public address | INTEGRATION-DEEP-DIVE §2.3 | Demo flexibility |
| 6 | `--filter 1` needed for all tokens including risk (security scanning) | INTEGRATION-DEEP-DIVE §2.2 | Security scan accuracy |
| 7 | `--exclude-risk 0` only works on ETH/BSC/SOL/BASE (filters risky tokens) | INTEGRATION-DEEP-DIVE §2.2 | Token filtering |
| 8 | `portfolio token-balances` max 20 token entries, format `chainIndex:tokenAddress` | INTEGRATION-DEEP-DIVE §2.2 | Token-specific queries |

## Unverified Patterns (use with caution, mark with WARNING in Architecture Doc)

| Component | Pattern | Source URL | Risk |
|-----------|---------|-----------|------|
| wallet history | `onchainos wallet history --chain <chain> [--limit N]` — exact CLI flags unconfirmed | INTEGRATION-DEEP-DIVE §2.4 (marked as "needs confirmation") | May need different flag names |
| ERC-8004 registration CLI | Exact `onchainos agent register-identity` or similar command not confirmed | Pending subagent | May use different CLI surface |
| TEE attestation generation | Exact CLI for generating attestation quote not documented | Speculative | May need manual steps |
| ASP review criteria | What OKX checks during 24h review not publicly documented | N/A | Could cause rejection |

## Assumed / Not Found (need decision trees in Implementation Plan)

| Component | What's Unknown | Fallback Approach |
|-----------|---------------|-------------------|
| OKX API key provisioning | How long after applying at dev-portal do keys arrive? | Use sandbox keys if dev keys delayed. Decision tree in Plan Phase 0. |
| OnchainOS response time for multi-address | How long do 3+ portfolio queries take sequentially? | Pre-cache ALL data before demo recording. Plan must enforce this. |
| ERC-8004 on X Layer testnet | Does ERC-8004 deploy to X Layer mainnet only or testnet available? | If testnet unavailable, register on mainnet with placeholder data. |
| ASP listing update after submission | Can you update ASP details (description, pricing) after submission? | Submit with placeholder text, update after approval. |
| Roast line quality from pre-generation | Will pre-generated roasts feel natural in 90s demo? | Generate 2x needed lines, pick best in editing. Decision tree in Plan. |

## x402 Implementation Pattern (from Omnispect-X reference)

**Complete middleware structure:**
```typescript
// x402Gate() — Hono middleware
// 1. DEMO MODE CHECK: if X402_DEMO_MODE=true → await next(); return;
// 2. HEADER CHECK: if X-Payment header present → verify + settle
// 3. 402 RESPONSE: return PaymentRequirements object with scheme:"exact"
// 4. VERIFICATION: on-chain (viem Transfer events) + OKX facilitator fallback
// 5. SETTLEMENT: fire-and-forget POST /api/v6/x402/settle after await next()
```

**Adaptation for Alter Ego:**
- Keep `X402_DEMO_MODE=true` in `.env` — pure bypass
- Keep `scheme: "exact"`, `network: "xlayer"`, `paymentTokenAddress: 0x4ae46a...` (USDG)
- Add frontend "Simulate Payment" button (Omnispect-X gap — they had no UI for this)
- Demo shows the payment trigger, never executes real settlement
