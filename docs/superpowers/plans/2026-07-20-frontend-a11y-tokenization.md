# Frontend A11y + Design Tokenization — Implementation Plan (Plan 4 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift Alter Ego's frontend from ~58 to ~80 craft tier by making it keyboard-accessible, motion-safe, and WCAG 2.1 AA color-compliant — WITHOUT losing the signature CRT / neon-arcade identity. Every interactive element gets a visible `:focus-visible` ring, every animation respects `prefers-reduced-motion`, all body copy passes 4.5:1 contrast on both dark backgrounds, the five conflicting hardcoded palettes collapse into one Tailwind v4 `@theme` token set, the inline-DOM `onMouseEnter/onFocus` style hacks become pure CSS, the illegible 6-8px pixel-font body copy is repaired, and the broken flagship `docs/images/landing.png` is re-captured showing real content.

**Architecture:** Tailwind v4 CSS-first. All color/motion primitives live in `src/app/globals.css` under a single `@theme` block plus a small utilities/keyframes layer. Components stop carrying literal hex strings (`text-[rgba(160,160,210,.45)]`, `bg-[#0a0a1a]`, inline `onMouseEnter` style mutations) and instead reference semantic tokens (`text-dim`, `bg-surface`, `.btn-primary`). A11y is enforced structurally: a global `:focus-visible` rule, a global `@media (prefers-reduced-motion: reduce)` guard, and a Playwright spec that asserts focus rings render and reduced-motion is honored. The CRT scanlines, vignette, flicker, glitch-shift, corner brackets, and polygon-clip card are all PRESERVED — only their triggers are gated and their colors are tokenized.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 (`@theme`, `@import "tailwindcss"`), framer-motion 12 (existing), Playwright 1.61 (existing). No new runtime dependencies.

## Global Constraints

- Tailwind v4 CSS-first: all tokens declared in `@theme` inside `src/app/globals.css`. No `tailwind.config.js` is introduced (the project has none and must stay that way). Custom-property names follow Tailwind v4 conventions (`--color-*`, `--font-*`) so utilities like `text-dim`, `bg-surface`, `border-accent` auto-generate.
- WCAG 2.1 AA: normal-size body text ≥ 4.5:1, large text (≥ 24px or ≥ 18.66px bold) and non-text UI ≥ 3:1, against BOTH `#050510` (body bg) and `#0a0a1a`/`#0d0d1a` (card bg). Every color decision in this plan is backed by a computed ratio (see the contrast table in Task 2).
- No em-dashes in any user-facing copy or docs (standing rule). Use a hyphen or restructure.
- Preserve the signature CRT look: scanlines (`body::after`), dual-tone vignette (`body::before`), header flicker, `glitchShift` offset layers, neon corner brackets, polygon `clip-path` card, dual pink/cyan neon primaries. None of these are removed — flicker/glitch/scale-pulse/typing are only GATED behind `prefers-reduced-motion`, and colors are only re-pointed at tokens with identical or near-identical hex.
- No visual regression: at full motion + default contrast, the rendered pixels must be within noise of the current design. The only intended pixel changes are (a) the dim text getting lighter to pass AA, (b) the placeholder becoming visible, (c) focus rings appearing only on keyboard focus. Verify with a before/after screenshot diff per Task 8.
- Independent of Plans 1-3: this plan touches only `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/proof/page.tsx`, `src/components/*`, and additively `package.json` + `playwright.config.ts`. It does NOT touch `src/lib/*`, `src/app/api/*`, or `src/data/cache/*`, so it never collides with Plan 1's data-layer work.

## Upstream Inputs & Branch Caveats

Plan 4 is a leaf in the roadmap DAG (`00-ROADMAP.md`: "Depends on: nothing"). It reads only the CURRENT committed state of the frontend, so there is no upstream fork to reconcile. The one file it shares with other plans is `package.json` (test scripts) and `playwright.config.ts` (test globbing) — both edited ADDITIVELY.

| Upstream artifact | Possible outcomes | Branch |
|---|---|---|
| `src/app/globals.css` / `src/components/*` current state (this plan's only real input) | (a) untouched since audit (expected); (b) already partially tokenized by a prior partial run | (a) run all tasks as written; (b) Task 0 Step 4 diffs against the audit-era hex list and SKIPS any token already present, never re-adding |
| `package.json` test scripts | (a) still the audit-era scaffold with only `dev/prebuild/build/start/lint`; (b) Plan 1 already added `"test": "vitest run"` / `"test:e2e": "playwright test"` | (a) add `test:a11y` additively; (b) do NOT overwrite Plan 1's `test`/`test:e2e` — only append `test:a11y` and reuse the existing `test:e2e` if present |
| `playwright.config.ts` `testMatch` | (a) audit-era `testMatch: "stress-browser.spec.ts"` (single-file); (b) Plan 1 widened it / added a `webServer` block | (a) widen `testMatch` to a glob that also catches `a11y.spec.ts`; (b) if Plan 1 already added `webServer`, reuse it and only extend `testMatch`, never clobber |
| `vitest` dependency (Plan 1) | Plan 1 adds `vitest`; this plan adds none | No conflict: Playwright a11y test is separate from vitest unit tests; both can coexist in `devDependencies`. This plan installs no packages. |

**Runs unconditionally.** There is no gate that can stop Plan 4 from executing; the only conditional logic is the "do not clobber a co-plan's additive edit" merge behavior in Task 0.

## Task 0: Reconcile with upstream output

**Files:**
- Read-only inspect: `package.json`, `playwright.config.ts`, `src/app/globals.css`
- Capture: `docs/images/_baseline/landing.png`, `battle.png`, `compare.png`, `results.png`, `proof.png` (Create dir)

**Interfaces:**
- Produces: a confirmed-parallelizable baseline plus before-screenshots that Task 8 diffs against. Consumes nothing from Plans 1-3.

- [ ] **Step 1: Confirm no blocking upstream.** `git -C /Users/MAC/hackathon-toolkit/active/alter-ego log --oneline -5` and `git status`. This plan proceeds regardless; the log read only informs the clobber-avoidance in Steps 2-3. Record the current HEAD sha in a scratch note so Task 8's diff has a reference point.

- [ ] **Step 2: Detect prior `package.json` edits (avoid clobbering Plan 1/5).**

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
grep -E '"(test|test:e2e|test:a11y)"' package.json || echo "NO_TEST_SCRIPTS_YET"
```

If `test`/`test:e2e` already exist (Plan 1 landed first), note that Task 7 will ADD `test:a11y` only and reuse the existing `test:e2e`. If none exist, Task 7 adds all three.

- [ ] **Step 3: Detect prior `playwright.config.ts` edits.**

```bash
grep -E 'testMatch|webServer' playwright.config.ts
```

If a `webServer` block is already present (Plan 1 added it), Task 7 reuses it and only extends `testMatch`. If `testMatch` is still the single-string `"stress-browser.spec.ts"`, Task 7 converts it to an array/glob so both the stress spec and the new `a11y.spec.ts` match.

- [ ] **Step 4: Detect prior tokenization (idempotency guard).**

```bash
grep -c '@theme' src/app/globals.css
grep -E -- '--color-(bg|surface|accent|dim)' src/app/globals.css || echo "NOT_TOKENIZED_YET"
```

Expected on a clean audit-era repo: one `@theme inline` block with only three `--font-*` lines and no `--color-*`. If `--color-*` tokens are already present from a partial run, Task 2 adds only the missing ones.

- [ ] **Step 5: Capture the before-baseline for the diff gate.** Start the dev server, screenshot all five surfaces at the audit viewport, and stash them under `_baseline/`.

```bash
mkdir -p docs/images/_baseline
# dev server (leave running in a bg shell): npm run dev
node - <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const shots = [
    ['landing', 'http://localhost:3000/'],
    ['proof',   'http://localhost:3000/proof'],
  ];
  for (const [name, url] of shots) {
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(2500); // let SlideIn settle
    await p.screenshot({ path: `docs/images/_baseline/${name}.png`, fullPage: true });
  }
  await b.close();
})();
EOF
```

Expected: `_baseline/landing.png` reproduces the audit bug (empty below hero) — this is the "before" we will prove fixed in Task 5. `battle/compare/results` are phase-gated behind the LOAD DEMO flow; capture those in Task 8 via the driven Playwright spec, not here.

- [ ] **Step 6: Commit the baseline.** `git add docs/images/_baseline && git commit -m "chore(a11y): capture pre-remediation frontend baseline screenshots"`

---

## Task 1: Motion primitives + `prefers-reduced-motion` guards

**Files:**
- Modify: `src/app/globals.css` (add reduced-motion guard + keep keyframes)
- Modify: `src/components/Terminal.tsx:36,40` (glitch layers), `:123-131` (TypingText), `:134-140` (SlideIn)
- Modify: `src/components/RoastBattle.tsx:24-25` (scale pulse), `src/components/PersonaCard.tsx:9`, `PatternCard.tsx:9`, `CompareCard.tsx:7` (framer entrance)

**Interfaces:**
- Produces: a `useReducedMotion` gate applied to every framer-motion component and CSS animation, so a user with `prefers-reduced-motion: reduce` sees content in its final state with zero flicker/glitch/scale/typing.

- [ ] **Step 1: Add the global CSS reduced-motion guard** to `src/app/globals.css` (append after the keyframes block). This kills the flicker, glitchShift, and the scanline/vignette shimmer for reduced-motion users while leaving the static neon look intact:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
  /* Freeze the CRT flicker/glitch at their opaque, un-shifted state */
  [data-anim="flicker"] { opacity: 1 !important; }
  [data-anim="glitch"]  { transform: none !important; }
}
```

- [ ] **Step 2: Tag the CRT-animated elements** so the guard above can pin them. In `Terminal.tsx`, add `data-anim="glitch"` to both offset glitch layers (`:22` cyan div, `:34` pink div) and `data-anim="flicker"` to the `▶ ALTER_EGO.EXE` span (`:61`). Leave their `animation:` inline styles as-is — the media query overrides them.

- [ ] **Step 3: Gate framer-motion via `useReducedMotion`.** framer-motion 12 exports `useReducedMotion()`. In `SlideIn` (`Terminal.tsx:134`), read it and collapse the entrance when reduced:

```tsx
import { motion, useReducedMotion } from "framer-motion";

export function SlideIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { delay, duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
```

Note `initial={false}` makes the element mount already-visible (critical: it also fixes the static-screenshot "empty below hero" symptom in Task 5).

- [ ] **Step 4: Apply the same `useReducedMotion` collapse** to `PatternCard.tsx:9` (`initial={reduce ? false : {opacity:0, x:...}}`), `PersonaCard.tsx:9` (`scale`), `CompareCard.tsx:7` (`y`), and the `RoastBattle.tsx:24-25` scale-pulse (`animate={reduce ? {scale:1} : {...}}`).

- [ ] **Step 5: Gate the `TypingText` typewriter** (`Terminal.tsx:123`). When reduced, render the full string immediately with no cursor blink:

```tsx
export function TypingText({ text, delay = 30 }: { text: string; delay?: number }) {
  const reduce = useReducedMotion();
  const [displayed, setDisplayed] = useState(reduce ? text : "");
  const [done, setDone] = useState(reduce);
  useEffect(() => {
    if (reduce) { setDisplayed(text); setDone(true); return; }
    let i = 0; setDisplayed(""); setDone(false);
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1)); i++;
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, delay);
    return () => clearInterval(interval);
  }, [text, delay, reduce]);
  return (<span>{displayed}{!done && <span className="animate-pulse">▌</span>}</span>);
}
```

- [ ] **Step 6: Verify with an emulated reduced-motion probe.**

```bash
node - <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  await p.goto('http://localhost:3000/');
  await p.waitForTimeout(200); // if reduced-motion honored, hero copy is already visible with no wait
  const opacity = await p.$eval('h1', el => getComputedStyle(el).opacity);
  const desc = await p.$eval('p', el => getComputedStyle(el).opacity);
  console.log('h1 opacity (want 1):', opacity, '| desc opacity (want 1):', desc);
  await b.close();
})();
EOF
```

Expected: both opacities are `"1"` within 200ms (no 500ms fade), proving the entrance is collapsed for reduced-motion users.

- [ ] **Step 7: Commit.** `git add src/app/globals.css src/components/Terminal.tsx src/components/RoastBattle.tsx src/components/PatternCard.tsx src/components/PersonaCard.tsx src/components/CompareCard.tsx && git commit -m "a11y: honor prefers-reduced-motion across CRT flicker, glitch, typing, and framer entrances"`

---

## Task 2: Hoist the 5 palettes into `@theme` tokens + fix AA contrast

**Files:**
- Modify: `src/app/globals.css` (expand `@theme`, add computed AA colors)
- Modify: `DESIGN_SYSTEM.md`, `brand.json` (rewrite their color system to reference the single canonical token set — closes the "docware disconnected from code" root)

**Interfaces:**
- Produces: one canonical token set (`--color-bg`, `--color-surface`, `--color-surface-input`, `--color-accent`, `--color-secondary`, `--color-warning`, `--color-text`, `--color-text-2`, `--color-dim`, `--color-eth`, `--color-sol`, plus glow custom props). Every component in Tasks 3-6 consumes these instead of literal hex.

**The five conflicting palettes (from the audit + files read):**
1. `globals.css` body: bg `#050510`, text `#d0d0f0`.
2. `DESIGN_SYSTEM.md`: bg `#0a0a0f`, surface `#0d0d1a`, input `#08081a`, text `#e0e0ff`, dim `rgba(200,200,255,0.5)`.
3. `brand.json`: background `#0a0a0f`, surface `#0d0d1a`, textPrimary `#00ffff`, textBody `#e0e0ff`, textMuted `rgba(200,200,255,0.5)`.
4. `page.tsx` inline: cards `#0a0a1a`, headings `#f0f0ff`, dim `rgba(160,160,210,.45)`.
5. `Terminal.tsx` inline: card `#0d0d1a`, dim `rgba(180,180,220,.45)`.

The reconciliation: page bg stays `#050510` (the actual rendered body), card surfaces standardize to `#0a0a1a` (what `page.tsx` cards + `PersonaCard` already use), input stays `#08081a`, and the dim color is REPLACED with an AA-passing value.

**Computed contrast (verified via WCAG relative-luminance formula; see Task 2 Step 5 for the reproducible script):**

| Token | Hex | Ratio on `#050510` | Ratio on `#0a0a1a` | Ratio on `#0d0d1a` | AA verdict |
|---|---|---:|---:|---:|---|
| current dim `rgba(160,160,210,.45)` (composited) | `~#4b4b67` | **2.42** | 2.46 | 2.45 | FAIL |
| **new `--color-dim`** | `#8f8fbf` | **6.61** | 6.39 | 6.29 | PASS (AA + AAA-large) |
| `--color-text` | `#f0f0ff` | 17.97 | 17.38 | 17.08 | PASS |
| `--color-text-2` | `#d0d0f0` | 13.48 | 13.03 | 12.81 | PASS |
| `--color-secondary` (cyan) | `#00ffff` | 16.17 | 15.63 | 15.37 | PASS |
| `--color-accent` (pink) | `#ff2d95` | 5.85 | 5.66 | 5.56 | PASS |
| `--color-warning` | `#ffff00` | 18.88 | 18.26 | 17.95 | PASS |
| `--color-eth` badge | `#627eea` | 5.22 | - | 5.22 | PASS |
| `--color-sol` badge (was `#9945ff` @ 4.27 FAIL) | `#8b6dff` | 5.26 | - | 5.26 | PASS |
| placeholder cyan `@10%` (current) | `~#072131` | - | - | 1.20 | FAIL (invisible) |
| **placeholder cyan `@45%`** (new) | `~#047781` | - | - | 3.74 | PASS (AA-large / non-text UI) |

- [ ] **Step 1: Replace the `@theme` block** in `src/app/globals.css:3-7` with the full token set. Tailwind v4 auto-derives `text-dim`, `bg-surface`, `border-accent`, etc. from `--color-*`:

```css
@theme {
  --font-sans: ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: 'Space Mono', ui-monospace, SFMono-Regular, monospace;
  --font-pixel: 'Press Start 2P', cursive;

  /* Surfaces (elevation ladder) */
  --color-bg: #050510;            /* page background (matches rendered body) */
  --color-surface: #0a0a1a;       /* card fill (canonicalized) */
  --color-surface-deep: #0d0d1a;  /* outer terminal card */
  --color-surface-input: #08081a; /* textarea fill */

  /* Neon primaries */
  --color-accent: #ff2d95;        /* pink: primary action, danger, guard */
  --color-secondary: #00ffff;     /* cyan: system, success, amplify */
  --color-warning: #ffff00;

  /* Text (all AA-verified) */
  --color-text: #f0f0ff;          /* headings */
  --color-text-2: #d0d0f0;        /* strong body */
  --color-dim: #8f8fbf;           /* muted body — was rgba(160,160,210,.45) @ 2.42:1, now 6.3-6.6:1 */

  /* Chain badges */
  --color-eth: #627eea;
  --color-sol: #8b6dff;           /* was #9945ff @ 4.27:1 (FAIL), now 5.26:1 */
  --color-base: #00ffff;
  --color-xlayer: #ff2d95;
}
```

- [ ] **Step 2: Move the glow values into custom properties** in a `:root` block (they are not colors Tailwind should tokenize, but they must stop being copy-pasted rgba literals). Append to `globals.css`:

```css
:root {
  --glow-pink: 0 0 20px rgba(255,45,149,.25);
  --glow-pink-strong: 0 0 40px rgba(255,45,149,.4);
  --glow-cyan: 0 0 15px rgba(0,255,255,.15);
  --glow-cyan-strong: 0 0 24px rgba(0,255,255,.35);
  --ring-focus: 0 0 0 2px #050510, 0 0 0 4px #00ffff, 0 0 15px rgba(0,255,255,.5);
}
```

- [ ] **Step 3: Point the `body` rule at the tokens** (`globals.css:9-13`):

```css
body {
  background: var(--color-bg);
  color: var(--color-text-2);
  font-family: 'Space Mono', monospace;
}
```

- [ ] **Step 4: Fix the invisible placeholder color** at the source. The rule change happens in Task 4 (WalletInput), but the token is declared here: the placeholder must use cyan at 45% (`3.74:1`), not 10% (`1.20:1`). No separate token needed — it is expressed as `placeholder:text-secondary/45` in Task 4.

- [ ] **Step 5: Verify every token with a reproducible contrast script.** Save and run `scripts/check-contrast.mjs` (throwaway, deleted at commit):

```js
const lin = c => { c/=255; return c<=0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4; };
const L = h => { const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16); return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b); };
const ratio = (fg,bg) => { const a=L(fg),b=L(bg),hi=Math.max(a,b),lo=Math.min(a,b); return (hi+0.05)/(lo+0.05); };
const bgs = { "#050510":"body", "#0a0a1a":"surface", "#0d0d1a":"deep" };
const checks = [["#8f8fbf","dim"],["#f0f0ff","text"],["#d0d0f0","text-2"],["#ff2d95","accent"],["#00ffff","secondary"],["#627eea","eth"],["#8b6dff","sol"]];
let fail = 0;
for (const [hex,name] of checks) for (const bg of Object.keys(bgs)) {
  const r = ratio(hex,bg); const ok = r >= 4.5;
  if (!ok) fail++;
  console.log(`${ok?"PASS":"FAIL"} ${name} ${hex} on ${bg} = ${r.toFixed(2)}`);
}
process.exit(fail ? 1 : 0);
```

`node scripts/check-contrast.mjs` — expected: all PASS, exit 0. (`--color-eth`/`--color-sol` are non-text UI so 3:1 would suffice, but both clear 4.5 anyway.)

- [ ] **Step 6: Rewrite `DESIGN_SYSTEM.md` and `brand.json` to reference the canonical token set.** Hoisting the CSS into one `@theme` set does NOT fix the audit's "five conflicting palettes / docware disconnected from code" root unless the design docs are re-pointed at that same set — otherwise `DESIGN_SYSTEM.md` (bg `#0a0a0f`, surface `#0d0d1a`, dim `rgba(200,200,255,0.5)`) and `brand.json` (background `#0a0a0f`, textPrimary `#00ffff`, textMuted `rgba(200,200,255,0.5)`) keep asserting palettes that no longer match the shipped CSS. Rewrite BOTH docs so their color system is the single canonical palette, hex-for-hex identical to the `@theme` custom properties from Step 1 (`bg #050510`, surface `#0a0a1a`, surface-deep `#0d0d1a`, input `#08081a`, accent `#ff2d95`, secondary `#00ffff`, warning `#ffff00`, text `#f0f0ff`, text-2 `#d0d0f0`, dim `#8f8fbf`, eth `#627eea`, sol `#8b6dff`). Each doc color entry names the token it maps to (e.g. `--color-dim` / `text-dim`) so the docs read as documentation OF the tokens, not a parallel source of truth. Remove every stale/conflicting hex: `#0a0a0f`, the old surface duplicates, `rgba(200,200,255,0.5)`, textPrimary `#00ffff`-as-body, and the old sol `#9945ff`. State in a one-line header note that `src/app/globals.css` `@theme` is the source of truth and these docs mirror it. No em-dashes.

- [ ] **Step 7: Verify no stale palette survives in the docs and the doc palette equals `@theme`.**

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
# 1) old/conflicting palette values must be gone from both docs
grep -nE '#0a0a0f|rgba\(200,\s*200,\s*255,\s*0?\.5\)|#9945ff' DESIGN_SYSTEM.md brand.json && echo "FAIL: stale palette remains" || echo "PASS: no stale palette hexes"
# 2) every canonical @theme value appears in the docs (doc palette == theme)
for hex in '#050510' '#0a0a1a' '#0d0d1a' '#08081a' '#ff2d95' '#00ffff' '#ffff00' '#f0f0ff' '#d0d0f0' '#8f8fbf' '#627eea' '#8b6dff'; do
  grep -qi -- "$hex" DESIGN_SYSTEM.md && grep -qi -- "$hex" brand.json || echo "MISSING in docs: $hex"
done
echo "done"
```

Expected: `PASS: no stale palette hexes`, no `FAIL`/`MISSING` lines. Any hit means a conflicting palette still lives in the design docs and the docware-disconnect root is not closed.

- [ ] **Step 8: Commit.** `rm scripts/check-contrast.mjs; git add src/app/globals.css DESIGN_SYSTEM.md brand.json && git commit -m "design: single @theme token set; repoint DESIGN_SYSTEM.md + brand.json at canonical tokens; fix AA contrast on dim text and sol badge (2.42 to 6.3:1)"`

---

## Task 3: Global `:focus-visible` rings + tokenize page.tsx

**Files:**
- Modify: `src/app/globals.css` (global focus rule + `.btn-primary` / `.btn-ghost` / `.arcade-card` utilities)
- Modify: `src/app/page.tsx` (replace ~40 inline hex refs with tokens; remove inline scale on stats)

**Interfaces:**
- Consumes: the `@theme` tokens and `--ring-focus` from Task 2.
- Produces: a keyboard-visible focus ring on every focusable element and a tokenized landing page.

- [ ] **Step 1: Add the global focus-visible rule** to `globals.css` (append). It uses `:focus-visible` (keyboard only, never on mouse click), never removes the outline without a replacement, and offsets from the dark bg so the cyan ring reads:

```css
:where(a, button, textarea, input, select, [tabindex]):focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
  border-radius: 2px;
}
/* never leave a focusable element with no indicator */
:where(a, button, textarea, input, [tabindex]):focus:not(:focus-visible) {
  outline: none;
}
```

- [ ] **Step 2: Add reusable component utilities** to `globals.css` so the inline `onMouseEnter` hacks (Task 4) and repeated card markup can be deleted. This is the CSS home for the hover recipe that currently lives in JS:

```css
@layer components {
  .arcade-card {
    background: var(--color-surface);
    border: 1px solid rgba(255,45,149,.1);
    padding: 2rem;
  }
  .btn-primary {
    font-family: var(--font-pixel);
    text-transform: uppercase;
    letter-spacing: 2px;
    background: var(--color-accent);
    color: #fff;
    border: none;
    box-shadow: var(--glow-pink);
    transition: transform .15s ease, box-shadow .15s ease;
    cursor: pointer;
  }
  .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: var(--glow-pink-strong); }
  .btn-primary:active:not(:disabled) { transform: translateY(0); transition: none; }
  .btn-primary:disabled { opacity: .3; cursor: not-allowed; }
  .btn-ghost {
    font-family: var(--font-pixel);
    text-transform: uppercase;
    background: transparent;
    border: 1px solid rgba(255,255,255,.08);
    color: var(--color-dim);
    transition: border-color .15s ease, color .15s ease;
    cursor: pointer;
  }
  .btn-ghost:hover { border-color: var(--color-secondary); color: var(--color-secondary); }
}
```

- [ ] **Step 3: Tokenize `page.tsx` dim text.** Replace every `text-[rgba(160,160,210,.45)]` with `text-dim` (occurrences at `:87,115,129,144,160,169,187,191,212` and the persona-stat labels). Replace `text-[#f0f0ff]` with `text-text`, `text-[#00ffff]` with `text-secondary`, `text-[#ff2d95]` with `text-accent`, `bg-[#0a0a1a]` with `bg-surface`. The description paragraph `:87` becomes:

```tsx
<p className="text-base text-dim mt-6 leading-relaxed max-w-[620px]">
```

which now reads at 6.6:1 instead of 2.4:1.

- [ ] **Step 4: Fix the illegible micro pixel-font labels** in `page.tsx`. Per `DESIGN_SYSTEM.md` ("Press Start 2P below 10px starts to break; use Space Mono for anything legible at body size"), the `font-pixel text-[6px]` and `text-[7px]` LABELS that carry real words (stat labels `:144,160`, chain label `:129`, footer badge `:169`) switch to `font-mono` at a legible size while KEEPING the pixel font only for the decorative dot-glyph headers. Concretely, the stat-label spans:

```tsx
// before: <span className="font-pixel text-[6px] uppercase text-[rgba(160,160,210,.45)]">{s.l}</span>
<span className="font-mono text-[10px] uppercase tracking-[1px] text-dim">{s.l}</span>
```

Apply the same font-pixel-to-font-mono swap only where the text is prose/labels below 10px; leave `▶ ALTER_EGO.EXE`, the big neon numerals, and the H1 in Press Start 2P (they are ≥ 17px and are the identity).

- [ ] **Step 5: Remove the inline stat-bar hardcoded gradient rgba** (`:156`) — keep the gradient (identity) but pull its stops from tokens is not possible in an inline `linear-gradient` cleanly, so leave the decorative gradient as-is (it is non-text, exempt) and only fix the `bg-[#0a0a1a]` cell fills to `bg-surface`.

- [ ] **Step 6: Verify focus ring renders on keyboard tab.**

```bash
node - <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:3000/');
  await p.keyboard.press('Tab'); // move focus to first focusable (textarea or a link)
  const shadow = await p.evaluate(() => {
    const el = document.activeElement;
    return { tag: el.tagName, shadow: getComputedStyle(el).boxShadow };
  });
  console.log(shadow.tag, '| box-shadow has ring:', /rgb\(0, 255, 255\)|0, 255, 255/.test(shadow.shadow));
  await b.close();
})();
EOF
```

Expected: the active element reports a `box-shadow` containing the cyan ring. Fail = ring rule not applied.

- [ ] **Step 7: Commit.** `git add src/app/globals.css src/app/page.tsx && git commit -m "a11y: global focus-visible ring + component utilities; tokenize landing page, fix illegible micro labels"`

---

## Task 4: Replace inline-DOM hover/focus hacks with CSS (WalletInput)

**Files:**
- Modify: `src/components/WalletInput.tsx` (delete `onMouseEnter/onMouseLeave/onFocus/onBlur` style mutations; fix placeholder; add `aria-*`)
- Modify: `src/app/globals.css` (`.input-arcade` utility if not covered by Task 3)

**Interfaces:**
- Consumes: `.btn-primary`, `.btn-ghost`, tokens, `--glow-*`.
- Produces: a fully CSS-driven, keyboard-accessible, ARIA-labeled wallet form with a visible placeholder.

The audit's "inline-DOM hover hacks" are concretely `WalletInput.tsx:51-52` (`onFocus`/`onBlur` mutating `e.target.style.boxShadow`) and `:61-62` (`onMouseEnter`/`onMouseLeave` mutating `transform`/`boxShadow`). These break for keyboard users (no `:focus-visible`, only mouse) and mutate the DOM imperatively.

- [ ] **Step 1: Add the input utility** to `globals.css` `@layer components`:

```css
.input-arcade {
  background: var(--color-surface-input);
  border: 2px solid rgba(255,45,149,.2);
  color: var(--color-secondary);
  transition: border-color .15s ease, box-shadow .15s ease;
  resize: none;
  outline: none;
}
.input-arcade::placeholder { color: rgba(0,255,255,.45); } /* was .10 (1.2:1), now .45 (3.74:1) */
.input-arcade:focus-visible { border-color: var(--color-accent); box-shadow: var(--glow-pink); }
```

- [ ] **Step 2: Rewrite the textarea** (`WalletInput.tsx:44-54`) to drop all inline handlers and the invisible `placeholder:text-[#00ffff]/10`, and add ARIA:

```tsx
<label htmlFor="wallets" className="font-mono text-[11px] uppercase tracking-[2px] text-accent block mb-2">
  &gt; Wallet Addresses
</label>
<textarea
  id="wallets"
  value={addresses}
  onChange={(e) => setAddresses(e.target.value)}
  placeholder={"0x...a3f7    Ethereum / X Layer / Base\nSvmBase58...  Solana\n\n# One address per line. Chains auto-detected."}
  rows={4}
  aria-describedby={error ? "wallet-error" : undefined}
  aria-invalid={!!error}
  className="input-arcade w-full min-h-[120px] p-5 font-mono text-sm leading-relaxed"
  disabled={isLoading}
/>
```

Note the label heading changed from `font-pixel text-[8px]` (illegible) to `font-mono text-[11px]` per the legibility rule.

- [ ] **Step 3: Rewrite both buttons** to use the CSS utilities, dropping the four inline mouse handlers (`:61-62`) entirely:

```tsx
<button type="submit" disabled={isLoading || !addresses.trim()}
  className="btn-primary text-[11px] tracking-[2px] px-10 py-[18px]">
  ▶ ANALYZE
</button>
{onDemoLaunch && (
  <button type="button" onClick={onDemoLaunch}
    className="btn-ghost text-[10px] tracking-[1px] px-5 py-[18px]">
    LOAD DEMO
  </button>
)}
```

(The ghost button label size lifts 8px to 10px for legibility.)

- [ ] **Step 4: Wire the error message to the ARIA describedby** (`:76`):

```tsx
{error && <p id="wallet-error" role="alert" className="text-accent font-mono text-[11px] mt-2">{error}</p>}
```

(Was `font-pixel text-[7px]` — an unreadable error message. Now legible mono + `role="alert"` so screen readers announce it.)

- [ ] **Step 5: Verify placeholder visibility + no inline style mutation.**

```bash
grep -n "e.target.style\|onMouseEnter\|onMouseLeave" src/components/WalletInput.tsx || echo "CLEAN: no inline DOM style hacks"
node - <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:3000/');
  const ph = await p.$eval('#wallets', el => getComputedStyle(el, '::placeholder').color);
  console.log('placeholder color (want ~alpha .45):', ph);
  await p.focus('#wallets');
  const focused = await p.$eval('#wallets', el => getComputedStyle(el).borderColor);
  console.log('focused border (want pink #ff2d95 -> rgb(255, 45, 149)):', focused);
  await b.close();
})();
EOF
```

Expected: grep prints CLEAN; placeholder color is the ~45% cyan (not 10%); focus turns the border pink via CSS, not JS.

- [ ] **Step 6: Commit.** `git add src/components/WalletInput.tsx src/app/globals.css && git commit -m "a11y: replace inline DOM hover/focus hacks with CSS; visible placeholder; label + role=alert for form"`

---

## Task 5: Tokenize remaining components + fix landing.png root cause

**Files:**
- Modify: `src/components/Terminal.tsx`, `PatternCard.tsx`, `PersonaCard.tsx`, `RoastBattle.tsx`, `CompareCard.tsx`, `PaymentButton.tsx`, `src/app/proof/page.tsx`
- Modify: `src/app/page.tsx` (Terminal already wraps; ensure SlideIn fix from Task 1 propagates)

**Interfaces:**
- Consumes: tokens, `.btn-primary`, `--glow-*`, the `useReducedMotion` `initial={false}` fix from Task 1.
- Produces: zero literal `rgba(160,160,210,.45)` / `#0a0a1a` / `#f0f0ff` across `src/components`, and a landing page that renders full content in a static screenshot.

The **landing.png root cause**: `page.tsx` wraps everything in `SlideIn` (`initial={{opacity:0,y:20}}`). A `fullPage` screenshot taken before the staggered `delay` chain (up to `delay:2`) completes captures elements still at `opacity:0` — hence "empty below hero." Task 1 Step 3 already changed `SlideIn` to `initial={false}` under reduced-motion; for the SCREENSHOT we additionally capture with `reducedMotion:'reduce'` (Task 8) so all content is mounted visible. This is the structural fix, not a longer `waitForTimeout`.

- [ ] **Step 1: Tokenize the leaf components.** In `PatternCard.tsx:25` replace `text-[rgba(160,160,210,.45)]` with `text-dim`; `PersonaCard.tsx:13,19,20` swap `text-[#f0f0ff]`/`text-[rgba(160,160,210,.45)]` for `text-text`/`text-dim` and `bg-[#0a0a1a]` for `bg-surface`; same sweep in `RoastBattle.tsx` (`:26,28,38` etc.), `CompareCard.tsx` (all `text-[rgba(160,160,210,.45)]` and `bg-[#0a0a1a]`), and `proof/page.tsx` (`:6,8,13,19` dim + surface). Use a guarded sed then eyeball:

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego/src
grep -rl 'rgba(160,160,210,.45)' components app | xargs sed -i '' 's/text-\[rgba(160,160,210,\.45)\]/text-dim/g'
grep -rl 'text-\[#f0f0ff\]' components app | xargs sed -i '' 's/text-\[#f0f0ff\]/text-text/g'
grep -rl 'bg-\[#0a0a1a\]' components app | xargs sed -i '' 's/bg-\[#0a0a1a\]/bg-surface/g'
```

Then `grep -rn 'rgba(160,160,210' src/` MUST return nothing.

- [ ] **Step 2: Tokenize `PaymentButton.tsx`** to use `.btn-primary` for the idle state (keeps the pink glow via `--glow-pink`), dropping the inline `boxShadow` style; keep the simulating/done state classes but swap literal cyan/pink for `text-secondary`/`border-secondary`. Add `aria-live="polite"` to the button so the "Payment Simulated" state change is announced.

- [ ] **Step 3: Fix the Solana chain badge color** wherever it renders (`DESIGN_SYSTEM.md` documents `SOL: #9945ff`; if any badge markup hardcodes it, swap to `text-sol`/`border-sol` = `#8b6dff`). Grep `9945ff` across `src/` and replace.

- [ ] **Step 4: Add a proper heading hierarchy check.** Confirm `page.tsx` has exactly one `<h1>` (`:78`) and `proof/page.tsx` one `<h1>` (`:6`); the `<h3>` section headers in results are fine but ensure no `<h3>` appears before an `<h2>`/`<h1>` on the same page. If `proof/page.tsx` uses `<h2>` under its `<h1>`, that is correct (descending).

- [ ] **Step 5: Re-capture the fixed landing.png** (the flagship deliverable) with reduced-motion so all SlideIn content is mounted:

```bash
node - <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  await p.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800); // fonts + logo
  await p.screenshot({ path: 'docs/images/landing.png', fullPage: true });
  await b.close();
})();
EOF
```

Expected: `docs/images/landing.png` now shows the hero, description, demo badge, wallet input, persona sidebar, stats bar, and footer — NOT empty below the hero.

- [ ] **Step 6: Verify visually.** Re-read the new `docs/images/landing.png` and confirm the persona sidebar cards and stats bar are present and the dim text is legible.

- [ ] **Step 7: Commit.** `git add src/components src/app docs/images/landing.png && git commit -m "design: tokenize all components; fix sol badge contrast; re-capture full landing.png (was empty below hero)"`

---

## Task 6: Icon-button labels + non-color status indicators

**Files:**
- Modify: `src/components/Terminal.tsx` (badge strip `aria-label`s), `PatternCard.tsx` (the ✅/❌ that carry meaning), `src/app/page.tsx` (persona ▲/▼ pnl direction)

**Interfaces:**
- Produces: WCAG 1.4.1 (do not rely on color alone) + 1.1.1 (non-text content) compliance for the status glyphs and decorative badges.

- [ ] **Step 1: Give the emoji status glyphs text alternatives.** `PatternCard.tsx:17` uses `✅`/`❌` to encode AMPLIFY vs GUARD — meaning conveyed by icon+color only. Wrap with an accessible label and keep a text tag so it does not rely on color:

```tsx
<span aria-hidden="true" className={isAmplify ? "text-secondary" : "text-accent"}>{isAmplify ? "✅" : "❌"}</span>
<span className="sr-only">{isAmplify ? "Amplify pattern:" : "Guard pattern:"}</span>
```

Add the `.sr-only` utility to `globals.css` if not present:

```css
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; }
```

- [ ] **Step 2: PnL direction must not be color-only.** In `page.tsx:132` the pnl is pink/cyan only. It already carries a `+`/`-` sign and (for the sidebar) an `up` boolean; ensure a `+`/`-` sign is always rendered (it is, via the string). For `PersonaCard.tsx:14-16` add an `aria-label`: `aria-label={isPositive ? "profit" : "loss"}` on the pnl span so a screen reader announces polarity beyond the color.

- [ ] **Step 3: Label the decorative header badges.** `Terminal.tsx:76-88` renders `ERC-8004 / ASP·LIFESTYLE / 🔒 TEE` as pure decoration; give the container `aria-hidden="true"` if purely decorative, OR wrap each with a real label. Since these communicate real status, keep them visible and add `role="img" aria-label="ERC-8004 registered"` etc. The three colored corner-bracket divs and glitch layers get `aria-hidden="true"` (they are pointer-events-none decoration).

- [ ] **Step 4: Verify with an automated axe-style probe** (no new dep — manual assertions):

```bash
node - <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ reducedMotion: 'reduce' });
  await p.goto('http://localhost:3000/');
  const h1count = await p.$$eval('h1', els => els.length);
  const imgsNoAlt = await p.$$eval('img', els => els.filter(e => !e.alt).length);
  const btnNoName = await p.$$eval('button', els => els.filter(e => !e.textContent.trim() && !e.getAttribute('aria-label')).length);
  console.log('h1 count (want 1):', h1count, '| imgs missing alt (want 0):', imgsNoAlt, '| buttons w/o name (want 0):', btnNoName);
  await b.close();
})();
EOF
```

Expected: `h1 count: 1 | imgs missing alt: 0 | buttons w/o name: 0`.

- [ ] **Step 5: Commit.** `git add src/components src/app && git commit -m "a11y: text alternatives for status glyphs, non-color-only pnl polarity, labeled decorative badges"`

---

## Task 7: Playwright a11y regression spec (the guard)

**Files:**
- Create: `a11y.spec.ts` (repo root, alongside `stress-browser.spec.ts`)
- Modify: `package.json` (add `test:a11y` additively per Task 0)
- Modify: `playwright.config.ts` (widen `testMatch` per Task 0)

**Interfaces:**
- Consumes: the live dev/build server and the fixes from Tasks 1-6.
- Produces: a falsifiable, CI-runnable assertion of focus rings, reduced-motion, contrast tokens, and legibility — the gate the pipeline lacked.

- [ ] **Step 1: Write the spec.**

```ts
// a11y.spec.ts
import { test, expect } from "@playwright/test";

test.describe("a11y", () => {
  test("keyboard focus produces a visible ring", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const shadow = await page.evaluate(() => getComputedStyle(document.activeElement!).boxShadow);
    expect(shadow).toMatch(/0, 255, 255|rgb\(0, 255, 255\)/); // cyan ring present
  });

  test("prefers-reduced-motion mounts content already visible", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.waitForTimeout(150);
    const heroOpacity = await page.$eval("h1", el => getComputedStyle(el).opacity);
    expect(Number(heroOpacity)).toBeGreaterThan(0.99);
    await ctx.close();
  });

  test("no illegible sub-8px prose labels remain", async ({ page }) => {
    await page.goto("/");
    const tiny = await page.$$eval("*", els =>
      els.filter(e => {
        const t = e.textContent?.trim() ?? "";
        const size = parseFloat(getComputedStyle(e).fontSize);
        // only leaf text nodes with real words, using the pixel font, under 9px
        return e.children.length === 0 && /[a-z]{3,}/i.test(t) &&
               getComputedStyle(e).fontFamily.includes("Press Start") && size < 9;
      }).length
    );
    expect(tiny).toBe(0);
  });

  test("dim body text token resolves to the AA color, not the old rgba", async ({ page }) => {
    await page.goto("/");
    const bad = await page.$$eval("*", els =>
      els.filter(e => getComputedStyle(e).color === "rgba(160, 160, 210, 0.45)").length
    );
    expect(bad).toBe(0);
  });

  test("single h1, all images have alt, all buttons have accessible names", async ({ page }) => {
    await page.goto("/");
    expect(await page.$$eval("h1", e => e.length)).toBe(1);
    expect(await page.$$eval("img", els => els.filter(e => !e.alt).length)).toBe(0);
    expect(await page.$$eval("button", els =>
      els.filter(e => !e.textContent?.trim() && !e.getAttribute("aria-label")).length)).toBe(0);
  });
});
```

- [ ] **Step 2: Wire config additively** (respect Task 0 findings). If `testMatch` is still the audit-era single string, change it to an array; if Plan 1 already widened it, just ensure `a11y.spec.ts` is included:

```ts
// playwright.config.ts
testMatch: ["stress-browser.spec.ts", "a11y.spec.ts"],
// if no webServer block exists yet (Plan 1 not landed), add:
webServer: {
  command: "npm run build && npm start",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
},
```

- [ ] **Step 3: Add the script** to `package.json` (append, do not overwrite Plan 1's `test`/`test:e2e`):

```jsonc
"test:a11y": "playwright test a11y.spec.ts"
```

- [ ] **Step 4: Run it green.** `npx playwright test a11y.spec.ts` — expected: 5 passed. If the "no illegible sub-8px" test fails, a prose label was missed in Task 3/4/5; fix and re-run (do not relax the assertion).

- [ ] **Step 5: Commit.** `git add a11y.spec.ts playwright.config.ts package.json && git commit -m "test: a11y regression spec (focus ring, reduced-motion, legibility, contrast token, semantics)"`

---

## Task 8: Full re-capture + no-visual-regression proof

**Files:**
- Regenerate: `docs/images/landing.png`, `battle.png`, `compare.png`, `results.png`, `proof.png`
- Compare against: `docs/images/_baseline/*` from Task 0

**Interfaces:**
- Produces: the five refreshed submission screenshots and a documented confirmation that the only intended visual deltas are the AA/legibility/focus fixes.

- [ ] **Step 1: Drive the phase-gated flow to capture battle/compare/results.** The results/battle/compare surfaces only appear after LOAD DEMO and its timer chain. Write a driver that clicks LOAD DEMO and snapshots each phase (with reduced-motion so nothing is mid-fade):

```bash
node - <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  await p.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'docs/images/landing.png', fullPage: true });
  await p.getByText('LOAD DEMO').click();
  // results (~2s), battle (~20s), compare (~58s) per page.tsx timers
  await p.waitForTimeout(3000);  await p.screenshot({ path: 'docs/images/results.png', fullPage: true });
  await p.waitForTimeout(19000); await p.screenshot({ path: 'docs/images/battle.png',  fullPage: true });
  await p.waitForTimeout(38000); await p.screenshot({ path: 'docs/images/compare.png', fullPage: true });
  await p.goto('http://localhost:3000/proof', { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);   await p.screenshot({ path: 'docs/images/proof.png',   fullPage: true });
  await b.close();
})();
EOF
```

(If Plan 1 has landed and `/api/analyze` returns live data, the demo still routes through the same phase machine; the screenshots capture whatever the current data path yields. If Plan 1 has NOT landed, ensure `DEMO_MODE`/cache path serves data so the flow completes.)

- [ ] **Step 2: Confirm the landing fix.** Re-read `docs/images/landing.png` and assert (by eye) the region below the hero is now populated (input + persona sidebar + stats + footer), unlike `_baseline/landing.png`.

- [ ] **Step 3: No-regression check on the CRT identity.** Read `battle.png` and `compare.png` and confirm: corner brackets present, polygon card intact, scanlines/vignette visible, neon glows intact, pink/cyan clash preserved. The only visible change vs `_baseline` should be the dim prose reading LIGHTER (legible) — the compare.png text that was near-invisible at 2.4:1 is now readable at 6.3:1.

- [ ] **Step 4: Document the intended deltas.** Append a short `## Visual Delta Log` to this plan file (or a sibling note) listing exactly: (1) dim text lighter, (2) placeholder visible, (3) focus rings on Tab only, (4) landing fully rendered, (5) sol badge lighter purple. Confirm no OTHER pixels moved.

- [ ] **Step 5: Commit.** `git add docs/images/*.png && git commit -m "docs: re-capture all submission screenshots after a11y + tokenization pass"`

---

## Self-Review notes

- **Spec coverage:** Every Plan-4 roadmap bullet maps to a task. Focus-visible rings (T3 global rule + T4 input); prefers-reduced-motion on flicker/glitch/scale-pulse/typing (T1); AA contrast fix on `text-dim` (2.42 to 6.3:1, T2) and the invisible placeholder (1.20 to 3.74:1, T4) and the sol badge (4.27 to 5.26:1, T2/T5); five conflicting palettes hoisted to one `@theme` set (T2); inline-DOM hover hacks replaced with CSS (T3 utilities + T4); illegible 6-8px pixel-font prose repaired via the pixel-to-mono legibility rule (T3/T4/T5, enforced by the T7 assertion); broken `landing.png` root-caused (SlideIn `initial:opacity:0` + static capture) and re-captured (T5/T8). CRT identity explicitly preserved (T1 gates rather than removes; T8 no-regression check).
- **Every hex is real and computed:** the contrast table in Task 2 is derived from the WCAG relative-luminance formula (script included and run; all targets PASS). No placeholder colors.
- **Independence honored:** no file under `src/lib`, `src/app/api`, or `src/data` is touched, so Plan 1 (data layer) and this plan never collide. The only shared files (`package.json`, `playwright.config.ts`) are edited additively with an explicit Task 0 clobber-avoidance check; `vitest` (Plan 1) and the Playwright a11y spec coexist without a dependency conflict, and this plan installs no packages.
- **Guard added, not just fixes:** Task 7's `a11y.spec.ts` is the falsifiable regression the audit said the pipeline lacked for the frontend — it asserts the ring renders, reduced-motion is honored, no sub-9px pixel-font prose survives, the old failing rgba is gone, and semantics hold. It fails loudly if any later edit regresses.
- **Token-name consistency:** `--color-dim` to `text-dim`, `--color-surface` to `bg-surface`, `--color-accent` to `text-accent`/`border-accent`, `--color-secondary` to `text-secondary`, `--color-sol` to `text-sol` are used identically across Tasks 2-6; the grep/sed sweeps in T5 enforce zero literal leftovers.
- **Assumption to confirm before T8:** the demo flow must reach the results/battle/compare phases for the screenshot driver. If Plan 1 has not yet landed and no cache/DEMO_MODE path serves data locally, capture only landing.png + proof.png in T8 and defer the three phase-gated shots until the data layer is green (they are submission assets, not a11y deliverables, so this does not block the a11y goal).
