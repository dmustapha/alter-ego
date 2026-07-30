# Evidence Integrity Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement and review each task.

**Goal:** Make every trade, price, cost, and realized outcome fail closed unless its source, identity, time, unit, and numeric representation are verifiable.

**Architecture:** Centralize canonical chain/native metadata and timestamp units. Derived records may reference upstream evidence only through validated, resolved objects—not caller-provided IDs. Invalid or insufficient data becomes explicit unknown/insufficient evidence.

**Tech Stack:** TypeScript, Vitest, existing OKX and DefiLlama adapters.

---

### Task 1: Canonicalize evidence time and numeric policy

**Files:** `src/lib/evidence/types.ts`, `normalize.ts`, `prices.ts`, `../defillama.ts`, tests.

1. Write failing tests for milliseconds-only evidence timestamps, rejected negative/future timestamps, bounded returned-price time delta, and unsafe numeric inputs.
2. Add explicit timestamp unit and maximum source-price delta policy.
3. Reject unsafe precision/exponent values until fixed-point/base-unit support exists; preserve raw values for future exact handling.
4. Verify focused tests, full suite, typecheck, and commit.

### Task 2: Bind trade details and price observations to source evidence

**Files:** `src/lib/evidence/trades.ts`, `prices.ts`, `types.ts`, tests.

1. Write failing tests for mismatched wallet, chain, transaction hash, or unlinked detail evidence; test missing/noncanonical native assets.
2. Require a detail to carry and match canonical event provenance before classification.
3. Resolve price evidence objects, not arbitrary ID strings; require matching chain/asset/time/source provenance before price is known.
4. Verify, review, and commit.

### Task 3: Make FIFO and execution-cost derivations unit-safe

**Files:** `outcomes.ts`, `costs.ts`, `native-assets.ts`, tests.

1. Write failing tests for PnL overflow, incompatible fee units, stale price evidence, and ambiguous multi-fill IDs.
2. Require fee unit/decimals provenance and reject unknown unit conversions.
3. Generate deterministic IDs with leg/match indexes; fail closed on non-finite derived values.
4. Verify, review, and commit.

### Task 4: Harden provider boundaries and collector coverage

**Files:** `normalize.ts`, `balances.ts`, `coverage.ts`, `prices.ts`, tests.

1. Write failing malformed-payload tests for null/non-array source fields and oversized duplicate price batches.
2. Add runtime guards, deduplication/budgets, and explicit unavailable records.
3. Redefine coverage to distinguish transaction-field coverage from collector coverage; future timestamps become unknown, never current.
4. Verify the complete evidence layer and commit.

**Exit criteria:** No derived financial value is known without canonical source identity, bounded timestamp validity, unit provenance, finite arithmetic, and resolved evidence links. No Task 7 work starts before this plan and an independent critical review pass.
