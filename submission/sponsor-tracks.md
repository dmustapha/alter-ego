# Sponsor Tracks: OKX.AI Genesis

## OKX OnchainOS Integration

OKX OnchainOS integrations wired into the Alter Ego app:

| Skill | Integration | Code Evidence |
|-------|------------|---------------|
| **OKX WALLET** (live) | Multi-chain address ingestion via the OnchainOS REST API | `src/components/WalletInput.tsx`: accepts EVM/Solana addresses, validates format |
| **OKX DEX-MARKET** (live) | Cross-chain trade history for the comparison engine | `src/app/api/compare/route.ts`: calculates GAP COST using multi-chain trade data |
| **OKX-AI** (live) | ASP agent listing on the OKX.AI marketplace | Integration strip: `src/app/page.tsx`; agent card served at `src/app/api/a2mcp/route.ts` |
| **x402** (gate wired) | Payment gate for snapshots; live settlement planned | `src/components/PaymentButton.tsx`: 3-state transition (idle to simulating to done), USDT0 on X Layer |

## Track: X Layer Arena (Human Track)

Alter Ego targets the X Layer Arena (full-stack agentic app) and maps to all four scoring dimensions:

- **OnchainOS Integration & Innovation** - combines OKX WALLET and DEX-MARKET REST ingestion with an OKX-AI marketplace listing and an x402 payment gate, not a single API call.
- **X Layer Ecosystem Fit** - X Layer is one of the three analyzed chains, the x402 token is USDT0 on X Layer, and the agent identity is registered on X Layer (chainIndex 196).
- **AI Interaction Experience** - the classifier turns raw on-chain history into a natural-language persona and a data-backed roast battle.
- **Product Completeness** - the full scan to persona to roast to comparison to snapshot flow runs end-to-end on the live deployment.

## Judging Criteria Alignment

| Criterion | How Alter Ego Scores |
|-----------|---------------------|
| Innovation | Multi-chain behavioral fingerprinting with persona-based roast battles is novel |
| Technical Depth | 4 API routes, 7 components, 6-phase state machine, TEE mock, x402 gate |
| User Experience | Glitch Core design (CRT scanlines, corner brackets, neon glow), 2-minute user journey |
| OKX Integration | WALLET + DEX-MARKET + OKX-AI wired via OnchainOS REST + A2MCP agent card; TEE attestation simulated; ERC-8004 identity registered on X Layer |
| Demo Quality | 6-phase auto-play journey, zero console errors, 33/33 tests, mobile responsive |
