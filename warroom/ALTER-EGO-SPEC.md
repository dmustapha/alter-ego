# ALTER EGO — Complete Specification
**OKX.AI Genesis Hackathon | Deadline: July 17, 2026 23:59 UTC**
**Track:** Lifestyle Companion + Social Buzz crossover
**ASP Type:** A2A (Agent-to-Agent) — user negotiates with Alter Ego for persona creation + ongoing coaching

---

## 0. Core Design Principles

### 0.1 SELF-LEARNING IS PRIMARY — The crowd is a mirror, not a teacher

Alter Ego's value hierarchy:

```
LAYER 1 (PRIMARY — mandatory, runs first): KNOW THYSELF
  └─ Analyze EVERY wallet, EVERY chain, EVERY trade the user has ever made
  └─ Classify AMPLIFY patterns: "Here's what you're actually good at"
  └─ Classify GUARD patterns: "Here's what's actually costing you money"
  └─ Generate persona from YOUR data only
  └─ Show the dollar cost of every bad pattern: "HODL Trap cost you $6,800"

LAYER 2 (SECONDARY — enhancement, runs after Layer 1): KNOW OTHERS
  └─ Cross-reference against top-3 leaderboard traders
  └─ Show the gap: "Top Trader #3 exits at +45%. You exit at +12%. That's $8,400."
  └─ Not "copy them" — "here's what's possible if you fix your patterns"

LAYER 3 (TERTIARY — social, opt-in): ROAST BATTLES
  └─ Compare two users' Alter Egos
  └─ Or: compare two of YOUR OWN wallets that contradict each other
  └─ Theater built on real data
```

**The user's insight:** Most traders don't actually know what kind of trader they are. They remember the wins, forget the losses, and never see patterns across wallets and chains. Alter Ego shows them the truth. Self-knowledge is the product. Crowd comparison is the upsell.

### 0.2 MULTI-ADDRESS — One person, many wallets

**The reality:** A crypto user typically has 3-7 wallets across chains. A trading wallet, a cold storage wallet, a DeFi wallet, a memecoin degen wallet, an NFT wallet. Alter Ego must aggregate them all.

**Discovery (how Alter Ego finds your wallets):**

| Approach | Hackathon? | Post-Hackathon? |
|----------|:---:|:---:|
| **Manual input** — user pastes all addresses | ✅ Demo uses this | Fallback |
| **Seed + trace** — user gives 1 address, Alter Ego follows fund flows to find linked wallets | ❌ Out of scope | ✅ Phase 2 |
| **OnchainOS native** — does OKX expose related-wallet data? | ❌ Not documented | Monitor |

**For the demo:** User manually inputs 2-3 addresses across Ethereum and Solana. The UI shows: "Connected: 3 wallets across 2 chains. 4,127 transactions found."

**Aggregation model:** UNIFIED PERSONA. All wallets contribute to one Alter Ego. The persona synthesizes across wallets: "Across your 3 wallets, you have one superpower (memecoin entries) and one fatal flaw (HODL Trap)."

**Privacy:** All wallet linking happens inside the TEE. The public Alter Ego persona never exposes wallet addresses — only patterns. Users choose which wallets to include.

### 0.3 MULTI-CHAIN — Cross-chain pattern correlation

**OnchainOS supports 20+ chains.** For the hackathon, focus on X Layer + Ethereum + Solana.

**Patterns are classified as:**

| Type | Definition | Example |
|------|-----------|---------|
| **CHAIN-AGNOSTIC** (personality) | Same pattern across ≥2 chains | Panic sells at -20% on both ETH and SOL |
| **CHAIN-SPECIFIC** (environmental) | Pattern only appears on one chain | Memecoin sniping only on Solana (low fees enable it) |

**The persona distinguishes them:**
- "On Solana you're a degen with 60% memecoin win rate."
- "On Ethereum you're a gentleman farmer earning 12% APY."
- "These are completely different people. Which one is the real you?"

### 0.4 CONTRADICTORY PATTERNS — When your wallets disagree

**The scenario:** One wallet is profitable (+$12K). Another is a disaster (-$8K). Same person.

**Alter Ego's response:**
- Unified persona acknowledges the split: "You have two trading personalities."
- The roast battle can be INTERNAL: your own wallets roasting each other
- The insight: "You're not one kind of trader. You're at least two. Now choose."

**For the demo:** This is the roast battle scenario. Two wallets from the same person (or two different users) with contrasting patterns. Maximum drama.

### 0.5 PERSONA EVOLUTION — The learning loop

| Phase | Timeframe | Deliverable |
|-------|-----------|-------------|
| **Initial Scan** | First session (demo) | Full historical analysis. All tags. Persona card. |
| **Check-in** | 1 week later (post-hackathon) | Re-scans 7 days. "Last week: 3 HODL Traps. This week: 0. You're learning." |
| **Evolution** | 1 month (post-hackathon) | Persona updates. Superpower may change. "You were a Meme Sniper. Now you're a Disciplined Defender." |

**For the hackathon:** Initial Scan only. The demo shows the FIRST analysis. The product pitch mentions evolution.

### 0.6 DEMO WALLET STRATEGY

**Decision: Real public wallets from OnchainOS leaderboard, anonymized in the demo.**

1. Query `okx-dex-market` leaderboard for top traders
2. Select 2 wallets with contrasting, interesting patterns:
   - **Wallet A:** High volume, liquidations, memecoin → "DeFi Degen"
   - **Wallet B:** Low volume, diamond hands, NFT → "Diamond Hands"
3. Run full pattern analysis on both
4. Verify patterns are demo-worthy (≥3 HIGH-confidence tags each)
5. Anonymize in video: "0x...a3f7" and "0x...b2e1"
6. All data is cached for demo. The 90-second video shows the RESULT, not the live analysis.

**Rationale:** Real data = authentic patterns. The roast lines hit harder when they cite real on-chain events.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      ALTER EGO ASP                            │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐    │
│  │              MULTI-ADDRESS + MULTI-CHAIN INGESTION    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │    │
│  │  │ Wallet A │  │ Wallet B │  │ Wallet C │  ...N     │    │
│  │  │ (ETH)    │  │ (SOL)    │  │ (X LAYER)│           │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘           │    │
│  │       └──────────────┼─────────────┘                 │    │
│  │                      ▼                               │    │
│  │         ┌────────────────────────┐                   │    │
│  │         │   UNIFIED TX HISTORY   │                   │    │
│  │         │   (all chains, all     │                   │    │
│  │         │    addresses merged)   │                   │    │
│  │         └───────────┬────────────┘                   │    │
│  └─────────────────────┼────────────────────────────────┘    │
│                        ▼                                      │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                 PATTERN CLASSIFIER                     │    │
│  │  ┌────────────────┐  ┌────────────────┐              │    │
│  │  │ CHAIN-AGNOSTIC │  │ CHAIN-SPECIFIC │              │    │
│  │  │ (personality)  │  │ (environmental)│              │    │
│  │  │                │  │                │              │    │
│  │  │ Panic sell -20%│  │ SOL memecoin   │              │    │
│  │  │ HODL past -40% │  │   sniper 60%   │              │    │
│  │  │ 3am degen mode│  │ ETH DeFi farm  │              │    │
│  │  └───────┬────────┘  └───────┬────────┘              │    │
│  │          └──────────┬────────┘                       │    │
│  │                     ▼                                │    │
│  │         ┌────────────────────────┐                   │    │
│  │         │  UNIFIED PERSONA MODEL │                   │    │
│  │         │  AMPLIFY + GUARD tags  │                   │    │
│  │         └───────────┬────────────┘                   │    │
│  └─────────────────────┼────────────────────────────────┘    │
│                        ▼                                      │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                  PERSONA ENGINE                        │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │    │
│  │  │  COACH   │  │  ROAST   │  │  CROWD-WISDOM    │   │    │
│  │  │  MODE    │  │  MODE    │  │  COMPARISON      │   │    │
│  │  │          │  │          │  │  (secondary)     │   │    │
│  │  │ "Here's  │  │ "Your    │  │ "Top Trader #3   │   │    │
│  │  │  what    │  │  SOL self│  │  exits at +45%"  │   │    │
│  │  │  you're  │  │  vs your │  │                  │   │    │
│  │  │  good at"│  │  ETH self│  │                  │   │    │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │    │
│  └─────────────────────┬────────────────────────────────┘    │
│                        ▼                                      │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                  TEE ENCLAVE                           │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │    │
│  │  │ Behavioral │  │  Pattern   │  │ Multi-Address  │  │    │
│  │  │Fingerprint │  │  Model     │  │ Link Map       │  │    │
│  │  │(sealed)    │  │  (sealed)  │  │ (sealed)       │  │    │
│  │  └────────────┘  └────────────┘  └────────────────┘  │    │
│  └─────────────────────┬────────────────────────────────┘    │
│                        ▼                                      │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              ERC-8004 ON-CHAIN IDENTITY                │    │
│  │  Identity Registry │ Reputation Registry              │    │
│  │  Validation Registry (TEE attestation proofs)         │    │
│  └──────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────┤
│              ONCHAINOS SKILLS (all 4 load-bearing)            │
│  okx-dex-market │ okx-agentic-wallet │ okx-ai │ okx-        │
│                 │                     │        │ agent-      │
│                 │                     │        │ payments    │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow (per user session)

**PHASE 1: SELF-LEARNING (primary, mandatory)**
```
1. User authenticates → Agentic Wallet login (email-based, TEE)
2. User inputs all wallet addresses (multi-address, multi-chain)
3. For EACH wallet address:
   a. Query tx history → okx-agentic-wallet (all swaps, sends, receives, approvals)
   b. Query PnL → okx-agentic-wallet (per-token, per-chain)
   c. Enrich analytics → okx-dex-market (7d/30d wallet analysis per chain)
   d. Security scan → okx-agentic-wallet (risky approvals, phishing, rugs)
4. MERGE: unified transaction history across all chains, all addresses
5. Pattern Classifier runs → CHAIN-AGNOSTIC tags + CHAIN-SPECIFIC tags
6. Contradiction detection: are your wallets different people?
7. UNIFIED PERSONA generated from YOUR data only
```
**PHASE 2: CROWD LEARNING (secondary, after Phase 1)**
```
8. Pull leaderboard → okx-dex-market (top-3 traders by PnL/win rate)
9. Cross-reference: compare unified persona vs top performers
10. Generate gap analysis: "Top Trader #3 exits at +45%. You exit at +12%."
```
**PHASE 3: SEAL + IDENTITY**
```
11. All learned state sealed → TEE attestation: fingerprint + pattern model + address link map
12. ERC-8004 identity updated → reputation registry, validation registry
```
**PHASE 4: INTERACT**
```
13. User interacts → Coach mode, Roast mode, Crowd-Wisdom comparison
14. Roast battle: two users' Alter Egos face off, OR user's own contradictory wallets battle
```

---

## 2. Data Ingestion Pipeline — Every OnchainOS Call

### 2.1 SELF-LEARNING: Wallet History (own wallets, all chains, all addresses)

**Runs FIRST. This is the primary mechanic.** For every wallet address the user provides, across every chain:

| Step | Skill | Command / Call | Returns | Demo Use |
|------|-------|---------------|---------|----------|
| A | `okx-agentic-wallet` | Get transaction history (last N txns) | Every swap, send, receive, approve — with timestamps, amounts, tokens, gas | Feed for pattern detection |
| B | `okx-agentic-wallet` | Get portfolio PnL | Current balances, total PnL, per-token PnL | "You're up $12K lifetime but $8K of that was one trade" |
| C | `okx-dex-market` | Wallet analysis workflow (`onchainos workflow wallet-analysis --address <addr>`) | 7d PnL, 30d PnL, trading behavior summary, recent activity | Compare short-term vs long-term performance |
| D | `okx-agentic-wallet` | Audit log | All approvals, contract interactions, security events | Detect risky behavior patterns |
| E | `okx-agentic-wallet` | Security scan | Token risk scores, DApp phishing checks, transaction security | "You approved 14 contracts, 3 of which are now flagged" |

### 2.2 Crowd Learning (other wallets)

| Step | Skill | Command / Call | Returns | Demo Use |
|------|-------|---------------|---------|----------|
| F | `okx-dex-market` | Leaderboard (top traders by PnL/win rate) | Ranked list with addresses, PnL, win rate, token categories | "Top Trader #3's win rate is 72%. Yours is 41%." |
| G | `okx-dex-market` | Smart money / whale / KOL signals | Recent buys/sells from tracked high-signal wallets | "Whale #7 just bought $200K of the same token you're in" |
| H | `okx-dex-market` | Wallet analysis on top-3 leaderboard wallets | 7d/30d PnL, trading behavior for each | Cross-reference patterns |
| I | `okx-dex-market` | Address tracker (follow specific wallets) | Real-time activity from followed wallets | Ongoing monitoring after demo |
| J | `okx-dex-market` | Token holder analysis | Who else holds the same tokens, their behavior | "3 of the top 10 traders also hold this token. Average exit: +45%" |

### 2.3 Data Freshness Constraints

| Data Type | Staleness Tolerance | Refresh Strategy |
|-----------|:---:|-----------------|
| Transaction history | 24h | Pull once per session, cache |
| PnL calculations | 24h | Pull once per session, cache |
| Leaderboard rankings | 6h | Pull once per session, cache |
| Smart money signals | 5 min | Can be live for demo (pre-cache for video) |
| Security scan results | On-demand | Real-time |

**For the demo video:** All data is pre-cached. The demo shows the RESULT of the ingestion, not the ingestion itself. The 90 seconds is pure analysis + persona + roast.

---

## 3. Pattern Classification Engine

### 3.1 Input Schema

For each trade in the user's history, extract:
```
{
  trade_id: string,
  timestamp: ISO8601,
  token_in: { symbol, address, chain },
  token_out: { symbol, address, chain },
  amount_in_usd: number,
  amount_out_usd: number,
  pnl_usd: number,          // realized PnL (can be negative)
  pnl_pct: number,
  hold_duration_min: number, // time between buy and sell
  dex: string,              // which DEX
  category: string,         // "memecoin" | "bluechip" | "stablecoin" | "defi" | "nft" | "other"
  liquidity_at_entry: number,
  was_rug: boolean,
  was_phishing: boolean
}
```

### 3.2 Amplify Tags (What You're Good At)

| Pattern ID | Detection Rule | Tag Name | What Alter Ego Says |
|-----------|---------------|----------|---------------------|
| AMP-01 | ≥3 trades in category with avg PnL > +30% | `{category} Sniper` | "You've got a gift for {category} entries. Amplifying this." |
| AMP-02 | ≥5 DCA buys on same token, avg entry improvement > 10% | `Patient Accumulator` | "Your DCA discipline on {token} is elite. Double down." |
| AMP-03 | Avg exit within 5% of local top across ≥5 trades | `Top Tick` | "You exit at the top 73% of the time. Trust your instinct." |
| AMP-04 | PnL on trades 2am-6am UTC > 2x daytime PnL | `Night Owl Edge` | "You trade better when the market sleeps. Lean into late sessions." |
| AMP-05 | Win rate on tokens < 24h old > 60% | `Early Bird` | "You spot winners before the crowd. That's rare." |
| AMP-06 | Stop-loss hit rate > 80% with avg loss < -5% | `Disciplined Defender` | "You cut losers fast. This is what keeps you alive." |

### 3.3 Guard Tags (What You're Bad At)

| Pattern ID | Detection Rule | Tag Name | What Alter Ego Says |
|-----------|---------------|----------|---------------------|
| GRD-01 | ≥3 trades held past -40% | `HODL Trap` | "You hold losers hoping they bounce. They don't. Set a -25% stop." |
| GRD-02 | ≥5 trades on tokens with liquidity < $100K | `Rug Roulette` | "You're gambling on micro-cap tokens. 60% of these rug." |
| GRD-03 | Sold ≥3 tokens at +10% that later ran to +100%+ | `Paper Hands` | "You leave money on the table. Here's what DCA-out would have done." |
| GRD-04 | Avg gas spent > 2x network average | `Gas Guzzler` | "You overpay gas by 2x. Use Gas Station on OnchainOS." |
| GRD-05 | ≥5 approvals to unverified contracts | `Blind Signer` | "You approved 14 contracts. 3 are flagged. Revoke these." |
| GRD-06 | ≥3 trades reversed within 2 hours (panic sell) | `Paper Trader` | "You buy and sell the same token within 2 hours. That's not trading — that's panicking." |

### 3.4 Confidence Scoring

Each tag carries a confidence score:
- **HIGH** (≥5 data points, clear pattern): bold assertion, roast-worthy
- **MEDIUM** (3-4 data points, emerging pattern): suggestive, coaching tone
- **LOW** (1-2 data points, insufficient data): "I notice... but need more trades to confirm"

**For the demo:** Both wallets are pre-selected to have HIGH-confidence tags on at least 3 patterns each.

---

## 4. Crowd Learning Pipeline

### 4.1 Leaderboard Comparison

```
Step 1: Pull top-10 leaderboard → okx-dex-market
Step 2: Filter to wallets trading same categories as user
Step 3: Run pattern classifier on top-3 filtered wallets (same AMP/GRD tags)
Step 4: Diff: user's metrics vs top trader's metrics
Step 5: Generate "You vs Them" comparison cards
```

### 4.2 Comparison Card Schema

```json
{
  "metric": "avg_exit_pct",
  "you": 12.3,
  "top_trader_3": 45.7,
  "gap": 33.4,
  "gap_direction": "underperforming",
  "insight": "Top Trader #3 exits memecoins at +45.7%. You exit at +12.3%. If you'd held your last 5 winners to +45%, you'd have $8,400 more.",
  "actionable": "Consider DCA-out: sell 33% at +20%, 33% at +40%, 34% at +60%."
}
```

### 4.3 Leaderboard Wallets (pre-selected for demo)

For the demo, we pre-select 3 leaderboard wallets and pre-compute their patterns. The comparison is shown as a "live analysis" but data is cached for video smoothness.

| Demo Wallet | Address Source | Why |
|-------------|---------------|-----|
| Wallet A (DeFi Degen) | Dami's wallet or a test wallet with known patterns | Shows HODL Trap + Early Bird tags |
| Wallet B (NFT Collector) | Second test wallet | Shows Paper Hands + Rug Roulette tags |
| Top Trader #3 | Real leaderboard wallet (anonymized) | Shows comparative metrics |

### 4.4 Smart Money Mirroring

```
Step 1: User's Alter Ego monitors tracked whales → okx-dex-market smart money signals
Step 2: When a tracked whale enters a token the user also holds/is watching:
  → "Whale #7 just bought $200K of TOKEN. Their win rate: 72%. Your position: $5K. 
     The last 3 times this whale moved on your tokens, you gained +18%."
Step 3: This is a COACHING signal, not a trade signal — Alter Ego never says "buy this"
```

---

## 5. Persona Engine

### 5.1 Persona Generation

From the pattern tags, Alter Ego generates a persona with:

| Persona Component | Source Data | Example |
|-------------------|-------------|---------|
| **Archetype** | Dominant AMP tags | "Meme Sniper with Diamond Hand Tendencies" |
| **Catchphrase** | Generated from top pattern | "I buy early, I hold through pain, I exit at the top. Usually." |
| **Vice** | Dominant GRD tag | "Cannot resist a token under $100K liquidity" |
| **Superpower** | Highest-confidence AMP tag | "Finds memecoins before they hit DEXScreener" |
| **Kryptonite** | Highest-cost GRD tag | "Down 40%? That's when the real conviction starts. (It never recovers.)" |
| **Trading Style** | Aggregated metrics | "High volume, high conviction, 41% win rate, +$12K lifetime" |
| **Emoji Signature** | Category + personality | "🔫🐋💎" (sniper whale diamond hands) |

### 5.2 Tone Modes

| Mode | Trigger | Tone | Example |
|------|---------|------|---------|
| **Roast** | User initiates roast battle / comparison with another Alter Ego | Brutal, funny, uses real data as ammunition | "You hold losers longer than most people hold relationships." |
| **Coach** | User asks "what should I do?" / "analyze my last trade" | Supportive, data-driven, actionable | "Your last 3 exits were at +12%. Here's what +30% would look like." |
| **Mirror** | User asks "who am I as a trader?" | Reflective, insightful, persona-rich | "You're a DeFi degen who buys tops but somehow still comes out ahead. Respect." |
| **Whisper** | Whale alert / comparison card | Urgent, concise, time-sensitive | "Whale #7 just entered. 72% win rate. You have 3 minutes." |

### 5.3 Chat Interface (for demo)

- Terminal-style UI with Alter Ego avatar
- Messages appear with typing animation
- Data cards (comparisons, tags) appear as embedded cards, not raw text
- Color coding: Amplify = green, Guard = red, Whale alert = amber
- The roast battle uses a split-screen with both Alter Egos visible

---

## 6. Roast Battle Mechanic

### 6.1 Setup

Two wallets are loaded. Each Alter Ego has analyzed its own wallet. Neither knows the other's data until the battle begins.

### 6.2 Battle Format (90-second demo allocation: 40s)

```
Round 1 (15s): INTRODUCTIONS
  - Alter Ego A reveals its wallet's archetype + superpower
  - Alter Ego B reveals its wallet's archetype + superpower
  - Visual: side-by-side persona cards slide in

Round 2 (15s): ROAST EXCHANGE
  - Alter Ego A attacks using B's GRD (Guard) tag data
  - Alter Ego B counter-attacks using A's GRD tag data
  - Visual: red "GUARD" tags flash as each insult lands
  - Example A→B: "You've minted 2,000 NFTs and never sold ONE. 
    That's not collecting — that's hoarding with a JPEG addiction."
  - Example B→A: "You bought the top on ETH three times. THREE. 
    At that point it's not bad luck — it's a subscription service."

Round 3 (10s): CROWD WISDOM
  - Both Alter Egos pull the same top-trader comparison
  - "Top Trader #3 would have made $8,400 more on these exact tokens."
  - Visual: comparison card appears between them
```

### 6.3 Roast Line Generation Rules

- Every roast MUST cite a specific on-chain fact (tx hash, amount, date)
- No generic insults — "you're bad at trading" is boring. "You bought PEPE at ATH on March 14" is evidence.
- Lines are pre-generated (not real-time LLM) for demo reliability
- Maximum 2 roasts per Alter Ego (fits 40-second window)
- Ending is always the crowd-wisdom comparison — it elevates from comedy to insight

---

## 7. TEE Integration

### 7.1 What's Sealed in TEE

| Data | Sealed? | Why |
|------|:---:|------|
| Behavioral fingerprint (full pattern model) | ✅ YES | This is your trading DNA — nobody should be able to extract it |
| Wallet address → pattern mapping | ✅ YES | Privacy-preserving: your Alter Ego exists without exposing your wallet |
| Persona state (archetype, catchprase, tone) | ✅ YES | Your Alter Ego is YOURS — not cloneable |
| Roast lines (pre-generated) | ❌ NO | These are public performance data, not private |
| Leaderboard comparison data | ❌ NO | Public data from OnchainOS |
| Transaction history (raw) | ✅ YES | Stored inside enclave, only used for pattern computation |

### 7.2 TEE Attestation Flow

```
1. User logs into Agentic Wallet → TEE generates session key
2. Alter Ego requests wallet history → signed by TEE key
3. Pattern Classifier runs INSIDE the enclave → raw tx data never leaves TEE
4. Behavioral fingerprint computed → sealed to enclave memory
5. Attestation quote generated → includes:
   - MRENCLAVE hash (proves code integrity)
   - Public key hash (proves this is YOUR Alter Ego)
   - Timestamp
6. Attestation quote stored on X Layer via ERC-8004 Validation Registry
```

### 7.3 Demo Simplification

For the 90-second demo, TEE attestation is shown as a "Verified" badge + a truncated attestation hash on screen. The actual attestation process is pre-computed. The demo shows the RESULT of attestation, not the attestation generation.

---

## 8. ERC-8004 Identity

### 8.1 Registration Flow

```
1. Install OnchainOS: npx skills add okx/onchainos-skills --yes -g
2. Login to Agentic Wallet (email-based)
3. Register ERC-8004 identity via okx-ai skill:
   → Name: "Alter Ego"
   → Description: "Your on-chain trading twin. Learn from your wins, guard against your losses."
   → Category: Lifestyle
   → Service Type: A2A (Agent-to-Agent)
   → Pricing: User negotiates per session
4. Identity NFT minted on X Layer (ERC-721)
5. Identity stored in ERC-8004 Identity Registry
```

### 8.2 Reputation Model

After each user interaction, the user can rate the Alter Ego via ERC-8004:
- ⭐ Rating (1-5)
- 📝 Review text
- 🔗 Linked to specific interaction session

Reputation accumulates on the Reputation Registry:
- Average rating
- Total interactions
- Verified TEE attestations (via Validation Registry)
- "Alter Ego of wallet 0x... has 94% pattern accuracy over 127 sessions"

### 8.3 Validation Registry

Each TEE attestation is stored as a validation entry:
```json
{
  "agent_id": "ERC-8004 token ID",
  "attestation_type": "behavioral_fingerprint",
  "mrenclave_hash": "0x...",
  "timestamp": "ISO8601",
  "proof": "TEE quote (base64)"
}
```

---

## 9. ASP Listing & Registration

### 9.1 Registration Steps (CRITICAL PATH — 24h review)

| Step | Action | Tool/Method | Time |
|------|--------|-------------|------|
| 1 | Install OnchainOS Skills | `npx skills add okx/onchainos-skills --yes -g` | 2 min |
| 2 | Login to Agentic Wallet | Email-based auth | 1 min |
| 3 | Register ERC-8004 identity | okx-ai skill → register agent | 5 min |
| 4 | Create ASP listing | OKX.AI marketplace UI or API | 10 min |
| 5 | Submit for review | Marketplace submission flow | 1 min |
| 6 | Wait for approval | OKX internal review | ⚠️ Up to 24h |
| 7 | ASP goes LIVE | Listed on okx.ai/agents | Instant after approval |

### 9.2 ASP Listing Details

```json
{
  "name": "Alter Ego",
  "tagline": "Your on-chain trading twin. It knows your patterns better than you do.",
  "description": "Alter Ego reads your complete wallet history, identifies what you're good at (amplify) and what you're bad at (guard), then becomes your living on-chain persona. It cross-references top-performing traders to surface patterns you've never discovered. TEE-sealed so your trading fingerprint stays private. ERC-8004 identity so your Alter Ego builds reputation over time.",
  "category": "Lifestyle",
  "service_type": "A2A",
  "pricing_model": "Negotiated per session",
  "integrations": ["okx-dex-market", "okx-agentic-wallet", "okx-ai", "okx-agent-payments-protocol"],
  "tags": ["trading", "identity", "analytics", "coaching", "persona", "social"],
  "demo_video_url": "<X post URL with #OKXAI>"
}
```

### 9.3 🚨 THE BLOCKER

**ASP review takes up to 24 hours. The deadline is ~50 hours from now (July 15 afternoon → July 17 23:59 UTC). If review takes the full 24 hours and you submit tomorrow, you miss the deadline.**

**ACTION: Submit ASP listing for review TODAY (July 15) with a placeholder description. You can update it after approval.**

---

## 10. x402 Monetization

### 10.1 Pricing Model

| Tier | Price | What You Get |
|------|-------|-------------|
| **Snapshot** | $0.99 (one-time) | One wallet analysis: 3 Amplify tags, 3 Guard tags, persona card |
| **Coach** | $4.99/month | Ongoing coaching: weekly pattern updates, leaderboard comparisons, whale alerts |
| **Battle** | $1.99 (one-time) | Roast battle between two wallets (both must authorize) |

### 10.2 Payment Flow (A2A escrow)

```
1. User requests "Snapshot" tier
2. A2A negotiation: user agrees to $0.99
3. Payment held in escrow on X Layer (okx-agent-payments-protocol)
4. Alter Ego delivers analysis
5. User signs off → payment released from escrow
6. If user disputes → OKB-staked arbitration
```

### 10.3 For the Demo

The demo shows the x402 payment trigger but does not require real payment. The analysis is shown as "already purchased" — the demo focuses on what the user GETS, not the payment flow.

---

## 11. Demo Script — Shot by Shot (90 seconds)

```
[00:00-00:05] HOOK (5s)
  BLACK SCREEN. Text fades in: "Every wallet has a story."
  Cut to: Terminal-style UI. Text types out: "Alter Ego initiating..."
  Sound: subtle keyboard clicks

[00:05-00:15] MULTI-WALLET DISCOVERY (10s)
  Terminal UI. User pastes 3 addresses:
    "0x...a3f7 (Ethereum) — 4,127 txns"
    "0x...b2e1 (Solana) — 2,847 txns"  
    "0x...c9d4 (X Layer) — 316 txns"
  Alter Ego processes: "3 wallets. 2 chains. 7,290 transactions. I see you. ALL of you."
  SCAN COMPLETE. Two persona cards materialize side by side:
  
  LEFT: "ETHEREUM SELF" — Professional. Disciplined. +$12,430 lifetime.
  RIGHT: "SOLANA SELF" — Degen. Reckless. -$8,210 lifetime.
  
  Text overlay: "SAME PERSON. TWO COMPLETELY DIFFERENT TRADERS."
  
[00:15-00:35] PATTERN REVEAL — BOTH SELVES (20s)
  ETHEREUM SELF persona expands:
    AMPLIFY (green):
    ✅ Patient Accumulator — avg hold: 47 days
    ✅ Disciplined Defender — stop-loss hit rate: 82%
    GUARD (red):
    ❌ Gas Guzzler — 2.3x avg gas fees
    ❌ Blind Signer — 14 unverified contract approvals
    
  SOLANA SELF persona expands:
    AMPLIFY (green):
    ✅ Meme Sniper — 60% win rate, avg entry 3.2h after launch
    ✅ Early Bird — tokens < 24h old: +$14,700
    GUARD (red):
    ❌ Rug Roulette — 60% of micro-cap trades rugged, -$21,800
    ❌ Paper Trader — 43 panic sells within 2 hours of buying
    
  Persona cards lock: "The Professional" vs "The Degen"

[00:35-01:10] ROAST BATTLE — YOUR OWN WALLETS FIGHTING (35s)
  Split screen. ETHEREUM SELF faces SOLANA SELF.
  
  ETHEREUM SELF:
  "You lost $21,800 on tokens that rugged. Twenty-one THOUSAND dollars. 
   I could have farmed that safely at 12% APY while you were gambling on 
   dog coins at 3am."
  [On-screen: SOL's Rug Roulette GUARD tag flashes RED with loss counter]
  
  SOLANA SELF:
  "Oh I'm sorry, I was too busy making +$14,700 on memecoin entries to 
   notice your 14 unverified contract approvals. Fourteen! One of them 
   is definitely draining your wallet right now."
  [On-screen: ETH's Blind Signer GUARD tag flashes RED — approval list scrolls]
  
  ETHEREUM SELF:
  "At least I HAVE a wallet left to drain. You burn 60% of your trades 
   and call it 'strategy.' That's not strategy. That's a subscription 
   to losing money."
  
  SOLANA SELF:
  "Your biggest win this year was a 12% APY stablecoin farm. TWELVE 
   PERCENT. I made that during this conversation. But sure, tell me 
   more about 'risk management.'"
  [Audience: ooooh]
  
  BOTH (unison, turning to face the user):
  "The question isn't which one of us is right. The question is: 
   which one are you going to be tomorrow?"

[01:15-01:30] CROWD WISDOM (15s)
  Both Alter Egos turn to face a new card that slides in:
  "TOP TRADER #3 — 72% win rate, +$340K lifetime"
  
  Comparison overlay:
    Your avg exit: +12%  |  Top Trader #3: +45%
    Your worst habit: HODL Trap  |  Their strategy: DCA-out at +30/+50/+70
  
  ALTER EGO (unified voice):
  "Top Trader #3 exits memecoins at +45%. You exit at +12%. 
   On your last 5 winners, that gap cost you $8,400.
   Here's what DCA-out would look like..."
  
  Animated chart shows: same entries, DCA-out exits → line shoots up

[01:30-01:40] PRODUCT PITCH (10s)
  Full Alter Ego dashboard shown:
    - "Your Trading Fingerprint — TEE-Sealed"
    - "Learn from YOU. Learn from the BEST."
    - On-screen: ASP listing card "Alter Ego — Live on OKX.AI"
    - #OKXAI hashtag

[01:40-01:50] CTA + CREDITS (10s)
  "Alter Ego. Know thyself. Then know everyone else."
  OKX.AI Genesis logo
  X Layer logo
  #OKXAI
```

---

## 12. Tech Stack

### 12.1 Core

| Component | Technology | Why |
|-----------|-----------|-----|
| ASP Framework | Node.js + TypeScript | OnchainOS skills are Node-native, MCP/API-based |
| Frontend | Next.js (React) + Tailwind CSS | Fast UI, good for terminal-style + card layouts |
| Chat/Persona Engine | Claude API or GPT-4o (via OnchainOS orchestration) | Pre-generated for demo reliability |
| TEE Integration | OKX Agentic Wallet + OnchainOS | Built-in — no custom TEE code needed |
| State Management | In-memory + TEE sealed storage | Lightweight, no DB needed for hackathon scope |

### 12.2 OnchainOS Skills (4 required)

| Skill | Version | Purpose |
|-------|---------|---------|
| `okx-agentic-wallet` | latest stable | Wallet auth, tx history, PnL, security scan |
| `okx-dex-market` | latest stable | Leaderboard, wallet analysis, smart money, address tracker |
| `okx-ai` | latest stable | ERC-8004 registration, agent identity, task marketplace |
| `okx-agent-payments-protocol` | latest stable | x402/A2A payment escrow |

### 12.3 Dependencies

```json
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "tailwindcss": "^3",
    "typescript": "^5",
    "framer-motion": "^11",
    "lucide-react": "^0.400"
  }
}
```

No blockchain SDK needed directly — all on-chain interaction is through OnchainOS skills.

### 12.4 API Credentials

Apply at: https://web3.okx.com/onchain-os/dev-portal
Required env vars:
```bash
OKX_API_KEY="your-api-key"
OKX_SECRET_KEY="your-secret-key"
OKX_PASSPHRASE="your-passphrase"
```

---

## 13. Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| Wallet has < 10 transactions | "I need more data. Come back after 10 trades — I'll have something real to say. For now: trade carefully." |
| Wallet has zero losing trades | "Either you're the greatest trader alive, or you're hiding your losses on a different wallet. I can only see what's here." |
| Leaderboard API rate-limited | Cache leaderboard data. Show "Last updated: 2 hours ago" badge. |
| Smart money wallet is inactive | "Whale #7 hasn't traded in 72 hours. They might be on vacation. Or building a position. Either way: patience." |
| User's wallet is on Solana (not X Layer) | OnchainOS supports 20+ chains. Pull data cross-chain. No difference in UX. |
| Pattern confidence is LOW on all tags | "You're an enigma. I can't read you yet. Trade more consistently and I'll figure you out." |
| Roast battle: both wallets have same patterns | "You two are the same trader in different fonts. This isn't a roast — it's a mirror." |
| ASP listing rejected | Fix rejection reason, re-submit immediately. This is why submitting TODAY is critical. |
| TEE attestation fails | Fall back to non-attested analysis with "Unverified" badge. TEE is for privacy, not core function. |
| User has no Agentic Wallet | Prompt to create one: "Log in to Agentic Wallet on Onchain OS with my email" |

---

## 14. Scope Boundaries

### ✅ IN SCOPE (must build)

1. Wallet ingestion pipeline — pull tx history + PnL from OnchainOS
2. Pattern classifier — detect ≥3 Amplify + ≥3 Guard tags per wallet
3. Persona generation — archetype, catchphrase, superpower, kryptonite, emoji signature
4. Leaderboard comparison — cross-reference user against top-3 traders
5. Roast battle — two Alter Egos interact with real on-chain data
6. Terminal-style chat UI with data cards
7. TEE-sealed behavioral fingerprint (shown as verified badge in demo)
8. ERC-8004 agent identity registration
9. ASP listing on OKX.AI marketplace
10. 90-second demo video (pre-recorded, tightly scripted)
11. X post with #OKXAI + demo video
12. Google Form submission

### ❌ OUT OF SCOPE (do not build)

1. Real-time whale monitoring (pre-cache for demo)
2. Multi-chain ingestion beyond X Layer + Ethereum + Solana
3. Real x402 payment processing (show trigger, don't execute)
4. Actual TEE attestation generation (show pre-computed attestation)
5. Persistent user accounts / auth system (use Agentic Wallet auth)
6. Mobile-responsive UI (desktop-only for demo)
7. Historical data beyond 30 days (OnchainOS default)
8. Custom ML model (use rule-based classification)
9. Cross-wallet correlation ("people like you also...")
10. Portfolio rebalancing suggestions (Phase 2)

---

## 15. Build Order — Hour by Hour

### TODAY — July 15 (ASAP)

| Hour | Task | Deliverable |
|------|------|-------------|
| 0-1 | Apply for OKX API keys | API credentials |
| 1-2 | Install OnchainOS Skills | `npx skills add okx/onchainos-skills --yes -g` |
| 2-3 | Set up Agentic Wallet | Email login complete |
| 3-4 | Register ERC-8004 identity | Agent identity token minted on X Layer |
| 4-5 | Create ASP listing on OKX.AI | Listing submitted for review ⚠️ |
| 5-6 | Set up Next.js project scaffold | Project running with OnchainOS connected |
| 6-7 | Build wallet ingestion pipeline | Pull tx history from 2 demo wallets |
| 7-8 | Build pattern classifier (rule-based) | AMP/GRD tags generating correctly |

### TOMORROW — July 16

| Hour | Task | Deliverable |
|------|------|-------------|
| 8-12 | Build persona engine | Archetype, catchphrase, superpower, kryptonite |
| 12-14 | Build leaderboard comparison | Cross-reference working against top-3 |
| 14-16 | Build chat UI + roast battle mode | Split-screen agent interaction working |
| 16-18 | Build terminal-style UI | Card-based data display, animations |
| 18-20 | Pre-generate roast lines + comparisons | Script tested, timing verified |
| 20-22 | Record demo video (first take) | Rough cut, identify timing issues |

### DEADLINE DAY — July 17

| Hour | Task | Deliverable |
|------|------|-------------|
| 22-24 | Verify ASP listing approved ⚠️ | Listed on okx.ai/agents |
| 24-26 | Polish UI + fix bugs | All flows working |
| 26-28 | Record final demo video | 90-second video, tightly edited |
| 28-30 | Post to X with #OKXAI | X post live with video |
| 30-32 | Submit Google Form | Form submitted |
| 32-34 | Buffer — anything goes wrong, fix it | |
| 34-36 | FINAL DEADLINE: July 17, 23:59 UTC | EVERYTHING SUBMITTED |
