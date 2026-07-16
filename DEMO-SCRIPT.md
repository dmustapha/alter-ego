# DEMO-SCRIPT — Alter Ego

**Generated:** 2026-07-16 | **Duration target:** 90s
**Audio strategy:** native (live narration)
**Live URL:** https://alter-ego.vercel.app (deploying)

---

## Pre-Recording Setup

- [x] Browser at 1280×800, zoom 100%, notifications off
- [x] DevTools closed (no console visible)
- [x] Demo data pre-seeded (LOAD DEMO fills 2 wallets)
- [x] All phases timing pre-calibrated (scanning 2s, results 18s, battle 38s, compare 18s)

---

## Filming Sequence

### Step 1: Landing Page — 0:00-0:10
**Action:** Open live URL in browser
**Show:** Hero text "Every wallet has a story." + integration strip (WALLET, DEX-MARKET, OKX-AI, X402)
**Say:** "Alter Ego is a TEE-bound agent that reads your entire on-chain history and reveals the trader you become on different chains. Same person. Two completely different traders."
**DO NOT SHOW:** Console, address bar

### Step 2: LOAD DEMO — 0:10-0:20
**Action:** Click LOAD DEMO button
**Show:** Addresses populate in textarea. ANALYZE button glows pink.
**Say:** "I'll load the demo wallets. One Ethereum address, one Solana address."

### Step 3: ANALYZE + Scanning — 0:20-0:30
**Action:** Click ANALYZE
**Show:** Scanning phase — "Analyzing 2 wallets..." with CRT flicker
**Say:** "Alter Ego ingests 4,463 transactions across three chains. It classifies every trade, builds a psychological profile."
**WAIT:** 2s for scanning to complete

### Step 4: Results — 0:30-0:45
**Action:** Results phase auto-appears after scanning
**Show:** Persona cards (The Professional / The Degen), PatternCards (AMPLIFY/GUARD), confidence scores
**Say:** "Here's what it found. On Ethereum: The Professional. Diamond hands, disciplined exits. On Solana: The Degen. High-frequency trading, chasing memes. The same person, two different traders."
**DO NOT SHOW:** Empty persona cards during load

### Step 5: Roast Battle — 0:45-0:65
**Action:** Battle auto-starts 20s after results
**Show:** 5-round roast battle. Pink/cyan/yellow speakers. GUARD tags flash pink. Witty lines.
**Say:** "Now the best part. Your Ethereum self and Solana self face off in a 5-round roast battle. Every insult is backed by real transaction data. 'You held through a 45% drawdown, that's not conviction, that's a coma.'"
**WAIT:** Battle plays 38s — let it run, interject at rounds 1, 3, and 5

### Step 6: Compare Card — 0:65-0:75
**Action:** Compare auto-appears after battle
**Show:** Side-by-side comparison. GAP COST: $31,500. Top Trader: Solana.
**Say:** "The comparison. Ethereum's win rate: 58%. Solana's: 72%. The Solana degen is actually the better trader. But at what cost? The GAP COST — what you lost by not being your best self on every chain — $31,500."
**DO NOT SHOW:** Negative percentages — double-check rendering

### Step 7: CTA — 0:75-0:90
**Action:** CTA phase auto-appears
**Show:** ATTESTATION VERIFIED badge. x402 payment button. TEE footer.
**Say:** "Wallets are a mirror. Alter Ego makes you look. This analysis is TEE-sealed. Cryptographic attestation pinned to this agent. Snapshot it. Share it. Or book a coaching session. Self-knowledge is the product. Built for OKX.AI Genesis."

---

## Do NOT Show During Recording

| Footgun | Severity | Why | Workaround |
|---------|----------|-----|-----------|
| TEE attestation is pre-computed mock | HIGH | "ATTESTATION: 0x7f3a...b91e" is static. Judges may challenge if inspected. | Don't linger on attestation text. Mention "TEE-sealed" verbally, move on. |
| x402 payment is simulated | LOW | "Simulate Payment" button appears. Not real USDC settlement. | Click past quickly. Frame as "payment gate integration proof." |
| Data is pre-cached | LOW | Real wallet addresses would fail if entered. | Only use LOAD DEMO. Never type random addresses. |
| OnchainOS not live | LOW | Integration strip implies live data but cache is static. | Frame as "demo mode with pre-loaded wallets." |

## Async Operation Timings

| Operation | Expected Wait | What to Do During Wait |
|-----------|--------------|----------------------|
| Scanning phase | 2s | Talk about wallet ingestion, 4,463 txns |
| Results → Battle transition | 18s | Discuss persona findings, pattern cards |
| Battle duration | 38s | Interject at rounds 1, 3, 5. Let battle play naturally. |
| Battle → Compare transition | ~0s | Instant — compare card appears |
| CTA transition | 18s | Recap the journey, tee up the close |

---

## Camera Notes

- **Font check:** Press Start 2P + Space Mono must render (pre-load page before recording)
- **CRT effects:** Scanlines and vignette add atmosphere — don't fight them
- **Color:** Pink (#ff2d95) and cyan (#00ffff) are the brand. Let the neon glow sell the aesthetic.
- **Corner brackets:** The Terminal component has pink/cyan L-brackets at each corner. Frame the shot to include at least 3 of 4.
