# Profile Prerequisite Collectors Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build typed, immutable, provenance-preserving balance, price, trade, outcome, and execution-cost collectors that make later wallet behavior profiles factual.

**Architecture:** Extend the normalized evidence domain without altering the existing UI analysis pipeline. Each collector consumes prior evidence, preserves explicit unknown values, and emits per-wallet observations only. Trade and outcome collectors are conservative: ambiguous transfers, unpriced events, and unclosed lots remain insufficient data.

**Tech Stack:** TypeScript, Vitest, existing OKX OnchainOS client, existing DefiLlama price client.

---

### Task 1: Add shared collector contracts

**Files:**
- Modify: `src/lib/evidence/types.ts`
- Test: `src/lib/evidence/types.test.ts`

**Step 1: Write the failing test**

Require balance, price, trade-classification, position-lot, realized-outcome, and execution-cost records to expose immutable IDs, wallet address, provenance/evidence IDs, and typed unknown values.

**Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/lib/evidence/types.test.ts`
Expected: FAIL because collector contracts are absent.

**Step 3: Write the minimum implementation**

Add readonly interfaces and discriminated unions. Use `EvidenceValue<T>` for incomplete measurements; include no persona, cohort, alpha, recommendation, or execution fields.

**Step 4: Run the test to verify it passes**

Run: `npm test -- --run src/lib/evidence/types.test.ts`
Expected: PASS.

**Step 5: Commit only this task**

```bash
git add src/lib/evidence/types.ts src/lib/evidence/types.test.ts
git commit -m "feat: define evidence collector contracts"
```

### Task 2: Normalize balance snapshots

**Files:**
- Create: `src/lib/evidence/balances.ts`
- Create: `src/lib/evidence/balances.test.ts`
- Modify: `src/lib/evidence/types.ts`

**Step 1: Write failing tests**

Cover two chains, immutable outputs, exact balance-source provenance, quoted USD values, risk flags, malformed numeric fields, and missing price values. Assert that a blank quote is unknown rather than zero.

**Step 2: Verify red**

Run: `npm test -- --run src/lib/evidence/balances.test.ts`
Expected: FAIL because `normalizeBalanceSnapshots` is absent.

**Step 3: Implement the minimum collector**

Map the existing OKX balance shape (`chainIndex`, `tokenContractAddress`, `symbol`, `balance`, `tokenPrice`, `isRiskToken`) to a frozen snapshot observation. Preserve chain index, retrieval time, source row index, and no-price/malformed-value reasons.

**Step 4: Verify green**

Run: `npm test -- --run src/lib/evidence/balances.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/evidence/types.ts src/lib/evidence/balances.ts src/lib/evidence/balances.test.ts
git commit -m "feat: collect balance snapshot evidence"
```

### Task 3: Collect price observations with provenance

**Files:**
- Create: `src/lib/evidence/prices.ts`
- Create: `src/lib/evidence/prices.test.ts`
- Modify: `src/lib/evidence/types.ts`
- Modify: `src/lib/defillama.ts`
- Modify: `src/lib/defillama.test.ts`

**Step 1: Write failing tests**

Use an injected price lookup to prove that requested timestamps, chain/asset keys, returned price, and the source confidence are preserved. Cover unavailable and low-confidence values as explicit unknowns.

**Step 2: Verify red**

Run: `npm test -- --run src/lib/evidence/prices.test.ts`
Expected: FAIL because `collectPriceObservations` is absent.

**Step 3: Implement the minimum collector**

Add a backward-compatible detailed DefiLlama lookup that retains returned timestamp and source confidence; keep `getHistoricalPrices` as its compatibility wrapper. Build a testable evidence adapter on that detailed lookup. It returns frozen price observations and never treats a null response as a zero price. Do not mutate transaction events.

**Step 4: Verify green**

Run: `npm test -- --run src/lib/evidence/prices.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/evidence/types.ts src/lib/evidence/prices.ts src/lib/evidence/prices.test.ts src/lib/defillama.ts src/lib/defillama.test.ts
git commit -m "feat: collect historical price evidence"
```

### Task 4: Classify transactions conservatively

**Files:**
- Create: `src/lib/evidence/trades.ts`
- Create: `src/lib/evidence/trades.test.ts`
- Modify: `src/lib/evidence/types.ts`

**Step 1: Write failing tests**

Prove that only records carrying explicit swap/trade legs from a source-detail adapter become classified trades; method IDs and directional transfers alone are not sufficient. Simple inflows, outflows, self-transfers, and ambiguous records remain `unknown`. Add a Solana mixed-case address test to ensure no lowercasing corrupts matching.

**Step 2: Verify red**

Run: `npm test -- --run src/lib/evidence/trades.test.ts`
Expected: FAIL because `classifyTrades` is absent.

**Step 3: Implement the minimum classifier**

Accept a typed source-detail adapter that supplies explicit trade legs when an upstream provider can prove them. Return a frozen `classified` or `unknown` result with event IDs and limitation reasons. The current transaction list is expected to return `unknown` until it includes such detail. Do not reuse `deriveTrades`, which is a legacy display-oriented heuristic.

**Step 4: Verify green**

Run: `npm test -- --run src/lib/evidence/trades.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/evidence/types.ts src/lib/evidence/trades.ts src/lib/evidence/trades.test.ts
git commit -m "feat: classify evidence-backed trades"
```

### Task 5: Build lots and realized outcomes

**Files:**
- Create: `src/lib/evidence/outcomes.ts`
- Create: `src/lib/evidence/outcomes.test.ts`
- Modify: `src/lib/evidence/types.ts`

**Step 1: Write failing tests**

Test FIFO matching only for classified, priced trades. Cover a realized gain/loss, partial closes, missing price, and an unclosed lot. Every result must list the contributing trade and price evidence IDs.

**Step 2: Verify red**

Run: `npm test -- --run src/lib/evidence/outcomes.test.ts`
Expected: FAIL because `buildRealizedOutcomes` is absent.

**Step 3: Implement the minimum outcome builder**

Sort immutable classified trades by timestamp, match FIFO lots per chain/asset, and return explicit insufficient results where price or classification is missing. Keep assumptions and excluded events visible; do not emit a prediction or recommendation.

**Step 4: Verify green**

Run: `npm test -- --run src/lib/evidence/outcomes.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/evidence/types.ts src/lib/evidence/outcomes.ts src/lib/evidence/outcomes.test.ts
git commit -m "feat: derive realized outcome evidence"
```

### Task 6: Normalize execution-cost observations

**Files:**
- Create: `src/lib/evidence/costs.ts`
- Create: `src/lib/evidence/costs.test.ts`
- Modify: `src/lib/evidence/types.ts`

**Step 1: Write failing tests**

Cover known chain-native gas fees, unknown/malformed fees, and refusal to aggregate native amounts across chains without an attached conversion observation.

**Step 2: Verify red**

Run: `npm test -- --run src/lib/evidence/costs.test.ts`
Expected: FAIL because `collectExecutionCosts` is absent.

**Step 3: Implement the minimum collector**

Emit frozen per-event native cost observations. Support USD conversion only when a supplied price observation references the matching chain/native asset/timestamp; otherwise leave USD cost unknown.

**Step 4: Verify green**

Run: `npm test -- --run src/lib/evidence/costs.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/evidence/types.ts src/lib/evidence/costs.ts src/lib/evidence/costs.test.ts
git commit -m "feat: collect execution cost evidence"
```

### Task 7: Verify the collector layer and update the deferred profile boundary

**Files:**
- Modify: `tasks/todo.md`
- Modify: `FOR[Dami].md`

**Step 1: Run focused collector tests**

Run: `npm test -- --run src/lib/evidence`
Expected: all evidence tests pass.

**Step 2: Run project verification**

Run: `npm test && npx tsc --noEmit`
Expected: all tests and typecheck pass.

**Step 3: Update documentation**

Mark the collector prerequisite phase complete and explain that behavior profiles can now be implemented from evidence. Keep Task 9 and every Composite/trading feature unchecked.

**Step 4: Commit**

```bash
git add tasks/todo.md FOR[Dami].md
git commit -m "docs: record evidence collector milestone"
```
