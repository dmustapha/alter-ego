# Alter Ego

## 1. What This Project Does

Alter Ego reads selected public wallet activity and turns the observable data into per-wallet behavioral evidence, grades, and presentation personas. It supports any user-selected research cohort; selecting wallets does not say they share an owner. The new `src/lib/evidence` layer preserves the raw transaction facts needed for later analysis without making performance, trade, or autonomous-execution claims.

## 2. Vocabulary

**OnchainOS**
OKX's on-chain data service. `src/lib/okx-api.ts` signs and throttles its transaction, balance, and transaction-detail requests.

**Normalized evidence**
A stable, typed record of an observable transaction fact. `NormalizedTransactionEvent` carries its chain, timestamp, asset, direction, available values, and source provenance.

**Provenance**
The source trail for a fact: provider, endpoint, chain, transaction hash, retrieval time, and source index. It lets later assertions point back to data instead of inventing a conclusion.

**Evidence value**
`EvidenceValue<T>` is either known or explicitly unknown with a reason. A missing amount or unavailable price is never replaced with `0`.

**Coverage**
A wallet-level description of how much of the selected evidence contains usable direction, amount, and price observations. It is not a confidence score, alpha signal, or quality guarantee.

**Persona**
A human-readable explanation generated after behavioral analysis. Personas are presentation-only and must never be combined into a trading rule.

**Composite Trading Pattern**
A planned, evidence-linked cohort synthesis layer. It is not live; it cannot become a recommendation until separately validated.

**x402**
An HTTP payment protocol used by the project for gated access on X Layer. Settlement proof is distinct from analysis evidence.

## 3. How the Code Is Organized

`src/app` contains the Next.js pages and API routes. The landing page submits selected wallets to `/api/analyze`, which can stream NDJSON progress events. `src/components` renders wallet input, scan progress, pattern cards, and personas. `src/lib` holds the analysis pipeline: `okx-api.ts` retrieves raw records, `analyze.ts` coordinates a scan, `classifier.ts` finds existing patterns, and `persona.ts` presents them. The new `src/lib/evidence` folder is intentionally independent: it turns raw transaction records into immutable evidence and summarizes one wallet's coverage.

The main flow is: a user selects addresses and chains; the page calls the analysis route; the route calls `analyzeWallets`; the analyzer retrieves source records and derives the current evidence-layer outputs. A future profile or Composite layer should consume normalized evidence, not personas or raw UI copy.

## 4. Prompting Tips for This Codebase

1. Name the exact chain indexes and raw fields when changing ingestion; EVM, Solana, and X Layer records are not interchangeable.
2. Ask for an evidence contract before requesting a new behavioral metric, including its provenance and insufficient-data behavior.
3. State whether a request concerns a selected cohort or one wallet. Never use “same owner” unless the user supplies that fact independently.
4. For a scan bug, include the address shape, selected chains, route mode (JSON or NDJSON), and the relevant raw response fixture.
5. Keep personas, roasts, and display labels out of numerical aggregation requests; use `src/lib/evidence` or future behavior-profile inputs instead.
6. If a task mentions a trade, alpha, or execution, request validation and explicit user approval requirements first; those layers are not implemented here.

## 5. Domain Knowledge

### Public wallet evidence

Wallet transaction APIs can omit prices, fees, token metadata, or a clear transfer direction. In Alter Ego, unknown is meaningful: replacing it with zero would turn absence of data into a false observation.

### Cross-chain identity

Chain IDs distinguish transactions that may reuse a hash format or have different address rules. Solana addresses are case-sensitive, so the normalizer compares supplied addresses exactly instead of lowercasing them.

### Coverage and recency

`summarizeCoverage` reports how many observable fields are present and whether the newest timestamp is current (seven days), recent (30 days), stale, or unknown. Coverage describes available evidence only; it does not prove a strategy works.

## 6. Gotchas and Non-Obvious Behavior

**Unknown is not zero**
What it looks like: a numerical field is blank or malformed.
What actually happens: the evidence layer returns `{ status: "unknown" }`.
How to avoid it: check `status` before using an evidence value in math.

**A transaction hash is not always a unique event**
What it looks like: two source rows share a hash.
What actually happens: the normalized ID also includes `sourceIndex`, preserving both observed legs.
How to avoid it: do not deduplicate normalized events by hash alone.

**The current transaction endpoint has no price feed**
What it looks like: a future calculation wants USD price.
What actually happens: `priceUsd` is explicitly unavailable until a sourced pricing collector supplies it.
How to avoid it: add priced evidence with provenance rather than guessing.

## 7. Debugging Guide

### Scan and normalization

Run `npm test -- --run src/lib/evidence/normalize.test.ts` to verify cross-chain mapping, immutability, provenance, and unknown handling. If it fails, inspect the OKX source field names in `src/lib/okx-api.ts` and fixtures in `src/lib/__fixtures__` before changing the contract.

### Coverage

Run `npm test -- --run src/lib/evidence/coverage.test.ts` with a fixed `nowMs`. A lower score normally means observed fields are missing, not that the wallet is risky. Check the individual known-field counts before interpreting the result.

### Full app

Run `npm test` and `npx tsc --noEmit`. For live API failures, inspect `/api/analyze` stream events and the throttled OnchainOS client; never mask an unavailable live result as new evidence.

## 8. Mistakes Log

**2026-07-28 — Dependency install changed the lockfile**
What happened: the required isolated-worktree setup updated `package-lock.json` metadata.
Why it happened: the install resolved an optional dependency newer than the committed lockfile.
How to avoid: inspect package-manager diffs immediately and remove incidental lockfile changes before feature work.

## 9. Quizzes

**Conceptual**

1. Why does Alter Ego keep provenance on each normalized event?
2. Why is a coverage score not a trading confidence score?
3. Why can’t selected wallets be described as belonging to one owner?

**Practical**

1. A raw transaction has no amount. What should the normalizer return?
2. A future profile needs price data. What must be added before using it?
3. Two X Layer records share a transaction hash. How should they be handled?

**Code reading**

1. In `src/lib/evidence/normalize.ts`, why does `freezeEvent` freeze nested values?
2. In `src/lib/evidence/coverage.ts`, why are recency and score returned separately?

**Answer key**

1. It makes each fact auditable against its provider and source row.
2. Coverage measures available observations, not outcomes or expected returns.
3. Selection is a user choice, not ownership evidence.
4. An explicit unknown with reason `missing`, never zero.
5. A price source plus its provenance and coverage semantics.
6. Preserve both with distinct source indexes.
7. So callers cannot mutate evidence after normalization.
8. Fresh data and complete fields answer different questions.
