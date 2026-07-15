# OKX.AI Genesis (Build X Series) — Research Brief
**Compiled:** 2026-07-15
**Intel Depth:** ID 6 (Standard)
**Sources:** Web Research, OKX.AI Platform, OKX OnchainOS Docs, GitHub, X/Twitter

---

## Overview

| Field | Value |
|-------|-------|
| Name | OKX.AI Genesis (Build X Series) |
| Organizer | OKX |
| Platform | Google Forms (custom) |
| Deadline | July 17, 2026 23:59 UTC (**~2 days remaining**) |
| Prize Pool | $100,000 |
| Tracks | 8 (Best Product, Creative Genius, Revenue Rocket, Finance Copilot, Software Utility, Lifestyle Companion, Artistic Excellence, Social Buzz) |
| Chain | X Layer (OP Stack L2, EVM-equivalent) |
| Native token | OKB |

### Submission Requirements
- Build an ASP (Agent Service Provider) that solves a clear, real-world use case
- Submit ASP for listing through OKX.AI — **must pass internal review and go live** to remain eligible
- Post on X with #OKXAI — introduce ASP, explain use case, include ≤90s demo/walkthrough
- Submit Google Form before July 17, 2026 23:59 UTC

---

## Demo Video Requirements

| Field | Value |
|-------|-------|
| Max length | **90 seconds** |
| Formats | Posted on X (native video) |
| Platform | X (Twitter) |
| Content notes | Must introduce ASP, explain use case, show clear demo/walkthrough. Sharing product story, build process, or user scenario encouraged. |

---

## Submission Form Fields

Google Form: `https://forms.gle/mddEUagmDbyV37ws8` (titled "OKX.AI Genesis Hackathon")

Fields inferred from form context:
- ASP Details (name, description, service type)
- X participation post link
- Project/team info

> **Note:** Form fields could not be fully extracted (Google Forms JS rendering). Verify before submitting.

---

## Disqualifiers

- ASP listing not approved / cannot go live on OKX.AI marketplace
- ASP not listed on OKX.AI by deadline
- No X participation post with #OKXAI
- Demo video exceeds 90 seconds

---

## Prizes

### Major Awards

| Track | 1st | 2nd | 3rd | Judging Focus |
|-------|-----|-----|-----|---------------|
| Best Product | $10,000 | $6,000 | $4,000 | Product experience, service completeness, user value |
| Creative Genius | $10,000 | $6,000 | $4,000 | Creativity and imagination |
| Revenue Rocket | $10,000 | $6,000 | $4,000 | **Live** revenue, orders, positive reviews during campaign period |

### Category Awards (3 winners each)

| Category | Prize Each | Total |
|----------|-----------|-------|
| Finance Copilot | $2,500 | $7,500 |
| Software Utility | $2,500 | $7,500 |
| Lifestyle Companion | $2,500 | $7,500 |
| Artistic Excellence | $2,500 | $7,500 |

### Social Awards

| Award | Winners | Prize Each | Total |
|-------|---------|-----------|-------|
| Social Buzz | 10 | $1,000 | $10,000 |

---

## Judging Criteria

| Criterion | Weight | What It Means | How to Score High |
|-----------|--------|---------------|-------------------|
| Product Experience & Completeness | Unknown | Best Product: strongest experience, completeness, user value | Build a polished ASP that works end-to-end with clear UX |
| Creativity | Unknown | Creative Genius: imagination and novelty | Build something unexpected, not a clone |
| Revenue / Orders / Reviews | Unknown | Revenue Rocket: live marketplace performance | **This is unique** — ASPs that actually sell during the campaign win |
| Category Excellence | Unknown | Best ASP in each category (Finance/Software/Lifestyle/Art) | Target a specific category and dominate it |
| Social Traction | Unknown | Social Buzz: community reach and engagement | Viral X post, community engagement, #OKXAI visibility |

> **Key insight:** Revenue Rocket is a LIVE marketplace metric, not a judged criterion. An ASP that generates actual sales during the campaign period has a massive advantage. As of July 15, the top-selling ASPs have 944, 547, 174, and 87 sales — this is beatable in 2 days with the right strategy.

---

## Workshop Signals

No workshops published for this hackathon.

---

## Tech Deep Dive

### X Layer Architecture
- **Stack:** OP Stack (Optimism framework), upgraded from Polygon CDK
- **EVM Equivalence:** Full — deploy existing Solidity contracts without modification
- **Performance:** Up to 20,000 TPS, 1-second block times, negligible gas fees
- **Gas Token:** OKB (fixed supply at 21M)
- **Security:** Optimistic rollup with 7-day challenge period + AggLayer ZK proof settlement
- **Uptime:** 99.9% (Conductor high-availability cluster for sequencer redundancy)

### OKX OnchainOS Skills (8 skills)

| Skill | What It Does |
|-------|-------------|
| `okx-agentic-wallet` | Wallet lifecycle (auth, balance, PnL, send, swap, bridge, Gas Station, security scanning, TEE signing) |
| `okx-dex-market` | Real-time DEX data: prices, K-line, smart money tracking, leaderboard, token analytics, meme scanning |
| `okx-agent-payments-protocol` | Unified payments: x402 (exact/aggr_deferred), MPP (charge/session), a2a-pay |
| `okx-ai` | **ERC-8004** on-chain Agent identity (register/update/search/rate) + agent task marketplace (publish/accept/deliver/dispute) |
| `okx-defi` | DeFi product discovery, deposit, withdraw, claim across Aave, Lido, PancakeSwap, Kamino, NAVI |
| `okx-dapp-discovery` | Third-party DApp routing: Polymarket, Aave V3, Hyperliquid, PancakeSwap V3, Morpho V1 |
| `okx-guide` | Onboarding hub + OKX.AI intro + support |
| `okx-growth-competition` | Agentic Wallet trading competitions |

**Installation:** `npx skills add okx/onchainos-skills --yes -g`

### ASP Types

| Type | Best For | Pricing | Payment | Disputes |
|------|----------|---------|---------|----------|
| **A2A** (Agent-to-Agent) | Complex tasks (design, research, custom work) | Negotiated or fixed per task | Escrow on X Layer, released on user approval | Arbitration (5% OKB bounty, refunded if successful) |
| **A2MCP** (Agent-to-MCP) | Standardized API endpoints | Fixed per call | x402 pay-per-call (paid) or free | None (instant settlement) |

### Registration Flow
1. Install agent (OpenClaw/Hermes/Claude Code/Codex)
2. Install OnchainOS: `npx skills add okx/onchainos-skills --yes -g`
3. Login to Agentic Wallet (TEE-secured, email-based)
4. Register ASP (A2A or A2MCP)
5. List on OKX.AI marketplace
6. Review within 24 hours

### ERC-8004 Agent Identity
- Standard for on-chain agent identity (ERC-721 based)
- Provides verifiable, decentralized AI agent identities
- Used by OKX.AI's `okx-ai` skill for ASP registration
- Enables portable, censorship-resistant agent identifiers

### x402 Payment Protocol
- Open standard using HTTP 402 "Payment Required"
- Enables AI agents to autonomously pay for API access
- Uses stablecoins (USDC) for settlement
- Eliminates API keys, subscriptions, manual payment processing
- OKX provides unified payment dispatcher via `okx-agent-payments-protocol`

---

## Network / Chain Infrastructure

| Field | Value |
|-------|-------|
| Chain | X Layer Mainnet |
| Chain ID | **196** (0xc4) |
| RPC | `https://rpc.xlayer.tech` |
| Explorer | `https://www.okx.com/web3/explorer/xlayer` |
| Gas Token | OKB |
| Testnet | X Layer Testnet |
| Faucet | `https://web3.okx.com/xlayer/faucet` |
| Deploy requirement | ASP listing on OKX.AI marketplace (no specific smart contract deploy required) |

---

## Ecosystem Products

| Product | Purpose | Integration Depth | Docs |
|---------|---------|:---:|------|
| OnchainOS Skills | Agent-native wallet, market data, payments, DeFi | **Deep** — required for ASP | [GitHub](https://github.com/okx/onchainos-skills) |
| OKX Agentic Wallet | TEE-secured wallet for agents | **Deep** — identity + payments | [Docs](https://web3.okx.com/onchainos/dev-docs/wallet/install-your-agentic-wallet) |
| OKX.AI Marketplace | ASP discovery and hiring | **Deep** — listing required | [Marketplace](https://www.okx.ai/agents) |
| x402 Protocol | Agent micropayments | Medium — for paid A2MCP | [x402.org](https://x402.org) |
| ERC-8004 | On-chain agent identity | Medium — underpins okx-ai skill | [EIP](https://eips.ethereum.org/EIPS/eip-8004) |
| OKX DEX API | Market data, swaps, liquidity | Medium — via okx-dex-market | [Docs](https://web3.okx.com/onchainos/dev-docs) |
| OKX Wallet | End-user wallet (non-agent) | Shallow — user-facing | [Wallet](https://www.okx.com/web3) |

---

## Capability Sheet

### Native Primitives — What X Layer + OKX.AI Uniquely Enables

1. **TEE-Secured Agent Wallets** — Private keys generated and stored inside server-side secure enclaves, never leaving the TEE. Agents can sign transactions autonomously without key exposure.
2. **ERC-8004 Agent Identity** — On-chain, verifiable agent identities with reputation and rating history. Not just a wallet address — a full agent profile.
3. **Live Agent Marketplace with Real Revenue** — ASPs sell services for real money (USDC/USDT). Revenue Rocket track rewards actual sales data, not theoretical business models.
4. **Agent-to-Agent Negotiation + Escrow** — A2A ASPs negotiate price and scope, funds held in escrow on X Layer, released only on user sign-off. Disputes resolved via OKB-staked arbitration.
5. **x402 Native Integration** — Unified payment dispatcher handles x402, MPP, and a2a-pay schemes. Pay-per-call monetization built in, not bolted on.
6. **Cross-Chain Agent Reach** — OnchainOS supports 20+ chains. An ASP deployed here can serve users across Solana, Ethereum, Base, BSC, Arbitrum, Polygon, and more.
7. **One-Command Agent Setup** — `npx skills add okx/onchainos-skills --yes -g` — agents are deployable by non-developers.

---

## Competitor Landscape

### Competitor Registry

| Project | Track | Threat | Tech | Source | Confidence |
|---------|-------|:---:|---|---|:---:|
| **Onchain Data Explorer** | Software Utility | **HIGH** | OnchainOS, 180-chain data | OKX.AI marketplace (944 sold, 4.86★) | A1 |
| **Eat This?** | Lifestyle Companion | **HIGH** | Food recognition AI, health tracking | OKX.AI marketplace (547 sold, 5.0★) | A1 |
| **WorldCupCaller** | World Cup / Lifestyle | **MEDIUM** | Poisson model, Polymarket integration | OKX.AI marketplace (174 sold, 4.74★) | A1 |
| **CertiK** | Finance Copilot | **HIGH** | Security AI, trade monitoring | OKX.AI marketplace (87 sold, 5.0★) | A1 |
| **okx-defi-yield-agent** | Revenue Rocket / Finance | **MEDIUM** | DeFi yield optimization | GitHub (jemi2k) | B2 |
| **okx-bountyscout-asp** | Software Utility | **LOW** | Bounty ranking, Web3 grants | GitHub (Lukeknow0) | B2 |
| **QuorixASP** | Software Utility | **MEDIUM** | Broker/discovery, task routing | X/Twitter (@QuorixASP) | C3 |
| **okx-ai-asp-launchpad** | N/A (template) | **LOW** | ASP scaffolding/template | GitHub (Najnomics) | B2 |

### Competition Density Map

| Track | Est. Teams | Activity | Density |
|-------|:---:|---|:---:|
| Best Product | 5-8 | Medium | **MEDIUM** |
| Creative Genius | 3-5 | Low | **LOW** ← opportunity |
| Revenue Rocket | 4-6 | Medium | **MEDIUM** |
| Finance Copilot | 4-6 | Medium | **MEDIUM** |
| Software Utility | 6-10 | High | **HIGH** |
| Lifestyle Companion | 3-5 | Low | **LOW** ← opportunity |
| Artistic Excellence | 2-4 | Low | **LOW** ← opportunity |
| Social Buzz | 8-12 | High | **HIGH** |

---

## Community Pain (Verbatim Quotes)

> **⚠️ SOCIAL INTEL SKIPPED** — No Discord/Twitter manual review conducted (Phase 2 skipped). Community pain points below are inferred from platform analysis, not direct observation.

### Inferred Pain Points (from platform analysis):

1. **"ASP must go live to be eligible"** — The listing review takes up to 24 hours. With 2 days left, late submissions risk missing the review window entirely. [A1 — hackathon page]
2. **"Revenue Rocket requires actual sales"** — Unlike most hackathons where demos suffice, this track demands real marketplace traction. Teams without a go-to-market strategy are at a disadvantage. [A1 — judging criteria]
3. **"x402 integration complexity"** — Paid A2MCP endpoints must implement the x402 payment protocol. While OKX provides an SDK, the protocol is still relatively new and documentation is evolving. [B2 — inferred from SDK complexity]

---

## Past Editions Analysis

**BOTTOM LINE:** OKX.AI Genesis is the **first edition** of this specific hackathon format. However, the Build X Series has run multiple seasons.

**EVIDENCE:**
- Build X Series seasons: Hook season, X Cup season, Hook x World Cup (all 2026) [A1]
- Past winners: ShieldSuite (3rd place, S2), Pitchside AI (X Cup — TEE agents + Aave V3) [B2]
- Season 1 focused on "agentic commerce apps on zkEVM L2" [C3]
- Common winning pattern: TEE integration + real DeFi composability + X Layer-native deployment [B2]

**CONFIDENCE:** Medium — past winner data is sparse.

**SO WHAT:** Winners integrate deeply with OKX's stack (TEE, OnchainOS, X Layer) rather than building generic AI agents. The "Build X" brand rewards technical depth on the sponsor's infrastructure.

---

## Broader Market Context

**BOTTOM LINE:** The AI agent marketplace space is exploding. OKX.AI is competing with Coinbase's AgentKit, OpenAI's GPTStore, and various Web3 agent platforms. OKX's differentiator is the **live marketplace with real payments** — this is not a theoretical hackathon, it's a launchpad for real businesses.

**EVIDENCE:**
- x402 protocol gaining traction as THE payment standard for AI agents [B2]
- ERC-8004 standardizing on-chain agent identity across EVM chains [A1]
- Agent-to-agent commerce projected as a multi-billion dollar market [D4]
- OKX has 100M+ users — distribution advantage over pure-Web3 competitors [A1]

**CONFIDENCE:** High on market trends, Medium on projections.

**SO WHAT:** Build something that could be a real business, not just a hackathon project. Revenue Rocket is a real metric because OKX is testing which ASPs have product-market fit for their marketplace.

---

## Category Saturation

> Grid/category saturation data not available — no API access for programmatic query. Manual observation:

| Category | Live ASPs on OKX.AI | Saturation |
|----------|:---:|---|
| Finance | 1 visible (CertiK) | **LOW** |
| Software Services | 1 visible (Onchain Data Explorer) | **LOW** |
| Lifestyle | 2 visible (Eat This?, WorldCupCaller) | **LOW-MEDIUM** |
| Art Creation | 0 visible | **EMPTY** ← major opportunity |
| World Cup | 1 visible | Niche |

> **Note:** Only 4+ ASPs visible on marketplace. This is a brand-new platform — first-mover advantage is real.

---

## Key Links & Resources

| Resource | URL |
|----------|-----|
| Hackathon Page | https://web3.okx.com/xlayer/build-x-series |
| ASP Tutorial | https://www.okx.ai/tutorial/asp |
| OKX.AI Marketplace | https://www.okx.ai/agents |
| Submission Form | https://forms.gle/mddEUagmDbyV37ws8 |
| OnchainOS Skills (GitHub) | https://github.com/okx/onchainos-skills |
| X Layer Docs | https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/about-xlayer |
| X Layer RPC Endpoints | https://web3.okx.com/onchainos/dev-docs/xlayer/developer/rpc-endpoints/rpc-endpoints |
| Agentic Wallet Install | https://web3.okx.com/onchainos/dev-docs/wallet/install-your-agentic-wallet |
| MCP Server Docs | https://web3.okx.com/onchainos/dev-docs/market/market-ai-tools-mcp-server |
| X Layer Faucet | https://web3.okx.com/xlayer/faucet |
| X Layer Explorer | https://www.okx.com/web3/explorer/xlayer |
| ERC-8004 Spec | https://eips.ethereum.org/EIPS/eip-8004 |
| x402 Protocol | https://x402.org |
| ChainList (Chain ID 196) | https://chainlist.org/chain/196 |

---

## Track Coverage Matrix

| Track | Prize Pool | Judging Focus | Overlap Potential | Est. Submissions |
|-------|-------|--------------|-------------------|:---:|
| Best Product | $20K (1st-3rd) | UX, completeness, user value | Creative Genius, any category | MEDIUM |
| Creative Genius | $20K (1st-3rd) | Novelty, imagination | Best Product, any category | LOW |
| Revenue Rocket | $20K (1st-3rd) | Live sales, orders, reviews | Finance Copilot, Software Utility | MEDIUM |
| Finance Copilot | $7.5K (3×) | Top Finance ASP | Revenue Rocket | MEDIUM |
| Software Utility | $7.5K (3×) | Top Software ASP | Revenue Rocket, Best Product | HIGH |
| Lifestyle Companion | $7.5K (3×) | Top Lifestyle ASP | Creative Genius | LOW |
| Artistic Excellence | $7.5K (3×) | Top Art ASP | Creative Genius | LOW |
| Social Buzz | $10K (10×) | Social reach, engagement | ALL tracks (cross-cutting) | HIGH |

### Multi-Track Targets
- **Creative Genius + Artistic Excellence** — An AI art/creative ASP could win both
- **Revenue Rocket + Finance Copilot** — A financial ASP that actually sells wins both
- **Best Product + Software Utility** — A polished utility ASP could sweep both
- **Any track + Social Buzz** — Viral X post qualifies any ASP for Social Buzz

### Low-Competition Tracks (Highest Win Probability)
1. **Artistic Excellence** — 0 visible competitors on marketplace, likely few submissions
2. **Lifestyle Companion** — Only 2 live ASPs, both in adjacent categories
3. **Creative Genius** — Low density, rewards novelty over polish

---

## Domain Knowledge Sources

| Source | URL | Covers | Essential? |
|--------|-----|--------|:---:|
| OnchainOS Skills README | GitHub | Full skill catalog + workflows | **YES** |
| ASP Tutorial | okx.ai/tutorial/asp | Registration, A2A vs A2MCP, listing | **YES** |
| X Layer Network Info | OKX Docs | Chain ID, RPC, contracts, bridging | **YES** |
| ERC-8004 EIP | eips.ethereum.org | Agent identity standard | YES |
| x402 Whitepaper | x402.org | Payment protocol spec | For paid ASPs |
| OKX DEX API Docs | OKX Docs | Market data, swaps, liquidity | For finance ASPs |

---

## Kill List

### 1. Saturated
- **Generic crypto price bot** — Onchain Data Explorer already dominates with 944 sales
- **World Cup prediction agent** — WorldCupCaller has 174 sales and the Cup is ending
- **Another "chat with your wallet" agent** — Too many wallet-chat agents in every hackathon

### 2. Broken Dependencies
- **Heavy smart contract deployment on X Layer** — 2-day timeline is too tight for audited contracts
- **Cross-chain bridge ASP** — Requires deep liquidity and security that can't be built in 2 days

### 3. Already Built
- **Food/health scanner** — Eat This? has 547 sales and 5.0★
- **Trading security monitor** — CertiK has 87 sales and 5.0★
- **Bounty/grants finder** — okx-bountyscout-asp already submitted

### 4. Zero Alignment
- **Pure Web2 SaaS without agent integration** — Must be an ASP on OKX.AI
- **Standalone mobile app** — No obvious path to agent marketplace
- **NFT minting platform** — No relevant track or OnchainOS skill synergy
