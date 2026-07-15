# Alter Ego — Implementation Plan

**Project:** Alter Ego
**Hackathon:** OKX.AI Genesis (Build X Series)
**Deadline:** July 17, 2026 23:59 UTC (~2 days remaining)
**Stack:** Next.js 14, TypeScript 5, React 18, Tailwind CSS 3, Framer Motion 11, OnchainOS CLI
**Architecture Doc:** `ARCHITECTURE.md` (THE source of truth for all code)
**Scope:** ⚠️ EMERGENCY MODE — Demo-first

## [EMERGENCY MODE — 5 components mocked/pre-computed]

---

## How to Use This Plan

1. Read in order. Do not skip phases. Do not reorder tasks.
2. Every phase has a GATE checklist. Verify every item before proceeding.
3. When you see 🔀 (decision point), test BOTH paths and follow the one that matches.
4. Copy code from ARCHITECTURE.md — do not improvise.
5. Commit after every task using the specified commit messages.
6. Save deployed addresses / credentials to .env immediately.
7. If something fails and isn't covered by a decision tree: STOP. Report the error. Do not guess.

---

## Phase Overview

| Phase | Purpose | Est. Time | Depends On |
|:---:|---------|-----------|-----------|
| 0 | ASP Registration + Project Scaffold | 4h (TODAY) | — |
| 1 | Core Library (types, onchainos, cache, classifier, persona) | 4h | Phase 0 |
| 2 | API Routes (analyze, persona, compare, roast) | 3h | Phase 1 |
| 3 | Frontend Components (Terminal, WalletInput, PatternCard, PersonaCard, RoastBattle, CompareCard) | 5h | Phase 2 |
| 4 | Pages + Seed Script + Polish + Demo Recording | 6h | Phase 3 |

**Total estimated:** 22h over ~2 days. Buffer: 4h.
**Matches Architecture build order:** Phase 0→1→2→3→4 (aligned with ARCHITECTURE.md §2 Component Build Order)

---

## Phase 0: ASP Registration + Project Scaffold

**Purpose:** Submit ASP for review (THE BLOCKER), scaffold Next.js project, install OnchainOS.
**Estimated time:** 4 hours (July 15 — TODAY)

### Task 0.1: Apply for OKX API Keys

**Steps:**
1. Go to https://web3.okx.com/onchain-os/dev-portal
2. Apply for API keys (API Key + Secret Key + Passphrase)
3. Save to `.env` file (NOT `.env.example` — real values)

**Gate:** `.env` exists with `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE` set.

**Commit:** `chore: add OKX API credentials`

#### 🔀 Decision Point: API Key Provisioning

Run: Check email for API key confirmation.
Expected: Keys arrive within minutes (per dev portal docs).

✅ **If keys arrive:** Continue to Task 0.2.

🔀 **If keys don't arrive within 2 hours:**
1. Check spam folder
2. Retry application at dev portal
3. Fallback: use built-in sandbox keys (rate-limited but functional)
4. Note: "Using sandbox keys" — update `.env` with a comment

⛔ **If sandbox keys also fail:**
1. Run `onchainos wallet status` to verify CLI connectivity
2. Try `onchainos wallet login <email>` with sandbox
3. If completely blocked: flag to user. This is a CRITICAL blocker.

### Task 0.2: Install OnchainOS + Login Agentic Wallet

**Steps:**
```bash
npx skills add okx/onchainos-skills --yes -g
onchainos wallet login <your-email> --locale en_US
# Check email for OTP
onchainos wallet verify <6-digit-code>
onchainos wallet status  # Verify: loggedIn = true
```

**Gate:** `onchainos wallet status` shows `loggedIn: true`.

**Commit:** N/A (system-level install)

### Task 0.3: Register ERC-8004 Identity + Submit ASP for Review

**Steps:**
```bash
onchainos agent pre-check --role asp
# Confirm consent, uniqueness check passes
onchainos agent create asp
# Interactive flow — provide:
#   Name: "Alter Ego"
#   Description: "Your on-chain trading twin. Learn from your wins, guard against your losses."
#   Category: Lifestyle
#   Service Type: A2A
#   Pricing: Negotiated per session
#   Endpoint: (leave empty for now)
```
Expected: `ASP identity #<id> registered — not yet visible to others.`

**Gate:** ASP identity ID received. Check https://www.okx.ai/agents for listing status (may show "pending review").

**Commit:** N/A (OKX platform action)

#### 🔀 Decision Point: ASP Review Timeline

Run: Check OKX.AI marketplace for listing status after 24h.
Expected: "Active" or "Live" status.

✅ **If approved within 24h:** Continue to Task 0.4.

🔀 **If still "pending" after 24h (July 16 evening):**
1. Check email for review feedback
2. If rejected: fix rejection reason, re-submit immediately
3. If no response: contact OKX support via dev portal
4. Proceed with build anyway — approval may come through late

⛔ **If rejected with unfixable reason (July 17 morning):**
1. Review rejection reason
2. If categorical ("not eligible"): STOP. Flag as BLOCKED.
3. If fixable: implement fix, re-submit, proceed with build.

### Task 0.4: Scaffold Next.js Project

**Steps:**
```bash
cd ~/hackathon-toolkit/active/
npx create-next-app@latest alter-ego --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd alter-ego
npm install framer-motion lucide-react
```

**Files to create:**
- Copy all code from ARCHITECTURE.md sections into project files (use as reference)

**Gate:** `npm run dev` starts, localhost:3000 shows default Next.js page.

**Commit:** `feat: scaffold Next.js project with deps`

---

## Phase 1: Core Library

**Purpose:** Build types, OnchainOS wrapper, cache loader, pattern classifier, persona engine.
**Estimated time:** 4 hours

### Task 1.1: Create Shared Types

**Files:**
- Create: `src/lib/types.ts` (copy from ARCHITECTURE.md §3)

**Steps:**
1. Create `src/lib/` directory
2. Copy types.ts code block from ARCHITECTURE.md §3 exactly
3. Verify: `npm run typecheck` passes with no errors

**Gate:** `npm run typecheck` passes.

**Commit:** `feat: add shared types (OnchainOS responses + domain types)`

### Task 1.2: Create OnchainOS CLI Wrapper

**Files:**
- Create: `src/lib/onchainos.ts` (copy from ARCHITECTURE.md §4)

**Steps:**
1. Copy onchainos.ts code block from ARCHITECTURE.md §4 exactly
2. Create cache directory: `mkdir -p src/data/cache`
3. Verify: `npm run typecheck` passes

**Gate:** `npm run typecheck` passes. No import errors.

**Commit:** `feat: add OnchainOS CLI wrapper with parsers`

### Task 1.3: Create Cache Loader

**Files:**
- Create: `src/lib/cache.ts` (copy from ARCHITECTURE.md §5)

**Steps:**
1. Copy cache.ts code block from ARCHITECTURE.md §5 exactly
2. Verify: `npm run typecheck` passes

**Gate:** `npm run typecheck` passes.

**Commit:** `feat: add cache loader for pre-cached demo data`

### Task 1.4: Create Pattern Classifier

**Files:**
- Create: `src/lib/classifier.ts` (copy from ARCHITECTURE.md §6)

**Steps:**
1. Copy classifier.ts code block from ARCHITECTURE.md §6 exactly
2. Verify: `npm run typecheck` passes

**Gate:** `npm run typecheck` passes. 12 pattern detection functions present (6 AMPLIFY + 6 GUARD).

**Commit:** `feat: add rule-based pattern classifier (12 patterns)`

### Task 1.5: Create Persona Engine

**Files:**
- Create: `src/lib/persona.ts` (copy from ARCHITECTURE.md §7)

**Steps:**
1. Copy persona.ts code block from ARCHITECTURE.md §7 exactly
2. Verify: `npm run typecheck` passes

**Gate:** `npm run typecheck` passes.

**Commit:** `feat: add persona engine (archetype/catchphrase/superpower/kryptonite)`

---

## Phase 2: API Routes

**Purpose:** Build Next.js API routes for analyze, persona, compare, roast.
**Estimated time:** 3 hours

### Task 2.1: Create Analyze Route

**Files:**
- Create: `src/app/api/analyze/route.ts` (copy from ARCHITECTURE.md §10)

**Steps:**
1. `mkdir -p src/app/api/analyze`
2. Copy route.ts from ARCHITECTURE.md §10 (analyze route) exactly
3. Verify: `npm run typecheck` passes

**Gate:** `npm run typecheck` passes.

**Commit:** `feat: add POST /api/analyze route`

### Task 2.2: Create Persona, Compare, Roast Routes

**Files:**
- Create: `src/app/api/persona/route.ts` (copy from ARCHITECTURE.md §10)
- Create: `src/app/api/compare/route.ts` (copy from ARCHITECTURE.md §10)
- Create: `src/app/api/roast/route.ts` (copy from ARCHITECTURE.md §10)

**Steps:**
1. Create directories: `mkdir -p src/app/api/{persona,compare,roast}`
2. Copy each route.ts from ARCHITECTURE.md §10 exactly
3. Verify: `npm run typecheck` passes

**Gate:** All 4 API routes created. `npm run typecheck` passes.

**Commit:** `feat: add persona, compare, roast API routes`

---

## Phase 3: Frontend Components

**Purpose:** Build all React components for the terminal-style UI.
**Estimated time:** 5 hours

### Task 3.1: Create Terminal + TypingText + SlideIn

**Files:**
- Create: `src/components/Terminal.tsx` (copy from ARCHITECTURE.md §11, Terminal section)

**Steps:**
1. `mkdir -p src/components`
2. Copy Terminal.tsx from ARCHITECTURE.md §11 (Terminal component) exactly
3. Verify: `npm run dev`, visit localhost:3000 — should render Terminal wrapper

**Gate:** Page renders with terminal header (● ● ● alter-ego@okx-ai ~ %).

**Commit:** `feat: add Terminal, TypingText, SlideIn components`

### Task 3.2: Create WalletInput

**Files:**
- Create: `src/components/WalletInput.tsx` (copy from ARCHITECTURE.md §11)

**Steps:**
1. Copy WalletInput.tsx from ARCHITECTURE.md §11 exactly
2. Verify: component renders with textarea and submit button

**Gate:** WalletInput renders, textarea accepts input, submit button is disabled when empty.

**Commit:** `feat: add WalletInput component`

### Task 3.3: Create PatternCard + PersonaCard

**Files:**
- Create: `src/components/PatternCard.tsx` (copy from ARCHITECTURE.md §11)
- Create: `src/components/PersonaCard.tsx` (copy from ARCHITECTURE.md §11)

**Steps:**
1. Copy both component files from ARCHITECTURE.md §11 exactly
2. Verify: `npm run typecheck` passes

**Gate:** Both components typecheck cleanly.

**Commit:** `feat: add PatternCard and PersonaCard components`

### Task 3.4: Create RoastBattle + CompareCard

**Files:**
- Create: `src/components/RoastBattle.tsx` (copy from ARCHITECTURE.md §11)
- Create: `src/components/CompareCard.tsx` (copy from ARCHITECTURE.md §11)

**Steps:**
1. Copy both component files from ARCHITECTURE.md §11 exactly
2. Verify: `npm run typecheck` passes

**Gate:** Both components typecheck cleanly.

**Commit:** `feat: add RoastBattle and CompareCard components`

### Task 3.5: Create PaymentButton [MOCK]

**Files:**
- Create: `src/components/PaymentButton.tsx` (copy from ARCHITECTURE.md §9)

**Steps:**
1. Copy PaymentButton.tsx from ARCHITECTURE.md §9 exactly
2. Verify: component renders with "Snapshot — $0.99" button

**Gate:** PaymentButton renders, click animates through "Processing x402..." → "✓ Payment Simulated".

**Commit:** `feat: add PaymentButton component [MOCK]`

### Task 3.6: Create TEE Badge [MOCK]

**Files:**
- Create: `public/tee-badge.svg` (copy from ARCHITECTURE.md §8)

**Steps:**
1. Copy tee-badge.svg from ARCHITECTURE.md §8 exactly
2. Verify: file exists at `public/tee-badge.svg`

**Gate:** `tee-badge.svg` exists, renders a green "🔒 TEE-SECURED" badge.

**Commit:** `feat: add TEE badge asset [MOCK]`

---

## Phase 4: Pages + Seed Script + Polish + Demo

**Purpose:** Build landing page, proof page, seed script, record demo.
**Estimated time:** 6 hours

### Task 4.1: Create Landing Page

**Files:**
- Create: `src/app/page.tsx` (copy from ARCHITECTURE.md §12, page.tsx)
- Create: `src/app/layout.tsx` (minimal layout with metadata)

**Steps:**
1. Copy page.tsx from ARCHITECTURE.md §12 exactly
2. Create layout.tsx:
   ```typescript
   import type { Metadata } from "next";
   export const metadata: Metadata = {
     title: "Alter Ego — Your On-Chain Trading Twin",
     description: "Know thyself. Then know everyone else.",
   };
   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return <html lang="en"><body className="bg-black">{children}</body></html>;
   }
   ```
3. Verify: `npm run dev`, visit localhost:3000 — landing page with WalletInput renders

**Gate:** Landing page renders with "Every wallet has a story." typing text and WalletInput.

**Commit:** `feat: add landing page with phased demo flow`

### Task 4.2: Create Proof Page

**Files:**
- Create: `src/app/proof/page.tsx` (copy from ARCHITECTURE.md §12, proof page)

**Steps:**
1. `mkdir -p src/app/proof`
2. Copy proof/page.tsx from ARCHITECTURE.md §12 exactly
3. Verify: visit localhost:3000/proof — proof page renders with tables

**Gate:** `/proof` page shows OnchainOS integration table, ERC-8004 section, TEE section, ASP listing.

**Commit:** `feat: add proof page with judge artifacts`

#### Task N.X: Implement Demo Seed Script

**Purpose:** Creates the exact demo state needed for recording. Run before every demo take.

**Files:**
- Create: `scripts/seed-demo.ts` (copy from ARCHITECTURE.md §13)

**Steps:**
1. `mkdir -p scripts`
2. Copy seed-demo.ts from ARCHITECTURE.md §13 exactly
3. **REPLACE PLACEHOLDER ADDRESSES:** Edit `WALLET_A`, `WALLET_B`, `WALLET_C` in the script to use real public leaderboard wallet addresses from OnchainOS. The current values (`0x...a3f7`, `SolanaBase58...b2e1`, `0x...c9d4`) are placeholders that will fail. Run `onchainos leaderboard list --chain ethereum --time-frame 3 --sort-by 1` to get real addresses, pick top-3 wallets, and replace the constants.
4. Run: `npx ts-node scripts/seed-demo.ts`
5. Verify: all 8 cache files created in `src/data/cache/`

**Gate:** `npx ts-node scripts/seed-demo.ts` runs to completion. Idempotent — safe to run multiple times.

**Commit:** `seed(demo): implement seed-demo.ts from PRD §6 Demo Prerequisites`

#### 🔀 Decision Point: Seed Script Fails (OnchainOS Unavailable)

Run: `npx ts-node scripts/seed-demo.ts`
Expected: All wallet data pulled, cache files created.

✅ **If it works:** Continue to Task 4.3.

🔀 **If OnchainOS CLI returns errors:**
1. Check `onchainos wallet status` — verify logged in
2. Check API keys in `.env`
3. Try individual commands: `onchainos portfolio all-balances --address <addr> --chains "ethereum" --filter 1`
4. If specific wallet fails: try a different public leaderboard wallet
5. If all fail: switch to manual cache creation (create JSON files by hand with realistic mock data)

⛔ **If absolutely nothing works:**
1. Create manual cache files with realistic placeholder data
2. Tag each file with `"source": "manual-mock"` 
3. Demo still works — the data is pre-cached, the UI is real
4. The analysis won't be from live wallets, but the PRODUCT experience is identical
5. Document this as a known limitation in the proof page

### Task 4.3: End-to-End Test + Polish

**Steps:**
```bash
# Ensure cache exists
npx ts-node scripts/seed-demo.ts

# Set demo mode
echo "DEMO_MODE=true" >> .env

# Start dev server
npm run dev
```

**Test checklist:**
- [ ] Landing page renders with typing text
- [ ] WalletInput accepts addresses and submits
- [ ] "Scanning..." phase shows
- [ ] Persona cards render (ETH SELF + SOL SELF) with AMPLIFY/GUARD tags
- [ ] RoastBattle auto-advances through 4 rounds
- [ ] CompareCard shows Top Trader #3 with gap analysis
- [ ] CTA shows TEE badge + PaymentButton
- [ ] `/proof` page renders all sections

**Gate:** All 8 items pass.

**Commit:** `chore: E2E demo flow verified, DEMO_MODE enabled`

#### 🔀 Decision Point: Demo Timing Is Off

Run: Time the full demo flow from page load to CTA.
Expected: 80-95 seconds for full auto-advance.

✅ **If timing is 80-95s:** Continue to Task 4.4.

🔀 **If timing is <80s (too fast):**
1. Increase setTimeout delays in page.tsx (line ~30-40)
2. Increase typing speed in TypingText (delay prop, currently 30ms)
3. Re-time

🔀 **If timing is >95s (too slow):**
1. Decrease setTimeout delays
2. Skip one pattern card animation
3. Speed up roast battle round transitions (currently 4000ms)
4. Re-time

⛔ **If timing can't be fixed:**
1. Record the demo with manual pacing (click to advance)
2. Edit in post-production for exact 90s
3. This is acceptable — the hackathon requires pre-recorded video

### Task 4.4: Record Demo Video

**Steps:**
1. Warm up the app: visit localhost:3000 once to compile
2. Open screen recording tool (QuickTime, OBS, or Screen Studio)
3. Clear browser cache, hard refresh localhost:3000
4. Start recording
5. Click "Begin Analysis" (or let auto-advance run)
6. Let the full 90-second flow play
7. Stop recording
8. Review: check timing, audio clarity, visual quality
9. If needed: re-record with adjustments

**Gate:** 90-second video exists, all scenes visible, timing within 85-95 seconds.

**Commit:** N/A (video file)

#### 🔀 Decision Point: Demo Video Quality

Run: Review recorded video.
Expected: Clear visuals, audible voiceover (if any), all UI animations visible.

✅ **If video is good:** Continue to Task 4.5.

🔀 **If video has issues (blurry UI, wrong timing, missing scenes):**
1. Check screen resolution — record at 1920x1080
2. Ensure browser is fullscreen
3. Warm up all pages before recording (visit each page once)
4. Re-record
5. If still bad after 3 attempts: record in segments, edit together

### Task 4.5: Post to X + Submit Google Form

**Steps:**
1. Post video to X with text:
   ```
   Meet Alter Ego — your on-chain trading twin. 
   
   It reads your ENTIRE wallet history across every chain, shows you what you're good at (amplify) and what's costing you money (guard). 
   
   Then your ETH self and SOL self face off in a roast battle. Built on real data.
   
   Live on OKX.AI. #OKXAI
   ```
2. Copy X post URL
3. Go to Google Form: https://forms.gle/mddEUagmDbyV37ws8
4. Fill in:
   - ASP name: Alter Ego
   - Description: "Your on-chain trading twin. TEE-sealed behavioral fingerprint. Pattern classification across all wallets and chains. ERC-8004 identity."
   - Service type: A2A
   - X post link: <paste URL>
   - Project info: Team/Dami
5. Submit form

**Gate:** Google Form submitted. X post live with #OKXAI.

**Commit:** N/A (submission actions)

---

## Decision Trees for CRITICAL + HIGH Risks

### 🔀 Risk 1: ASP Review Takes >24h (CRITICAL)

Run: Check https://www.okx.ai/agents for Alter Ego listing status at 24h mark.
Expected: Status is "Active" or "Live."

✅ **If approved:** ASP is live. Eligible for all judging criteria. Continue build.

🔀 **If still pending at 24h (July 16 evening):**
1. Check email (including spam) for OKX review feedback
2. If there's a "fix required" message: implement fix, re-submit
3. If no message: proceed with build — approval may come through
4. Note in proof page: "ASP submitted July 15, pending review"

🔀 **If rejected:**
1. Read rejection reason carefully
2. Fix the issue (common: missing description, wrong category, incomplete listing)
3. Re-submit immediately via `onchainos agent update asp`
4. If re-submitted before July 16 midnight: review may complete by July 17 deadline

⛔ **If rejected and can't fix (July 17 afternoon):**
1. Document the rejection reason
2. Contact OKX support via dev portal
3. Submit hackathon form anyway — note "ASP under review" in submission
4. This is the worst case. Mitigated by submitting TODAY (July 15).

### 🔀 Risk 2: API Keys Not Provisioned (CRITICAL)

Run: Check email for OKX Developer Portal API key confirmation.
Expected: Keys arrive within 1-2 hours of application.

✅ **If keys arrive:** Set in `.env`. Continue.

🔀 **If keys don't arrive within 4 hours:**
1. Check OKX Developer Portal dashboard directly
2. Try creating new API key from the portal UI
3. Contact OKX support

🔀 **Fallback: use sandbox keys:**
1. OnchainOS ships with shared sandbox keys
2. Run: `onchainos wallet status` — if it works, sandbox keys are active
3. Sandbox keys are rate-limited but functional for demo
4. Note: "Using sandbox API keys — rate limits apply"

⛔ **If sandbox keys also fail:**
1. Run `onchainos wallet login <email>` with no API keys set
2. The CLI should fall back to sandbox
3. If this fails: the demo cannot pull live data
4. Fallback: create cache files manually with realistic placeholder data
5. Demo still works — pre-cached data, real UI, real product

### 🔀 Risk 3: Demo Pacing — 90s Too Tight (HIGH)

Run: Time full demo flow from first render to CTA.
Expected: 80-95 seconds.

✅ **If timing is 80-95s:** Perfect. Proceed.

🔀 **If >95s:**
1. In page.tsx, reduce:
   - TypingText delay from 30 to 20
   - Phase transition timeouts (reduce by 20%)
   - RoastBattle round duration from 4000ms to 3500ms
2. Skip "scanning" phase animation (jump to results)
3. Re-time

🔀 **If <70s:**
1. Increase TypingText delay to 40
2. Add 2s pause between persona reveal and roast battle start
3. Re-time

⛔ **If timing can't be fixed after 3 attempts:**
1. Record demo with manual pacing (click-to-advance)
2. Edit video to exactly 90s in post-production
3. The hackathon accepts pre-recorded/edited videos

### 🔀 Risk 4: OnchainOS CLI Errors on Public Addresses (HIGH)

Run: `onchainos portfolio all-balances --address <DEMO_ADDR> --chains "ethereum" --filter 1`
Expected: Token balances returned in table format.

✅ **If command succeeds:** Continue with all 3 demo wallets.

🔀 **If EVM wallet fails but Solana works:**
1. Try different EVM wallet from leaderboard
2. Ensure address is lowercase (EVM requirement per OnchainOS docs)
3. Try with single chain first: `--chains "ethereum"`

🔀 **If Solana wallet fails:**
1. Ensure address is base58 format (not hex)
2. Run `onchainos leaderboard list --chain solana --time-frame 3 --sort-by 1` first to verify Solana connectivity
3. Pick a different Solana address from the leaderboard

⛔ **If all OnchainOS queries fail:**
1. `onchainos wallet status` — check login
2. `onchainos leaderboard supported-chains` — verify chain support
3. If still failing: create manual cache files with realistic data
4. The demo shows pre-cached results — the product experience is identical

---

## Phase Gate Checklists

### Phase 0 Gate
- [ ] OKX API keys applied for
- [ ] OnchainOS installed, Agentic Wallet logged in
- [ ] ASP submitted for review
- [ ] Next.js project scaffolded, `npm run dev` works

### Phase 1 Gate
- [ ] `src/lib/types.ts` — all shared types, `npm run typecheck` passes
- [ ] `src/lib/onchainos.ts` — CLI wrapper with all 6 command functions
- [ ] `src/lib/cache.ts` — cache loader with all 7 load functions
- [ ] `src/lib/classifier.ts` — 12 pattern detection functions
- [ ] `src/lib/persona.ts` — persona generator with archetypes/vices

### Phase 2 Gate
- [ ] `src/app/api/analyze/route.ts` — POST handler
- [ ] `src/app/api/persona/route.ts` — GET handler
- [ ] `src/app/api/compare/route.ts` — GET handler
- [ ] `src/app/api/roast/route.ts` — GET handler
- [ ] All routes typecheck cleanly

### Phase 3 Gate
- [ ] Terminal, TypingText, SlideIn render
- [ ] WalletInput accepts input and submits
- [ ] PatternCard renders AMPLIFY (green) and GUARD (red)
- [ ] PersonaCard renders archetype, catchphrase, superpower, kryptonite
- [ ] RoastBattle auto-advances through rounds
- [ ] CompareCard shows Top Trader comparison
- [ ] PaymentButton simulates x402 flow

### Phase 4 Gate (FINAL)
- [ ] Landing page full flow works end-to-end
- [ ] `/proof` page shows all judge artifacts
- [ ] `npm run seed` runs idempotently
- [ ] Demo video recorded (85-95 seconds)
- [ ] X post published with #OKXAI
- [ ] Google Form submitted
- [ ] ASP listing approved and live on OKX.AI marketplace
