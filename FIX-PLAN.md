# FIX PLAN — Alter Ego Interrogate Remediation

**Generated:** 2026-07-16 | **Source:** hackathon-interrogate DEEP (23 personas, 72 gaps)
**Deadline:** July 17, 2026 23:59 UTC (~30 hours)
**Strategy:** Fix P0 blockers + high-impact P1s; acknowledge remaining P1/P2/P3 in submission

---

## Phase 0: Credential Rotation (5 min, BLOCKS submission) 🔴

### F0.1 — Rotate OKX API credentials
**Files:** `.env` (delete contents), Vercel dashboard
**Action:**
```bash
# 1. Log into OKX Developer Portal → Project 01
# 2. Regenerate API Key, Secret Key
# 3. Add new keys to Vercel Environment Variables:
#    OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE
# 4. Delete local .env file: rm .env
# 5. Never commit .env — already in .gitignore (line 9)
```
**Fixes:** P08:8.1 (P0) — Live OKX credentials on disk

### F0.2 — Rotate Vercel OIDC token
**Files:** `.env.local`
**Action:**
```bash
# 1. Remove VERCEL_OIDC_TOKEN line from .env.local
# 2. Token auto-expires 2026-07-16 (today) — no action needed if expired
# 3. Verify: git log --all -- .env.local returns empty (never committed)
```
**Fixes:** P03:3.5 (P0) — Vercel deployment token exposed

---

## Phase 1: page.tsx — State Machine Hardening (20 min, 6 demo hazards) 🟡

### F1.1 — Add re-entry guard to handleAnalyze
**File:** `src/app/page.tsx`, line 28
**Problem:** Double ANALYZE clicks overwrite timers, orphan old setTimeout handles, cause race conditions. Fixes P02:2.5, P18:18.5.
**Change:**
```typescript
// Add this ref (line ~23):
const isAnalyzing = useRef(false);

// At TOP of handleAnalyze (line 28):
const handleAnalyze = async (addresses: Array<{ address: string; chains: string[] }>) => {
  if (isAnalyzing.current) return;  // ← ADD THIS
  isAnalyzing.current = true;        // ← ADD THIS
  // Clear old timers before setting new ones
  phaseTimers.current.forEach(clearTimeout);  // ← ADD THIS
  // ... rest of function
}
// At end of function (line 38), in finally block:
finally { setLoading(false); }

// Reset isAnalyzing when flow completes or fails:
// Add to the catch at line 38:
catch { setPhase("landing"); isAnalyzing.current = false; }

// Add to t4 setTimeout that transitions to cta (line 36):
const t4 = setTimeout(() => { setPhase("cta"); isAnalyzing.current = false; }, 76000);
```

### F1.2 — Replace silent catch blocks with error feedback
**File:** `src/app/page.tsx`, lines 34-38
**Problem:** 3 fetch failure modes silently swallow errors — user sees blank screen with no recovery. Fixes P02:2.3, P02:2.4, P05:5.3, P12:12.4, P17:17.4 (5 findings — the most-piled-on issue).
**Change:**
```typescript
// Add to Phase type (line 6):
type Phase = "landing" | "scanning" | "results" | "battle" | "compare" | "cta" | "error";

// Add error state (line ~20):
const [error, setError] = useState<string | null>(null);

// Modify catch blocks (lines 34-38):
// t2 roast fetch (line 34):
const t2 = setTimeout(() => {
  fetch("/api/roast")
    .then(r => r.json())
    .then(d => { if (d.battle) { setBattleData(d.battle); setPhase("battle"); } else { setPhase("battle"); } })
    .catch(() => { setError("Roast battle data unavailable. Continuing..."); setPhase("battle"); });
}, 20000);

// t3 compare fetch (line 35):
const t3 = setTimeout(() => {
  fetch("/api/compare")
    .then(r => r.json())
    .then(d => { if (d.comparison) { setCompareData(d.comparison); setPhase("compare"); } else { setPhase("compare"); } })
    .catch(() => { setError("Comparison data unavailable. Continuing..."); setPhase("compare"); });
}, 58000);

// Main catch (line 38):
} catch { 
  setError("Analysis failed. Please try again.");
  setPhase("error"); 
  isAnalyzing.current = false; 
} finally { setLoading(false); }

// Add error phase render (after the cta block, before closing </Terminal>):
{phase === "error" && (
  <SlideIn>
    <div className="text-center space-y-6 py-12">
      <p className="text-[#ff2d95] text-lg font-bold">{error || "Something went wrong."}</p>
      <button 
        onClick={() => { setPhase("landing"); setError(null); setData(null); setBattleData(null); setCompareData(null); }}
        className="font-pixel text-[11px] uppercase tracking-[2px] px-8 py-4 bg-[#ff2d95] text-white"
      >
        ▶ TRY AGAIN
      </button>
    </div>
  </SlideIn>
)}
```

### F1.3 — Add error display overlay for non-blocking errors
**File:** `src/app/page.tsx`, after Terminal opening tag
**Problem:** Non-fatal errors (roast/compare fetch failure) should show inline, not block the flow. Fixes P02:2.3, P05:5.3.
**Change:**
```tsx
{/* Add right after <Terminal> opening */}
{error && phase !== "error" && (
  <div className="mb-4 px-4 py-2 border border-[rgba(255,45,149,.2)] bg-[rgba(255,45,149,.05)] text-[#ff2d95] text-xs font-mono">
    ⚠ {error}
  </div>
)}
```

### F1.4 — Make stats bar dynamic from API data
**File:** `src/app/page.tsx`, line 127
**Problem:** Hardcoded "6,134 TRANSACTIONS" contradicts actual cache total of 4,463. Fixes P09:9.2 (P2).
**Change:**
```tsx
// Replace hardcoded stats with dynamic values:
{[ 
  { n: data ? data.chains.length.toString() : "4", l: "CHAINS" }, 
  { n: data ? data.totalTxns.toLocaleString() : "4,463", l: "TRANSACTIONS" }, 
  { n: "$4,527", l: "NET PNL" }, 
  { n: "TEE", l: "READY" }  // Changed from "SEALED" to "READY"
].map(s => (
```
Note: NET PNL stays hardcoded (no dynamic source). "TEE SEALED" → "TEE READY" per claim language fix.

### F1.5 — Replace misleading attestation badges
**File:** `src/app/page.tsx`, lines 141, 178
**Problem:** "ATTESTATION: 0x7f3a...b91e" and "ATTESTATION VERIFIED" are static text implying real crypto verification. Fixes P03:3.1, P09:9.1, P09:9.4, P14:14.2.
**Change:**
```tsx
// Line 141 — footer badge:
🔒 TEE: Simulated Attestation (Demo)

// Line 178 — CTA badge:
🔒 TEE Attestation — Simulated for Demo
```
This is a simple text change from "ATTESTATION VERIFIED" to "TEE Attestation — Simulated for Demo." Not lying to judges.

---

## Phase 2: API Route Hardening (15 min) 🟡

### F2.1 — Add request body validation to POST /api/analyze
**File:** `src/app/api/analyze/route.ts`, line 10
**Problem:** Zero validation — any JSON body accepted, no address format check, no length limit. Fixes P07:7.1 (P0), P18:18.1.
**Change:**
```typescript
// After line 10 (const body = await req.json()):
// Add validation:
if (!body.addresses || !Array.isArray(body.addresses)) {
  return NextResponse.json({ error: "Invalid request: addresses must be an array" }, { status: 400 });
}
if (body.addresses.length === 0) {
  return NextResponse.json({ error: "At least one address required" }, { status: 400 });
}
if (body.addresses.length > 5) {
  return NextResponse.json({ error: "Maximum 5 wallets per analysis" }, { status: 400 });
}
for (const addr of body.addresses) {
  if (!addr.address || typeof addr.address !== "string") {
    return NextResponse.json({ error: "Each address entry requires an 'address' string" }, { status: 400 });
  }
  // Basic format check (not exhaustive, but catches obvious garbage)
  if (addr.address.length < 10 || addr.address.length > 100) {
    return NextResponse.json({ error: `Invalid address format: ${addr.address.slice(0, 10)}...` }, { status: 400 });
  }
}
```

### F2.2 — Sanitize error responses (production safety)
**File:** `src/app/api/analyze/route.ts`, line 55 (catch block)
**Files also:** `src/app/api/roast/route.ts`, `src/app/api/compare/route.ts`, `src/app/api/persona/route.ts`
**Problem:** All 4 routes leak `error.message` to client. Fixes P07:7.2.
**Change:**
```typescript
// Replace the catch block in all 4 route.ts files:
} catch (error: any) {
  console.error(`[API] ${req.method} ${req.url}:`, error.message);
  const message = process.env.NODE_ENV === "production" 
    ? "Internal server error" 
    : error.message;
  return NextResponse.json({ error: message }, { status: 500 });
}
```
Note: In Vercel production, `process.env.NODE_ENV` is automatically `"production"`, so this will return generic errors to users while logging details server-side.

### F2.3 — Add DEMO_MODE to .env.example
**File:** `.env.example`
**Problem:** DEMO_MODE referenced in code but never documented. Fixes P08:8.4.
**Change:** Add to end of `.env.example`:
```
# Demo mode (default: auto-detected from cache files)
# Set to "true" to force demo mode, "false" to force live mode
DEMO_MODE=true
```

---

## Phase 3: onchainos.ts — Security Hardening (10 min) 🟡

### F3.1 — Fix command injection vector
**File:** `src/lib/onchainos.ts`, lines 6-14
**Problem:** execSync with string interpolation on user input — command injection if live mode ever activated. Fixes P01:1.4 (P0).
**Change:**
```typescript
import { spawnSync } from "child_process";

function run(args: string[]): string {
  try {
    const result = spawnSync(CLI, args, { 
      encoding: "utf-8", 
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000  // 30s timeout
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || `Exit code ${result.status}`);
    return result.stdout;
  } catch (e: any) {
    console.error(`OnchainOS command failed: ${CLI} ${args[0]}`);
    console.error(e.stderr || e.message);
    throw new Error(`OnchainOS error: ${e.stderr || e.message}`);
  }
}
```
Then update each function to pass args as arrays instead of string interpolation:
```typescript
// getAllBalances: was run(`${CLI} portfolio all-balances --address ${address} --chains "${chainsStr}"`)
// becomes: run(["portfolio", "all-balances", "--address", address, "--chains", chainsStr, "--filter", String(filter)])

// getPortfolioOverview: was run(`${CLI} market portfolio-overview --address ${address} --chain ${chain} --time-frame ${timeFrame}`)
// becomes: run(["market", "portfolio-overview", "--address", address, "--chain", chain, "--time-frame", String(timeFrame)])

// And so on for all 8 functions...
```

### F3.2 — Fix console.error privacy leak
**File:** `src/lib/onchainos.ts`, line 10
**Problem:** console.error logs full user-supplied addresses. Fixes P08:8.3.
**Change:** Already handled by the F3.1 change — `console.error(`OnchainOS command failed: ${CLI} ${args[0]}`)` only logs the subcommand name, not the full address.

---

## Phase 4: Metadata & Docs (5 min) 🟢

### F4.1 — Fix layout metadata "TEE-sealed" claim
**File:** `src/app/layout.tsx`, line 14
**Change:** `"TEE-sealed"` → `"TEE-ready architecture"`
```typescript
description: "Multi-chain behavioral fingerprinting agent. TEE-ready architecture. ERC-8004 registered. Built for OKX.AI Genesis.",
```

### F4.2 — Update PaymentButton "Simulate" label
**File:** `src/components/PaymentButton.tsx`, line 6
**Problem:** Already says "Simulate Payment" — this is honest. No change needed. But add a comment for clarity.
**Change:** Add comment above component:
```typescript
// [DEMO MODE] x402 payment simulation — no real USDC settlement.
// Post-hackathon: integrate @okx/x402-sdk for live payments.
```

### F4.3 — Fix README "TEE-bound" headline
**File:** `README.md`, line 3
**Change:** `"Alter Ego is a TEE-bound agent"` → `"Alter Ego is a TEE-ready agent (simulated attestation in demo)"`

---

## Phase 5: Acknowledge (Ship-As-Is) 📋

These findings are documented, understood, and intentionally shipped. Add a `## Known Limitations` section to the submission description.

| # | Finding | Why Ship-As-Is |
|---|---------|---------------|
| 1 | P02:2.1 No phase transition guards | Demo is timer-driven for recording — no live interaction needed |
| 2 | P02:2.2 Loading guard releases early | Doesn't matter for recorded demo — user won't click mid-flow |
| 3 | P05:5.1 OnchainOS CLI not on Vercel | Dead code in demo mode; cacheExists() short-circuits |
| 4 | P05:5.4 No SDK/CLI docs | Hackathon demo — integration docs post-MVP |
| 5 | P06:6.1 Unpinned deps (9/13) | Lockfile pins exact versions; npm ci used for deploy |
| 6 | P08:8.5 Hardcoded thresholds | 2-day hackathon — speed over configurability |
| 7 | P09:9.5 OKX integrations bypassed in demo | Documented in Emergency Mode tables; cache design is intentional |
| 8 | P10:10.1 x402 revenue claim weakened | All hackathon entries have simulated payments |
| 9 | P11:1-5 Sponsor integration depth | Concept demo; integrations structurally complete but demo-bypassed |
| 10 | P12:12.2 No phase navigation | Auto-advance is intentional for recorded demo |
| 11 | P13:1-4 Traction/market unproven | Pre-market hackathon — expected |
| 12 | P17:17.1-3 Code quality (long functions, duplication) | Post-hackathon refactor |
| 13 | P18:18.2-4 Numeric/string/array edge cases | Input validation (F2.1) covers most; rest are post-MVP |
| 14 | P19:1-5 Upgrade foresight | Greenfield project — no upgrade path needed yet |
| 15 | P20:1-5 Narrative coherence gaps | Acknowledged in submission: "demo mode with pre-computed data" |
| 16 | P22:1-5 Architecture diagram gaps | ARCHITECTURE.md Emergency Mode table already documents mocks |
| 17 | P23:1-5 Competitive positioning | Differentiation is strong (persona engine) despite market overlap |

---

## Fix Order & Dependencies

```
Phase 0 (credentials) ──┐
                         ├── No dependencies — do FIRST
Phase 4 (docs) ─────────┘

Phase 1 (page.tsx) ──── requires: nothing
Phase 2 (API routes) ── requires: nothing
Phase 3 (onchainos.ts) ─ requires: nothing

(Phases 1-3 can run in parallel after Phase 0)
Phase 5 (acknowledge) ─ last — depends on all fixes being done
```

## Files Changed Summary

| File | Changes | Risk |
|------|---------|------|
| `.env` | DELETE file | None — credentials rotated first |
| `.env.local` | Remove VERCEL_OIDC_TOKEN line | None — token expires today |
| `.env.example` | Add DEMO_MODE=true | None |
| `src/app/page.tsx` | ~30 lines changed/add: re-entry guard, error state, error display, dynamic stats, attestation text | Medium — core demo file |
| `src/app/api/analyze/route.ts` | Add input validation (~15 lines), sanitize error (~5 lines) | Low |
| `src/app/api/roast/route.ts` | Sanitize error (~3 lines) | Low |
| `src/app/api/compare/route.ts` | Sanitize error (~3 lines) | Low |
| `src/app/api/persona/route.ts` | Sanitize error (~3 lines) | Low |
| `src/lib/onchainos.ts` | Replace execSync with spawnSync (~30 lines changed) | Medium — dead code in demo |
| `src/app/layout.tsx` | 1 word change | None |
| `src/components/PaymentButton.tsx` | Add comment only | None |
| `README.md` | 1 word change | None |

**Total: ~70 lines changed across 11 files. Estimated time: 45-60 minutes.**

---

## Phase 6: Testing Gate — Livetest-Style Verification (20 min) 🧪

> Modeled after `hackathon-livetest` V1/V2/V3 methodology. Tests EVERY fix against the live deployed app. Every finding from interrogate that was addressed gets at least one test case proving the fix works.

### Testing Setup

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
DEV_URL="http://localhost:3000"
LIVE_URL="https://alter-ego-wine-mu.vercel.app"
TEST_URL="$DEV_URL"  # Start with local; optionally test live
```

### Interface Inventory

| Channel | Endpoint | Auth | Priority | Test Target |
|---------|----------|------|----------|-------------|
| Browser UI | $TEST_URL/ | none | HIGH | 6-phase flow, error state, attestation text |
| Browser UI | $TEST_URL/proof | none | HIGH | Integration proof page |
| REST POST | $TEST_URL/api/analyze | none | HIGH | Validation, demo data |
| REST GET | $TEST_URL/api/roast | none | HIGH | Roast battle data |
| REST GET | $TEST_URL/api/compare | none | HIGH | Comparison data |
| REST GET | $TEST_URL/api/persona | none | HIGH | Persona data |

### V1: Functional Coverage (19 tests)

Every fix must have at least one functional test proving it works.

#### Domain 1: Credential Cleanup
| ID | Test | Expected | Status |
|----|------|----------|--------|
| FIX-V1-01 | Verify .env file deleted | File does not exist | |
| FIX-V1-02 | Verify VERCEL_OIDC_TOKEN removed from .env.local | grep returns nothing | |

#### Domain 2: State Machine Fixes (page.tsx)
| ID | Test | Expected | Status |
|----|------|----------|--------|
| FIX-V1-03 | LOAD DEMO → ANALYZE: full 6-phase flow completes | All phases render, no blank screens | |
| FIX-V1-04 | Double-click ANALYZE during flow | Second click is ignored, flow continues | |
| FIX-V1-05 | Click ANALYZE → immediately click LOAD DEMO again | First flow completes, no race condition | |
| FIX-V1-06 | Stats bar shows dynamic transaction count | Shows "4,463" not "6,134" | |

#### Domain 3: Error Handling
| ID | Test | Expected | Status |
|----|------|----------|--------|
| FIX-V1-07 | Force /api/analyze error → verify error state | Error phase renders with "TRY AGAIN" button | |
| FIX-V1-08 | Force /api/roast error → verify inline warning | Non-blocking warning overlay appears | |
| FIX-V1-09 | Force /api/compare error → verify inline warning | Non-blocking warning overlay appears | |
| FIX-V1-10 | Click "TRY AGAIN" on error page | Returns to landing, state reset | |

#### Domain 4: Attestation Text
| ID | Test | Expected | Status |
|----|------|----------|--------|
| FIX-V1-11 | Landing page footer: attestation badge text | "TEE: Simulated Attestation (Demo)" | |
| FIX-V1-12 | CTA phase: attestation badge text | "TEE Attestation — Simulated for Demo" | |
| FIX-V1-13 | Metadata description text | Contains "TEE-ready architecture" not "TEE-sealed" | |
| FIX-V1-14 | README headline | Contains "TEE-ready agent (simulated attestation in demo)" | |

#### Domain 5: API Validation
| ID | Test | Expected | Status |
|----|------|----------|--------|
| FIX-V1-15 | POST /api/analyze with empty body `{}` | HTTP 400, "addresses must be an array" | |
| FIX-V1-16 | POST /api/analyze with empty addresses `{"addresses":[]}` | HTTP 400, "at least one address required" | |
| FIX-V1-17 | POST /api/analyze with 6 addresses | HTTP 400, "maximum 5 wallets" | |
| FIX-V1-18 | POST /api/analyze with invalid address (3 chars) | HTTP 400, "invalid address" | |
| FIX-V1-19 | POST /api/analyze with valid demo address | HTTP 200, returns demo data with wallets=3 | |

### V2: Exact Value Assertions (12 tests)

Every fix that changes a value gets an exact assertion.

| ID | Field | Expected Value | Source Derivation | Status |
|----|-------|---------------|-------------------|--------|
| FIX-V2-01 | `POST /api/analyze` → `totalTxns` | `4463` | Sum of wallet-a(847) + wallet-b(3204) + wallet-c(412) | |
| FIX-V2-02 | `POST /api/analyze` (invalid body) → `status` | `400` | New validation returns 400, not 500 | |
| FIX-V2-03 | `POST /api/analyze` (invalid body) → `error` field | String containing "Invalid" or "required" | New validation messages | |
| FIX-V2-04 | Landing page HTML → attestation text | `"TEE: Simulated Attestation (Demo)"` | Changed from "ATTESTATION: 0x7f3a...b91e" | |
| FIX-V2-05 | CTA phase HTML → attestation text | `"TEE Attestation — Simulated for Demo"` | Changed from "ATTESTATION VERIFIED" | |
| FIX-V2-06 | `layout.tsx` metadata → `description` | Contains `"TEE-ready"` not `"TEE-sealed"` | Check `document.querySelector('meta[name=description]')` | |
| FIX-V2-07 | `GET /api/roast` → `status` | `200` | Cache data always present | |
| FIX-V2-08 | `GET /api/compare` → `status` | `200` | Cache data always present | |
| FIX-V2-09 | `GET /api/persona` → `status` | `200` | Cache data always present | |
| FIX-V2-10 | Error response in production mode → `error` field | `"Internal server error"` | Not error.message — generic in prod | |
| FIX-V2-11 | `PaymentButton.tsx` → label text | Contains `"Simulate"` or `"Simulated"` | Honest demo-mode labeling | |
| FIX-V2-12 | Stats bar → transaction count | `"4,463"` | Dynamic from API response.totalTxns | |

### V3: Adversarial Battery (10 tests)

Edge cases and boundary values. Test what the interrogate personas found.

#### ADV-01: Boundary Values
| ID | Test | Input | Expected | Status |
|----|------|-------|----------|--------|
| FIX-V3-01 | POST /api/analyze: null addresses | `{"addresses":null}` | HTTP 400 | |
| FIX-V3-02 | POST /api/analyze: address length 9 | `{"addresses":[{"address":"123456789"}]}` | HTTP 400 (min 10 chars) | |
| FIX-V3-03 | POST /api/analyze: address length 101 | `{"addresses":[{"address":"0x" + "a".repeat(99)}]}` | HTTP 400 (max 100 chars) | |

#### ADV-02: Empty / Zero / Undefined
| ID | Test | Input | Expected | Status |
|----|------|-------|----------|--------|
| FIX-V3-04 | POST /api/analyze: missing addresses field | `{}` or `{"other":"field"}` | HTTP 400 | |
| FIX-V3-05 | POST /api/analyze: address is empty string | `{"addresses":[{"address":""}]}` | HTTP 400 | |

#### ADV-03: Overlong / Malformed
| ID | Test | Input | Expected | Status |
|----|------|-------|----------|--------|
| FIX-V3-06 | POST /api/analyze: 1000 addresses | Array of 1000 addresses | HTTP 400 (max 5) | |

#### ADV-04: Race / Concurrency
| ID | Test | Input | Expected | Status |
|----|------|-------|----------|--------|
| FIX-V3-07 | Rapid double-click ANALYZE (automated) | Click twice fast | Second click ignored, no crash | |
| FIX-V3-08 | Click ANALYZE → refresh page mid-flow | Browser refresh during battle | Page reloads cleanly to landing | |

#### ADV-05: State / Encoding
| ID | Test | Input | Expected | Status |
|----|------|-------|----------|--------|
| FIX-V3-09 | POST /api/analyze: address with special chars | `{"addresses":[{"address":"0x<script>alert(1)</script>"}]}` | HTTP 400 or safely handled | |
| FIX-V3-10 | Error state → TRY AGAIN → full flow | Click TRY AGAIN, then LOAD DEMO → ANALYZE | Full flow completes normally | |

### Console Error Zero Tolerance

```bash
# Run with Playwright console capture
npx playwright test stress-browser.spec.ts 2>&1 | grep -E "(FAIL|Error|error)"
# Expected: 0 first-party console errors after fixes
```

### Testing Execution

```bash
# 1. Start dev server
WATCHPACK_POLLING=true npm run dev -- --turbopack --port 3000 &
sleep 5

# 2. Run V1 functional tests
echo "=== V1: Credential Cleanup ==="
test ! -f .env && echo "PASS: .env deleted" || echo "FAIL: .env exists"
grep -q OIDC .env.local 2>/dev/null && echo "FAIL: OIDC token still in .env.local" || echo "PASS: OIDC token removed"

echo "=== V1: API Validation ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{}')
[ "$STATUS" = "400" ] && echo "PASS: Empty body → 400" || echo "FAIL: Empty body → $STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"addresses":[]}')
[ "$STATUS" = "400" ] && echo "PASS: Empty addresses → 400" || echo "FAIL: Empty addresses → $STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"addresses":[{"address":"0xDemoAddress12","chains":["ethereum"]}]}')
[ "$STATUS" = "200" ] && echo "PASS: Valid demo address → 200" || echo "FAIL: Valid demo address → $STATUS"

echo "=== V2: Exact Values ==="
RESPONSE=$(curl -s -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"addresses":[{"address":"0xDemoAddress12","chains":["ethereum"]}]}')
echo "$RESPONSE" | grep -q '"totalTxns":4463' && echo "PASS: totalTxns=4463" || echo "FAIL: totalTxns mismatch"
echo "$RESPONSE" | grep -q '"wallets":3' && echo "PASS: wallets=3" || echo "FAIL: wallets mismatch"

echo "=== V2: Attestation Text ==="
curl -s http://localhost:3000 | grep -q "Simulated Attestation" && echo "PASS: Attestation text updated" || echo "FAIL: Old attestation text"

echo "=== V3: Adversarial ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"addresses":null}')
[ "$STATUS" = "400" ] && echo "PASS: Null addresses → 400" || echo "FAIL: Null addresses → $STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"addresses":[{"address":""}]}')
[ "$STATUS" = "400" ] && echo "PASS: Empty address → 400" || echo "FAIL: Empty address → $STATUS"

echo "=== Console Errors ==="
# Check the running dev server for console errors in its output
echo "Check dev server output manually for console.error messages"

# 3. Run Playwright tests
npx playwright test stress-browser.spec.ts

# 4. Update test assertions for new attestation text
grep -n "ATTESTATION" stress-browser.spec.ts
# Replace any old attestation text assertions with new "Simulated" text
```

### Testing Gate Pass Criteria

| Criterion | Threshold |
|-----------|-----------|
| V1 functional tests | 19/19 PASS |
| V2 exact value tests | 12/12 PASS |
| V3 adversarial tests | 10/10 PASS |
| Console errors (first-party) | 0 |
| Playwright tests | 33/33 PASS (after updating attestation assertions) |
| Demo flow end-to-end | 1 complete run, all 6 phases render |
| .env deleted | Confirmed |
| OIDC token removed | Confirmed |

**GATE RESULT: PASS if all criteria met. FAIL if any V1/V2/V3 test fails or any P0 console error present.**
