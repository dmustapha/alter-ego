# Demo Release and Composite Trading Pattern Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a truthful, verified demo video tonight while preserving a complete implementation path from multi-wallet evidence to validated Composite Trading Patterns.

**Architecture:** The demo release fixes and proves the existing live evidence layer. The post-submission product adds a typed cohort-synthesis layer above `analyzeWallets`, then validation and user-approved action layers. Personas remain presentation-only; synthesis consumes patterns, signals, coverage, and outcomes.

**Tech Stack:** Next.js, TypeScript, Vitest, Playwright, OKX OnchainOS, Groq, x402 on X Layer, Playwright recording, generated TTS, Whisper, ffmpeg/ffprobe.

---

## Track A: Demo release, execute first

### Task 1: Establish a fresh baseline and preserve the current scan work

**Files:**
- Test: `src/lib/analyze.test.ts`
- Test: `src/app/api/analyze/route.test.ts`
- Modify only if a failing test identifies a defect: `src/lib/analyze.ts`, `src/app/api/analyze/route.ts`

1. Run `npm test -- --run src/lib/analyze.test.ts src/app/api/analyze/route.test.ts`.
2. Run `npx tsc --noEmit`.
3. Inspect the unstaged diff using `git diff -- src/lib/analyze.ts src/lib/okx-api.ts src/app/api/analyze/route.ts`.
4. Add a regression test for each demonstrated invariant: stream events are NDJSON, `done` is terminal, standard/deep settings reach the expected paginator cap, and no progress event reports completion before the result is ready.
5. Run the focused tests and then `npm test`.
6. Commit only the verified scan/progress files.

### Task 2: Remove demo-critical truth gaps from the UI

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/WalletInput.tsx`
- Modify: `src/components/ScanProgress.tsx`
- Modify: `src/lib/types.ts`
- Test: `tests/a11y.spec.ts`

1. Write a focused interaction test for the Deep Scan control: keyboard operable, visible state, and an accessible label.
2. Replace “full history” with the actual bounded depth statement. Do not market a capped paginator as complete history.
3. Replace the contradictory “Demo Mode: Pre-computed Data” presentation with language that reflects live analysis while retaining an explicit demo-wallet shortcut.
4. Preserve the final server-provided progress counters rather than resetting the request count on the done event.
5. Replace same-owner-only wording with selected-wallet/cohort wording.
6. Run `npm run test:a11y`, focused unit tests, `npx tsc --noEmit`, and `npm test`.

### Task 3: Make post-analysis content follow the scanned wallets or omit it

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/api/roast/route.ts`
- Modify: `src/app/api/compare/route.ts`
- Modify/Create: `src/lib/roast.ts`, `src/lib/compare.ts`
- Test: `src/lib/roast.test.ts`
- Test: `src/app/api/analyze/route.test.ts`

1. Write failing tests proving a roast/compare request receives the current analysis result or explicitly has no result.
2. Add a request-scoped payload contract; never make a newly scanned wallet render cache-only roast or comparison data.
3. Generate the roast from current personas/pattern evidence with the existing numeric guard, or hide the roast section if generation cannot complete safely.
4. Replace static leaderboard-style comparison with an evidence-led cross-wallet comparison, or omit it from the release.
5. Run focused tests, `npm test`, `npx tsc --noEmit`, and a local stream rehearsal.

### Task 4: Verify a production rehearsal and select the demo cohort

**Files:**
- Create: `video/REHEARSAL-LOG.md`
- Create: `scripts/rehearse-live.mjs`
- Create: `video/rehearsal-final-frame.png`

1. Confirm the canonical production URL from `README.md` and submission links.
2. Verify a normal JSON analysis and the streaming analysis route against the exact payload the UI sends.
3. Drive the live page at 1920×1080 with Playwright; fail on page errors, API 5xx responses, empty cards, or static cache output presented as live analysis.
4. Choose a two-wallet cohort with enough data and a meaningful behavior contrast. Record its addresses, chains, transaction count, scan duration, generated pattern evidence, and any omitted sections in `video/REHEARSAL-LOG.md`.
5. Capture a final rehearsal screenshot and add it to the log.

### Task 5: Replace the stale script with verified, human walkthrough narration

**Files:**
- Modify: `DEMO-SCRIPT.md`
- Modify: `video/VIDEO-PLAN.md`
- Create: `video/SCRIPT.md`
- Create: `video/STORYBOARD.md`
- Create: `video/ASSETS.md`

1. Write only from the rehearsal log and visible product states.
2. Lead with multi-wallet comparison: wallets may be a user, peers, funds, or research targets; same-owner comparison is an example.
3. Explain live scan, evidence, per-wallet profiles, and the path to a Composite Trading Pattern in a warm, direct walkthrough voice.
4. Mention x402 only while showing the settlement proof. Do not characterize a simulated UI button as a successful settlement.
5. Describe Composite Trading Pattern as the next layer unless its live implementation exists at capture time.
6. Remove obsolete fixed counts, 1280×800 instructions, static-timer timings, simulated-payment wording, and unsupported TEE claims.

### Task 6: Capture and produce the demo video

**Files:**
- Create: `scripts/capture-demo.mjs`
- Create: `video/demo-raw-1080.mp4`
- Create: `video/narration-script.txt`
- Create: `video/narration-raw.*`
- Create: `video/subs.srt`
- Create: `video/demo-final-1080.mp4`

1. Record the verified production flow at 1920×1080 using Playwright video capture. Use a silent capture and separate TTS audio.
2. Generate TTS only after the final narration is approved. Use a warm, direct conversational voice. Do not use a paid third-party endpoint without confirming its price/authorization; use an available local fallback if necessary.
3. Normalize and align the narration. Run Whisper against the actual audio and use its timestamps for subtitles.
4. Mux narration, burn subtitles, and include a brief closing card naming Alter Ego, the canonical URL, and OKX Build X.
5. Verify with `ffprobe`: 1920×1080, H.264 video, AAC audio, and an appropriate duration. Review sampled frames for empty cards, stale copy, and subtitle overlap.

### Task 7: Reconcile the submission surface

**Files:**
- Modify: `README.md`
- Modify: `submission/copy/description.md`
- Modify: `submission/DETAILS-BODY.html`
- Modify/Create: `docs/proof/*`, `submission/links.md`

1. Search all submission assets for obsolete transaction counts, pre-computed/demo-only claims, simulated-x402 claims, stale URLs, and same-owner-only positioning.
2. Replace only claims proven in the rehearsal log and settlement proof.
3. Add the verified video link once produced.
4. Run a final URL/link audit, tests, typecheck, and production smoke rehearsal.

## Track B: Full Composite Trading Pattern, execute after submission

### Task 8: Define normalized evidence and coverage contracts

**Files:**
- Create: `src/lib/evidence/types.ts`
- Create: `src/lib/evidence/normalize.ts`
- Create: `src/lib/evidence/coverage.ts`
- Test: `src/lib/evidence/normalize.test.ts`
- Test: `src/lib/evidence/coverage.test.ts`

1. Write tests for cross-chain transaction normalization, direction/price provenance, missing-data handling, and coverage scoring.
2. Implement immutable normalized events and explicit unknown values rather than fabricated zeroes.
3. Add wallet-level coverage and recency summaries.

### Task 9: Build evidence-backed wallet behavior profiles

**Files:**
- Create: `src/lib/behavior/profile.ts`
- Create: `src/lib/behavior/rules.ts`
- Test: `src/lib/behavior/profile.test.ts`
- Test: `src/lib/behavior/rules.test.ts`

1. Write tests for concentration, turnover, holding horizon, execution cost, drawdown response, and risk exposure dimensions.
2. Implement each dimension with provenance, confidence, coverage, and an insufficient-data state.
3. Keep persona generation downstream of this profile.

### Task 10: Build cohort synthesis and Composite Trading Pattern output

**Files:**
- Create: `src/lib/composite/types.ts`
- Create: `src/lib/composite/synthesize.ts`
- Create: `src/app/api/composite/route.ts`
- Test: `src/lib/composite/synthesize.test.ts`
- Test: `src/app/api/composite/route.test.ts`

1. Write tests for consensus, disagreement, recency weighting, coverage weighting, and no-owner-inference behavior.
2. Implement market posture, strengths, risks, conflicts, confidence, and limits from behavior profiles.
3. Return evidence IDs for every generated assertion.

### Task 11: Compile and validate strategy hypotheses

**Files:**
- Create: `src/lib/strategy/types.ts`
- Create: `src/lib/strategy/compiler.ts`
- Create: `src/lib/backtest/*`
- Test: `src/lib/strategy/compiler.test.ts`
- Test: `src/lib/backtest/*`

1. Write tests requiring every rule to name its evidence, market regime, assumptions, and confidence.
2. Implement walk-forward splits, fees, gas, slippage, liquidity checks, and no-lookahead controls.
3. Mark unvalidated strategies as hypotheses and prevent them from becoming trade recommendations.

### Task 12: Add proposal and user-approved action flow

**Files:**
- Create: `src/lib/proposal/*`
- Create: `src/app/api/proposals/route.ts`
- Modify: `src/app/page.tsx`
- Test: `src/lib/proposal/*`

1. Write tests that require explicit user approval, risk disclosure, and a validated strategy before execution.
2. Implement proposal rendering and an audit trail.
3. Integrate an approved execution path through the applicable OnchainOS capability; do not expose autonomous execution by default.

## Final verification

Run:

```bash
npm test
npm run test:a11y
npx tsc --noEmit
npm run build
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height -show_entries format=duration -of default=noprint_wrappers=1 video/demo-final-1080.mp4
```

Expected: all tests and typecheck pass; production build passes in an environment with font/network access; final video reports 1920×1080 H.264 video and AAC audio.
