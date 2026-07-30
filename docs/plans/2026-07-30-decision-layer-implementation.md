# Evidence-Linked Decision Layer Implementation Plan

> **For Codex:** Execute this plan task-by-task with a visible red → minimal implementation → green cycle. Do not create or submit transactions.

**Goal:** Build evidence-backed wallet profiles, cohort synthesis, neutral hypotheses, walk-forward validation, and user-approved non-executing proposals.

**Architecture:** New pure modules consume only the typed evidence contracts. Every result is immutable, provenance-linked, and able to return explicit insufficiency. Personas are excluded from every input. A proposal is a review state, not a transaction or execution interface.

**Tech Stack:** TypeScript, Vitest, existing `src/lib/evidence` contracts.

---

### Task 1: Add decision-layer contracts

**Files:**
- Modify: `src/lib/evidence/types.ts`
- Test: `src/lib/evidence/types.test.ts`

1. Write failing tests for readonly profile dimensions, cohort findings, hypotheses, validation reports, and proposal states; assert no execution payload or signer field exists.
2. Run `npm test -- --run src/lib/evidence/types.test.ts` and confirm the contracts are absent.
3. Add minimal discriminated types: known/unknown profile metrics, profile coverage, consensus/disagreement findings, neutral hypotheses, validation statuses, and proposal states.
4. Re-run the focused test and `npx tsc --noEmit`.
5. Commit the scoped contract change.

### Task 2: Build per-wallet behavior profiles

**Files:**
- Create: `src/lib/evidence/profiles.ts`
- Create: `src/lib/evidence/profiles.test.ts`

1. Write failing tests for concentration, risk exposure, outcome summary, execution cost, stale evidence, cross-wallet rejection, and unknown prerequisites.
2. Run `npm test -- --run src/lib/evidence/profiles.test.ts` and confirm the builder is absent.
3. Implement `buildWalletBehaviorProfile` with wallet-scoped inputs only, source IDs, bounded confidence, explicit unknowns, and frozen output.
4. Re-run the focused test and manual-review that zero is never substituted for missing evidence.
5. Commit the profile builder.

### Task 3: Synthesize cohort consensus and disagreement

**Files:**
- Create: `src/lib/evidence/synthesis.ts`
- Create: `src/lib/evidence/synthesis.test.ts`

1. Write failing tests proving profiles—not personas—are required; at least two eligible wallets are required; conflicts become disagreements; selected wallets do not imply ownership.
2. Run `npm test -- --run src/lib/evidence/synthesis.test.ts` and confirm the synthesizer is absent.
3. Implement deterministic confidence-weighted consensus with minimum evidence and agreement thresholds, excluded-wallet reasons, and immutable limits.
4. Re-run focused tests and manually verify that an average never hides disagreement.
5. Commit the synthesis module.

### Task 4: Compile neutral strategy hypotheses

**Files:**
- Create: `src/lib/evidence/hypotheses.ts`
- Create: `src/lib/evidence/hypotheses.test.ts`

1. Write failing tests for consensus-linked draft hypotheses, insufficient findings, deterministic IDs, and rejection of token/side/price instructions.
2. Run `npm test -- --run src/lib/evidence/hypotheses.test.ts` and confirm the compiler is absent.
3. Implement the smallest compiler that outputs measurable conditions and outcome definitions with assumptions and source finding IDs; never emit a recommendation.
4. Re-run focused tests and review every emitted field for prohibited trading claims.
5. Commit the hypothesis compiler.

### Task 5: Validate hypotheses with chronological walk-forward folds

**Files:**
- Create: `src/lib/evidence/validation.ts`
- Create: `src/lib/evidence/validation.test.ts`

1. Write failing tests for chronological train/test separation, cost deduction, missing mandatory cost rejection, insufficient samples, and immutable fold reports.
2. Run `npm test -- --run src/lib/evidence/validation.test.ts` and confirm the validator is absent.
3. Implement a pure injected-observation validator: it trains only on preceding data, evaluates the next fold, records exclusions/costs, and returns `validated`, `rejected`, or `insufficient` without performance promises.
4. Re-run focused tests and manually review that no in-sample result is promoted as validation.
5. Commit the validator.

### Task 6: Build proposal-only approval state and verify boundaries

**Files:**
- Create: `src/lib/evidence/proposals.ts`
- Create: `src/lib/evidence/proposals.test.ts`
- Modify: `tasks/todo.md`, `FOR[Dami].md`

1. Write failing tests proving only validated hypotheses create proposals; approval/decline/expiry change state only; no execution capability is exposed.
2. Run `npm test -- --run src/lib/evidence/proposals.test.ts` and confirm the proposal builder is absent.
3. Implement immutable proposal creation and state transitions; do not add wallet connection, signing, broadcasting, scheduler, or network calls.
4. Run every decision-layer test, `npm run lint`, `npm test`, `npx tsc --noEmit`, and `git diff --check`.
5. Manually review ownership, persona, alpha, recommendation, validation, and execution boundaries; update milestone documents and commit only scoped work.
