# Composite Trading Pattern Design

## Decision

Alter Ego will synthesize the **observable behavioral evidence** of a user-selected wallet cohort into a Composite Trading Pattern. It will not average persona names, infer shared ownership, or represent a behavior signal as a guaranteed trade outcome.

## Product boundary

The input is any selected collection of wallets: a user's wallets, peers, funds, researchers' targets, or a market cohort. The cohort is explicitly user-defined. Same-owner comparison is one compelling use case, not an assumption.

The product has two layers:

1. **Evidence layer**: live wallet analysis, patterns, behavioral grades, personas, and evidence cards.
2. **Decision layer**: a Composite Trading Pattern that explains what the selected wallets consistently do, where they conflict, and what trading rules are worth testing.

## Output contract

The Composite Trading Pattern must contain:

- **Market posture**: a concise behavior-led description, such as selective momentum or concentrated conviction.
- **Shared strengths**: recurring high-confidence amplify signals across the cohort.
- **Shared risks**: recurring guard signals across the cohort.
- **Disagreements**: behavior that differs materially by wallet or chain.
- **Playbook**: evidence-linked entry, sizing, exposure, and exit guardrails.
- **Coverage**: number of wallets, chains, transactions, and data quality.
- **Confidence**: a result of signal coverage, evidence strength, cross-wallet agreement, and outcome availability.
- **Limits**: an explicit statement that the result is a hypothesis until validated against historical outcomes.

Personas remain a human-readable explanation of each wallet. They are never inputs to a numerical or trading-rule aggregation.

## Full-scope architecture

```text
user-selected wallets
  → normalized transactions, balances, swaps, positions, and price history
  → per-wallet feature extraction
  → evidence-backed behavioral signals
  → cohort consensus and disagreement engine
  → Composite Trading Pattern
  → historical validation and regime analysis
  → user-approved trade proposal / agent action
```

### 1. Normalized evidence

Preserve per-event chain, timestamp, asset, direction, size, price, gas, protocol, and transaction provenance. Add position and realized-outcome data before making performance or entry claims.

### 2. Wallet behavior profiles

Compute observable dimensions rather than narrative labels: concentration, turnover, holding horizon, momentum-chasing proxy, drawdown response, execution cost, realized outcomes, and risk-token exposure. Each dimension carries coverage and confidence.

### 3. Cohort synthesis

Aggregate only compatible dimensions. Weight evidence by coverage, confidence, recency, and verified outcome quality. Surface both consensus and disagreement; never hide a conflict behind an average.

### 4. Strategy compiler

Translate a validated behavioral pattern into testable hypotheses and guardrails. A rule must point to supporting evidence, its assumptions, its applicable market regime, and its confidence. It may not become a token-specific recommendation without separate market and liquidity evidence.

### 5. Validation and action

Validate rules with time-split, walk-forward backtests that include fees, gas, slippage, liquidity, and survivorship controls. Only then expose a trade proposal. Execution remains user-confirmed and routed through the appropriate X Layer / OnchainOS capability.

## Tonight's demo lane

The demo will show only what is live and verifiable:

1. Submit a selected multi-wallet cohort.
2. Show real streaming scan progress and the evidence it retrieves.
3. Show per-wallet patterns, grade, and persona as evidence-layer outputs.
4. Explain that these outputs are the inputs to the Composite Trading Pattern, without claiming that the unbuilt strategy compiler is live.
5. Show the genuinely shipped Groq roast only if it is grounded in this scan; otherwise omit it.
6. Show real x402 settlement proof only with its on-chain transaction evidence, not a simulated UI flow.

The narration uses a warm, direct, builder-led walkthrough. It describes visible actions in short sentences, avoids generic AI language, and makes no unverified TEE, full-history, performance, or autonomous-trading claim.

## Delivery order

### Demo release, now

1. Verify and stabilize the uncommitted streaming/depth work.
2. Resolve demo-critical truth gaps in the UI and script.
3. Rehearse the production deployment with selected wallets.
4. Capture a 1920×1080 video with generated narration, accurate subtitles, and verified audio.
5. Reconcile the submission assets with the proof shown in the video.

### Full product, after submission

1. Build the normalized evidence schema and richer historical outcome collector.
2. Build wallet behavior profiles with coverage/confidence.
3. Build the cohort synthesis engine and Composite Trading Pattern API/UI.
4. Build the strategy-hypothesis and backtesting layer.
5. Build user-approved proposals and execution integration.

## Non-negotiable safety and truth rules

- Do not infer wallet ownership from selection.
- Do not infer alpha from a persona or a raw behavior signal.
- Do not show static comparison or roast data as results from a newly scanned cohort.
- Always expose insufficient data and conflicting evidence.
- Never imply that the payment UI settled a payment unless the shown path actually did.

## Success criteria

Tonight's demo is successful when it has a fresh production rehearsal, a truthful 1920×1080 MP4 with audio and subtitles, and submission copy consistent with the live product.

The full product is successful when a selected cohort produces an evidence-linked, confidence-scored Composite Trading Pattern whose rules have passed documented historical validation and can feed a user-approved action flow.
