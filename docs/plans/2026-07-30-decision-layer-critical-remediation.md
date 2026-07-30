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

### Task 1: Replace incomplete decision contracts

**Files:** `src/lib/evidence/types.ts`, `types.test.ts`

1. Add failing compile/runtime tests for profile metric source coverage, evidence IDs, metric unit/type, finding distribution, fold boundaries, exclusion records, validated-hypothesis artifact, and proposal acknowledgement/expiry states.
2. Define metric-specific value domains: ratios for concentration/risk/turnover; milliseconds for holding horizon; USD totals only as wallet-local summaries and never cohort consensus values.
3. Require every synthesized finding to retain eligible profile IDs, metric evidence IDs, confidence inputs, distribution/range, and limitations.
4. Separate `DraftHypothesis` from `ValidatedHypothesis`; only the validator may create the latter.
5. Make proposal transitions include draft, approved, declined, and expired; retain acknowledgement metadata without identity or execution details.

**Gate:** focused contracts + `npx tsc --noEmit`; manual review that no type permits a trade/execution payload.

### Task 2: Harden source and derived provenance consistently

**Files:** `outcomes.ts`, `costs.ts`, `coverage.ts`, corresponding tests`

1. Write failing tests for epoch, future, fractional, foreign-wallet, foreign-chain, missing-evidence, and malformed-endpoint records.
2. Apply `isCanonicalTimestampMs(..., Date.now())` to every source and derived retrieval time.
3. Count collector coverage only for records whose wallet, chain, endpoint, evidence IDs, and provenance match the summary inputs.
4. Fail closed on malformed source/derived records; never count or derive from them.

**Gate:** all three focused suites; mutation review of every public boundary.

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

### Task 6: Implement actual walk-forward validation

**Files:** `validation.ts`, `validation.test.ts`

1. Define provenance-linked historical observations with canonical timestamps, scope, evidence IDs, outcome, fee/gas/slippage cost fields, and explicit missing state.
2. Write failing tests for fold boundaries, no training/test overlap, frozen fitted threshold, missing cost, insufficient OOS sample, negative net OOS result, and fabricated observation rejection.
3. Fit an explicit hypothesis condition from each training fold, evaluate only its next fold, record each fold’s eligible/excluded counts, costs, and limitations, then aggregate OOS results only.
4. Create a `ValidatedHypothesis` only when all predefined gates pass; otherwise emit `rejected` or `insufficient` with no proposal eligibility.

**Gate:** deterministic fold tests, no in-sample result in validation totals, manual review of every cost/exclusion path.

### Task 7: Make proposal transitions honest and unreachable by forgery

**Files:** `proposals.ts`, `proposals.test.ts`

1. Write failing tests for draft-only creation from a validator-produced artifact, mismatched validation rejection, expiry, decline, repeated transition rejection, acknowledgement requirement, and absence of execution fields.
2. Accept only the validated-hypothesis artifact and a matching immutable validation report.
3. Implement approve/decline/expire as pure state transitions. Approval must reject expired proposals and record explicit caller-supplied acknowledgement text/time.
4. Keep all action interfaces absent.

**Gate:** focused proposal suite and static search for signer/wallet/transaction/broadcast/scheduler APIs.

### Task 8: Adversarial verification and merge gate

1. Run all evidence/decision suites, full lint, full tests, TypeScript, diff check, and a static safety search.
2. Manually trace one valid and one invalid datum across every stage; verify IDs, limitations, timestamps, chains, and evidence references remain intact.
3. Review every claim in `FOR[Dami].md`, plans, and todo against actual behavior.
4. Conduct an independent read-only critical review; fix every Critical/Important finding before merge.
5. Commit, push, then merge only with fresh green evidence.

## Testing matrix

| Gate | Must prove |
|---|---|
| Provenance | canonical time, source endpoint, wallet, chain, evidence IDs |
| Completeness | partial/missing records become unknown with limitations |
| Units | ratios, milliseconds, and USD are never compared with one threshold |
| Cohort | confidence/recency/sample thresholds and disagreement visibility |
| Validation | chronological OOS folds, fitted rule, supplied costs, exclusions |
| Proposal | validated artifact only, expiry/decline/acknowledgement, no execution |
| Safety | no persona, ownership, alpha, recommendation, or transaction path |
