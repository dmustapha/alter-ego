# Evidence-Linked Decision Layer Design

## Goal

Turn a user-selected wallet cohort’s normalized evidence into explainable behavior profiles, cohort findings, testable hypotheses, and user-approved action proposals—without treating personas as data, inferring ownership, claiming alpha, or submitting a transaction.

## Scope and safety boundary

- A cohort is user-selected. It can contain any public wallets and never implies common ownership.
- Personas and roasts remain display-only. They are excluded from all metric, confidence, synthesis, validation, and proposal inputs.
- A behavior finding is an observed tendency, not an investment recommendation or expected return.
- A hypothesis becomes eligible for a proposal only after documented time-separated validation. It remains non-executing.
- The system does not create, sign, broadcast, schedule, or autonomously execute transactions.

## Architecture

```text
evidence records + coverage
  -> per-wallet profile metrics
  -> cohort findings (consensus and disagreement)
  -> testable hypotheses
  -> walk-forward validation reports
  -> user-approved, non-executing proposal
```

Every stage is immutable, carries source IDs or references to the earlier stage, exposes insufficiency explicitly, and can decline to emit a result.

## 1. Wallet behavior profiles

A profile is per wallet and never crosses wallet boundaries. It contains a bounded set of factual dimensions:

| Dimension | Evidence input | Value | Insufficient when |
|---|---|---|---|
| Concentration | Balance snapshots | largest known holding / known portfolio value | fewer than two usable balances or no known quote |
| Turnover | Classified trade legs | disposed quantity / acquired quantity by asset | no classified, quantity-known trade legs |
| Holding horizon | FIFO lots and realized outcomes | time from opening to closing matched lot | no closed lots with known timestamps |
| Risk exposure | Balance risk flags | risk-flagged known value / known portfolio value | no usable balance value or risk flags |
| Execution cost | Execution-cost records | total known USD cost and cost coverage | no source-linked USD costs |
| Realized outcomes | Realized outcomes | known PnL count, win/loss count, and sum | no fully sourced closed outcomes |

Each dimension is an `EvidenceValue`; a profile never converts absence into zero. It also records evidence IDs, observation count, recency, and a bounded confidence between 0 and 1. Confidence means evidence adequacy only; it does not measure skill, alpha, profitability, or likelihood of future success.

### Profile confidence

For a known dimension:

```text
confidence = source coverage × recency factor × sample factor
```

- Source coverage is the fraction of required records that are known and source-linked.
- Recency factor is 1.0 for current evidence, 0.75 for recent evidence, and 0.4 for stale evidence.
- Sample factor ramps from 0 to 1 across a documented dimension-specific minimum sample (for example, 10 closed lots for outcome summaries).

Any missing prerequisite emits `unknown` with a reason and confidence `0`; no heuristic filling is allowed.

## 2. Cohort synthesis

The synthesizer accepts only profiles produced by the profile builder. It produces one cohort result with:

- cohort coverage: wallet count, chain count, source record counts, and data limitations;
- consensus findings: only dimensions that have enough known profiles and a directional agreement threshold;
- disagreements: dimensions with sufficient evidence but materially divergent values;
- excluded wallets: each omitted wallet and its insufficiency reason;
- limits: immutable, human-readable statements including that selection does not prove ownership.

No arithmetic average is emitted if it would hide disagreement. A consensus requires at least two eligible wallets, at least 60% agreement, and confidence-weighted support. The result retains profile IDs and dimension evidence IDs for every finding.

## 3. Strategy hypotheses

A hypothesis is a test specification, never advice. It has:

- an ID and a neutral condition (for example, a concentration or turnover threshold);
- a measurable outcome definition;
- applicable market/asset scope;
- source cohort finding IDs and evidence references;
- explicit assumptions and exclusions;
- status: `draft`, `insufficient`, `validated`, or `rejected`.

The compiler can create a `draft` only from a known cohort consensus. It cannot create a token-specific buy/sell instruction, a price target, or a performance claim.

## 4. Walk-forward validation

Validation is pure and injected with historical observations. It must not fetch, trade, or mutate evidence. A report uses chronological folds:

1. fit a threshold only on the training segment;
2. apply that frozen threshold to the next segment;
3. account for supplied fees, gas, slippage, and excluded/missing observations;
4. aggregate only out-of-sample results.

The report includes fold boundaries, candidate count, eligible count, exclusions, total supplied costs, outcome summary, and limitations. A `validated` status requires enough out-of-sample samples, positive predefined utility after supplied costs, and no missing mandatory cost input. Otherwise it is `insufficient` or `rejected`; neither state can feed a proposal.

## 5. Proposal-only approval flow

A proposal is a readonly review artifact generated only from a validated hypothesis. It presents the hypothesis, validation report, assumptions, risk and coverage limits, and an explicit approval state:

- `draft`: created from validation, no user action;
- `approved`: explicit user acknowledgement recorded in-memory by the caller;
- `declined`: explicit user rejection;
- `expired`: proposal exceeds its review window.

Approval changes only the proposal state. There is no signer, wallet connection, transaction payload, broadcast call, scheduler, or agent execution interface in this phase.

## Error handling and reviewability

- Public builders accept `unknown` at runtime and fail closed with immutable insufficiency records.
- IDs are deterministic and include wallet/chain-scoped source references.
- All arrays and objects returned by decision builders are frozen.
- A review UI/API, if added later, receives these readonly reports; it cannot infer ownership or elevate a finding to a trade.

## Testing strategy

Tests must prove:

1. profiles reject malformed, cross-wallet, stale, and unlinked evidence;
2. missing data stays unknown and does not raise confidence;
3. synthesis never uses persona strings and surfaces disagreements;
4. hypotheses cannot be token instructions or be built from insufficient findings;
5. validation is chronological, cost-aware, and out-of-sample only;
6. proposals require validated input and never expose execution fields;
7. every public output is immutable and provenance-linked.

## Delivery order

1. Add decision-layer contracts and profile builder.
2. Add cohort consensus/disagreement synthesis.
3. Add neutral hypothesis compiler.
4. Add pure walk-forward validator.
5. Add proposal-only approval state.
6. Run full verification and independently review all truth boundaries.
