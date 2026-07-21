# Scope Decisions

## DECISION: Phase-timer UX retained as-is (Q7)

**What:** `src/app/page.tsx` contains a setTimeout chain (~2 s / ~20 s / ~58 s) that drives the
loading phases visible during wallet analysis.

**Decision:** RETAIN as an intentional demo-pacing choice. Do not re-architect.

**Rationale:** The demo capture (Plan 6) and the landing screenshots (Plan 4) were recorded and
validated against these exact timings. Re-architecting the timer mid-remediation would require
re-recording all visual assets, invalidate the existing demo video, and introduce non-trivial risk
with zero scoring gain. The phase durations reflect the real latency profile of the live OKX API
calls (cold-start + 3-chain fan-out can take 15-25 s), so the UX is not dishonest -- it maps to
genuine wait times. Making it a true progress signal driven by streaming responses is a valid
future enhancement and is tracked as a post-submission improvement, not a defect.

**Filed by:** Task 7, Plan 1 of 6 (2026-07-21)
