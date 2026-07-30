# Lint Cleanup and Evidence Branch Merge Plan

> **For Codex:** Fix each ESLint violation with a focused red/green lint cycle, then verify and merge the evidence branch.

**Goal:** Remove the repository lint gate without changing product behavior, then merge the verified evidence remediation into `main`.

**Architecture:** Treat ESLint as the regression oracle for maintenance-only corrections. Preserve the existing evidence boundary and avoid new profile, Composite, trading, recommendation, or execution behavior.

**Tech Stack:** TypeScript, React, ESLint, Vitest, Git.

---

### Task 1: Clear focused ESLint violations

**Files:** only the 11 files reported by `npm run lint` on 2026-07-30.

1. Run ESLint on each file to reproduce its specific error.
2. Apply the smallest type, JSX, hook, or declaration correction.
3. Re-run focused ESLint and review that runtime behavior is unchanged.

### Task 2: Verify and integrate

1. Run lint, full tests, TypeScript, and diff checks.
2. Commit and push the lint-only update.
3. Merge `feature/evidence-coverage` into `main` only after all gates pass; push `main` and confirm its status.

## Pre-merge verification — 2026-07-30

- `npm run lint`: passed with no errors or warnings.
- `npm test`: passed, 28 files and 248 tests.
- `npx tsc --noEmit` and `git diff --check`: passed.
- The lint cleanup is maintenance-only; it adds no profile, Composite, trading, recommendation, or execution behavior.
