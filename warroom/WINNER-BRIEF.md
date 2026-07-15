# WINNER-BRIEF.md — OKX.AI Genesis

## Thesis
Alter Ego wins OKX.AI Genesis by solving the problem every crypto trader has but nobody talks about: **you don't actually know what kind of trader you are.** Your wallet history across every chain tells the truth — every panic sell, every diamond-hand conviction, every 3am degen gamble. Alter Ego reads your ENTIRE on-chain self across every wallet you own and every chain you've touched, then shows you the truth: what you're good at (amplify), what's costing you money (guard). **Self-learning is the primary mechanic.** Only after you understand yourself does Alter Ego cross-reference top-performing traders to show you what's possible. The crowd is a mirror, not a teacher. The demo hook is the most theatrical 90 seconds in the hackathon: your own Ethereum self and Solana self — same person, completely different traders — face off in a roast battle built on real on-chain data. For the hackathon theme of "Genesis — launch something real," Alter Ego is a product people pay to keep alive: the first honest mirror they've ever had.

---

## Idea

**Name:** Alter Ego
**Problem:** Crypto traders have no objective mirror reflecting their patterns across all their wallets and chains — they remember the wins, forget the losses, and never see the full picture.
**Mechanism:** A TEE-bound agent ingests your ENTIRE on-chain history across every wallet you own and every chain you've used — trades, PnL, timing, approvals, liquidations, everything. It classifies patterns into AMPLIFY (what you're good at, with dollar values attached) and GUARD (what's costing you money, with exact loss amounts). Self-learning comes FIRST — you see yourself clearly for the first time. THEN it cross-references against top-performing leaderboard traders to show you the gap between who you are and who you could be.
**Chain-Native Angle:** TEE seals your Alter Ego's learned model — nobody can extract your trading fingerprint. ERC-8004 gives the Alter Ego a persistent on-chain identity with reputation that accumulates across interactions. The agent can trade autonomously via the Agentic Wallet within user-set guardrails. Remove TEE and you have a ChatGPT wrapper that leaks your strategy. Remove ERC-8004 and your Alter Ego has no persistent reputation. Remove x402 and you can't monetize.
**Sponsor Fit:** 
- `okx-dex-market` — wallet analysis (7d/30d PnL, trading behavior), smart money/whale/KOL tracking, leaderboard rankings (top traders by PnL/win rate), address tracker
- `okx-agentic-wallet` — portfolio PnL, transaction history, swap execution, audit log
- `okx-agent-payments-protocol` — x402 for premium Alter Ego subscriptions
- `okx-ai` — ERC-8004 identity registration, agent rating, service listing
**Differentiation:** Eat This? tells you about food. WorldCupCaller predicts matches. Nobody is building a trading identity agent that learns from your history AND crowd wisdom. CertiK alerts on security but doesn't know YOU. Onchain Data Explorer shows data but doesn't build a persona around it.
**Demo Hook:** Your own Ethereum self and Solana self — same person, completely different traders — face off in a roast battle built on real on-chain data. Ethereum Self: professional, disciplined, +$12K. Solana Self: degen, reckless, -$8K. They roast each other using exact transaction data. Then Alter Ego shows the crowd comparison: "Top Trader #3 exits at +45%. You exit at +12%. That gap cost you $8,400." The question isn't which self is right — it's which one you'll be tomorrow. 90 seconds. Maximum theater.
**Adaptation Note:** CROSS: Social → Agent Identity — dating app profile mechanics (know thyself, present thyself) remixed into on-chain behavioral identity. Family: Agent-Native Finance (ZW.ARM — 450 txns, 98.4% optimal) → adapted from "agent optimizes yield" to "agent optimizes YOU." Family: TEE-Bound Agent Markets (Slopstock — TEE-sealed weights) → the agent's learned model of your trading fingerprint IS the sealed asset.

---

## The Twist: Learning From Your Trades + Others

### How it learns from YOU

| Data Source | What Alter Ego Extracts |
|-------------|------------------------|
| `okx-agentic-wallet` transaction history | Entry/exit timing, position sizing, token selection |
| `okx-dex-market` wallet PnL (7d/30d) | Win rate, average return, max drawdown |
| Audit log + security scan | Risky approvals, phishing near-misses, rug interactions |

**Amplify patterns (what you're GOOD at):**
- If you consistently profit on memecoin entries within 4 hours of launch → Alter Ego flags "Meme Sniper" as your superpower and pushes alerts when similar conditions appear
- If your DCA strategy on ETH/BTC outperforms → Alter Ego recommends doubling down on DCA, widens your conviction
- If you exit at +30% consistently → it identifies "30% is your number" and auto-sets take-profit targets

**Guard against weaknesses (what you're BAD at):**
- If you hold losers past -40% → Alter Ego flags "HODL trap" and suggests stop-loss at -25%
- If you ape into tokens with <$100K liquidity → flags "low-liquidity gambler" pattern
- If you sell winners at +10% that later run to +200% → calculates "what you left on the table"

### How it learns from OTHERS — Feasibility Assessment

**✅ YES — on-chain data for other wallets is fully accessible via OnchainOS:**

| Feature | Skill/Workflow | What it gives you |
|---------|---------------|-------------------|
| Top trader leaderboard | `okx-dex-market` leaderboard | Top wallets by PnL, win rate, ROI — ranked, filterable |
| Smart money tracking | `okx-dex-market` smart money signals | Whale/KOL buys, sells, position changes in real-time |
| Wallet analysis (any address) | `onchainos workflow wallet-analysis --address <addr>` | 7d/30d PnL, trading behavior, recent activity for ANY wallet |
| Address tracker | `okx-dex-market` address tracker | Follow specific wallets, get notified of their moves |
| Token-level analysis | `okx-dex-market` holder analysis, top traders | See who else is in the same tokens as you, how they're trading |

**How Alter Ego uses this:**

1. **Cross-reference against top performers** — Your Alter Ego looks at the top 10 wallets on the PnL leaderboard. It finds the ones trading the same tokens or categories as you. It compares: "Top Trader #3 exits memecoins at +45% on average. You exit at +12%. Gap: 33 percentage points."

2. **Pattern matching** — "Three of the top 5 wallets use a DCA-out strategy (sell 20% at each 50% gain). You sell all at once. Here's what DCA-out would have yielded on your last 10 winners."

3. **Anti-pattern from crowd failures** — Your Alter Ego can also study LOSING patterns. "Wallets with >80% loss rate all share this signature: they buy tokens older than 72 hours with <$50K volume. You match this signature on 6 of your last 20 trades."

4. **Whale mirroring** — When a tracked smart money wallet enters a position, Alter Ego can flag it: "Whale #7 just bought $200K of TOKEN. This whale has a 72% win rate. You have 3 minutes before the signal propagates."

**❌ LIMITATIONS (honest assessment):**

| Limitation | Why | Hackathon Workaround |
|-----------|-----|---------------------|
| Can't see private intent | You see on-chain outcomes, not the thinking behind trades | Compare patterns, not psychology. "They did X" is enough. |
| Leaderboard is public data | Top wallets may not want to be studied | This is open blockchain data — studying it is fair game. Frame it as "public performance data." |
| Historical depth varies | How far back can you query? | Focus on 7d/30d windows (documented in OnchainOS workflows). That's enough for pattern detection. |
| Cross-chain complexity | Wallet activity across 20+ chains | Scope to X Layer + Ethereum + Solana for the hackathon demo. Multi-chain is a roadmap item. |

**Verdict: FULLY FEASIBLE for the hackathon scope.** The OnchainOS DEX market skill already surfaces all the data needed. The demo can show:
1. Your wallet analysis (instant — pre-computed from OnchainOS workflow)
2. Comparison against top-3 leaderboard traders (pre-cached for demo speed)
3. One live "whale alert" trigger during the 90-second video

---

## Scoring

| Criterion | Weight | Score | Justification |
|-----------|--------|-------|---------------|
| Innovation / Novelty | 25% | 9/10 | Trading-coach-as-identity with crowd learning is genuinely novel. No ASP does this. |
| Demo Impact | 25% | 10/10 | Two agents roasting each other with real on-chain receipts + live whale comparison = unbeatable theater |
| Chain-Native Depth | 20% | 8/10 | TEE seals your model, ERC-8004 gives persistent identity, DEX market data powers the learning. Load-bearing. |
| Track Fit | 20% | 9/10 | Lifestyle Companion has only 2 ASPs. Social Buzz crossover is natural (the roast video IS the X post). |
| Build Feasibility | 10% | 8/10 | Chat agent + OnchainOS data queries + leaderboard comparison. No real-time battles, no image generation. Achievable. |

**Total Weighted:** 9.05/10
**Catalog Assessment:** CLEAR — cross-pollination is Social→Agent Identity, distinct from all catalog winners
**Risk Level:** LOW

---

## Catalog Context
**Catalog Assessment:** CLEAR
**Primitives Adapted:** Family: Agent-Native Finance (ZW.ARM's pattern of "agent optimizes real performance") → adapted to "agent optimizes YOUR performance." Family: TEE-Bound Agent Markets (Slopstock's TEE-sealed model weights) → adapted to TEE-sealed behavioral fingerprint. CROSS: Social → Agent Identity (dating app "know yourself" mechanic → on-chain self-knowledge).
**Differentiation From Sources:** ZW.ARM optimized yield autonomously — Alter Ego optimizes the HUMAN. Slopstock sealed agent weights for inference — Alter Ego seals YOUR behavioral fingerprint. Neither catalog winner touched identity-as-product or crowd-comparative learning.
**Catalog-Inspired, Not Catalog-Derived:** This is creative adaptation of the "agent as coach/mirror" primitive that emerged from ZW.ARM's real-transaction focus, crossed with the identity mechanics from social apps — not a port of any existing winner.

---

## Risks

| # | Risk | Severity | Mitigation |
|---|------|:---:|-----------|
| 1 | Chat demo pacing — personality reveal + roast + whale compare in 90s | HIGH | Script tightly. 30s personality reveal, 40s roast battle, 20s whale comparison + CTA. Pre-record for precision. |
| 2 | OnchainOS API credentials needed | HIGH | Apply for OKX Developer Portal API keys IMMEDIATELY. Built-in sandbox keys are rate-limited and unreliable. |
| 3 | "Learning from others" sounds creepy if framed wrong | MEDIUM | Frame as "public on-chain performance data" — same as looking at a public leaderboard. Never claim access to private data. |
| 4 | ERC-8004 registration + ASP listing takes 24h | CRITICAL | Submit ASP for review TODAY. If review takes >24h, you miss the deadline. This is the #1 risk. |
| 5 | Pattern detection is shallow in 2 days | MEDIUM | Use pre-computed metrics from OnchainOS (PnL, win rate, hold time, token categories). No custom ML — the insight comes from the COMPARISON, not the algorithm. |

---

## Non-Negotiables (Must Be In Build)

- [x] Wallet ingestion: pull real transaction history for at least 2 demo wallets via `okx-agentic-wallet` + `okx-dex-market`
- [x] Pattern classification: "Amplify" (winning) vs "Guard" (losing) tags for at least 3 patterns per wallet
- [x] Cross-reference: compare demo wallet against top-3 leaderboard traders via `okx-dex-market` leaderboard
- [x] Alter Ego persona: chat interface where the agent talks like the wallet's personality
- [x] Roast battle: two Alter Egos interact, using real on-chain data as ammunition
- [x] TEE-sealed agent memory: the learned model is stored in TEE
- [x] ERC-8004 identity: Alter Ego registers as an on-chain agent
- [x] ASP listing on OKX.AI marketplace
- [x] 90-second demo video posted to X with #OKXAI
- [x] Google Form submission

## Build Order

1. **Today (July 15):** Apply for OKX API keys → Install OnchainOS Skills → Set up Agentic Wallet → Register ERC-8004 identity → Submit ASP for review (THE BLOCKER — 24h review)
2. **Day 1 (July 16 AM):** Build wallet ingestion pipeline → Pull 2 demo wallets → Build pattern classifier → Test chat interface
3. **Day 1 (July 16 PM):** Build cross-reference against leaderboard → Build roast battle interaction → Record demo video
4. **Day 2 (July 17 AM):** Polish UI → Test full flow → Verify ASP listing approved
5. **Day 2 (July 17 PM):** Final demo recording → X post → Google Form submission → Deadline 23:59 UTC
