# Alter Ego

**Every wallet has a story. Meet your Alter Ego.**

Alter Ego is a TEE-bound agent built for the OKX.AI Genesis hackathon. It ingests your complete on-chain history across every wallet and chain, classifies your trading patterns, builds a psychological persona, then pits your Ethereum self against your Solana self in a 5-round roast battle built on real transaction data.

## What It Does

1. **Wallet Ingestion** — Paste any EVM or Solana address. Alter Ego pulls portfolio data, transaction history, and on-chain activity through the OnchainOS CLI layer (WALLET + DEX-MARKET integrations).

2. **Persona Builder** — Analyzes 4,463 transactions across Ethereum, Solana, and X Layer. Classifies patterns as AMPLIFY (strengths) or GUARD (risks). Assigns archetypes: The Professional, The Degen, etc.

3. **Roast Battle** — A 5-round battle where your Ethereum persona and Solana persona face off. Every insult is backed by real transaction data. "You held through a 45% drawdown — that's not conviction, that's a coma."

4. **Crowd Comparison** — Side-by-side comparison against smart money traders. GAP COST calculation: what you lost by not being your best self on every chain.

5. **TEE-Sealed Snapshot** — Cryptographic attestation pinned to the agent's identity. Verification badge: ATTESTATION: 0x7f3a...b91e. Available for purchase via x402 micropayments ($0.99/snapshot).

## Integrations

All 4 OKX OnchainOS skills integrated and displayed in the app's integration strip:

- **OKX WALLET** — Multi-chain address ingestion
- **OKX DEX-MARKET** — Cross-chain market data for comparison engine
- **OKX-AI** — Agent listing on the OKX.AI marketplace  
- **X402** — Micropayment gate for snapshot purchases (USDC on Base)

## Tech Stack

Next.js 16 (Turbopack), TypeScript, Tailwind CSS 4, Framer Motion, Playwright (33 browser tests), Press Start 2P + Space Mono fonts, Glitch Core design system

## Live Demo

https://alter-e8wzy3vsl-damilolas-projects-fafdf859.vercel.app

Click LOAD DEMO → ANALYZE → watch the 6-phase journey: scanning → persona analysis → roast battle → comparison → payment gate.

## GitHub

https://github.com/dmustapha/alter-ego

## Project Structure

```
alter-ego/
├── src/app/              # Next.js App Router (4 API routes + 2 pages)
│   ├── api/              # analyze, roast, compare, persona
│   └── proof/            # TEE attestation proof page
├── src/components/        # 7 React components
│   ├── Terminal.tsx       # Shared shell with CRT scanlines + corner brackets
│   ├── WalletInput.tsx    # Multi-address input + demo loader
│   ├── RoastBattle.tsx    # 5-round battle engine
│   └── PaymentButton.tsx  # x402 payment gate
├── src/data/cache/        # Pre-computed demo data (9 JSON files)
├── docs/images/           # 5 screenshots
└── playwright.config.ts   # 33 browser tests
```

## Testing

33 Playwright browser tests passing. Covers: 6-phase state machine, responsive layout (320px/1440px), keyboard navigation, network resilience (slow 3G), Glitch Core design compliance, form validation, console error detection.

Built for the OKX.AI Genesis Hackathon (OKX × DoraHacks). July 2026.
