# Evidence Critical Review Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close every integrity gap found in the post-Task-4 critical review without starting downstream product work.

**Architecture:** Centralize canonical timestamp and exact-number validation at every provider boundary. Derived costs and outcomes must independently validate canonical upstream event/trade provenance and bounded source-price time. Coverage must be derived from supplied collector records, not caller-declared labels.

**Tech Stack:** TypeScript, Vitest, existing evidence collectors.

---

### Task 1: Canonical transaction and balance source boundaries

**Files:**
- Modify: `src/lib/evidence/normalize.ts`, `balances.ts`
- Test: `src/lib/evidence/normalize.test.ts`, `balances.test.ts`

1. Write one failing test each for zero/future retrieval timestamps and unsafe balance numeric strings.
2. Run each focused test and confirm the unsafe evidence is currently accepted.
3. Require canonical retrieval times and reuse the exact decimal policy for balances.
4. Re-run focused tests and typecheck.

### Task 2: Strict derived cost and outcome lineage

**Files:**
- Modify: `src/lib/evidence/costs.ts`, `outcomes.ts`
- Test: `src/lib/evidence/costs.test.ts`, `outcomes.test.ts`

1. Write failing tests for forward-dated price provenance, malformed event provenance, and malformed classified-trade provenance.
2. Run focused tests and confirm each can currently derive a known value.
3. Add shared-shape-equivalent canonical provenance and timestamp checks at each public derivation boundary.
4. Re-run focused tests and typecheck.

### Task 3: Evidence-derived collector coverage and bounded direct provider calls

**Files:**
- Modify: `src/lib/evidence/coverage.ts`, `types.ts`, `src/lib/defillama.ts`
- Test: `src/lib/evidence/coverage.test.ts`, `src/lib/defillama.test.ts`

1. Write failing tests proving caller labels cannot inflate coverage and direct price adapter calls are bounded/deduplicated.
2. Run focused tests and confirm the unsafe behavior.
3. Derive collector coverage from supplied collector records and apply the same dedupe/budget guard at the direct adapter boundary.
4. Re-run focused tests and typecheck.

### Task 4: Final evidence review and verification

**Files:** all evidence files and tests.

1. Run all evidence suites, the full suite, typecheck, lint, and diff checks.
2. Manually review source identity, timestamp, numeric, unit, and coverage claims.
3. Record the review result and commit only the scoped implementation/tests.

## Verification record — 2026-07-30

- Tasks 1–3 are complete: source boundaries require canonical time and exact supported numerics; derived costs and outcomes validate source lineage; coverage is derived from collector-record provenance and direct historical-price requests are deduplicated and capped at 100 unique tuples.
- Manual review found no ownership inference, persona, Composite, alpha, trading, recommendation, or execution claims in this scope.
- Passed: all evidence suites (9 files, 107 tests), full suite (28 files, 248 tests), `npx tsc --noEmit`, and `git diff --check`.
- Repository lint remains red with 20 errors and 12 warnings in pre-existing out-of-scope UI, API, cache, and stress-test files; none are evidence-layer files changed by this remediation.
