# Demo Re-record — Implementation Plan (Plan 6 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Also read the `demo-video` skill (`~/.claude/skills/demo-video/SKILL.md`) for scene/audio/render conventions before Task 3.

**Goal:** Produce a TRUE, produced demo of Alter Ego AFTER the product is genuinely live — a real rehearsal against the LIVE Vercel URL with a real wallet (the step that would have caught the HTTP 500), the persona-name mismatch fixed, and a re-recorded 1920x1080 video WITH narration that matches `DEMO-SCRIPT.md`, subtitled/loudnorm'd/muxed per the demo-video skill and verified with `ffprobe`.

**Architecture:** This is a screen-recording demo with native narration (per `DEMO-SCRIPT.md` "Audio strategy: native"), not a fully Remotion-composited video. The pipeline is: (0) live-truth precondition gate + real-wallet rehearsal → (1) fix the `page.tsx:120` persona-name mismatch so what is rendered matches what is spoken → (2) capture a clean 1920x1080 screen recording of the live flow → (3) record narration, normalize loudness (EBU R128 two-pass), mux it onto the video track, and burn Whisper-timed subtitles → (4) assemble final MP4 + outro card + vertical social clip → (5) verify every spec with `ffprobe`/`grep`. The current `video/demo-final.mp4` is 1280x800, silent, and off-spec; it is replaced, not patched.

**Tech Stack:** ffmpeg / ffprobe (capture, scale, loudnorm, mux, concat), Playwright (deterministic browser drive of the live URL), Whisper (`--model base`, subtitle timestamps), Remotion (outro card + optional subtitle overlay + social clip), Gemini TTS `gemini-speak` (fallback narration) or human voice memo, Next.js live app on Vercel.

## Global Constraints

- **Resolution: 1920x1080** exactly. The final MP4 must probe `width=1920,height=1080`. The existing 1280x800 silent file is off-spec and must not be shipped.
- **Has-audio:** the final MP4 MUST carry an AAC audio stream (`ffprobe` shows `codec_type=audio`). The existing file has no audio.
- **Narration matches `DEMO-SCRIPT.md`:** the spoken words are the 7-step script copy, adjusted ONLY where reality changed (persona names, tx count, any claim softened by Plan 5). Do not invent new copy.
- **No em-dashes** in any on-screen copy (outro card, burned subtitles, titles). Standing rule.
- **The demo must work on the LIVE url with a real wallet.** Recording happens against `https://alter-ego-wine-mu.vercel.app` (or the Plan-5-reconciled canonical URL), not localhost. A real rehearsal that exercises a real wallet path must pass BEFORE any recording. If the live flow 500s or a real wallet returns empty, HALT.
- **Target: OKX.AI Genesis** (Build X Series), agent ASP #6013, chain X Layer (index 196). The outro card and any spoken close say "Built for OKX.AI Genesis" — never "Build X" and never a stale/auth-walled URL.
- **VO honesty:** the narration claims ONLY what actually shipped across Plans 1-5. If x402 (Plan 3) is simulated, the VO must not claim real USDC settlement; if A2MCP (Plan 2) did not ship, the VO must not call it a live marketplace agent.
- **No placeholders in commands.** Every ffmpeg/ffprobe/whisper/curl command below is runnable as written once the two variables at the top of Task 0 are set.

## Upstream Inputs & Branch Caveats

This is the LAST plan; it consumes the truth produced by all prior plans. Read the state each produced BEFORE recording, and branch as follows.

| Upstream artifact | Possible outcomes | Branch |
|---|---|---|
| **Plan 1** — live 500 fixed on prod (`/api/analyze` returns 200; `/api/diag` is 404) | (a) 200 with populated patterns AND a real wallet returns non-empty; (b) still 500, or real wallet returns empty | (a) proceed to record; (b) **HALT** — do not record over a broken flow. Re-open Plan 1 Task 0/Task 3. |
| **Plan 2** — A2MCP conformance shipped (`/api/a2mcp` is a real agent: agent card + 402/X-PAYMENT + envelope) | (a) shipped and live; (b) still a plain REST blob / deferred | (a) VO may say "listed as an A2MCP marketplace agent"; (b) VO says only "exposes an analysis endpoint" — do NOT claim marketplace-agent conformance. |
| **Plan 3** — real x402 payment shipped (OKX Payment SDK `@okxweb3/x402`, real USDT0 on X Layer `eip155:196`; MANDATORY listing gate) | (a) real settlement live; (b) not yet settling | (a) VO/outro may say "pay per analysis in USDT0 on X Layer"; (b) VO frames it as "payment-gate integration" and Step 7 drops any "real payment" claim. Note: x402 is a listing gate, so (b) means #6013 is not yet listed, and the demo must not claim marketplace listing either. |
| **Plan 5** — reconciled submission values | single tx count (was 4,463/4,051/6,134), GitHub handle `dmustapha` (not `dmz4pf`), canonical live URL `alter-ego-wine-mu.vercel.app` (not auth-walled `alter-ego-demo`) | Outro card + any spoken number use ONLY the Plan-5-reconciled values. Read `description.md`/`links.md`/README post-Plan-5 to fetch them. If Plan 5 has not run, HALT until it has (this plan depends on all above). |

If ANY "(b)"/HALT branch fires, stop and record it in `video/REHEARSAL-LOG.md`; do not proceed to capture.

---

## Task 0: Reconcile with upstream output (live-truth precondition gate, do FIRST)

**Files:**
- Create: `video/REHEARSAL-LOG.md` (the gate deliverable + rehearsal record)
- Read: `docs/superpowers/plans/00-ROADMAP.md`, Plan 1 (`2026-07-20-genuinely-live-data-layer.md`), Plan 5 output (`description.md`, `links.md`, `README.md`, `submission/`), `DEMO-SCRIPT.md`
- Reference: `src/app/page.tsx:14-15` (the exact LOAD DEMO / analyze payload the UI sends)

**Interfaces:**
- Consumes: the live prod deployment + all prior plans' shipped state.
- Produces: a PASS/HALT gate result and `video/REHEARSAL-LOG.md`. No recording may start until this task is PASS.

Set these two variables once; every command below uses them:

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
BASE=https://alter-ego-wine-mu.vercel.app   # confirm this is the Plan-5 canonical URL, not alter-ego-demo
REAL_WALLET=0x0000000000000000000000000000000000000000   # replace with a genuinely active EVM wallet you control/know
```

- [ ] **Step 1: Confirm the canonical URL from Plan 5.** `grep -rn "vercel.app" description.md links.md README.md submission/ 2>/dev/null | sort -u`. Expected: every hit is `alter-ego-wine-mu.vercel.app`; NO hit is `alter-ego-demo`. If `alter-ego-demo` still appears, Plan 5 did not complete — **HALT**.

- [ ] **Step 2: Live-500 gate — `/api/analyze` returns 200 (not 500).** Send the exact payload the UI sends:

```bash
curl -s -o /tmp/analyze.json -w "HTTP %{http_code}\n" -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' \
  -d '{"address":"0xDemo...","chains":["ethereum"]}'
```

Expected: `HTTP 200` and `jq '.patterns|length' /tmp/analyze.json` > 0. If `HTTP 500`, **HALT** — Plan 1 is not green on prod; re-open it. Do not record.

- [ ] **Step 3: Info-leak gate — `/api/diag` is 404.**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/api/diag"
```

Expected: `HTTP 404`. If 200, the info-leak endpoint is still live — **HALT** and finish Plan 1 Task 0 Step 4.

- [ ] **Step 4: Real-wallet rehearsal (the step that catches the 500).** Drive a real wallet through the ANALYZE path — not LOAD DEMO — against LIVE prod:

```bash
curl -s -o /tmp/real.json -w "HTTP %{http_code}\n" -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' \
  -d "{\"address\":\"$REAL_WALLET\",\"chains\":[\"ethereum\"]}"
jq '{status:(.error//"ok"), patterns:(.patterns|length), personas:(.personas|length)}' /tmp/real.json
```

Expected: `HTTP 200`, `patterns > 0`, `personas > 0`, no `error`. If the real wallet returns empty patterns/personas or a 500, **HALT** — the live path is not genuinely working; record over nothing.

- [ ] **Step 5: Full-flow browser rehearsal against LIVE prod (Playwright).** Confirm the UI's LOAD DEMO → ANALYZE → all 6 phases render without a thrown error or empty card, at 1920x1080. Write `scripts/rehearse-live.mjs`:

```js
import { chromium } from "playwright";
const BASE = process.env.BASE || "https://alter-ego-wine-mu.vercel.app";
const b = await chromium.launch({ headless: false });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
p.on("response", (r) => { if (r.url().includes("/api/") && r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });
await p.goto(BASE, { waitUntil: "networkidle" });
await p.click('button:has-text("LOAD DEMO")');
await p.click('button:has-text("ANALYZE")');
await p.waitForTimeout(80000);          // let all 6 phases auto-play
await p.screenshot({ path: "video/rehearsal-final-frame.png" });
console.log(errs.length ? "REHEARSAL FAIL:\n" + errs.join("\n") : "REHEARSAL PASS: no pageerror, no 5xx");
await b.close();
```

```bash
BASE=$BASE node scripts/rehearse-live.mjs
```

Expected: prints `REHEARSAL PASS`. If it prints any 5xx or pageerror, **HALT**.

- [ ] **Step 6: Read shipped-state of Plans 2 and 3** to set VO honesty. `grep -n "agent card\|X-PAYMENT\|402\|serviceList" src/app/api/a2mcp/route.ts` (Plan 2 shipped iff these exist); `grep -rn "x402/verify\|x402/settle\|setTimeout" src/` (Plan 3 real iff verify/settle exist and the `setTimeout` is gone). Record which branch of the Upstream table applies.

- [ ] **Step 7: Read the Plan-5 reconciled numbers** for the outro card and spoken script: `grep -rn "4,463\|4,051\|6,134\|transactions" description.md submission/ | head`. Record the ONE canonical tx count. Record `dmustapha` handle and canonical URL.

- [ ] **Step 8: Write `video/REHEARSAL-LOG.md`.** Capture: URL used, the four gate results (analyze 200, diag 404, real-wallet non-empty, browser rehearsal PASS), the Plan-2/Plan-3 branch decisions, the reconciled tx count / handle / URL, and an explicit `GATE: PASS` or `GATE: HALT — <reason>` line. Commit:

```bash
git add video/REHEARSAL-LOG.md scripts/rehearse-live.mjs video/rehearsal-final-frame.png
git commit -m "demo: live-truth precondition gate + real-wallet rehearsal log"
```

**Verification:** `grep -q "GATE: PASS" video/REHEARSAL-LOG.md && echo "cleared to record" || echo "BLOCKED"` prints `cleared to record`. Do not start Task 2 until it does.

---

## Task 1: Fix the persona-name mismatch (script vs UI)

**Files:**
- Modify: `src/app/page.tsx:120` (the hard-coded persona card list)
- Reference: `src/lib/persona.ts:6`, `src/data/cache/personas.json:57`, `src/data/cache/roast-battle.json:57`, `DEMO-SCRIPT.md:40`

**Interfaces:**
- Produces: a UI where the Solana persona NAME rendered on screen equals the name spoken in the narration and stored in the cache/persona map. Removes the "The Degen" (spoken/cached) vs "The Sniper" (rendered) contradiction the audit flagged.

- [ ] **Step 1: Establish the single source of truth.** Determine the canonical Solana archetype. `DEMO-SCRIPT.md:40` says "The Degen"; `personas.json:57` and `roast-battle.json:57` say "The Degen"; `types.ts:103` comment says `"The Degen"`; but `page.tsx:120` renders "🔫 The Sniper" and `persona.ts:6` maps `AMP-03 → "The Sniper"`. **Canonical = "The Degen"** (it is what the script speaks, what the cache serves, and what the compare/roast surfaces already show). Make everything match "The Degen".

- [ ] **Step 2: Fix the rendered card.** In `src/app/page.tsx:120`, change `name: "🔫 The Sniper"` to `name: "🔫 The Degen"`. (Keep the emoji; only the words are wrong.)

- [ ] **Step 3: Reconcile the persona map.** In `src/lib/persona.ts:6`, decide: if `AMP-03` genuinely means the sniper trait, leave the archetype but ensure the Solana demo persona is generated from a rule that yields "The Degen"; simplest honest fix is to rename `AMP-03` archetype to `"The Degen"` so the live classifier output and the cache agree. Confirm no OTHER archetype string is now duplicated incorrectly.

- [ ] **Step 4: Verify no "The Sniper" remains as the Solana demo name.**

```bash
grep -rn "The Sniper" src/ && echo "STILL PRESENT — reconcile" || echo "clean"
grep -rn "The Degen" src/app/page.tsx src/data/cache/personas.json
```

Expected: `page.tsx` now shows "The Degen"; `personas.json` shows "The Degen"; the spoken script (`DEMO-SCRIPT.md:40`) already says "The Degen" — all three agree.

- [ ] **Step 5: Typecheck + rebuild + redeploy so the LIVE url reflects the fix** (recording happens against prod):

```bash
npm run typecheck
git add src/app/page.tsx src/lib/persona.ts
git commit -m "fix: persona-name mismatch — Solana self is 'The Degen' everywhere (matches script + cache)"
vercel --prod
```

- [ ] **Step 6: Confirm the fix is live.** After deploy, re-run the browser rehearsal from Task 0 Step 5 and `grep` the rendered DOM:

```bash
BASE=$BASE node scripts/rehearse-live.mjs   # must still print REHEARSAL PASS
```

Then load the live page and confirm the Solana card reads "The Degen".

**Verification:** `curl -s "$BASE" | grep -o "The Sniper" || echo "no stale Sniper on live landing"` and the rehearsal screenshot `video/rehearsal-final-frame.png` shows "The Degen" on the Solana persona card. The word spoken in Step 4 of the script now matches the pixels.

---

## Task 2: Capture the clean 1920x1080 screen recording of the live flow

**Files:**
- Create: `scripts/capture-demo.mjs` (deterministic Playwright drive + native recording)
- Produce: `video/demo-raw-1080.mp4` (1920x1080 video track, no narration yet)
- Reference: `DEMO-SCRIPT.md` (7-step sequence + async timings), `~/.claude/skills/demo-video/SKILL.md` (Screen Recording section, C6 rules)

**Interfaces:**
- Consumes: the LIVE, Task-1-fixed deployment.
- Produces: a silent 1920x1080 H.264 MP4 of the full 7-step flow, timed to leave room for narration per the DEMO-SCRIPT async table.

- [ ] **Step 1: Set the browser to a true 1920x1080 viewport, no chrome.** Use Playwright's built-in video capture (deterministic, headless-safe, no OS screen-recorder framing risk). Write `scripts/capture-demo.mjs`:

```js
import { chromium } from "playwright";
const BASE = process.env.BASE || "https://alter-ego-wine-mu.vercel.app";
const b = await chromium.launch({ headless: false, args: ["--force-device-scale-factor=1", "--hide-scrollbars"] });
const ctx = await b.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: "video/raw/", size: { width: 1920, height: 1080 } },
});
const p = await ctx.newPage();
await p.goto(BASE, { waitUntil: "networkidle" });
await p.waitForTimeout(3000);                         // Step 1 landing — 3s to breathe
await p.click('button:has-text("LOAD DEMO")');
await p.waitForTimeout(2000);                         // Step 2 addresses populate
await p.click('button:has-text("ANALYZE")');
// Steps 3-7 auto-play: scanning 2s, results 18s, battle 38s, compare, CTA 18s
await p.waitForTimeout(82000);
await ctx.close();                                    // finalizes the .webm
await b.close();
```

```bash
BASE=$BASE node scripts/capture-demo.mjs
ls -la video/raw/                                     # a single *.webm at 1920x1080
```

- [ ] **Step 2: Transcode the raw webm to a normalized 1920x1080 30fps H.264 MP4** (fix container, framerate, pixel format; hard-assert resolution with the scale filter):

```bash
RAW=$(ls -t video/raw/*.webm | head -1)
ffmpeg -y -i "$RAW" \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30" \
  -pix_fmt yuv420p -c:v libx264 -crf 20 -preset slow \
  video/demo-raw-1080.mp4
```

- [ ] **Step 3: Confirm the capture caught all phases** (persona cards, roast battle, compare, CTA). Extract a few frames and eyeball:

```bash
ffmpeg -y -i video/demo-raw-1080.mp4 -vf "fps=1/10" video/raw/frame_%02d.png
open video/raw/frame_03.png video/raw/frame_06.png video/raw/frame_08.png   # results / battle / CTA
```

Confirm the Solana card reads "The Degen" (Task 1 landed) and no empty cards flashed. If a phase was missed or a card was empty, adjust the wait timings and re-capture.

**Verification:**

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,codec_name \
  -show_entries format=duration -of default=noprint_wrappers=1 video/demo-raw-1080.mp4
```

Expected: `width=1920`, `height=1080`, `r_frame_rate=30/1`, `codec_name=h264`, and `duration` ~85-90s. If width/height are not exactly 1920/1080, fix Step 2 before proceeding.

---

## Task 3: Narration + loudness + subtitles (the produced layer)

**Files:**
- Produce: `video/narration-raw.(m4a|mp3)` (human voice memo OR Gemini TTS), `/tmp/narration-normalized.m4a`, `video/subs.srt`
- Produce: `video/demo-narrated-1080.mp4` (video track + AAC narration + burned subtitles)
- Reference: `DEMO-SCRIPT.md` (the 7 `Say:` blocks), `~/.claude/skills/demo-video/SKILL.md` (Voiceover Workflow, Whisper H4, EBU R128 L3, Audio Mux H1)

**Interfaces:**
- Consumes: `video/demo-raw-1080.mp4`, the DEMO-SCRIPT narration (honesty-adjusted per Task 0 Step 6).
- Produces: a 1920x1080 MP4 that HAS audio matching the script, with Whisper-timed burned subtitles.

- [ ] **Step 1: Finalize the narration script.** Concatenate the seven `Say:` blocks from `DEMO-SCRIPT.md` into `video/narration-script.txt`, in order, applying Task-0 honesty edits: use the reconciled tx count (replace "4,463" if Plan 5 changed it), say "The Degen" for Solana, and — if Plan 3 is simulated — change Step 7's close from any real-payment claim to "payment-gate integration." Remove any em-dashes. Total target ~130-150 wpm over ~85s (~185-215 words).

- [ ] **Step 2: Produce the narration audio.** Two routes; native/human is preferred per `DEMO-SCRIPT.md` "Audio strategy: native":
  - **Human (preferred):** record a single-take voice memo reading `video/narration-script.txt`, save as `video/narration-raw.m4a`. Do NOT apply `atempo` (SPEED-mode narration; see the skill's C4 warning).
  - **TTS fallback:** use the Gemini MCP `gemini-speak` with voice `Charon` (Security/DeFi archetype), save raw, then `ffmpeg -i raw.mp3 -af "atempo=1.12" -y video/narration-raw.m4a` (GAP-mode only).

- [ ] **Step 3: Normalize loudness (EBU R128 two-pass, I=-20 TP=-1.5 LRA=11).** Pass 1 measure:

```bash
ffmpeg -i video/narration-raw.m4a -af loudnorm=I=-20:TP=-1.5:LRA=11:print_format=json -f null /dev/null 2>&1 | tail -20
```

Read `measured_I/measured_TP/measured_LRA/measured_thresh/offset` from the JSON, then Pass 2 apply (substitute the five measured values):

```bash
ffmpeg -y -i video/narration-raw.m4a \
  -af "loudnorm=I=-20:TP=-1.5:LRA=11:measured_I=<measured_I>:measured_TP=<measured_TP>:measured_LRA=<measured_LRA>:measured_thresh=<measured_thresh>:offset=<offset>:linear=true" \
  -ar 44100 /tmp/narration-normalized.m4a
```

- [ ] **Step 4: Mux narration onto the video track** (ffmpeg cannot read+write the same file — write to /tmp then mv). Per the skill's Audio Mux H1 pattern:

```bash
ffmpeg -y -i video/demo-raw-1080.mp4 -i /tmp/narration-normalized.m4a \
  -map 0:v -map 1:a \
  -c:v copy -c:a aac -shortest \
  /tmp/demo-muxed.mp4
mv /tmp/demo-muxed.mp4 video/demo-narrated-1080.mp4
```

- [ ] **Step 5: Whisper-time the subtitles from the muxed audio** (never eyeball timings — skill H4):

```bash
ffmpeg -y -i video/demo-narrated-1080.mp4 -vn -acodec copy /tmp/demo_audio.m4a
whisper /tmp/demo_audio.m4a --model base --output_format srt --output_dir /tmp/
cp /tmp/demo_audio.srt video/subs.srt
```

- [ ] **Step 6: Sanity-fix subtitle text** (Whisper mis-hears jargon): open `video/subs.srt` and correct proper nouns to match the script — "Alter Ego", "The Degen", "OKX.AI Genesis", the tx count, "TEE". Remove any em-dashes Whisper inserted.

- [ ] **Step 7: Burn subtitles into the narrated video** (keeps audio; re-encodes video once):

```bash
ffmpeg -y -i video/demo-narrated-1080.mp4 \
  -vf "subtitles=video/subs.srt:force_style='FontName=Space Mono,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,MarginV=48'" \
  -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p \
  -c:a copy \
  video/demo-subbed-1080.mp4
```

**Verification:**

```bash
ffprobe -v error -show_entries stream=codec_type,codec_name -of csv=p=0 video/demo-subbed-1080.mp4
```

Expected: one `video,h264` line AND one `audio,aac` line (has-audio proven). Then spot-check sync: `ffmpeg -y -i video/demo-subbed-1080.mp4 -ss 35 -frames:v 1 /tmp/sub_check.png && open /tmp/sub_check.png` — the burned caption at 35s must match what is spoken at 35s (Whisper-accurate). Confirm the caption text has no em-dashes: `grep -c "—" video/subs.srt` returns `0`.

---

## Task 4: Assemble final MP4 (outro card + optional social clip)

**Files:**
- Create: `video/outro/` Remotion outro card OR a static ffmpeg-generated card `video/outro-1080.mp4`
- Produce: `video/demo-final-1080.mp4` (the submission master), `video/out/hook-social.mp4` (1080x1920 vertical clip)
- Reference: `VIDEO-PLAN.md` (outro spec), `~/.claude/skills/demo-video/SKILL.md` (Social Clip section)

**Interfaces:**
- Consumes: `video/demo-subbed-1080.mp4`, the Plan-5 reconciled URL/handle.
- Produces: a single spec-compliant master MP4 with a Genesis outro, plus a vertical social clip.

- [ ] **Step 1: Build a 4s 1920x1080 outro card.** Title "Alter Ego" / subtitle "Built for OKX.AI Genesis" / footer `alter-ego-wine-mu.vercel.app  ·  github.com/dmustapha/alter-ego` (Plan-5 handle `dmustapha`, canonical URL; NO em-dashes; use `·` not `—`). Simplest robust route — a static PNG rendered to video (a designer PNG on brand black `#0a0a1a` with pink `#ff2d95`/cyan `#00ffff`), then:

```bash
ffmpeg -y -loop 1 -i video/outro-card.png -t 4 \
  -vf "scale=1920:1080,fps=30" -pix_fmt yuv420p -c:v libx264 -crf 20 \
  -f lavfi -i anullsrc=r=44100:cl=stereo -shortest -c:a aac \
  video/outro-1080.mp4
```

(Alternatively render a Remotion `Outro` composition at 1920x1080 — either is fine as long as it probes 1920x1080 with an audio track for clean concat.)

- [ ] **Step 2: Concat the demo + outro** (both must share codec/params; use the concat demuxer with a re-encode to be safe):

```bash
printf "file '%s'\nfile '%s'\n" "$PWD/video/demo-subbed-1080.mp4" "$PWD/video/outro-1080.mp4" > /tmp/concat.txt
ffmpeg -y -f concat -safe 0 -i /tmp/concat.txt \
  -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -c:a aac -ar 44100 \
  video/demo-final-1080.mp4
```

- [ ] **Step 3: Render the vertical social clip (10-12s)** from the strongest 12s (the roast battle, ~0:45-0:57). Crop-to-vertical and scale to 1080x1920:

```bash
ffmpeg -y -ss 45 -t 12 -i video/demo-final-1080.mp4 \
  -vf "crop=ih*9/16:ih,scale=1080:1920,fps=30" -pix_fmt yuv420p \
  -c:v libx264 -crf 20 -c:a aac \
  video/out/hook-social.mp4
```

- [ ] **Step 4: Replace the old off-spec file and commit.** Keep the new master as the canonical `demo-final.mp4` reference (or update every pointer to `demo-final-1080.mp4`):

```bash
git rm --ignore-unmatch video/demo-final.mp4 video/page@*.webm
git add video/demo-final-1080.mp4 video/out/hook-social.mp4 video/subs.srt \
        video/narration-script.txt scripts/capture-demo.mjs video/outro-1080.mp4
git commit -m "demo: re-recorded 1920x1080 narrated master + Genesis outro + vertical social clip"
```

**Verification:**

```bash
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height \
  -show_entries format=duration -of default=noprint_wrappers=1 video/demo-final-1080.mp4
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 video/out/hook-social.mp4
```

Expected master: `width=1920,height=1080`, a `video,h264` + `audio,aac` pair, `duration` ~89-94s (demo + 4s outro). Expected social: `1080,1920`.

---

## Task 5: Final spec-compliance verification + wire the new file into submission

**Files:**
- Modify: `video/VIDEO-PLAN.md`, `DEMO-SCRIPT.md` (update the recorded-spec line: 1920x1080, narrated), any submission pointer to the video (`submission/`, `links.md`, README)
- Reference: all prior task outputs

**Interfaces:**
- Consumes: `video/demo-final-1080.mp4`, `video/REHEARSAL-LOG.md`.
- Produces: a single verification block proving every Global Constraint, and submission docs pointing at the new file.

- [ ] **Step 1: Full ffprobe assertion block** (this is the spec gate):

```bash
V=video/demo-final-1080.mp4
echo "res:";      ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$V"     # must be 1920,1080
echo "audio:";    ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "$V"       # must print aac
echo "fps:";      ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$V"     # 30/1
echo "duration:"; ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$V"                  # ~89-94
```

Expected: `1920,1080` / `aac` / `30/1` / ~90s. If any fails, return to the owning task; do not ship.

- [ ] **Step 2: Confirm the old off-spec file is gone.** `ls video/*.webm 2>/dev/null && echo "STALE WEBM PRESENT" || echo "clean"`; and `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 video/demo-final.mp4 2>/dev/null` should either be absent or already point to the 1920x1080 master.

- [ ] **Step 3: Confirm the gate + persona fixes are reflected.** `grep -q "GATE: PASS" video/REHEARSAL-LOG.md && echo ok`; `grep -rn "The Sniper" src/ && echo "MISMATCH REMAINS" || echo "persona names consistent"`.

- [ ] **Step 4: Update the doc spec lines to reality.** In `video/VIDEO-PLAN.md` and `DEMO-SCRIPT.md`, change any "1280x800" / "800p" / "Trim to exactly 90s" language to the actual "1920x1080, narrated, subtitled, ~90s." Update any submission pointer (`links.md` / README / `submission/`) to reference `video/demo-final-1080.mp4` and the canonical URL.

- [ ] **Step 5: Commit the doc reconciliation.**

```bash
git add video/VIDEO-PLAN.md DEMO-SCRIPT.md links.md README.md submission/ 2>/dev/null
git commit -m "docs: point submission at the 1920x1080 narrated demo; align spec lines to reality"
```

**Verification:** the Step 1 block prints `1920,1080` + `aac` + `30/1`; `grep -rn "800p\|1280x800" video/ DEMO-SCRIPT.md` returns nothing; `grep -rn "alter-ego-demo" submission/ links.md README.md` returns nothing (canonical URL only).

---

## Self-Review notes

- **Spec coverage:** every Plan-6 roadmap item maps to a task — real rehearsal against the LIVE URL with a real wallet (Task 0, the 500-catcher), 1920x1080 (Tasks 2/4/5, hard-asserted by ffprobe), narration matching `DEMO-SCRIPT.md` (Task 3, honesty-adjusted), persona-name mismatch fixed (Task 1: "The Sniper"→"The Degen" across `page.tsx`/`persona.ts` to match cache + script). Subtitle/loudnorm/mux follow the demo-video skill's H1/H4/L3 procedures exactly.
- **Dependency honesty:** Task 0 is a true gate, not a formality — four independent HALT conditions (URL not reconciled, analyze 500, diag 200, real wallet empty) each stop the plan before any pixels are recorded. This is the structural fix for the audit's "no real rehearsal ran" finding: recording is gated on live truth, not assumed.
- **VO/claim honesty:** the Upstream table binds the narration to what actually shipped. If Plan 2/3 didn't ship, the VO is downgraded automatically (no marketplace-agent claim, no real-payment claim) rather than repeating the old script's simulated-x402 framing as fact.
- **Off-spec cleanup:** the existing 1280x800 silent `demo-final.mp4` and the stray `page@*.webm` are removed, not left beside the new master, so a judge cannot open the wrong file.
- **No double-speedup:** Task 3 Step 2 explicitly forks native (no atempo) vs TTS (atempo 1.12, no Remotion playbackRate) per the skill's C4 warning — the one place demo audio commonly breaks.
- **Assumption to confirm before Task 0:** `BASE` is the Plan-5 canonical URL and `REAL_WALLET` is a genuinely active address; both are set once at the top of Task 0 and every command inherits them. If Plan 5 has not landed, the plan HALTS at Task 0 Step 1 by design.
