# Alter Ego: inspect public-wallet evidence before drawing conclusions

Alter Ego turns selected public EVM and Solana wallet activity into inspectable evidence. It records what was observed, where it came from, and what is missing. Agents can request the same grounded analysis through a payment-gated A2MCP endpoint on X Layer.

The decision layer is deliberately bounded. It forms behavior profiles and cohort findings from normalized evidence, produces neutral hypotheses, and validates them against an immutable historical dataset. It does not infer common ownership, promise outcomes, provide trade instructions, or submit transactions.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-304%20passing-brightgreen)]()

**Live:** [alter-ego-wine-mu.vercel.app](https://alter-ego-wine-mu.vercel.app)
**Proof:** [payment, identity, and integration evidence](https://alter-ego-wine-mu.vercel.app/proof)

---

![Alter Ego landing page](docs/images/landing.png)

## What it does

1. Accepts user-selected public wallet addresses.
2. Collects wallet activity, holdings, and provider-bound evidence through OKX integrations.
3. Normalizes the evidence with coverage, provenance, unit, and limitation records.
4. Builds explainable wallet profiles and cohort-level consensus or disagreement findings.
5. Produces a neutral, falsifiable hypothesis when the evidence is sufficient.
6. Validates eligible hypotheses chronologically against an immutable, attested historical dataset.

The live application is an evidence surface. The decision modules are pure contracts that can return `insufficient` or `rejected` when evidence or validation is incomplete. A proposal is a non-executing review artifact, never an authorization to act.

## Evidence and decision boundaries

| Boundary | Guarantee |
|---|---|
| Wallet cohort | A selected public cohort is not treated as proof of shared ownership or a shared strategy. |
| Evidence | Metrics retain provider, retrieval, coverage, and limitation context. |
| Historical validation | Walk-forward validation consumes an immutable dataset and never substitutes live observations. |
| Historical source | Collector-issued snapshots require a server-side HMAC attestation. Unattested or tampered snapshots fail closed. |
| Hypotheses | Outputs are testable claims with explicit assumptions and limitations, not predictions or alpha. |
| Proposals | Approval, decline, and expiry are pure state transitions. No signer, wallet, broadcast, scheduler, or execution field exists. |

## Live A2MCP service and payment proof

`POST /api/a2mcp` exposes payment-gated wallet analysis for agents. It uses the official OKX x402 seller flow on X Layer. The live demonstration UI is not payment proof.

A separate external-buyer A2MCP request settled **0.01 USDT0 on X Layer**. The public transaction proof is [0x59eebf…53d103](https://www.oklink.com/x-layer/evm/tx/0x59eebfc91fac2ffa203de3b3d04a6820eda223404d0f6512db0fe6e72353d103).

| Field | Value |
|---|---|
| Agent identity | ERC-8004 agent `#6013` |
| Network | X Layer, chain ID `196` |
| A2MCP endpoint | `https://alter-ego-wine-mu.vercel.app/api/a2mcp` |
| Settlement | 0.01 USDT0, external buyer, X Layer |

## How it works

```text
Selected public wallets
        |
        v
OKX wallet and market evidence
        |
        v
Normalized observations with provenance and coverage
        |
        +-------------------------------+
        |                               |
        v                               v
Wallet behavior profiles          A2MCP grounded analysis
        |                               |
        v                               v
Cohort findings and hypotheses   x402-gated agent response
        |
        v
Attested immutable historical dataset
        |
        v
Walk-forward validation report
        |
        v
Non-executing review proposal
```

## Core capabilities

- **Public-wallet evidence:** Supports chosen EVM and Solana addresses without converting a cohort into an identity claim.
- **Provenance-aware metrics:** Preserves source, retrieval time, evidence identifiers, coverage, units, and limitations.
- **Cohort synthesis:** Separates consensus from disagreement instead of averaging away conflicts.
- **Neutral hypotheses:** Expresses observable conditions as testable statements with assumptions and exclusions.
- **Chronological validation:** Uses fixed train and holdout folds with documented costs and explicit insufficiency outcomes.
- **Attested historical inputs:** Requires a server-side `ALTER_EGO_HISTORICAL_SOURCE_KEY` to verify collector snapshots.
- **Payment-gated agent access:** Makes grounded analysis discoverable through A2MCP and x402 on X Layer.

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Collect and return grounded wallet analysis for selected public addresses. |
| `POST` | `/api/a2mcp` | Payment-gated A2MCP wallet-analysis request. |
| `GET` | `/api/a2mcp` | Service discovery and payment-gated A2MCP interaction. |
| `GET` | `/proof` | Human-readable identity, integration, and settlement proof surface. |

An unpaid A2MCP request receives the standard x402 payment requirement. A paid request is still bounded by the available evidence and its limitations.

## Tech stack

| Layer | Technology |
|---|---|
| Application | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS 4, Framer Motion |
| Evidence collection | OKX OnchainOS wallet and market integrations |
| Agent service | A2MCP, OKX AI, x402 on X Layer |
| Historical validation | Immutable attested datasets, chronological walk-forward evaluator |
| Testing | Vitest, Playwright |
| Deployment | Vercel |

## Testing

The suite currently contains **304 passing tests across 38 files**.

```bash
npm test
# 304 passing

npm run build
# production build passes
```

The tests cover evidence normalization, provenance and coverage checks, cost and outcome boundaries, cohort synthesis, hypothesis construction, historical-dataset attestation, walk-forward validation, proposal transitions, A2MCP/x402 conformance, and UI/accessibility behavior.

## Run locally

```bash
git clone https://github.com/dmustapha/alter-ego.git
cd alter-ego
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env.example` to `.env.local`, then configure only the integrations you need.

| Variable | Purpose |
|---|---|
| `OKX_API_KEY` | OKX OnchainOS API key |
| `OKX_SECRET_KEY` | OKX OnchainOS API secret |
| `OKX_PASSPHRASE` | OKX OnchainOS API passphrase |
| `GROQ_API_KEY` | Optional grounded-commentary provider key |
| `A2MCP_ENDPOINT_URL` | Public A2MCP service URL |
| `A2MCP_PAYTO_ADDRESS` | x402 settlement recipient |
| `X402_PRICE` | x402 price configuration |
| `ALTER_EGO_HISTORICAL_SOURCE_KEY` | Server-only key for collector-side historical snapshot attestations |

Never expose the historical-source key to a browser, client bundle, or repository.

## Project structure

```text
src/
├── app/api/                 # Analyze and A2MCP route handlers
├── app/proof/               # Public proof surface
├── lib/evidence/            # Normalization, profiles, synthesis, validation, proposals
│   └── historical-source-server.ts
│                            # Server-side snapshot attestation issuer
├── lib/a2mcp/               # Agent card and envelope handling
├── lib/x402/                # Official x402 seller boundary
└── components/              # Live evidence interface
```

Built for the [OKX.AI Genesis Hackathon](https://www.okx.ai/genesis) on X Layer.

## License

MIT
