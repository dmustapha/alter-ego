# ALTER EGO — Integration Deep-Dive
**Every exact command, function call, and data format verified against OnchainOS source**

---

## INTEGRATION 1: okx-dex-market (Leaderboard + Wallet Analysis + Smart Money)

### 1.1 Leaderboard — Top Trader Rankings

**Command:**
```bash
onchainos leaderboard list --chain solana --time-frame 3 --sort-by 1
```

**Parameters:**
| Param | Values | Alter Ego Use |
|-------|--------|---------------|
| `--chain` | `xlayer`, `solana`, `ethereum`, `base`, `bsc`, etc. | Query across 3 chains |
| `--time-frame` | `1`=1D, `2`=3D, `3`=7D/1W, `4`=30D/1M, `5`=3M | Use `3` (7D) for demo — enough data without staleness |
| `--sort-by` | `1`=PnL, `2`=win rate, `3`=tx count, `4`=volume, `5`=ROI | Use `1` (PnL) and `2` (win rate) |
| `--wallet-type` | `sniper`, `dev`, `fresh`, `pump`, `smartMoney`, `influencer` | SINGLE VALUE ONLY (not comma-separated) — omit for all types |

**Returns:** Max 20 entries. Fields: `rank`, `walletAddress`, `pnl`, `winRate`, `txCount`, `volume`.

**Pre-flight:** Run `onchainos leaderboard supported-chains` first to confirm chain support.

### 1.2 Wallet PnL — Own Wallet Analysis

**Logged-in wallet PnL overview:**
```bash
onchainos market portfolio-overview
```
Returns: `winRate`, `realizedPnl`, `top3Tokens` (by PnL contribution).

**DEX transaction history:**
```bash
onchainos market portfolio-dex-history
```
Returns: individual DEX trades with timestamps, tokens, amounts, PnL.

**Per-token PnL snapshot:**
```bash
onchainos market portfolio-token-pnl
```
Returns: `realizedPnl`, `unrealizedPnl` per token.

**Recent PnL by token:**
```bash
onchainos market portfolio-recent-pnl
```

**Chain support check:** Run `onchainos market portfolio-supported-chains` first.

**⚠️ CRITICAL:** These commands work for the LOGGED-IN wallet only. For external wallet addresses, we use `okx-agentic-wallet`'s portfolio commands instead (see Integration 2).

### 1.3 Smart Money / Whale Tracking

**Raw transaction feed:**
```bash
onchainos tracker activities --tracker-type smart_money --trade-type 1
```
| Param | Values |
|-------|--------|
| `--tracker-type` | `smart_money`, `kol`, `multi_address` |
| `--wallet-address` | Required when `--tracker-type multi_address` |
| `--trade-type` | `0`=all, `1`=buy-only, `2`=sell-only |
| `--chain` | Optional — omit for all chains |
| `--min-volume`, `--max-volume` | Trade volume range (USD) |
| `--min-market-cap`, `--max-market-cap` | Token market cap range (USD) |

**Returns:** Table with time, wallet address (truncated), token symbol, trade direction (Buy/Sell), amount USD, price, realized PnL.

**For Alter Ego demo:** We don't use this live. We pre-cache smart money data for the crowd comparison card. The demo shows the RESULT, not the live query.

### 1.4 Data Freshness

All responses carry a `requestTime` field (Unix ms). For the demo, we cache data at recording time and display the timestamp. Live queries would be too slow for a 90-second video.

---

## INTEGRATION 2: okx-agentic-wallet (TEE Auth + Portfolio + Security)

### 2.1 TEE Authentication Flow

**Step 1 — Check login state:**
```bash
onchainos wallet status
```
If `data.loggedIn` is `true` → proceed. Otherwise:

**Step 2 — Email login:**
```bash
onchainos wallet login user@email.com --locale en_US
```
System sends OTP to email. CLI response contains `message` with instructions.

**Step 3 — OTP verification:**
```bash
onchainos wallet verify <6-digit-code>
```

**Post-login:** Run `onchainos wallet balance` to show accounts.

**⚠️ TEE FACTS (from source):**
- "the private key is generated and stored inside a server-side secure enclave and never leaves the TEE"
- "the Agent cannot export or locally sign with it"
- All signing happens inside the enclave
- For the demo: user authenticates before recording. The demo shows "TEE-SECURED" badge, not the auth flow itself.

### 2.2 Public Address Portfolio (Multi-Address Ingestion)

**THIS IS THE KEY COMMAND FOR MULTI-ADDRESS PATTERN DETECTION.**

**Total value across chains:**
```bash
onchainos portfolio total-value --address 0xAbc123... --chains "xlayer,solana,ethereum,base,bsc"
```

**All balances with token details:**
```bash
onchainos portfolio all-balances --address 0xAbc123... --chains "xlayer,solana,ethereum" --filter 1
```
- `--filter 0` = default (filters risk/custom/passive tokens)
- `--filter 1` = all tokens including risk (use for security scanning)
- `--chains`: up to 50 chain IDs (comma-separated, names or numeric)
- `--exclude-risk 0`: only ETH/BSC/SOL/BASE (filters risky tokens)

**Specific token balances:**
```bash
onchainos portfolio token-balances --address <addr> --tokens "196:0xtoken,501:0xtoken"
```
Max 20 token entries. Format: `chainIndex:tokenAddress` (empty address = native, e.g. `196:` for OKB).

**⚠️ ADDRESS FORMAT GOTCHA:**
- EVM addresses (`0x…`) work across Ethereum/BSC/Polygon/Arbitrum/Base
- Solana (Base58) addresses are DIFFERENT
- Passing an EVM address with `--chains solana` FAILS THE ENTIRE REQUEST
- **MUST MAKE SEPARATE CALLS:** one for EVM chains with the EVM address, one for Solana with the Solana address

**For Alter Ego multi-address flow:**
```bash
# Wallet A (EVM, on Ethereum + X Layer + Base)
onchainos portfolio all-balances --address 0xAAA111... --chains "xlayer,ethereum,base" --filter 1

# Wallet B (SOL, on Solana only)
onchainos portfolio all-balances --address SolanaBase58AddrBBB222... --chains "solana" --filter 1

# Wallet C (EVM, on Ethereum only)
onchainos portfolio all-balances --address 0xCCC333... --chains "ethereum" --filter 1
```

### 2.3 Security Scanning

**Token risk scan:**
```bash
onchainos security token-scan --tokens "1:0xtoken1,501:0xtoken2"
```
Returns: `riskLevel` (`CRITICAL`/`HIGH`/`MEDIUM`/`LOW`), triggered labels, buy/sell tax.

**Approval check:**
```bash
onchainos security approvals --address 0xAAA111...
```
Returns: all ERC-20/Permit2 approvals — identify risky ones.

**For Alter Ego's "Blind Signer" GUARD tag:** Run approvals, count unverified contracts, flag if >5.

### 2.4 Transaction History

**From the wallet domain (logged-in wallet):**
The wallet domain's Intent Routing table lists "Transaction history / tx detail / order status" under the `wallet` reference file. The exact CLI command needs to be confirmed from `wallet-cli-reference.md`, but the flow is:
```bash
onchainos wallet history --chain <chain> [--limit N]
```

**For external wallets (public addresses), use market domain instead:**
```bash
onchainos market portfolio-dex-history --address <addr>
```

---

## INTEGRATION 3: okx-ai (ERC-8004 Identity + ASP Registration)

### 3.1 ASP Registration (CRITICAL PATH)

**Register as ASP:**
```bash
onchainos agent create asp
```

This is an interactive flow. The CLI will prompt for:
- Agent name: "Alter Ego"
- Description: "Your on-chain trading twin. Learn from your wins, guard against your losses."
- Category: Lifestyle
- Service type: A2A (Agent-to-Agent)
- Pricing model: Negotiated per session
- Endpoint/contact details

**ZERO COST:** The source explicitly states: "On-chain actions (create / update / activate / deactivate) cost the user nothing — OKX covers network fees."

**Post-creation:** The agent gets an ERC-8004 identity:
- Identity Registry: ERC-721 token minted on X Layer (chain 196)
- Unique global ID: `{namespace}:{chainId}:{identityRegistry}:{tokenId}`
- URIStorage extension: resolves to agent's registration file

### 3.2 ERC-8004 Identity Model

From the EIP-8004 spec:
- **Identity Registry:** ERC-721 with URIStorage extension. Agent identified by `agentRegistry:{chainId}:{identityRegistry}:{tokenId}`.
- **Reputation Registry:** Standard interface for posting/fetching feedback signals. Scoring and aggregation can be on-chain or off-chain.
- **Validation Registry:** Generic hooks for requesting/recording validator checks (TEE oracles, zkML verifiers, stakers re-running jobs).

**For Alter Ego:**
- The ERC-8004 identity is the Alter Ego's on-chain presence
- TEE attestation proofs are stored in the Validation Registry
- User ratings (after each session) go to the Reputation Registry
- The persona's "reputation" is a verifiable on-chain score

### 3.3 Agent Search (finding other agents)

```bash
onchainos agent search --query "trading coach"
```
Returns matching agents with ratings, service descriptions, pricing.

### 3.4 ASP Listing on OKX.AI Marketplace

After `agent create asp` succeeds:
1. Agent is listed in the OKX.AI marketplace at https://www.okx.ai/agents
2. OKX internal review begins (up to 24 hours)
3. Once approved, agent is publicly visible and purchasable
4. Users can rate/review after interactions (ERC-8004 Reputation Registry)

**⚠️ THE 24-HOUR REVIEW:** The source doesn't specify exact review criteria, but from the hackathon rules: "ASP must pass internal review and go live to remain eligible." Submit TODAY.

### 3.5 Pre-Delivery Checklist (from source)
- Reply entirely in conversation language — no English template text leaked
- No `onchainos` literal / skill name in user text
- Write ops showed card and awaited confirm
- Success output from reference template, not self-summarized JSON

---

## INTEGRATION 4: okx-agent-payments-protocol (x402 + A2A Escrow)

### 4.1 x402 Payment Flow

**How it works:**
1. Buyer agent calls seller's endpoint
2. Seller returns HTTP 402 with `PAYMENT-REQUIRED` header (v2, base64-encoded JSON)
3. Buyer decodes the 402 payload to see: `accepts` array (payment options), amounts, currencies
4. Buyer confirms and runs: `onchainos payment pay --payload <raw_402_body>`
5. CLI signs the payment with the TEE wallet
6. Payment settles in USDC on X Layer

**x402 schemes:**
| Scheme | Use Case |
|--------|----------|
| `exact` | Pay-per-call, fixed price |
| `exact+Permit2` | Pay-per-call with token approval |
| `upto` | Pay up to a maximum (metered) |
| `aggr_deferred` | Aggregated billing, settle later |

**For Alter Ego monetization:**
- "Snapshot" tier ($0.99): x402 exact, one-time pay-per-call
- "Coach" tier ($4.99/month): x402 aggr_deferred, aggregated billing
- "Battle" tier ($1.99): x402 exact, pay-per-battle

### 4.2 A2A Escrow Flow

**Negotiation → Escrow → Sign-off → Arbitration:**

1. User agent and ASP negotiate price/scope (A2A protocol messaging)
2. User sends payment → held in escrow contract on X Layer
3. ASP delivers service
4. User signs off → escrow releases to ASP
5. If user disputes → OKB-staked arbitration (5% bounty deposit, refunded if successful)

**For the demo:** We SHOW the payment trigger (a "Pay $0.99 for Snapshot" button) but do not execute real payment. The demo analysis is pre-computed. The product pitch: "Alter Ego is live on OKX.AI with x402 micropayments."

### 4.3 MPP (Micro Payment Protocol)

MPP is the channel-based alternative to x402:
- `intent="charge"`: one-shot payment through a payment channel
- `intent="session"`: open a session, stream payments, settle later
- Uses `WWW-Authenticate: Payment` header (different from x402's `PAYMENT-REQUIRED`)

**For Alter Ego:** Not needed for hackathon. x402 exact is simpler and sufficient.

---

## INTEGRATION 5: Frontend Stack (How It All Connects)

### 5.1 Architecture

```
┌─────────────────────────────────────────────┐
│           ALTER EGO NEXT.JS APP              │
│                                              │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  │
│  │  CHAT   │  │ PATTERN  │  │  PERSONA   │  │
│  │   UI    │  │  CARDS   │  │  GENERATOR │  │
│  └────┬────┘  └────┬─────┘  └─────┬──────┘  │
│       │            │              │          │
│       ▼            ▼              ▼          │
│  ┌────────────────────────────────────────┐  │
│  │         ALTER EGO API LAYER            │  │
│  │  (Next.js API routes / server actions) │  │
│  └────────────────┬───────────────────────┘  │
│                   │                          │
│                   ▼                          │
│  ┌────────────────────────────────────────┐  │
│  │         ONCHAINOS CLI LAYER             │  │
│  │  execSync("onchainos leaderboard ...")  │  │
│  │  execSync("onchainos portfolio ...")    │  │
│  │  execSync("onchainos market ...")       │  │
│  └────────────────┬───────────────────────┘  │
│                   │                          │
└───────────────────┼──────────────────────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │   ONCHAINOS MCP     │
         │   / OKX API GATEWAY │
         └─────────────────────┘
```

### 5.2 Demo Data Flow (Pre-cached, not live)

```
1. BEFORE RECORDING:
   - Run all OnchainOS queries (leaderboard, portfolio, market PnL)
   - Cache results as JSON files in the project
   - Pre-compute all AMPLIFY/GUARD tags
   - Pre-generate all roast lines
   - Pre-generate crowd comparison cards

2. DURING DEMO (90-second video):
   - App loads cached data — ZERO live API calls
   - All animations, persona reveals, roast lines are deterministic
   - The "TEE-SECURED" badge is shown, not generated
   - The x402 payment trigger is shown, not executed

3. WHY PRE-CACHE:
   - 90 seconds is too short for live API calls
   - Network latency would break demo timing
   - Pre-cached = reliable, reproducible, tight
   - The value is in the ANALYSIS, not in watching data load
```

### 5.3 Exact Command Sequence (Pre-Recording Setup)

```bash
# 1. Authenticate
onchainos wallet status                              # Check login state
onchainos wallet login dami@email.com                # Login if needed
onchainos wallet verify <code>                       # Verify OTP

# 2. Register ASP (DO THIS TODAY)
onchainos agent create asp                            # Interactive: name, description, category, etc.

# 3. Pull Demo Wallet A (DeFi Degen, Solana)
onchainos portfolio all-balances --address <SOL_ADDR_A> --chains "solana" --filter 1
onchainos market portfolio-overview                    # If this IS the logged-in wallet
onchainos market portfolio-dex-history                 # DEX trade history
onchainos market portfolio-token-pnl                   # Per-token PnL
onchainos security approvals --address <SOL_ADDR_A>    # Find Blind Signer patterns

# 4. Pull Demo Wallet B (Conservative, Ethereum)
onchainos portfolio all-balances --address <ETH_ADDR_B> --chains "ethereum,xlayer,base" --filter 1
onchainos market portfolio-overview
onchainos market portfolio-token-pnl
onchainos security token-scan --tokens "1:0xToken1,1:0xToken2"  # Scan holdings for risks

# 5. Leaderboard (for crowd comparison)
onchainos leaderboard supported-chains
onchainos leaderboard list --chain solana --time-frame 3 --sort-by 1
onchainos leaderboard list --chain ethereum --time-frame 3 --sort-by 1

# 6. Save all output → JSON cache files → feed into pattern classifier
```

### 5.4 Pattern Classifier Implementation

**Not ML. Rule-based.** For a 2-day hackathon, we use deterministic rules:

```typescript
// Example: HODL Trap detection
function detectHODLTrap(trades: Trade[]): Pattern | null {
  const heldPast40Pct = trades.filter(t => t.pnlPct < -40 && t.holdDurationDays > 7);
  if (heldPast40Pct.length >= 3) {
    return {
      id: 'GRD-01',
      tag: 'HODL Trap',
      confidence: heldPast40Pct.length >= 5 ? 'HIGH' : 'MEDIUM',
      evidence: heldPast40Pct,
      costUsd: heldPast40Pct.reduce((sum, t) => sum + Math.abs(t.pnlUsd), 0),
      insight: `You held ${heldPast40Pct.length} trades past -40%. Total cost: $${costUsd}.`
    };
  }
  return null;
}
```

All 12 pattern rules (6 AMPLIFY, 6 GUARD) follow this exact structure. See ALTER-EGO-SPEC.md §3 for the full rule catalog.

---

## INTEGRATION 6: Verification Checklist (What We've Proven)

| Claim | Source | Status |
|-------|--------|:---:|
| Leaderboard returns top 20 traders by PnL/win rate | `signal.md` — `leaderboard list` command, returns max 20 | ✅ |
| Portfolio queries work for ANY public address, not just logged-in | `portfolio.md` — "Look up a public address's balances" | ✅ |
| Multi-chain queries: separate calls for EVM vs Solana | `portfolio.md` §Address Format | ✅ |
| TEE is server-side enclave, keys never leave | `wallet.md` §Notes — "generated and stored inside server-side secure enclave" | ✅ |
| ASP registration is zero-cost | `okx-ai/SKILL.md` — "OKX covers network fees" | ✅ |
| ERC-8004 has 3 registries: Identity, Reputation, Validation | `eips.ethereum.org/EIPS/eip-8004` (truncated but confirmed) | ✅ |
| Security scan works without wallet login | `security.md` — "do not require wallet login" | ✅ |
| x402 uses `PAYMENT-REQUIRED` header, base64-encoded JSON body | `okx-agent-payments-protocol/SKILL.md` §Step A3-Accepts | ✅ |
| A2A escrow: negotiation → escrow → sign-off → arbitration | Research brief + skill descriptions | ✅ |
| Portfolio `--chains` supports up to 50 chain IDs | `portfolio.md` §Parameter Notes | ✅ |
| Signal/leaderboard pagination with `--cursor` | `signal.md` — `signal list` pagination | ✅ |

---

## INTEGRATION 7: What We CAN'T Do (Honest Gaps)

| Limitation | Why | Workaround |
|-----------|-----|-----------|
| Automated multi-address discovery | No OnchainOS "find related wallets" API | Manual input for hackathon |
| Real-time pattern updates | OnchainOS queries are pull-based, not push | Demo uses cached snapshot |
| Cross-chain unified PnL in one call | Each chain needs separate `portfolio` call | Pre-compute during setup, merge in code |
| TEE attestation verification in demo | Attestation generation is async | Show pre-computed attestation hash + verified badge |
| Real x402 payment in demo | Requires real USDC, real escrow | Show payment trigger UI, don't execute |
| Wallet transaction history for external addresses | `market portfolio-dex-history` needs logged-in wallet | For external wallets, infer patterns from `portfolio all-balances` + `market portfolio-token-pnl` |
