# Alter Ego Remediation — Roadmap (6 plans)

Date: 2026-07-20
Source of truth for the remediation arc. Detailed plans are written **roll-wave** (each just-in-time after the prior lands), because Plan 1's API spike can fork the rest. This file holds the confirmed target + skeletons so nothing is lost between waves.

## Confirmed target (from forge/intel docs)

- **Hackathon:** OKX.AI Genesis (Build X Series) — `PRD.md:3`.
- **Submission:** OKX.AI marketplace listing (ASP agent #6013) + DoraHacks Details tab — `submission/`, `PRD.md:428`.
- **Chain:** X Layer, chain index **196** — ERC-8004 identity token minted on X Layer (`ARCHITECTURE.md:1962`), x402 uses **USDG** `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` on X Layer (`DEEP-RESEARCH.md:20`), demo wallet C is X Layer.
- **Chains analyzed:** Ethereum (1), Solana (501), X Layer (196). The trade-history spike (Plan 1 Task 1) MUST probe `chainIndex: 196` too, not only Ethereum.
- **Genesis differentiator the brief rewards:** decision-to-action lineage (AI decision → on-chain tx/intent id). Currently absent; candidate for a later plan if scoring needs it.

## Sequence

`1 (live spine) → 2 (A2MCP) → 4 (a11y, parallel) → 5 (honesty) → 6 (demo)`; **3 (x402) optional**, run before 5 only if the payment track matters for scoring. Each plan must be green before the next detailed plan is written. Est. ~3-4 focused days.

---

## Plan 1 — Genuinely-live data layer ✅ WRITTEN
`docs/superpowers/plans/2026-07-20-genuinely-live-data-layer.md`. Security hotfix + REST trade client + wire into routes + classifier fixes + honest cache regen + differential test.

## Plan 2 — A2MCP conformance
**Goal:** make `/api/a2mcp` a real A2MCP marketplace agent, not a REST endpoint named a2mcp.
**Depends on:** Plan 1 (real analysis output to serve).
**Tasks (skeleton):**
- Agent-card `GET`: capability list, input schema, output schema, pricing/service metadata per the OKX.AI A2MCP contract.
- `402` → `X-PAYMENT` handshake on the paid analyze call.
- A2A envelope parsing on `POST` (`{agentId, message:{source,event,jobId}}` and `{msgType:"a2a-agent-chat", jobId, sender}`) per the okx-ai skill activation contract.
- Populate ASP #6013 `serviceList` to point at the endpoint.
**Spike:** the exact OKX.AI marketplace A2MCP envelope/agent-card schema (read the `okx-ai` + `okx-agent-payments-protocol` skills). ~1 day.
**Why it matters:** for a marketplace agent this is the make-or-break integration; agent judges probe the protocol.

## Plan 3 — Real x402 payment (optional)
**Goal:** replace the `PaymentButton.tsx` `setTimeout` with real settlement.
**Depends on:** Plan 2 (402 challenge lives in the a2mcp path).
**Tasks (skeleton):**
- Server 402 challenge with `PaymentRequirements` `{scheme:"exact", network:"xlayer", payToAddress, maxAmountRequired, paymentTokenAddress: USDG, requiredDeadlineSeconds:300}` (`DEEP-RESEARCH.md:18`).
- Client `X-PAYMENT` header construction + submit.
- Facilitator `POST /api/v6/x402/verify` then fire-and-forget `/settle` after serving (`DEEP-RESEARCH.md:19,63`).
**Spike:** one testnet USDG settlement round-trip on X Layer. ~0.5-1 day.

## Plan 4 — Frontend a11y + design tokenization (parallelizable)
**Goal:** lift the UI from 58→80 tier and fix the broken flagship screenshot.
**Depends on:** nothing (can run alongside 1-3).
**Tasks (skeleton):**
- Add `:focus-visible` rings globally; add `prefers-reduced-motion` guards on flicker/glitch/scale-pulse/typing.
- Fix AA contrast on body text (`text-dim` ~2.9:1) and the invisible placeholder.
- Hoist the 5 conflicting palettes into CSS custom properties / `@theme` tokens; replace inline-DOM hover hacks with CSS.
- Re-capture `docs/images/landing.png` (currently renders empty below the hero).
**Spike:** none. ~0.5 day.

## Plan 5 — Submission honesty pass
**Goal:** remove every falsifiable overclaim and broken link before resubmission.
**Depends on:** Plans 1-4 (needs the final truth about what runs).
**Tasks (skeleton):**
- Replace `alter-ego-demo.vercel.app` (auth-walled) → `alter-ego-wine-mu.vercel.app` across `description.md`, `links.md`, `DETAILS-BODY.html`, `SUBMISSION-GUIDE.md`, README.
- Fix README clone URL `dmz4pf` → `dmustapha`.
- Reconcile the transaction count to ONE number everywhere (was 4,463 / 4,051 / 6,134).
- Rewrite TEE / x402 / "all 4 skills integrated" / "endpoints 200" claims to match reality post-Plans-1-3; keep the honest `## Known Limitations` block as the model.
**Spike:** none. ~0.5 day.

## Plan 6 — Demo re-record
**Goal:** a true, produced demo.
**Depends on:** all above.
**Tasks (skeleton):**
- Run a REAL rehearsal against the live Vercel URL (not localhost) with a real wallet — the step that would have caught the 500.
- Re-record at 1920×1080 with narration (script in `DEMO-SCRIPT.md` is strong; keep the copy, fix the delivery).
- Fix the script/UI persona-name mismatch ("The Degen" spoken vs "The Sniper" rendered).
**Spike:** none. ~0.5 day.

---

## Status: all 6 plans written in full detail

| Plan | File | Reconciliation gate |
|------|------|---------------------|
| 1 | `2026-07-20-genuinely-live-data-layer.md` | Task 0 security gate + Task 1 API spike (own fork) |
| 2 | `2026-07-20-a2mcp-conformance.md` | Task 0 reconcile + Task 1 A2MCP-contract spike |
| 3 | `2026-07-20-real-x402-payment.md` | Task 0 reconcile + Task 1 x402 round-trip HARD GATE |
| 4 | `2026-07-20-frontend-a11y-tokenization.md` | Task 0 reconcile (independent; parallelizable) |
| 5 | `2026-07-20-submission-honesty-pass.md` | Task 0 reconcile (branches on what actually shipped) |
| 6 | `2026-07-20-demo-rerecord.md` | Task 0 live-truth gate (HALT if prod 500s) |

## Reconciliation protocol (how caveats resolve across plans)

Full plans are written up front, but each carries **branch caveats** (documented forks) that are resolved by a **reconciliation spike** at its head. The caveat is "what could be true"; the spike is "which one is". They are one mechanism, not two alternatives.

- **Foreseeable forks** → pre-written as branch caveats in each plan's `## Upstream Inputs & Branch Caveats` table (cheap, keeps momentum).
- **Unforeseeable results** (the spike surfaces something no branch anticipated) → the reconciliation spike HALTS and amends the plan before code. This is the safety valve for unknown-shape unknowns.

**Every plan opens with `## Task 0: Reconcile with upstream output`:** read the artifacts in the "Reads" column below, confirm which documented branch applies, write the chosen branch + evidence to the plan's state note, then proceed. If reality matches no branch, STOP and amend.

## Branch-Caveat Matrix (the different caveats, keyed to the previous process's output)

| Plan | Reads (upstream artifact) | Possible outcomes | Branch taken |
|------|---------------------------|-------------------|--------------|
| 1 | (root; no upstream) — its own Task 1 spike | REST trade endpoint exists / does not | exists → live-data build; none → **Plan-1B honest-demo fork** |
| 2 | Plan 1 green + `docs/OKX-TRADE-API-CONTRACT.md`; A2MCP spike | marketplace card/envelope confirmed live / only skill-grounded defaults reachable | confirmed → build to it; defaults → build to fallbacks + flag card-shape re-validate as a Downstream Item |
| 3 | Plan 2 green (`docs/A2MCP-CONTRACT.md`, 402 seam); x402 round-trip spike | testnet USDG settles / cannot settle | settles → real x402 (`settlementMode=live`); cannot → **keep demo settlement, do NOT ship Plan 3**, tell Plan 5/6 to not claim real payment |
| 4 | independent of 1-3; current `globals.css`/components | (no upstream fork) | always runs; parallelizable; only `package.json`/`playwright.config.ts` are shared (additive) |
| 5 | Plans 1-4 final state + live URL + whether Plan 3 shipped | x402 real vs simulated; A2MCP live vs metadata-only; tx count from regenerated cache | rewrite copy to whichever is TRUE; ONE canonical tx number from Plan 1's cache |
| 6 | Plan 1 live-500 fixed on prod + `video/REHEARSAL-LOG.md` + whether 2/3 shipped | live flow works with real wallet / still 500s | works → record; 500 → **HALT (never record over a broken flow)**; VO claims only what shipped |

## Pipeline-skill tickets (process-level — NOT product plans)

A full reconciliation of both audits against the six plans (2026-07-21) confirmed **no silent product gaps**: 1 true gap (rate-limiting) and 6 partials were closed by patch edits into Plans 1/2/4/5. The findings below are about the **hackathon pipeline skills themselves**, not the Alter Ego product — they belong in the skill definitions, not these plans. Logged here so they are acknowledged, not dropped:

- **Critique gate enforcement** — the `hackathon-critique` skill was silently skipped; the conductor did not enforce it. Fix: make critique a hard, ledgered gate. (Q3 / N2 / ML-1)
- **Differential-test kill-zone** — verify/forge self-audit gates measure presence + HTTP-200 and reward mocks (scored a `setTimeout` 3/5, a zeros-returning path 15/15). Fix: every gate must run the product on ≥2 distinct real inputs and assert outputs differ + are non-empty. (Q2 / Q17 / Q18 / Q19 / F17 / ML-2 / ML-3) — product-side already instantiated as Plan 1 T6 differential test.
- **Debug requires tests** — the debug gate self-certified "ACCEPTED" with `testCount:0`. Fix: debug must require ≥1 new committed test. (Q11)
- **Interrogate integrity** — delete the P21 "defense-attorney" persona, remove severity caps on the honesty/architecture/sponsor lanes, fix the 93-vs-72 count arithmetic. (Q37 / Q38 / Q39 / ML-4)

These route to `~/.claude/skills/` (conductor, hackathon-verify, hackathon-debug, hackathon-interrogate), tracked as a separate workstream.
