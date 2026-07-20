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
