# OKX Trade/Data API Contract — Spike Result (Plan 1 Task 1)

Date: 2026-07-21. Creds: existing (unrotated) set A. Read-only probes.

## Headline

The documented plan assumed a binary fork (a REST trade endpoint with PnL exists, or
none does → Plan-1B honest demo). **Reality is a third branch:** rich genuinely-live
data IS available, but **OKX exposes no realized-per-trade PnL endpoint**, and the
current app's integration surface is dead. This escalates per the roadmap
reconciliation protocol (unforeseen result → HALT + amend before code).

## Two header schemes (critical, was the root of the 404s)

| Surface | Path prefix | Auth headers | Status with our creds |
|---------|-------------|--------------|-----------------------|
| Agentic OnchainOS | `/priapi/v5/wallet/agentic/...` | `OKX-ACCESS-*` (with X) + `OKX-ACCESS-PROJECT` | **405 "Request error"** on every call — the surface the app ships today is DEAD for these keys |
| Public Web3 API | `/api/v5/...` | `OK-ACCESS-*` (no X) + `OK-ACCESS-PROJECT` | **200** — works |

Prehash for both = `timestamp + method + path(+query) + body`, HMAC-SHA256, base64.

## Working endpoints (200, public Web3 API, `OK-ACCESS-*`)

### 1. Transaction history — `GET /api/v5/dex/post-transaction/transactions-by-address`
Query: `address`, `chains` (chainIndex), optional `limit`, `cursor`. Verified on
Ethereum (`chains=1`) AND X Layer (`chains=196`).
Response: `data[0].transactions[]` (the `/wallet/...` variant names it `transactionList[]`), each:
`{ chainIndex, txHash, itype, methodId, nonce, txTime (ms), from:[{address,amount}], to:[{address,amount}], tokenContractAddress, amount, cursor }`.
Gives: real activity, tokens touched, direction (from/to), timestamp, chain. **No USD, no PnL.**

### 2. Per-tx detail — `GET /api/v5/dex/post-transaction/transaction-detail-by-txhash`
Query: `chainIndex`, `txHash`. Response `data[0]`:
`{ chainIndex, height, txTime, txhash, gasLimit, gasUsed, gasPrice, nonce, symbol, amount, txStatus, methodId, txFee, fromDetails[], toDetails[], internalTransactionDetails[], tokenTransferDetails[] (for swaps) }`.
Gives: gas behavior, token transfers per tx (→ derive BUY/SELL + token amount). **No USD value, no PnL.**

### 3. Portfolio USD value — `GET /api/v5/wallet/asset/total-value-by-address`
Query: `address`, `chains`. Response: `data[0].totalValue` (string).
CAVEAT: polluted by spam-token fake prices (vitalik returned `totalValue ≈ 4.2e8`, nonsense).

### 4. Token balances + price — `GET /api/v5/dex/balance/all-token-balances-by-address`
Query: `address`, `chains`. Response `data[0].tokenAssets[]`:
`{ chainIndex, symbol, balance, rawBalance, tokenPrice (CURRENT, USD), isRiskToken, tokenContractAddress }`.
Gives: current holdings, current price, **`isRiskToken` spam flag** (the one reliable quality signal).
CAVEAT: `tokenPrice` is CURRENT only (no price-at-tx-time); list is spam-heavy — filter on `isRiskToken`.

## Not available (404 on every candidate)

`.../specific-trade-list`, `.../trade-history`, `.../market/wallet-pnl`, and the agentic
`market/portfolio-dex-history`, `market/token-transaction-list`, `asset/wallet-transaction-list`.
**There is no realized-PnL / trade-analytics endpoint.** Per-trade `pnlUsd`/`pnlPct` and
`holdDurationDays` are NOT retrievable fields.

## Consequence for the classifier's `Trade[]` contract

`Trade = { tokenSymbol, chain, action, amountUsd, pnlUsd, pnlPct, holdDurationDays }`.
Derivable from live data: `tokenSymbol` (via balances/detail), `chain`, `action` (from/to
direction or tokenTransferDetails), timestamp. NOT directly available: `pnlUsd`, `pnlPct`
(need cost-basis pairing + historical price — no historical-price endpoint found),
reliable `amountUsd` (current price only; spam-polluted).

## Decision (HALTED — owner fork required)

Documented branches did not cover "live data yes, PnL no." Three honest paths:

- **Path A — Derive PnL:** pair buys/sells per token from tx history + tx detail, estimate
  realized PnL. Heavy; needs a historical-price source (not yet found); output is an
  approximation. Highest code + honesty risk.
- **Path B — Re-aim the analysis onto live behavioral signals (RECOMMENDED):** key the
  personas/patterns on what IS real and reliable — tx cadence/recency, token & chain
  diversity, `isRiskToken` exposure, holding concentration, gas behavior. Drop/demote the
  PnL-based rules. Genuinely live + honest, moderate classifier rework.
- **Path C — Plan-1B honest demo:** keep the cache-driven demo, label it, add a real
  live tx-history/holdings "proof" panel. Least code; core analysis stays demo, not live.

Awaiting owner decision before writing Task 2+ code.
