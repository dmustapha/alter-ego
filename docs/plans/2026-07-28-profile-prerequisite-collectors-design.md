# Profile Prerequisite Collectors Design

## Decision

Defer wallet behavior profiles until Alter Ego has typed, provenance-preserving evidence for every requested dimension. The normalized transaction layer remains the base; collectors enrich it without converting transfers into trades or unknown values into zeroes.

## Why this comes first

The present transaction endpoint can provide event times, asset identifiers, directional transfer observations, and some fees. It cannot by itself prove current position concentration, risk-token exposure, holding horizon, drawdown response, or USD-comparable execution cost. A behavior profile must therefore wait for the following source-backed collectors.

## Collector boundaries

### 1. Balance snapshots

Normalize the existing OKX balance response into immutable per-asset observations with chain, retrieval time, asset identifier, quantity, quoted USD value when supplied, and risk-token flag when supplied. This supports concentration and risk exposure only at the snapshot time; it is not historical portfolio reconstruction.

### 2. Price observations

Wrap historical price results in evidence records that carry provider, requested timestamp, returned timestamp, source confidence, and explicit unavailable state. Price data must remain separate from a transaction until the join is documented by evidence IDs.

### 3. Trade classification

Add a conservative classifier that distinguishes a verified swap/trade from an inbound or outbound transfer only when source fields support that conclusion. Ambiguous records stay `unknown`; they cannot seed lots, holding horizons, or performance metrics.

### 4. Position lots and realized outcomes

Build FIFO lots only from classified, priced trades. Preserve the contributing event and price evidence IDs for each lot and realized close. This enables observed holding horizons and drawdown-response calculations, while unclosed or unpriced positions remain insufficient data.

### 5. Execution-cost observations

Normalize chain-native gas observations with chain and unit provenance. Only compare or aggregate fees after a documented price conversion; cross-chain native fees are not USD-comparable by default.

## Shared contract rules

- All collector outputs are immutable and identify their source evidence.
- Every field is known or explicitly unknown with a reason.
- Coverage is reported separately from confidence and outcome quality.
- The collectors operate per wallet. Selected wallets form a research cohort only; no ownership inference is permitted.
- Personas remain presentation-only.
- No collector emits alpha, a trade recommendation, a Composite Trading Pattern, or an execution instruction.

## Dependency order

```text
normalized transactions
  ├─ balance snapshots ───────────────→ concentration / risk exposure
  ├─ price observations ─┐
  ├─ conservative trade classification ├→ FIFO lots / realized outcomes
  └─ gas observations ───┘              → holding horizon / drawdown / execution cost
                                             ↓
                                      behavior profiles (deferred)
```

## Acceptance criteria

The collector phase is complete when each output has a typed contract, provenance, explicit unknown handling, deterministic coverage tests, and no unsupported trade classification. Only then may Task 9 implement the six per-wallet dimensions with confidence and insufficient-data states.
