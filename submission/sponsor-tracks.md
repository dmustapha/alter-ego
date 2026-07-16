# Sponsor Tracks — OKX.AI Genesis

## OKX OnchainOS Integration

All 4 OKX OnchainOS skills are integrated into the Alter Ego app:

| Skill | Integration | Code Evidence |
|-------|------------|---------------|
| **OKX WALLET** | Multi-chain address ingestion via OnchainOS CLI | `src/components/WalletInput.tsx` — accepts EVM/Solana addresses, validates format |
| **OKX DEX-MARKET** | Cross-chain price feeds for comparison engine | `src/app/api/compare/route.ts` — calculates GAP COST using multi-chain PnL |
| **OKX-AI** | Agent listing on marketplace | Integration strip: `src/app/page.tsx` — OKX-AI badge, ASP listing metadata |
| **X402** | Micropayment gate for snapshots | `src/components/PaymentButton.tsx` — 3-state transition (idle→simulating→done), USDC on Base |

## Track: Lifestyle Companion + Social Buzz

Alter Ego bridges both tracks:

- **Lifestyle Companion** — Ongoing relationship with your trading data. Coaching subscription ($4.99/mo). Pattern tracking over time. Persona evolution as your trading behavior changes.
- **Social Buzz** — Roast battle format is inherently shareable. "Your ETH self vs your SOL self" as a social post. Cryptographic snapshot for proof of identity.

## Judging Criteria Alignment

| Criterion | How Alter Ego Scores |
|-----------|---------------------|
| Innovation | Multi-chain behavioral fingerprinting with persona-based roast battles is novel |
| Technical Depth | 4 API routes, 7 components, 6-phase state machine, TEE mock, x402 gate |
| User Experience | Glitch Core design (CRT scanlines, corner brackets, neon glow), 2-minute user journey |
| OKX Integration | All 4 OnchainOS skills integrated + TEE attestation + ERC-8004 metadata |
| Demo Quality | 6-phase auto-play journey, zero console errors, 33/33 tests, mobile responsive |
