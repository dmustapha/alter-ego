# Alter Ego Remediation — Roadmap (6 plans)

Date: 2026-07-20
Source of truth for the remediation arc. Detailed plans are written **roll-wave** (each just-in-time after the prior lands), because Plan 1's API spike can fork the rest. This file holds the confirmed target + skeletons so nothing is lost between waves.

## Confirmed target (from forge/intel docs)

- **Hackathon:** OKX.AI Genesis (Build X Series) — `PRD.md:3`.
- **Submission:** OKX.AI marketplace listing (ASP agent #6013) + DoraHacks Details tab — `submission/`, `PRD.md:428`.
- **Chain:** X Layer, chain index **196** — ERC-8004 identity token minted on X Layer (`ARCHITECTURE.md:1962`), x402 uses **USDT0** `0x779ded0c9e1022225f8e0630b35a9b54be713736` (6 decimals) on X Layer (verified from OKX `howtomcp`; the earlier **USDG** `0x4ae46a…` from `DEEP-RESEARCH.md:20` was an omnispect-x error, see `docs/LISTING-REJECTION-ANALYSIS.md`), demo wallet C is X Layer.
- **Chains analyzed:** Ethereum (1), Solana (501), X Layer (196). The trade-history spike (Plan 1 Task 1) MUST probe `chainIndex: 196` too, not only Ethereum.
- **Genesis differentiator the brief rewards:** decision-to-action lineage (AI decision → on-chain tx/intent id). Currently absent; candidate for a later plan if scoring needs it.

## LISTING REJECTION WORKSTREAM (2026-07-21) — READ FIRST

Agent #6013 was **rejected again** for three protocol failures. Full analysis + corrected facts: `docs/LISTING-REJECTION-ANALYSIS.md` (authoritative — all x402/A2MCP/A2A work references it). The rejection is about the **agent protocol layer**, which the original six plans barely covered. Reason → fix owner:

| OKX rejection reason | Root cause | Fix |
|----------------------|-----------|-----|
| 1. Endpoint unreachable | `serviceList: []` on-chain + submitted URL is Vercel-auth-walled (302) | Plan 2 (register reachable `wine-mu` URL) + deploy-protection-off check |
| 2. x402 validation failed | Wrong token/version/network + hand-rolled (USDG/18dp/v1/xlayer). OKX needs USDT0/6dp/v2/eip155:196 via `@okxweb3/x402` SDK | Plan 3 (corrected + MANDATORY) → Plan 2 |
| 3. Task timed out / no response | A2A daemon scoped presence-only; nothing answers XMTP task messages | **NEW Plan 7** (full always-on daemon + AI adapter) |

**Two service surfaces both required:** A2MCP HTTP endpoint (`/api/a2mcp`, x402-gated, in `serviceList`) AND the A2A XMTP channel (`communicationAddress`, daemon-served). **x402 is now MANDATORY, not optional.**

## Sequence

Listing-critical path first (the active blocker), then product/submission polish:

`1 (live data) → 3 (x402 via OKX SDK, MANDATORY) + 2 (A2MCP endpoint + serviceList) → 7 (A2A daemon, full) → 8 (listing-readiness gate: pass OKX's 3 tests) → 4 (a11y) → 5 (honesty) → 6 (demo)`

Plan 2 and Plan 3 interleave (the `/api/a2mcp` endpoint issues the SDK's x402 402). **No resubmission to OKX until Plan 8's three tests are all green** (per Dami's directive). Each plan green before the next is written. Est. ~5-6 focused days.

## New plans (listing workstream)

- **Plan 7 — A2A daemon (full, always-on):** `docs/superpowers/plans/2026-07-21-a2a-daemon-full.md`. Deploy the full `okx-a2a` daemon (XMTP + `task` + `ai` adapter) to the cloud; AI adapter delivers Alter Ego analysis; responds to `a2a-agent-chat` + user prompts within timeout. Supersedes the presence-only spec `docs/superpowers/specs/2026-07-20-presence-daemon-fly-design.md`.
- **Plan 8 — Listing-readiness gate (terminal):** `docs/superpowers/plans/2026-07-21-listing-readiness-gate.md`. Run OKX's 3 tests (reachable+registered, `curl -i -X POST`→402+PAYMENT-REQUIRED, live A2A response) against the live deploy + on-chain state. Hard gate before any resubmit.

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
- Server 402 challenge via the **OKX Payment SDK `@okxweb3/x402`** with the verified v2 `accepts[0]`: `{scheme:"exact", network:"eip155:196", asset:"0x779ded0c…713736" (USDT0, 6dp), amount, payTo, maxTimeoutSeconds:300, extra:{name:"USD₮0", version:"1"}}` (authoritative: `docs/LISTING-REJECTION-ANALYSIS.md`; supersedes the omnispect-x USDG/xlayer/requiredDeadlineSeconds values).
- Client `X-PAYMENT` header via `onchainos payment pay`/`pay-local` (payer side).
- Verify + settle handled by the **OKX Payment SDK** (the omnispect `/api/v6/x402/verify|settle` paths are unverified and NOT used; the SDK owns the facilitator call).
**Spike:** one testnet USDT0 settlement round-trip on X Layer. ~0.5-1 day.

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
