# Decision-Layer Critical Remediation Plan

> **For Codex:** Execute sequentially. For every behavior change: failing focused test → minimal implementation → passing focused test → manual review. Do not merge until every final gate passes.

**Goal:** Make the decision layer genuinely evidence-linked, unit-safe, chronologically validated, and proposal-only before it can be integrated.

**Non-negotiable boundary:** no persona input; no ownership inference; no alpha/performance claim; no token, side, price, or execution instruction; no signer, wallet, transaction payload, broadcast, scheduler, or autonomous action.

## Required data-flow contract

```text
validated source evidence
  -> runtime-validated per-wallet metrics with limitations
  -> normalized metric-specific cohort finding with evidence references
  -> structured neutral hypothesis with explicit scope
  -> immutable chronological fold report
  -> validated-hypothesis artifact
  -> expiry-aware, non-executing proposal state
```

Each arrow must reject malformed provenance, foreign-wallet records, incompatible chains, noncanonical times, missing mandatory fields, and unsupported units.

## Scope and trust model

- This remediation is library-only. No route, UI, display claim, or integration is added until the library gates pass in a separate reviewed task.
- A pure library records an acknowledgement supplied by its caller; it cannot authenticate a human. Session/identity verification belongs to a future application boundary and must not be implied here.
- TypeScript types are not a runtime trust boundary. Every receipt, observation, and proposal input must undergo runtime validation.

### Task 0: Define a reproducible historical validation dataset and evaluator

**Files:** `types.ts`, new `validation-dataset.ts`, `validation-dataset.test.ts`

1. Write failing tests for immutable observation IDs, dataset fingerprint/version, canonical event/outcome times, chain/asset scope, source evidence IDs, duplicate policy, and explicit unavailable fee/gas/slippage/liquidity fields.
2. Define an injected historical-source adapter and snapshot policy: each dataset records its source adapter/version, fixed retrieval interval, retrieval time, and evidence IDs; validation consumes an immutable snapshot and never fetches or substitutes live data.
3. Define the inclusion/exclusion policy: an observation with an absent required price, cost, liquidity, outcome horizon, or provenance is excluded with a reason; it never contributes zero utility.
4. Define the evaluator contract before implementation: a neutral, metric-specific predicate is fitted from training observations; its outcome horizon and utility formula are fixed; all supplied costs are deducted; data cannot be re-labelled by a caller as utility.
5. Require a dataset fingerprint to cover source adapter/version, observation IDs, relevant source IDs, schema version, and fold configuration so results are reproducible.

**Gate:** focused dataset tests prove that incomplete/regime-unavailable data returns `insufficient`; no validation may accept bare `{ utilityUsd, costUsd }` objects.

### Task 1: Replace incomplete decision contracts

**Files:** `src/lib/evidence/types.ts`, `types.test.ts`

1. Add failing compile/runtime tests for profile metric source coverage, evidence IDs, metric unit/type, finding distribution, fold boundaries, exclusion records, validated-hypothesis artifact, and proposal acknowledgement/expiry states.
2. Define metric-specific value domains: ratios for concentration/risk/turnover; milliseconds for holding horizon; USD totals only as wallet-local summaries and never cohort consensus values.
3. Require every synthesized finding to retain eligible profile IDs, metric evidence IDs, confidence inputs, distribution/range, and limitations.
4. Separate `DraftHypothesis` from `ValidatedHypothesis`; only the validator may create the latter.
5. Make proposal transitions include draft, approved, declined, and expired; retain acknowledgement metadata without identity or execution details.

**Gate:** focused contracts + `npx tsc --noEmit`; manual review that no type permits a trade/execution payload.

### Task 2: Harden every source and derived provenance boundary consistently

**Files:** `balances.ts`, `prices.ts`, `trades.ts`, `outcomes.ts`, `costs.ts`, `coverage.ts`, shared validator module, corresponding tests

1. Write failing tests for epoch, future, fractional, foreign-wallet, foreign-chain, missing-evidence, and malformed-endpoint records.
2. Apply `isCanonicalTimestampMs(..., Date.now())` to every source and derived retrieval time.
3. Extract shared runtime guards for collector endpoint/provider, canonical retrieval time, wallet, chain, nonempty evidence IDs, and source-specific provenance fields; do not duplicate divergent checks.
4. Count collector coverage only for records whose wallet, chain, endpoint, evidence IDs, and provenance match the summary inputs.
5. Fail closed on malformed source/derived records; never count or derive from them.

**Gate:** every affected focused suite; mutation review of every public boundary.

### Task 3: Rebuild profiles around completeness and source coverage

**Files:** `profiles.ts`, `profiles.test.ts`

1. Write failing tests showing that partial portfolio quotes, unknown risk flags, missing trade quantities, unlinked price evidence, stale records, foreign chain, and forged provenance yield explicit insufficiency rather than a numeric metric.
2. Add runtime guards for each input collector’s endpoint, canonical retrieval time, chain membership, nonempty evidence IDs, and required linked records.
3. Compute confidence exactly as documented: source coverage × recency factor × metric-specific sample factor.
4. Populate immutable limitations for every excluded record and unknown metric.
5. Keep all metrics per-wallet; do not derive a holding horizon unless opening and closing evidence are source-linked and chronological.

**Gate:** focused profile suite covers every metric’s known, unknown, stale, partial, and foreign-input cases.

### Task 4: Rebuild metric-specific cohort synthesis

**Files:** `synthesis.ts`, `synthesis.test.ts`

1. Write failing tests for zero-confidence profiles, stale profiles, insufficient sample, disagreement, confidence weighting, foreign persona-shaped input, and incompatible-unit rejection.
2. Restrict synthesizable metrics to comparable normalized dimensions (concentration, risk exposure, turnover, holding horizon); do not synthesize wallet-local USD PnL or cost totals.
3. Add per-metric thresholds: eligible wallets, minimum profile confidence, source coverage, recency, sample size, and agreement range.
4. Produce `insufficient` findings when thresholds fail and `disagreement` findings when eligible values diverge; do not emit a misleading average.
5. Preserve distribution/range and source evidence links for every consensus.

**Gate:** focused synthesis suite proves no persona/ownership input and no hidden disagreement.

### Task 5: Create structured, neutral hypotheses

**Files:** `hypotheses.ts`, `hypotheses.test.ts`

1. Write failing tests requiring finding evidence references, normalized range, applicable scope, exclusion rules, and an outcome definition.
2. Compile only eligible consensus findings into a structured condition—not free text—and reject any token/side/price language.
3. Return draft or insufficient only; do not let callers construct a validated artifact here.

**Gate:** focused tests plus static audit of all emitted strings/fields.

### Task 6: Implement actual walk-forward validation and verified receipts

**Files:** `validation.ts`, `validation.test.ts`

1. Consume only the Task 0 dataset, scoped to the structured neutral hypothesis metric and range; reject an observation outside its declared chain/asset/horizon scope.
2. Write failing tests for fold boundaries, no training/test overlap, frozen fitted threshold, missing cost, unavailable liquidity/slippage, insufficient OOS sample, negative net OOS result, duplicate source IDs, and fabricated observation rejection.
3. Fit the metric-specific predicate only from each training fold, evaluate that frozen predicate only on the immediately following fold, and record boundaries, source IDs, eligible/excluded counts, costs, and limitations per fold.
4. Aggregate out-of-sample folds only. Create a versioned validation receipt containing the hypothesis fingerprint, dataset fingerprint, fold configuration, report fingerprint, and canonical issuance time.
5. Create a `ValidatedHypothesis` only through receipt verification when all predefined gates pass; otherwise emit `rejected` or `insufficient` with no proposal eligibility.

**Gate:** deterministic fold tests, no in-sample result in validation totals, manual review of every cost/exclusion path.

### Task 7: Make proposal transitions honest and runtime-verifiable

**Files:** `proposals.ts`, `proposals.test.ts`

1. Write failing tests for forged plain validated objects/receipts, mismatched fingerprints, stale receipts, expiry, decline, repeated transition rejection, acknowledgement requirement, and absence of execution fields.
2. Accept only a runtime-verified receipt and matching immutable validated artifact; TypeScript shape matching alone is never sufficient.
3. Implement approve/decline/expire as pure state transitions. Approval must reject expired proposals and record caller-supplied acknowledgement text/time with an explicit `acknowledgementSource: "caller"` limitation.
4. Keep all action interfaces absent.

**Gate:** focused proposal suite and static search for signer/wallet/transaction/broadcast/scheduler APIs.

### Task 8: Migrate compatible evidence consumers

1. Write failing compatibility tests for legacy realized outcomes without `openedAt`, pre-remediation serialized records, and existing consumer expectations.
2. Keep legacy records readable but return unknown holding horizon with an explicit limitation when opening time is unavailable.
3. Verify no existing UI/API consumer treats a decision-layer report as product-visible or live execution capability.

**Gate:** legacy evidence/outcome suite and TypeScript consumers pass without fabricated defaults.

### Task 9: Adversarial verification and merge gate

1. Add deterministic adversarial/property tests for shuffled order, duplicate IDs, malformed nesting, epoch/future/fractional time, mixed wallet/chain, missing denominators, incompatible units, conflicting folds, and every proposal transition.
2. Run all evidence/decision suites, full lint, full tests, TypeScript, diff check, and a precise static safety search restricted to decision-layer production modules. The search checks prohibited capability imports/calls, not neutral words in tests/docs.
3. Manually trace one valid and one invalid datum across every stage; verify IDs, limitations, timestamps, chains, units, dataset/receipt fingerprints, and evidence references remain intact.
4. Review every claim in `FOR[Dami].md`, plans, and todo against actual behavior; state library-only status until a separate integration task is approved.
5. Conduct an independent read-only critical review; fix every Critical/Important finding before merge.
6. Commit, push, then merge only with fresh green evidence.

## Testing matrix

| Gate | Must prove |
|---|---|
| Provenance | canonical time, source endpoint, wallet, chain, evidence IDs |
| Completeness | partial/missing records become unknown with limitations |
| Units | ratios, milliseconds, and USD are never compared with one threshold |
| Cohort | confidence/recency/sample thresholds and disagreement visibility |
| Validation | chronological OOS folds, fitted rule, supplied costs, exclusions |
| Dataset | fixed source snapshot/version, immutable observations, reproducible fingerprint |
| Receipts | runtime verification, matching fingerprints, canonical issue/expiry times |
| Proposal | validated artifact only, expiry/decline/acknowledgement, no execution |
| Safety | no persona, ownership, alpha, recommendation, or transaction path |
