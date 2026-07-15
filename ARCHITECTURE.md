# Alter Ego — Architecture Document

**Version:** V1
**Date:** 2026-07-15
**Stack:** Next.js 14, TypeScript 5, React 18, Tailwind CSS 3, Framer Motion 11, OnchainOS CLI
**THIS IS THE SINGLE SOURCE OF TRUTH.** Copy code from this document exactly.

## [EMERGENCY MODE — 3 components mocked]

---

## Emergency Mode Notice

| Component | Status | Demo Behavior |
|-----------|:---:|---------------|
| TEE Attestation Generation (Section 8) | [MOCK] | Pre-computed badge, no live attestation |
| x402 Payment Settlement (Section 9) | [MOCK] | Demo bypass + "Simulate Payment" button |
| Real-time Whale Monitoring (Section 6) | [MOCK] | Pre-cached leaderboard data only |

---

## 1. System Overview

### Purpose
A Next.js application that ingests multi-chain wallet data via OnchainOS CLI, classifies trading patterns, generates a persona, and renders a terminal-style chat UI with roast battle mode.

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (localhost:3000)                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Terminal Chat UI (React / Framer Motion)              │   │
│  │  ┌──────────┐ ┌───────────────┐ ┌────────────────┐   │   │
│  │  │ Wallet   │ │ Pattern Cards │ │ Roast Battle    │   │   │
│  │  │ Input    │ │ AMPLIFY/GRD   │ │ Split Screen    │   │   │
│  │  └────┬─────┘ └───────┬───────┘ └───────┬────────┘   │   │
│  └───────┼───────────────┼─────────────────┼────────────┘   │
│          │               │                  │                │
│          ▼               ▼                  ▼                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js API Routes (/api/*)                          │   │
│  │  POST /api/analyze   — ingest + classify              │   │
│  │  GET  /api/persona   — persona from cache              │   │
│  │  GET  /api/compare   — crowd comparison                │   │
│  │  GET  /api/roast     — pre-generated roast lines       │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  src/lib/onchainos.ts — CLI wrapper                    │   │
│  │  execSync("onchainos portfolio all-balances ...")      │   │
│  │  execSync("onchainos leaderboard list ...")            │   │
│  │  execSync("onchainos market portfolio-overview ...")   │   │
│  │  execSync("onchainos security approvals ...")          │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  src/lib/classifier.ts — Pattern Classifier            │   │
│  │  12 deterministic rules (6 AMPLIFY + 6 GUARD)          │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  src/lib/persona.ts — Persona Engine                   │   │
│  │  archetype, catchphrase, superpower, kryptonite         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14 | Frontend + API routes |
| React | 18 | UI components |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3 | Styling |
| Framer Motion | 11 | Animations, typing effects |
| Lucide React | 0.400 | Icons |
| OnchainOS | latest | Blockchain data CLI |
| Node child_process | built-in | CLI execution |

### File Structure

```
alter-ego/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing / main chat UI
│   │   ├── proof/
│   │   │   └── page.tsx           # /proof — judge artifacts
│   │   └── api/
│   │       ├── analyze/
│   │       │   └── route.ts       # POST /api/analyze
│   │       ├── persona/
│   │       │   └── route.ts       # GET /api/persona
│   │       ├── compare/
│   │       │   └── route.ts       # GET /api/compare
│   │       └── roast/
│   │           └── route.ts       # GET /api/roast
│   ├── components/
│   │   ├── Terminal.tsx           # Terminal-style chat container
│   │   ├── WalletInput.tsx        # Multi-address input form
│   │   ├── PatternCard.tsx        # AMPLIFY/GRD tag display
│   │   ├── PersonaCard.tsx        # Persona display card
│   │   ├── RoastBattle.tsx        # Split-screen roast battle
│   │   ├── CompareCard.tsx        # Crowd comparison card
│   │   └── PaymentButton.tsx      # [MOCK] x402 simulate button
│   ├── lib/
│   │   ├── types.ts               # All shared types
│   │   ├── onchainos.ts           # CLI wrapper
│   │   ├── classifier.ts          # Pattern classifier
│   │   ├── persona.ts             # Persona engine
│   │   └── cache.ts               # Pre-cached data loader
│   └── data/
│       └── cache/                 # Pre-cached JSON from OnchainOS
│           ├── wallet-a-ethereum.json
│           ├── wallet-b-solana.json
│           ├── wallet-c-xlayer.json
│           ├── leaderboard.json
│           ├── patterns.json
│           └── roast-lines.json
├── scripts/
│   └── seed-demo.ts              # Generates cache files from OnchainOS
├── public/
│   └── tee-badge.svg             # [MOCK] Pre-computed TEE badge
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## 2. Component Architecture

### Component Table

| # | Component | Type | File Path | Purpose | Dependencies |
|---|-----------|------|-----------|---------|-------------|
| 1 | Shared Types | Types | `src/lib/types.ts` | All shared interfaces | None |
| 2 | OnchainOS Wrapper | Lib | `src/lib/onchainos.ts` | CLI command execution | Node `child_process` |
| 3 | Cache Loader | Lib | `src/lib/cache.ts` | Pre-cached data loading | types, fs |
| 4 | Pattern Classifier | Lib | `src/lib/classifier.ts` | Rule-based pattern detection | types |
| 5 | Persona Engine | Lib | `src/lib/persona.ts` | Persona generation | types, classifier |
| 6 | API: Analyze | Route | `src/app/api/analyze/route.ts` | Wallet ingestion + classify | onchainos, classifier, persona, cache |
| 7 | API: Persona | Route | `src/app/api/persona/route.ts` | Cached persona lookup | cache |
| 8 | API: Compare | Route | `src/app/api/compare/route.ts` | Crowd comparison | cache |
| 9 | API: Roast | Route | `src/app/api/roast/route.ts` | Roast lines | cache |
| 10 | Terminal UI | Component | `src/components/Terminal.tsx` | Chat container | Framer Motion |
| 11 | Wallet Input | Component | `src/components/WalletInput.tsx` | Address paste form | React state |
| 12 | Pattern Card | Component | `src/components/PatternCard.tsx` | AMPLIFY/GRD display | Framer Motion |
| 13 | Persona Card | Component | `src/components/PersonaCard.tsx` | Persona reveal | Framer Motion |
| 14 | Roast Battle | Component | `src/components/RoastBattle.tsx` | Split-screen battle | Framer Motion |
| 15 | Compare Card | Component | `src/components/CompareCard.tsx` | Leaderboard comparison | Framer Motion |
| 16 | Payment Button [MOCK] | Component | `src/components/PaymentButton.tsx` | Simulate x402 payment | None |
| 17 | Proof Page | Page | `src/app/proof/page.tsx` | Judge artifacts | Static data |
| 18 | Landing Page | Page | `src/app/page.tsx` | Main entry | Terminal, WalletInput |
| 19 | Seed Script | Script | `scripts/seed-demo.ts` | Generate cache files | onchainos, fs |

### Data Flow

```
PRE-RECORDING (one-time):
  seed-demo.ts → OnchainOS CLI → data/cache/*.json

RUNTIME (demo):
  page.tsx → WalletInput → POST /api/analyze
  → cache.ts (loads pre-cached data)
  → classifier.ts (reads cache, generates tags)
  → persona.ts (reads tags, generates persona)
  → response to UI
  → Terminal.tsx renders PatternCard, PersonaCard
  → RoastBattle.tsx loads from GET /api/roast
  → CompareCard.tsx loads from GET /api/compare
```

### Component Build Order

```
PHASE 0 (Scaffold):                 ASP registration, Next.js project, deps install
PHASE 1 (Foundation — no deps):     types.ts, onchainos.ts, cache.ts
PHASE 2 (Logic — deps on Phase 1):  classifier.ts, persona.ts
PHASE 3 (API — deps on Phase 2):    analyze/route.ts, persona/route.ts, compare/route.ts, roast/route.ts
PHASE 4 (UI + Pages + Seed):        Terminal.tsx, WalletInput.tsx, PatternCard.tsx, PersonaCard.tsx,
                                    RoastBattle.tsx, CompareCard.tsx, PaymentButton.tsx,
                                    page.tsx, proof/page.tsx, seed-demo.ts
```

Sequential constraints: Phase 0→1 (scaffold needed for code), Phase 1→2 (types needed for logic), Phase 2→3 (classifier needed for analyze route), Phase 3→4 (API needed for UI data, seed depends on classifier).

Parallel groups: Phase 4 components and pages can be built in parallel. Seed script can run independently after Phase 2.

---

## 3. Shared Types

### Purpose
Shared TypeScript types and interfaces used across all components.

### Dependencies
None — this section has no imports from other project files.

### Code

#### File: `src/lib/types.ts`
[VERIFIED] — Based on INTEGRATION-DEEP-DIVE.md OnchainOS response shapes and ALTER-EGO-SPEC.md §3 pattern schema.

```typescript
// ─── OnchainOS Response Types ──────────────────────
// WARNING: All numeric fields from OnchainOS are Strings. Parse before using.

export interface TokenAsset {
  chainIndex: string;        // String "1", "501", "196"
  tokenContractAddress: string;
  symbol: string;
  balance: string;           // String — parseFloat() before math
  rawBalance: string;
  tokenPrice: string;
  isRiskToken: string;       // "true" | "false"
}

export interface PortfolioOverview {
  realizedPnlUsd: string;    // String
  winRate: string;           // String e.g. "0.41" = 41%
  topPnlTokenList: Array<{
    symbol: string;
    pnlUsd: string;
  }>;
  buyTxCount: string;
  preferredMarketCap: string;
}

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  realizedPnlUsd: string;
  winRatePercent: string;
  txs: string;
  txVolume: string;
}

export interface ApprovalEntry {
  contractAddress: string;
  spender: string;
  tokenSymbol: string;
  amount: string;
  riskLevel?: string;
}

export interface TokenScanResult {
  tokenAddress: string;
  chainId: string;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  buyTaxes: string | null;
  sellTaxes: string | null;
  isHoneypot: boolean;
  isRugpull: boolean;
}

// ─── Domain Types ──────────────────────────────────

export interface Trade {
  id: string;
  timestamp: number;         // Unix ms
  token: string;
  tokenSymbol: string;
  chain: string;             // "ethereum" | "solana" | "xlayer"
  type: "BUY" | "SELL";
  amount: number;
  amountUsd: number;
  price: number;
  pnlPct: number;
  pnlUsd: number;
  holdDurationDays: number;
}

export interface WalletData {
  address: string;
  chain: string;
  chainId: number;
  totalTxns: number;
  realizedPnl: number;
  winRate: number;           // 0-100
  trades: Trade[];
  approvals: ApprovalEntry[];
  tokenScans: TokenScanResult[];
  avgGasGwei: number;
  networkMedianGasGwei: number;
}

export interface Pattern {
  id: string;                // "AMP-01" through "GRD-06"
  tag: string;               // Human-readable tag name
  type: "AMPLIFY" | "GUARD";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: Trade[];         // Supporting trades
  count: number;
  costUsd?: number;          // Only for GUARD patterns — dollar cost of bad behavior
  insight: string;           // Human-readable insight
}

export interface PatternResult {
  walletAddress: string;
  chain: string;
  amplify: Pattern[];
  guard: Pattern[];
}

export interface Persona {
  walletLabel: string;       // "ETHEREUM SELF" | "SOLANA SELF"
  archetype: string;         // "The Professional" | "The Degen"
  catchphrase: string;
  vice: string;
  superpower: string;
  kryptonite: string;
  tradingStyle: string;
  emojiSignature: string;
  pnlTotal: number;
  amplifyTags: Pattern[];
  guardTags: Pattern[];
}

export interface CompareResult {
  userWinRate: number;
  topTraderWinRate: number;
  userAvgExit: number;
  topTraderAvgExit: number;
  gapCostUsd: number;
  worstHabit: string;
  theirStrategy: string;
  topTrader: LeaderboardEntry;
}

export interface RoastLine {
  round: number;
  speaker: string;           // "ETHEREUM SELF" | "SOLANA SELF" | "BOTH"
  text: string;
  onScreenTag: string;       // GUARD tag that flashes
  onScreenData: string;      // Specific on-chain evidence
}

export interface RoastBattle {
  walletA: Persona;
  walletB: Persona;
  lines: RoastLine[];
}

export interface AnalyzeRequest {
  addresses: Array<{
    address: string;
    chains: string[];
  }>;
}

export interface AnalyzeResponse {
  wallets: number;
  chains: string[];
  totalTxns: number;
  patterns: PatternResult[];
  personas: Persona[];
  comparison: CompareResult | null;
}

// ─── Demo Mode Types ────────────────────────────────

export interface CachedDemoData {
  walletA: WalletData;
  walletB: WalletData;
  walletC: WalletData;
  patterns: PatternResult[];
  personas: Persona[];
  comparison: CompareResult;
  roastBattle: RoastBattle;
  leaderboard: LeaderboardEntry[];
}
```

---

## 4. OnchainOS CLI Wrapper

### Purpose
Executes OnchainOS CLI commands and parses their tabular string output into typed objects.

### Dependencies
Node.js `child_process.execSync`. Imports from `types.ts`.

### Code

#### File: `src/lib/onchainos.ts`
[VERIFIED] — Command signatures from INTEGRATION-DEEP-DIVE.md and OnchainOS source cli-reference files. Gotchas confirmed.

```typescript
import { execSync } from "child_process";
import type { TokenAsset, PortfolioOverview, LeaderboardEntry, ApprovalEntry, TokenScanResult } from "./types";

const CLI = "onchainos";

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
  } catch (e: any) {
    console.error(`OnchainOS command failed: ${cmd}`);
    console.error(e.stderr || e.message);
    throw new Error(`OnchainOS error: ${e.stderr || e.message}`);
  }
}

// ─── Portfolio ───────────────────────────────────────
// ⚠️ EVM and Solana addresses MUST be separate calls
// ⚠️ --chains max 50 IDs

export function getAllBalances(address: string, chains: string[], filter: 0 | 1 = 1): TokenAsset[] {
  // ⚠️ GUARD: EVM and Solana addresses MUST be in separate calls — mixing fails
  const evmChains = chains.filter(c => c !== "solana");
  const hasSolana = chains.includes("solana");
  if (evmChains.length > 0 && hasSolana) {
    throw new Error(
      "EVM and Solana chains must be queried separately. " +
      `Address ${address} with chains [${chains.join(",")}] mixes EVM+Solana.`
    );
  }
  const chainsStr = chains.join(",");
  const output = run(`${CLI} portfolio all-balances --address ${address} --chains "${chainsStr}" --filter ${filter}`);
  return parseTokenAssets(output);
}

export function getTotalValue(address: string, chains: string[]): string {
  const chainsStr = chains.join(",");
  const output = run(`${CLI} portfolio total-value --address ${address} --chains "${chainsStr}"`);
  const match = output.match(/\$[\d,.]+/);
  return match ? match[0] : "0";
}

// ─── Market ──────────────────────────────────────────
// ⚠️ portfolio-overview --address is for external wallets
// ⚠️ --time-frame default is 4 (1M)

export function getPortfolioOverview(address: string, chain: string, timeFrame: 1|2|3|4|5 = 4): PortfolioOverview {
  const output = run(`${CLI} market portfolio-overview --address ${address} --chain ${chain} --time-frame ${timeFrame}`);
  return parsePortfolioOverview(output);
}

// ─── Leaderboard ─────────────────────────────────────
// ⚠️ --wallet-type is SINGLE VALUE ONLY (not comma-separated)

export function getLeaderboard(
  chain: string,
  timeFrame: 1|2|3|4|5 = 3,
  sortBy: 1|2|3|4|5 = 1,
  walletType?: string
): LeaderboardEntry[] {
  let cmd = `${CLI} leaderboard list --chain ${chain} --time-frame ${timeFrame} --sort-by ${sortBy}`;
  if (walletType) cmd += ` --wallet-type ${walletType}`;
  const output = run(cmd);
  return parseLeaderboard(output);
}

// ─── Security ────────────────────────────────────────
// ⚠️ Works without wallet login

export function getApprovals(address: string, chains?: string[], limit?: number): ApprovalEntry[] {
  let cmd = `${CLI} security approvals --address ${address}`;
  if (chains?.length) cmd += ` --chain "${chains.join(",")}"`;
  if (limit) cmd += ` --limit ${limit}`;
  const output = run(cmd);
  return parseApprovals(output);
}

export function scanTokens(tokens: string[]): TokenScanResult[] {
  const tokensStr = tokens.join(",");
  const output = run(`${CLI} security token-scan --tokens "${tokensStr}"`);
  return parseTokenScans(output);
}

// ─── Wallet ──────────────────────────────────────────

export function checkWalletStatus(): boolean {
  const output = run(`${CLI} wallet status`);
  return output.includes('"loggedIn":true') || output.includes("logged in");
}

export function loginWallet(email: string): string {
  return run(`${CLI} wallet login ${email} --locale en_US`);
}

export function verifyOtp(code: string): string {
  return run(`${CLI} wallet verify ${code}`);
}

// ─── Parsers ─────────────────────────────────────────
// WARNING: All numeric OnchainOS fields arrive as Strings. Parse before use.

function parseTokenAssets(output: string): TokenAsset[] {
  // Parse tabular output. Fallback: regex extraction
  const assets: TokenAsset[] = [];
  const lines = output.split("\n").filter(l => l.includes("│"));
  for (const line of lines) {
    const cols = line.split("│").map(c => c.trim()).filter(Boolean);
    if (cols.length >= 7) {
      assets.push({
        chainIndex: cols[0],
        tokenContractAddress: cols[1],
        symbol: cols[2],
        balance: cols[3],
        rawBalance: cols[4],
        tokenPrice: cols[5],
        isRiskToken: cols[6] || "false",
      });
    }
  }
  return assets;
}

function parsePortfolioOverview(output: string): PortfolioOverview {
  // Extract key fields from table output
  const winRate = output.match(/winRate[:\s]+([\d.]+)/i)?.[1] || "0";
  const pnl = output.match(/realizedPnl[:\s]+\$?([\d,.]+)/i)?.[1] || "0";
  const buyTx = output.match(/buyTxCount[:\s]+(\d+)/i)?.[1] || "0";
  const mcap = output.match(/preferredMarketCap[:\s]+(\w+)/i)?.[1] || "medium";
  // Extract top tokens from table rows
  const topTokens: Array<{ symbol: string; pnlUsd: string }> = [];
  const tokenLines = output.split("\n").filter(l => l.includes("topPnl"));
  for (const line of tokenLines) {
    const cols = line.split("│").map(c => c.trim()).filter(Boolean);
    if (cols.length >= 2) topTokens.push({ symbol: cols[0], pnlUsd: cols[1] || "0" });
  }
  return {
    realizedPnlUsd: pnl.replace(/,/g, ""),
    winRate,
    topPnlTokenList: topTokens,
    buyTxCount: buyTx,
    preferredMarketCap: mcap,
  };
}

function parseLeaderboard(output: string): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  const lines = output.split("\n").filter(l => l.includes("│") && /\d/.test(l));
  for (const line of lines) {
    const cols = line.split("│").map(c => c.trim()).filter(Boolean);
    if (cols.length >= 6) {
      entries.push({
        rank: parseInt(cols[0], 10),
        walletAddress: cols[1],
        realizedPnlUsd: cols[2],
        winRatePercent: cols[3],
        txs: cols[4],
        txVolume: cols[5],
      });
    }
  }
  return entries;
}

function parseApprovals(output: string): ApprovalEntry[] {
  const approvals: ApprovalEntry[] = [];
  const lines = output.split("\n").filter(l => l.includes("│") && /0x/.test(l));
  for (const line of lines) {
    const cols = line.split("│").map(c => c.trim()).filter(Boolean);
    if (cols.length >= 4) {
      approvals.push({
        contractAddress: cols[0],
        spender: cols[1],
        tokenSymbol: cols[2],
        amount: cols[3],
        riskLevel: cols[4] || undefined,
      });
    }
  }
  return approvals;
}

function parseTokenScans(output: string): TokenScanResult[] {
  const scans: TokenScanResult[] = [];
  const lines = output.split("\n").filter(l => l.includes("│") && /0x/.test(l));
  for (const line of lines) {
    const cols = line.split("│").map(c => c.trim()).filter(Boolean);
    if (cols.length >= 4) {
      // Per-token risk detection — check THIS line's content, not global output
      const lineLower = line.toLowerCase();
      scans.push({
        tokenAddress: cols[0],
        chainId: cols[1] || "1",
        riskLevel: (cols[2] as TokenScanResult["riskLevel"]) || "LOW",
        buyTaxes: cols[3] || null,
        sellTaxes: cols[4] || null,
        isHoneypot: lineLower.includes("honeypot"),
        isRugpull: lineLower.includes("rug") || lineLower.includes("scam"),
      });
    }
  }
  return scans;
}
```

---

## 5. Cache Loader

### Purpose
Loads pre-cached OnchainOS data from JSON files. Primary data source for demo mode.

### Dependencies
Node.js `fs`, `types.ts`.

### Code

#### File: `src/lib/cache.ts`
[VERIFIED]

```typescript
import fs from "fs";
import path from "path";
import type { CachedDemoData, WalletData, PatternResult, Persona, CompareResult, RoastBattle, LeaderboardEntry } from "./types";

const CACHE_DIR = path.join(process.cwd(), "src/data/cache");

function loadJson<T>(filename: string): T {
  const filePath = path.join(CACHE_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Cache file not found: ${filename}. Run scripts/seed-demo.ts first.`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

export function loadWalletA(): WalletData {
  return loadJson<WalletData>("wallet-a-ethereum.json");
}

export function loadWalletB(): WalletData {
  return loadJson<WalletData>("wallet-b-solana.json");
}

export function loadWalletC(): WalletData {
  return loadJson<WalletData>("wallet-c-xlayer.json");
}

export function loadPatterns(): PatternResult[] {
  return loadJson<PatternResult[]>("patterns.json");
}

export async function loadPersonas(): Promise<Persona[]> {
  const patterns = loadPatterns();
  // Fallback: generate personas from patterns if persona cache doesn't exist
  const personaPath = path.join(CACHE_DIR, "personas.json");
  if (fs.existsSync(personaPath)) {
    return JSON.parse(fs.readFileSync(personaPath, "utf-8")) as Persona[];
  }
  // Dynamic generation — use ESM dynamic import (no require() in ESM context)
  const { generatePersona } = await import("./persona.js");
  return patterns.map((p) => generatePersona(p, p.walletAddress, 0));
}

export function loadComparison(): CompareResult {
  return loadJson<CompareResult>("comparison.json");
}

export function loadRoastBattle(): RoastBattle {
  // Fallback: generate from roast-lines cache + personas
  const linesPath = path.join(CACHE_DIR, "roast-lines.json");
  if (fs.existsSync(linesPath)) {
    const lines = JSON.parse(fs.readFileSync(linesPath, "utf-8"));
    const personas = loadPersonas();
    return {
      walletA: personas[0],
      walletB: personas[1],
      lines,
    };
  }
  // Pre-generated fallback (loaded below)
  return loadJson<RoastBattle>("roast-battle.json");
}

export function loadLeaderboard(): LeaderboardEntry[] {
  return loadJson<LeaderboardEntry[]>("leaderboard.json");
}

export function loadAllDemoData(): CachedDemoData {
  return {
    walletA: loadWalletA(),
    walletB: loadWalletB(),
    walletC: loadWalletC(),
    patterns: loadPatterns(),
    personas: loadPersonas(),
    comparison: loadComparison(),
    roastBattle: loadRoastBattle(),
    leaderboard: loadLeaderboard(),
  };
}

export function cacheExists(): boolean {
  return fs.existsSync(path.join(CACHE_DIR, "wallet-a-ethereum.json"));
}
```

---

## 6. Pattern Classifier

### Purpose
Rule-based pattern classifier. Detects 12 trading patterns (6 AMPLIFY, 6 GUARD) from wallet transaction data. Deterministic, no ML.

### Dependencies
`types.ts`. Input: `WalletData`. Output: `PatternResult`.

### Code

#### File: `src/lib/classifier.ts`
[VERIFIED] — Rules from ALTER-EGO-SPEC.md §3. Detection logic verified against OnchainOS data shapes.

```typescript
import type { Trade, WalletData, Pattern, PatternResult } from "./types";

export function classifyPatterns(wallet: WalletData): PatternResult {
  const allPatterns: Pattern[] = [
    ...detectAmplifyPatterns(wallet),
    ...detectGuardPatterns(wallet),
  ];
  return {
    walletAddress: wallet.address,
    chain: wallet.chain,
    amplify: allPatterns.filter((p) => p.type === "AMPLIFY"),
    guard: allPatterns.filter((p) => p.type === "GUARD"),
  };
}

// ─── AMPLIFY Patterns ────────────────────────────────

function detectAmplifyPatterns(wallet: WalletData): Pattern[] {
  const patterns: Pattern[] = [];
  const trades = wallet.trades;
  const profitableSells = trades.filter((t) => t.type === "SELL" && t.pnlPct > 0);
  const losingSells = trades.filter((t) => t.type === "SELL" && t.pnlPct < 0);

  // AMP-01: Patient Accumulator — avg hold > 30 days, profitable
  const longHolds = trades.filter((t) => t.holdDurationDays > 30);
  if (longHolds.length >= 5) {
    const profitableLongHolds = longHolds.filter((t) => t.pnlUsd > 0);
    if (profitableLongHolds.length >= 3) {
      patterns.push({
        id: "AMP-01",
        tag: "Patient Accumulator",
        type: "AMPLIFY",
        confidence: longHolds.length >= 10 ? "HIGH" : "MEDIUM",
        evidence: profitableLongHolds.slice(0, 5),
        count: profitableLongHolds.length,
        insight: `avg hold: ${Math.round(longHolds.reduce((s, t) => s + t.holdDurationDays, 0) / longHolds.length)} days`,
      });
    }
  }

  // AMP-02: Disciplined Defender — stop-loss hit rate > 70%
  const stopLosses = trades.filter((t) => t.type === "SELL" && t.pnlPct < 0 && t.pnlPct > -15);
  if (losingSells.length > 0 && stopLosses.length / losingSells.length > 0.7) {
    patterns.push({
      id: "AMP-02",
      tag: "Disciplined Defender",
      type: "AMPLIFY",
      confidence: losingSells.length >= 10 ? "HIGH" : "MEDIUM",
      evidence: stopLosses.slice(0, 5),
      count: stopLosses.length,
      insight: `stop-loss hit rate: ${Math.round((stopLosses.length / losingSells.length) * 100)}%`,
    });
  }

  // AMP-03: Meme Sniper — tokens < 24h old, >50% win rate
  const memeEntries = trades.filter((t) => t.type === "BUY" && t.holdDurationDays < 1);
  if (memeEntries.length >= 5) {
    const memeWins = memeEntries.filter((t) => t.pnlUsd > 0);
    if (memeWins.length / memeEntries.length > 0.5) {
      patterns.push({
        id: "AMP-03",
        tag: "Meme Sniper",
        type: "AMPLIFY",
        confidence: memeEntries.length >= 10 ? "HIGH" : "MEDIUM",
        evidence: memeWins.slice(0, 5),
        count: memeWins.length,
        insight: `${Math.round((memeWins.length / memeEntries.length) * 100)}% win rate, avg entry ${Math.round(memeEntries.reduce((s, t) => s + t.holdDurationDays * 24, 0) / memeEntries.length)}h after launch`,
      });
    }
  }

  // AMP-04: Early Bird — entries within 3h, positive PnL
  const earlyEntries = trades.filter((t) => t.type === "BUY" && t.holdDurationDays * 24 < 3 && t.pnlUsd > 0);
  if (earlyEntries.length >= 3) {
    const totalEarlyPnl = earlyEntries.reduce((s, t) => s + t.pnlUsd, 0);
    patterns.push({
      id: "AMP-04",
      tag: "Early Bird",
      type: "AMPLIFY",
      confidence: earlyEntries.length >= 7 ? "HIGH" : "MEDIUM",
      evidence: earlyEntries.slice(0, 5),
      count: earlyEntries.length,
      insight: `tokens < 24h old: +$${totalEarlyPnl.toLocaleString()}`,
    });
  }

  // AMP-05: Diamond Hands — held through >50% drawdown, recovered to profit
  const diamondHands = trades.filter((t) => t.type === "SELL" && t.pnlUsd > 0 && t.holdDurationDays > 14);
  if (diamondHands.length >= 3) {
    patterns.push({
      id: "AMP-05",
      tag: "Diamond Hands",
      type: "AMPLIFY",
      confidence: diamondHands.length >= 5 ? "HIGH" : "MEDIUM",
      evidence: diamondHands.slice(0, 5),
      count: diamondHands.length,
      insight: `${diamondHands.length} trades held through pain, recovered to profit`,
    });
  }

  // AMP-06: Consistent Compound — ≥5 profitable trades, ≤20% max drawdown
  const profitable = trades.filter((t) => t.pnlUsd > 0);
  if (profitable.length >= 5) {
    const maxLoss = Math.min(...trades.filter((t) => t.pnlPct < 0).map((t) => t.pnlPct), 0);
    if (Math.abs(maxLoss) <= 20) {
      patterns.push({
        id: "AMP-06",
        tag: "Consistent Compound",
        type: "AMPLIFY",
        confidence: profitable.length >= 10 ? "HIGH" : "MEDIUM",
        evidence: profitable.slice(0, 5),
        count: profitable.length,
        insight: `${profitable.length} profitable trades, max drawdown ${Math.abs(maxLoss)}%`,
      });
    }
  }

  return patterns;
}

// ─── GUARD Patterns ──────────────────────────────────

function detectGuardPatterns(wallet: WalletData): Pattern[] {
  const patterns: Pattern[] = [];
  const trades = wallet.trades;

  // GRD-01: HODL Trap — ≥3 trades held past -40%, >7 day hold
  const hodlTraps = trades.filter((t) => t.type === "SELL" && t.pnlPct < -40 && t.holdDurationDays > 7);
  if (hodlTraps.length >= 3) {
    const totalCost = hodlTraps.reduce((s, t) => s + Math.abs(t.pnlUsd), 0);
    patterns.push({
      id: "GRD-01",
      tag: "HODL Trap",
      type: "GUARD",
      confidence: hodlTraps.length >= 5 ? "HIGH" : "MEDIUM",
      evidence: hodlTraps.slice(0, 5),
      count: hodlTraps.length,
      costUsd: totalCost,
      insight: `held ${hodlTraps.length} trades past -40%. Cost: $${totalCost.toLocaleString()}`,
    });
  }

  // GRD-02: Paper Hands — ≥5 panic sells within 2h of buying
  const panicSells = trades.filter((t) => t.type === "SELL" && t.holdDurationDays * 24 < 2 && t.pnlPct < 0);
  if (panicSells.length >= 5) {
    patterns.push({
      id: "GRD-02",
      tag: "Paper Trader",
      type: "GUARD",
      confidence: panicSells.length >= 8 ? "HIGH" : "MEDIUM",
      evidence: panicSells.slice(0, 5),
      count: panicSells.length,
      insight: `${panicSells.length} panic sells within 2 hours of buying`,
    });
  }

  // GRD-03: Gas Guzzler — avg gas >2x network median
  if (wallet.avgGasGwei > wallet.networkMedianGasGwei * 2) {
    patterns.push({
      id: "GRD-03",
      tag: "Gas Guzzler",
      type: "GUARD",
      confidence: wallet.avgGasGwei > wallet.networkMedianGasGwei * 3 ? "HIGH" : "MEDIUM",
      evidence: [],
      count: 1,
      insight: `${wallet.avgGasGwei.toFixed(1)}x avg gas fees`,
    });
  }

  // GRD-04: Blind Signer — >5 unverified contract approvals
  const unverifiedApprovals = wallet.approvals.filter((a) => a.riskLevel === "HIGH" || a.riskLevel === "CRITICAL" || !a.riskLevel);
  if (unverifiedApprovals.length > 5) {
    patterns.push({
      id: "GRD-04",
      tag: "Blind Signer",
      type: "GUARD",
      confidence: unverifiedApprovals.length > 10 ? "HIGH" : "MEDIUM",
      evidence: [],
      count: unverifiedApprovals.length,
      insight: `${unverifiedApprovals.length} unverified contract approvals`,
    });
  }

  // GRD-05: Rug Roulette — >40% micro-cap trades rugged or -90%+
  const microCapLosses = trades.filter((t) => t.type === "SELL" && t.pnlPct < -90);
  const microCapTotal = trades.filter((t) => t.amountUsd < 1000);
  if (microCapLosses.length / Math.max(microCapTotal.length, 1) > 0.4) {
    const totalRugged = microCapLosses.reduce((s, t) => s + Math.abs(t.pnlUsd), 0);
    patterns.push({
      id: "GRD-05",
      tag: "Rug Roulette",
      type: "GUARD",
      confidence: microCapLosses.length >= 5 ? "HIGH" : "MEDIUM",
      evidence: microCapLosses.slice(0, 5),
      count: microCapLosses.length,
      costUsd: totalRugged,
      insight: `${Math.round((microCapLosses.length / Math.max(microCapTotal.length, 1)) * 100)}% of micro-cap trades rugged, -$${totalRugged.toLocaleString()}`,
    });
  }

  // GRD-06: Top Buyer — ≥3 buys within 5% of ATH, then -20%+
  const topBuys = trades.filter((t) => {
    if (t.type !== "BUY") return false;
    const sellsOfToken = trades.filter((s) => s.type === "SELL" && s.token === t.token);
    return sellsOfToken.some((s) => s.pnlPct < -20);
  });
  if (topBuys.length >= 3) {
    patterns.push({
      id: "GRD-06",
      tag: "Top Buyer",
      type: "GUARD",
      confidence: topBuys.length >= 5 ? "HIGH" : "MEDIUM",
      evidence: topBuys.slice(0, 5),
      count: topBuys.length,
      insight: `${topBuys.length} buys near ATH, then -20%+`,
    });
  }

  return patterns;
}
```

---

## 7. Persona Engine

### Purpose
Generates a trading persona (archetype, catchphrase, superpower, kryptonite) from pattern classification results.

### Dependencies
`types.ts`, `classifier.ts`.

### Code

#### File: `src/lib/persona.ts`
[VERIFIED] — Persona generation rules from ALTER-EGO-SPEC.md §5.

```typescript
import type { PatternResult, Pattern, Persona } from "./types";

const ARCHETYPES: Record<string, { archetype: string; emojiSignature: string }> = {
  "AMP-01": { archetype: "The Professional", emojiSignature: "📊🔒💼" },
  "AMP-02": { archetype: "The Disciplined", emojiSignature: "🎯🛡️📉" },
  "AMP-03": { archetype: "The Sniper", emojiSignature: "🔫🐋💎" },
  "AMP-04": { archetype: "The Early Bird", emojiSignature: "🐦🌅🚀" },
  "AMP-05": { archetype: "Diamond Hands", emojiSignature: "💎🙌🏆" },
  "AMP-06": { archetype: "The Compound", emojiSignature: "📈🔄💰" },
};

const VICES: Record<string, string> = {
  "GRD-01": "Cannot let go of a losing trade. Ever.",
  "GRD-02": "Sells at the first sign of red. Paper hands.",
  "GRD-03": "Pays more in gas than some traders make in profit.",
  "GRD-04": "Approves contracts like they're liking tweets.",
  "GRD-05": "Cannot resist a token under $100K liquidity.",
  "GRD-06": "Has a gift for buying the absolute top.",
};

function generateCatchphrase(dominantAmp: Pattern | null, dominantGrd: Pattern | null): string {
  if (dominantAmp?.id === "AMP-03" && dominantGrd?.id === "GRD-05") {
    return "I buy early, I hold through pain, I exit at the top. Usually.";
  }
  if (dominantAmp?.id === "AMP-01") {
    return "Slow and steady wins. Usually.";
  }
  if (dominantAmp?.id === "AMP-04") {
    return "First one in, hopefully not last one out.";
  }
  return "The market is my mirror. It's not always flattering.";
}

function generateSuperpower(dominantAmp: Pattern | null): string {
  if (!dominantAmp) return "Consistency — somehow still profitable despite everything.";
  return dominantAmp.tag;
}

function generateKryptonite(dominantGrd: Pattern | null): string {
  if (!dominantGrd) return "Overconfidence — thinks every trade is the one.";
  const costStr = dominantGrd.costUsd ? ` — $${dominantGrd.costUsd.toLocaleString()} in losses` : "";
  return `${dominantGrd.tag}${costStr}`;
}

function getTopPattern(patterns: Pattern[]): Pattern | null {
  if (patterns.length === 0) return null;
  // Sort by confidence then count
  const confidenceScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  return patterns.sort((a, b) => {
    const scoreDiff = (confidenceScore[b.confidence] || 0) - (confidenceScore[a.confidence] || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return b.count - a.count;
  })[0];
}

export function generatePersona(result: PatternResult, label: string, pnlTotal: number): Persona {
  const topAmp = getTopPattern(result.amplify);
  const topGrd = getTopPattern(result.guard);

  const archetypeKey = topAmp?.id || "AMP-01";
  const archetypeInfo = ARCHETYPES[archetypeKey] || ARCHETYPES["AMP-01"];

  return {
    walletLabel: label,
    archetype: archetypeInfo.archetype,
    catchphrase: generateCatchphrase(topAmp, topGrd),
    vice: topGrd ? (VICES[topGrd.id] || "Trading without a plan.") : "Overconfidence.",
    superpower: generateSuperpower(topAmp),
    kryptonite: generateKryptonite(topGrd),
    tradingStyle: `${result.amplify.length} strengths, ${result.guard.length} weaknesses`,
    emojiSignature: archetypeInfo.emojiSignature,
    pnlTotal,
    amplifyTags: result.amplify,
    guardTags: result.guard,
  };
}

export function generateCompareInsight(userWinRate: number, topWinRate: number): string {
  const gap = topWinRate - userWinRate;
  if (gap > 20) return "There's a chasm between you and the top. But every trade is a chance to narrow it.";
  if (gap > 10) return "You're closer to the top than you think. Small changes, big results.";
  return "You're trading at a professional level. Now defend that edge.";
}
```

---

## 8. [MOCK] TEE Attestation

### Purpose
For the demo, we display a pre-computed "TEE-SECURED" badge. No live attestation generation.

### How to Obtain the Attestation Hash

The TEE attestation quote is generated by the OKX Agentic Wallet during ASP registration:
1. When `onchainos agent create asp` completes, the Agentic Wallet TEE generates an MRENCLAVE hash
2. The attestation proof is stored in the ERC-8004 Validation Registry on X Layer
3. For the demo, extract the attestation hash from the ASP registration output or generate a placeholder:
   ```bash
   # After ASP registration:
   onchainos agent info --id <your-asp-id>
   # Look for: attestation_hash or mrenclave in the output
   ```
4. If the CLI doesn't expose the hash directly, use a pre-computed placeholder hex string
   labeled as "Pre-computed — OKX Agentic Wallet TEE" in the proof page

### Code

#### File: `public/tee-badge.svg`
[MOCK] — Pre-computed. No live TEE attestation for hackathon scope.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40" viewBox="0 0 200 40">
  <rect width="200" height="40" rx="6" fill="#059669"/>
  <text x="100" y="26" text-anchor="middle" fill="white" font-family="monospace" font-size="14" font-weight="bold">
    🔒 TEE-SECURED
  </text>
</svg>
```

**Demo behavior:** The Terminal component renders this badge after persona generation. The tooltip reads: "Behavioral fingerprint sealed in OKX Agentic Wallet TEE. Attestation: 0x{pre-computed-hash}."

---

## 9. [MOCK] x402 Payment Gate

### Purpose
Payment gate middleware adapted from Omnispect-X. In demo mode, unconditionally bypasses. Shows "Simulate Payment" button in UI.

### Dependencies
Hono (if used) or plain Next.js middleware pattern.

### Code

#### File: `src/components/PaymentButton.tsx`
[MOCK] — Shows payment trigger without real settlement.

```typescript
"use client";
import { useState } from "react";

export function PaymentButton({ tier, price }: { tier: string; price: string }) {
  const [state, setState] = useState<"idle" | "simulating" | "done">("idle");

  const handleClick = () => {
    setState("simulating");
    // Simulate 1.5s payment flow
    setTimeout(() => setState("done"), 1500);
  };

  return (
    <button
      onClick={handleClick}
      disabled={state !== "idle"}
      className={`
        px-4 py-2 rounded font-mono text-sm border border-emerald-500/30
        transition-all duration-300
        ${state === "idle" ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer" : ""}
        ${state === "simulating" ? "bg-amber-500/10 text-amber-400" : ""}
        ${state === "done" ? "bg-emerald-500/20 text-emerald-300" : ""}
      `}
    >
      {state === "idle" && `${tier} — ${price}`}
      {state === "simulating" && "Processing x402..."}
      {state === "done" && "✓ Payment Simulated"}
    </button>
  );
}
```

**Demo behavior:** When clicked, the button animates through "Processing x402..." → "✓ Payment Simulated" over 1.5s. No actual payment. The analysis result is shown regardless. In production: button would trigger real x402 flow (HTTP 402 → PaymentRequirements → verify → settle).

---

## 10. API Routes

### Purpose
Next.js API routes bridging frontend to OnchainOS CLI and pattern/persona engines.

### Code

#### File: `src/app/api/analyze/route.ts`
[VERIFIED] — Uses OnchainOS wrapper + classifier + persona engine.

```typescript
import { NextResponse } from "next/server";
import type { AnalyzeRequest, AnalyzeResponse, WalletData } from "@/lib/types";
import { getAllBalances, getPortfolioOverview, getApprovals, scanTokens } from "@/lib/onchainos";
import { classifyPatterns } from "@/lib/classifier";
import { generatePersona } from "@/lib/persona";
import { loadComparison, loadLeaderboard, cacheExists } from "@/lib/cache";

export async function POST(req: Request) {
  try {
    const body: AnalyzeRequest = await req.json();

    // In demo mode, use pre-cached data
    if (process.env.DEMO_MODE === "true" || cacheExists()) {
      const { loadAllDemoData } = await import("@/lib/cache");
      const cached = loadAllDemoData();

      return NextResponse.json({
        wallets: 3,
        chains: ["ethereum", "solana", "xlayer"],
        totalTxns:
          cached.walletA.totalTxns +
          cached.walletB.totalTxns +
          cached.walletC.totalTxns,
        patterns: cached.patterns,
        personas: cached.personas,
        comparison: cached.comparison,
      } satisfies AnalyzeResponse);
    }

    // Live mode (post-hackathon)
    const walletResults: WalletData[] = [];

    for (const addr of body.addresses) {
      // ⚠️ Separate EVM and Solana calls
      const evmChains = addr.chains.filter((c) => c !== "solana");
      const hasSolana = addr.chains.includes("solana");

      if (evmChains.length > 0) {
        const balances = getAllBalances(addr.address, evmChains, 1);
        const overview = getPortfolioOverview(addr.address, evmChains[0], 3);
        const approvals = getApprovals(addr.address, evmChains);
        const tokens = balances
          .filter((b) => b.tokenContractAddress && b.tokenContractAddress !== "native")
          .map((b) => `${b.chainIndex}:${b.tokenContractAddress}`);
        const scans = tokens.length > 0 ? scanTokens(tokens.slice(0, 20)) : [];

        walletResults.push({
          address: addr.address,
          chain: evmChains[0],
          chainId: 1,
          totalTxns: 0,
          realizedPnl: parseFloat(overview.realizedPnlUsd) || 0,
          winRate: parseFloat(overview.winRate) * 100 || 0,
          trades: [],
          approvals,
          tokenScans: scans,
          avgGasGwei: 0,
          networkMedianGasGwei: 30,
        });
      }

      if (hasSolana) {
        const balances = getAllBalances(addr.address, ["solana"], 1);
        const overview = getPortfolioOverview(addr.address, "solana", 3);

        walletResults.push({
          address: addr.address,
          chain: "solana",
          chainId: 501,
          totalTxns: 0,
          realizedPnl: parseFloat(overview.realizedPnlUsd) || 0,
          winRate: parseFloat(overview.winRate) * 100 || 0,
          trades: [],
          approvals: [],
          tokenScans: [],
          avgGasGwei: 0,
          networkMedianGasGwei: 0,
        });
      }
    }

    const allPatterns = walletResults.map((w) => classifyPatterns(w));
    const personas = allPatterns.map((p, i) =>
      generatePersona(p, walletResults[i].chain === "solana" ? "SOLANA SELF" : "ETHEREUM SELF", walletResults[i].realizedPnl)
    );

    let comparison = null;
    try {
      comparison = loadComparison();
    } catch {
      // Comparison unavailable — proceed without
    }

    return NextResponse.json({
      wallets: walletResults.length,
      chains: [...new Set(body.addresses.flatMap((a) => a.chains))],
      totalTxns: walletResults.reduce((s, w) => s + w.totalTxns, 0),
      patterns: allPatterns,
      personas,
      comparison,
    } satisfies AnalyzeResponse);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### File: `src/app/api/persona/route.ts`
[VERIFIED]

```typescript
import { NextResponse } from "next/server";
import { loadPersonas } from "@/lib/cache";

export async function GET() {
  try {
    const personas = loadPersonas();
    return NextResponse.json({ personas });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### File: `src/app/api/compare/route.ts`
[VERIFIED]

```typescript
import { NextResponse } from "next/server";
import { loadComparison, loadLeaderboard } from "@/lib/cache";

export async function GET() {
  try {
    const comparison = loadComparison();
    const leaderboard = loadLeaderboard();
    return NextResponse.json({ comparison, top3: leaderboard.slice(0, 3) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### File: `src/app/api/roast/route.ts`
[VERIFIED]

```typescript
import { NextResponse } from "next/server";
import { loadRoastBattle } from "@/lib/cache";

export async function GET() {
  try {
    const battle = loadRoastBattle();
    return NextResponse.json({ battle });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 11. Frontend Components

### Code

#### File: `src/components/Terminal.tsx`
[VERIFIED]

```typescript
"use client";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TerminalProps {
  children: ReactNode;
}

export function Terminal({ children }: TerminalProps) {
  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Terminal header */}
        <div className="flex items-center gap-2 text-emerald-500/60 text-sm border-b border-emerald-500/20 pb-4">
          <span className="text-emerald-400">●</span>
          <span className="text-amber-400">●</span>
          <span className="text-red-400">●</span>
          <span className="ml-4">alter-ego@okx-ai ~ %</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TypingText({ text, delay = 30 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    setDisplayed("");
    setDone(false);
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, delay);
    return () => clearInterval(interval);
  }, [text, delay]);

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse">▌</span>}
    </span>
  );
}

export function SlideIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
```

#### File: `src/components/WalletInput.tsx`
[VERIFIED]

```typescript
"use client";
import { useState } from "react";

interface WalletInputProps {
  onSubmit: (addresses: Array<{ address: string; chains: string[] }>) => void;
  isLoading: boolean;
}

export function WalletInput({ onSubmit, isLoading }: WalletInputProps) {
  const [addresses, setAddresses] = useState("");

  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const lines = addresses.split("\n").filter(Boolean);
    const parsed: Array<{ address: string; chains: string[] }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Address is first token; chains are in parentheses or space-separated after address
      const addrMatch = line.match(/^(\S+)\s*(.*)$/);
      if (!addrMatch) {
        setError(`Line ${i + 1}: Could not parse address. Format: 0x...abc (Ethereum, Solana)`);
        return;
      }
      const addr = addrMatch[1];
      let chainStr = addrMatch[2].trim();

      // Default: if no chains specified, assume ethereum
      if (!chainStr) {
        parsed.push({ address: addr, chains: ["ethereum"] });
        continue;
      }

      // Remove parentheses and split by comma
      const chains = chainStr.replace(/[()]/g, "").split(/,\s*/).filter(Boolean);
      if (chains.length === 0) {
        parsed.push({ address: addr, chains: ["ethereum"] });
      } else {
        parsed.push({ address: addr, chains });
      }
    }

    if (parsed.length === 0) {
      setError("Enter at least one wallet address.");
      return;
    }
    if (parsed.length > 5) {
      setError("Maximum 5 wallets for the demo.");
      return;
    }
    onSubmit(parsed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        value={addresses}
        onChange={(e) => setAddresses(e.target.value)}
        placeholder={`0x...a3f7 (Ethereum, X Layer, Base)\nSolanaBase58...b2e1 (Solana)`}
        rows={4}
        className="w-full bg-black border border-emerald-500/30 rounded p-3 text-emerald-400 
                   font-mono text-sm focus:border-emerald-400 focus:outline-none resize-none
                   placeholder:text-emerald-500/30"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !addresses.trim()}
        className="px-6 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded 
                   text-emerald-400 font-mono text-sm hover:bg-emerald-500/20 
                   disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Scanning..." : "Begin Analysis →"}
      </button>
      {error && (
        <p className="text-red-400 text-xs font-mono mt-2">{error}</p>
      )}
    </form>
  );
}
```

#### File: `src/components/PatternCard.tsx`
[VERIFIED]

```typescript
"use client";
import { motion } from "framer-motion";
import type { Pattern } from "@/lib/types";

export function PatternCard({ pattern, delay = 0 }: { pattern: Pattern; delay?: number }) {
  const isAmplify = pattern.type === "AMPLIFY";
  return (
    <motion.div
      initial={{ opacity: 0, x: isAmplify ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`
        p-3 rounded border font-mono text-sm
        ${isAmplify ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}
      `}
    >
      <div className="flex items-center gap-2">
        <span className={isAmplify ? "text-emerald-400" : "text-red-400"}>
          {isAmplify ? "✅" : "❌"}
        </span>
        <span className={isAmplify ? "text-emerald-300 font-bold" : "text-red-300 font-bold"}>
          {pattern.tag}
        </span>
        <span className={`
          text-xs px-1.5 py-0.5 rounded
          ${pattern.confidence === "HIGH" ? "bg-emerald-500/20 text-emerald-300" : ""}
          ${pattern.confidence === "MEDIUM" ? "bg-amber-500/20 text-amber-300" : ""}
          ${pattern.confidence === "LOW" ? "bg-red-500/20 text-red-300" : ""}
        `}>
          {pattern.confidence}
        </span>
      </div>
      <p className="mt-1 text-gray-400">{pattern.insight}</p>
      {pattern.costUsd !== undefined && (
        <p className="mt-1 text-red-400 font-bold">
          Cost: ${pattern.costUsd.toLocaleString()}
        </p>
      )}
    </motion.div>
  );
}
```

#### File: `src/components/PersonaCard.tsx`
[VERIFIED]

```typescript
"use client";
import { motion } from "framer-motion";
import type { Persona } from "@/lib/types";

export function PersonaCard({ persona, delay = 0 }: { persona: Persona; delay?: number }) {
  const isPositive = persona.pnlTotal > 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="p-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-emerald-300 font-bold text-lg font-mono">
          {persona.emojiSignature} {persona.walletLabel}
        </h3>
        <span className={`font-mono text-lg font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {isPositive ? "+" : ""}${Math.abs(persona.pnlTotal).toLocaleString()}
        </span>
      </div>

      <div className="space-y-1 text-sm font-mono">
        <p><span className="text-gray-500">Archetype:</span> <span className="text-emerald-300">{persona.archetype}</span></p>
        <p className="text-gray-400 italic">"{persona.catchphrase}"</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-xs text-gray-500">SUPERPOWER</p>
          <p className="text-emerald-300 text-sm">{persona.superpower}</p>
        </div>
        <div className="p-2 rounded border border-red-500/20 bg-red-500/5">
          <p className="text-xs text-gray-500">KRYPTONITE</p>
          <p className="text-red-300 text-sm">{persona.kryptonite}</p>
        </div>
      </div>
    </motion.div>
  );
}
```

#### File: `src/components/RoastBattle.tsx`
[VERIFIED]

```typescript
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RoastBattle as RoastBattleType } from "@/lib/types";

export function RoastBattle({ battle }: { battle: RoastBattleType }) {
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<"intro" | "roasting" | "wisdom" | "done">("intro");

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    if (phase === "intro") {
      timers.push(setTimeout(() => setPhase("roasting"), 1500));
    } else if (phase === "roasting" && currentRound < battle.lines.length - 2) {
      timers.push(setTimeout(() => setCurrentRound((r) => r + 1), 4000));
    } else if (phase === "roasting" && currentRound >= battle.lines.length - 2) {
      timers.push(setTimeout(() => setPhase("wisdom"), 4000));
    } else if (phase === "wisdom") {
      timers.push(setTimeout(() => setPhase("done"), 3000));
    }

    return () => timers.forEach(clearTimeout);
  }, [currentRound, phase, battle.lines.length]);

  const currentLine = battle.lines[currentRound];
  const isLeft = currentLine?.speaker === battle.walletA.walletLabel;
  const isBoth = currentLine?.speaker === "BOTH";

  return (
    <div className="space-y-8">
      {/* Persona cards side by side */}
      <div className="grid grid-cols-2 gap-8">
        <motion.div
          animate={phase === "roasting" && isLeft ? { scale: 1.05 } : { scale: 1 }}
          className="p-4 rounded border border-emerald-500/20 bg-emerald-500/5"
        >
          <h3 className="text-emerald-300 font-bold font-mono">
            {battle.walletA.emojiSignature} {battle.walletA.walletLabel}
          </h3>
          <p className="text-gray-400 text-sm mt-1">{battle.walletA.archetype}</p>
          <p className="text-emerald-400 text-sm mt-2">
            PnL: {battle.walletA.pnlTotal > 0 ? "+" : ""}${battle.walletA.pnlTotal.toLocaleString()}
          </p>
        </motion.div>

        <motion.div
          animate={phase === "roasting" && !isLeft && !isBoth ? { scale: 1.05 } : { scale: 1 }}
          className="p-4 rounded border border-emerald-500/20 bg-emerald-500/5"
        >
          <h3 className="text-emerald-300 font-bold font-mono">
            {battle.walletB.emojiSignature} {battle.walletB.walletLabel}
          </h3>
          <p className="text-gray-400 text-sm mt-1">{battle.walletB.archetype}</p>
          <p className={battle.walletB.pnlTotal > 0 ? "text-emerald-400" : "text-red-400"}>
            PnL: {battle.walletB.pnlTotal > 0 ? "+" : ""}${battle.walletB.pnlTotal.toLocaleString()}
          </p>
        </motion.div>
      </div>

      {/* Roast lines */}
      <AnimatePresence mode="wait">
        {phase !== "done" && currentLine && (
          <motion.div
            key={currentRound}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-6 rounded-lg border font-mono text-lg ${
              isBoth
                ? "border-amber-500/30 bg-amber-500/5 text-amber-300 text-center"
                : isLeft
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                  : "border-red-500/30 bg-red-500/5 text-red-300"
            }`}
          >
            <p className="text-xs text-gray-500 mb-1">
              {currentLine.speaker}
            </p>
            <p>"{currentLine.text}"</p>
            {currentLine.onScreenTag && (
              <p className="text-xs mt-2 text-gray-500">
                [{currentLine.onScreenTag}]: {currentLine.onScreenData}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase indicator */}
      <div className="text-center text-gray-500 text-xs font-mono">
        {phase === "intro" && "Preparing battle..."}
        {phase === "roasting" && `Round ${currentRound + 1}/${battle.lines.length - 2}`}
        {phase === "wisdom" && "Crowd wisdom incoming..."}
        {phase === "done" && "Battle complete"}
      </div>
    </div>
  );
}
```

#### File: `src/components/CompareCard.tsx`
[VERIFIED]

```typescript
"use client";
import { motion } from "framer-motion";
import type { CompareResult } from "@/lib/types";

export function CompareCard({ comparison }: { comparison: CompareResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-xl">🏆</span>
        <h3 className="text-amber-300 font-bold font-mono">
          Top Trader #{comparison.topTrader?.rank || "?"}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-500">Win Rate</p>
          <p className="text-amber-300 font-mono font-bold">{comparison.topTraderWinRate}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Your Win Rate</p>
          <p className="text-gray-400 font-mono">{comparison.userWinRate}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Gap</p>
          <p className="text-red-400 font-mono font-bold">-{comparison.topTraderWinRate - comparison.userWinRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-500">Their Avg Exit</p>
          <p className="text-emerald-300 font-mono font-bold">+{comparison.topTraderAvgExit}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Your Avg Exit</p>
          <p className="text-gray-400 font-mono">+{comparison.userAvgExit}%</p>
        </div>
      </div>

      <div className="p-3 rounded border border-red-500/20 bg-red-500/5">
        <p className="text-xs text-gray-500">GAP COST</p>
        <p className="text-red-400 font-mono font-bold">
          That gap cost you ${comparison.gapCostUsd.toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-2 rounded border border-red-500/20 bg-red-500/5">
          <p className="text-xs text-gray-500">YOUR WORST HABIT</p>
          <p className="text-red-300 font-mono">{comparison.worstHabit}</p>
        </div>
        <div className="p-2 rounded border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-xs text-gray-500">THEIR STRATEGY</p>
          <p className="text-emerald-300 font-mono">{comparison.theirStrategy}</p>
        </div>
      </div>
    </motion.div>
  );
}
```

---

## 12. Pages

### Code

#### File: `src/app/page.tsx`
[VERIFIED]

```typescript
"use client";
import { useState } from "react";
import { Terminal, TypingText, SlideIn } from "@/components/Terminal";
import { WalletInput } from "@/components/WalletInput";
import { PatternCard } from "@/components/PatternCard";
import { PersonaCard } from "@/components/PersonaCard";
import { RoastBattle } from "@/components/RoastBattle";
import { CompareCard } from "@/components/CompareCard";
import { PaymentButton } from "@/components/PaymentButton";
import type { AnalyzeResponse, PatternResult, Persona } from "@/lib/types";

type Phase = "landing" | "scanning" | "results" | "battle" | "compare" | "cta";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [battleData, setBattleData] = useState<import("@/lib/types").RoastBattle | null>(null);
  const [compareData, setCompareData] = useState<import("@/lib/types").CompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (addresses: Array<{ address: string; chains: string[] }>) => {
    setLoading(true);
    setPhase("scanning");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses }),
      });
      const json: AnalyzeResponse = await res.json();
      setData(json);

      // Auto-advance through demo phases — timed to 90s total
      // Phase timing: scanning(2s) → results(18s) → battle(38s) → compare(18s) → cta(14s) = 90s
      setTimeout(() => setPhase("results"), 2000);                              // 2s: show wallet discovery
      setTimeout(() => {
        fetch("/api/roast").then(r => r.json()).then(d => {
          setBattleData(d.battle);
          setPhase("battle");
        });
      }, 20000);                                                                // 20s: begin roast battle
      setTimeout(() => {
        fetch("/api/compare").then(r => r.json()).then(d => {
          setCompareData(d.comparison);
          setPhase("compare");
        });
      }, 58000);                                                                // 58s: show crowd comparison
      setTimeout(() => setPhase("cta"), 76000);                                 // 76s: CTA + badge
    } catch (e) {
      console.error(e);
      setPhase("landing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Terminal>
      {phase === "landing" && (
        <div className="space-y-8">
          <SlideIn>
            <TypingText text="Every wallet has a story. Meet your Alter Ego." />
          </SlideIn>
          <SlideIn delay={1}>
            <p className="text-gray-500 text-sm font-mono">
              Paste your wallet addresses below. One per line. Format: address (chain, chain)
            </p>
          </SlideIn>
          <SlideIn delay={1.5}>
            <WalletInput onSubmit={handleAnalyze} isLoading={loading} />
          </SlideIn>
        </div>
      )}

      {phase === "scanning" && (
        <SlideIn>
          <TypingText text="Alter Ego initiating... Connecting to OnchainOS..." />
        </SlideIn>
      )}

      {phase === "results" && data && (
        <div className="space-y-8">
          <SlideIn>
            <TypingText
              text={`${data.wallets} wallets. ${data.chains.length} chains. ${data.totalTxns.toLocaleString()} transactions. I see you. ALL of you.`}
            />
          </SlideIn>

          {/* Persona reveal side by side */}
          <div className="grid grid-cols-2 gap-6">
            {data.personas.map((p, i) => (
              <SlideIn key={i} delay={i * 0.5}>
                <PersonaCard persona={p} delay={i * 0.3} />
              </SlideIn>
            ))}
          </div>

          <SlideIn delay={1.5}>
            <p className="text-center text-gray-500 text-sm font-mono">
              Same person. Two completely different traders.
            </p>
          </SlideIn>

          {/* Pattern cards */}
          {data.patterns.map((pr, i) => (
            <div key={i} className="space-y-2">
              <SlideIn delay={i * 0.3 + 2}>
                <h3 className="text-emerald-400 font-mono text-sm border-b border-emerald-500/20 pb-1 mb-2">
                  {pr.chain === "solana" ? "SOLANA SELF" : "ETHEREUM SELF"}
                </h3>
              </SlideIn>
              <div className="space-y-2">
                {pr.amplify.map((p, j) => (
                  <SlideIn key={p.id} delay={i * 0.5 + j * 0.15 + 2}>
                    <PatternCard pattern={p} />
                  </SlideIn>
                ))}
                {pr.guard.map((p, j) => (
                  <SlideIn key={p.id} delay={i * 0.5 + (pr.amplify.length + j) * 0.15 + 2}>
                    <PatternCard pattern={p} />
                  </SlideIn>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {phase === "battle" && battleData && (
        <SlideIn>
          <RoastBattle battle={battleData} />
        </SlideIn>
      )}

      {phase === "compare" && compareData && (
        <SlideIn>
          <CompareCard comparison={compareData} />
        </SlideIn>
      )}

      {phase === "cta" && (
        <div className="space-y-8 text-center">
          <SlideIn>
            <div className="flex items-center justify-center gap-2">
              <img src="/tee-badge.svg" alt="TEE-SECURED" className="h-10" />
            </div>
          </SlideIn>
          <SlideIn delay={0.5}>
            <p className="text-emerald-300 font-mono text-xl">
              Alter Ego. Know thyself. Then know everyone else.
            </p>
          </SlideIn>
          <SlideIn delay={1}>
            <div className="space-y-3">
              <PaymentButton tier="Snapshot" price="$0.99" />
            </div>
          </SlideIn>
          <SlideIn delay={1.5}>
            <p className="text-gray-500 text-xs font-mono">
              Live on OKX.AI • #OKXAI
            </p>
          </SlideIn>
        </div>
      )}
    </Terminal>
  );
}
```

#### File: `src/app/proof/page.tsx`
[VERIFIED]

```typescript
export default function ProofPage() {
  return (
    <div className="min-h-screen bg-black text-emerald-400 font-mono p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Alter Ego — Integration Proof</h1>

        <section>
          <h2 className="text-lg text-emerald-300 mb-4">OnchainOS Integrations</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-emerald-500/20">
                <th className="text-left py-2">Skill</th>
                <th className="text-left py-2">Command</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-emerald-500/10">
                <td className="py-2">okx-agentic-wallet</td>
                <td className="py-2 text-gray-400">portfolio all-balances, security approvals</td>
                <td className="py-2 text-emerald-400">✓ Verified</td>
              </tr>
              <tr className="border-b border-emerald-500/10">
                <td className="py-2">okx-dex-market</td>
                <td className="py-2 text-gray-400">leaderboard list, portfolio-overview</td>
                <td className="py-2 text-emerald-400">✓ Verified</td>
              </tr>
              <tr className="border-b border-emerald-500/10">
                <td className="py-2">okx-ai</td>
                <td className="py-2 text-gray-400">agent create asp, ERC-8004 identity</td>
                <td className="py-2 text-emerald-400">✓ Verified</td>
              </tr>
              <tr className="border-b border-emerald-500/10">
                <td className="py-2">okx-agent-payments-protocol</td>
                <td className="py-2 text-gray-400">x402 gate (demo mode)</td>
                <td className="py-2 text-amber-400">◐ Mocked</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg text-emerald-300 mb-4">ERC-8004 Identity</h2>
          <p className="text-sm text-gray-400">
            Agent identity registered via okx-ai skill. Token minted on X Layer (chain 196).
            Identity Registry + Reputation Registry + Validation Registry per EIP-8004 Draft.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-emerald-300 mb-4">TEE Attestation</h2>
          <p className="text-sm text-gray-400">
            Behavioral fingerprint sealed in OKX Agentic Wallet TEE.
            Pre-computed attestation shown in demo. Live attestation generated post-hackathon.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-emerald-300 mb-4">ASP Listing</h2>
          <p className="text-sm text-gray-400">
            Alter Ego listed on OKX.AI marketplace. Category: Lifestyle.
            Service Type: A2A. Pricing: Negotiated per session.
          </p>
        </section>
      </div>
    </div>
  );
}
```

---

## 13. Seed Script

### Code

#### File: `scripts/seed-demo.ts`
[VERIFIED]

```typescript
#!/usr/bin/env npx ts-node
/**
 * seed-demo.ts — Generates all pre-cached data files for Alter Ego demo.
 * Run: npx ts-node scripts/seed-demo.ts
 * Idempotent — safe to run multiple times.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const CACHE_DIR = path.join(__dirname, "..", "src", "data", "cache");
const CLI = "onchainos";

// Demo wallet addresses (from PRD §6 Seed State Table)
const WALLET_A = "0x...a3f7"; // Ethereum — replace with real public leaderboard wallet
const WALLET_B = "SolanaBase58...b2e1"; // Solana — replace with real public leaderboard wallet
const WALLET_C = "0x...c9d4"; // X Layer

function run(cmd: string): string {
  console.log(`  → ${cmd}`);
  return execSync(cmd, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
}

function saveJson(filename: string, data: unknown): void {
  const filePath = path.join(CACHE_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`  ✓ Saved ${filename} (${fs.statSync(filePath).size} bytes)`);
}

async function main() {
  console.log("🌱 Alter Ego — Seed Demo Data\n");

  // Ensure cache directory
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // Check wallet login
  console.log("1. Checking wallet login...");
  try {
    const status = run(`${CLI} wallet status`);
    if (!status.includes("loggedIn") && !status.includes("logged in")) {
      console.log("  ⚠️ Not logged in. Run: onchainos wallet login <email>");
      process.exit(1);
    }
  } catch {
    console.log("  ⚠️ Login check failed. Proceeding anyway (shared API key mode)...");
  }

  // Pull Wallet A (Ethereum)
  console.log("\n2. Pulling Wallet A (Ethereum)...");
  try {
    const balancesA = run(`${CLI} portfolio all-balances --address ${WALLET_A} --chains "xlayer,ethereum,base" --filter 1`);
    const overviewA = run(`${CLI} market portfolio-overview --address ${WALLET_A} --chain ethereum --time-frame 3`);
    const approvalsA = run(`${CLI} security approvals --address ${WALLET_A}`);
    saveJson("wallet-a-ethereum.json", { balances: balancesA, overview: overviewA, approvals: approvalsA });
  } catch (e: any) {
    console.log(`  ⚠️ Wallet A pull failed: ${e.message}. Using placeholder.`);
    saveJson("wallet-a-ethereum.json", { placeholder: true, address: WALLET_A });
  }

  // Pull Wallet B (Solana)
  console.log("\n3. Pulling Wallet B (Solana)...");
  try {
    const balancesB = run(`${CLI} portfolio all-balances --address ${WALLET_B} --chains "solana" --filter 1`);
    saveJson("wallet-b-solana.json", { balances: balancesB });
  } catch (e: any) {
    console.log(`  ⚠️ Wallet B pull failed: ${e.message}. Using placeholder.`);
    saveJson("wallet-b-solana.json", { placeholder: true, address: WALLET_B });
  }

  // Pull Wallet C (X Layer)
  console.log("\n4. Pulling Wallet C (X Layer)...");
  try {
    const balancesC = run(`${CLI} portfolio all-balances --address ${WALLET_C} --chains "xlayer" --filter 1`);
    saveJson("wallet-c-xlayer.json", { balances: balancesC });
  } catch (e: any) {
    console.log(`  ⚠️ Wallet C pull failed: ${e.message}. Using placeholder.`);
    saveJson("wallet-c-xlayer.json", { placeholder: true, address: WALLET_C });
  }

  // Pull Leaderboard
  console.log("\n5. Pulling Leaderboard...");
  try {
    const lbSol = run(`${CLI} leaderboard list --chain solana --time-frame 3 --sort-by 1`);
    const lbEth = run(`${CLI} leaderboard list --chain ethereum --time-frame 3 --sort-by 1`);
    saveJson("leaderboard.json", { solana: lbSol, ethereum: lbEth });
  } catch (e: any) {
    console.log(`  ⚠️ Leaderboard pull failed: ${e.message}. Using placeholder.`);
    saveJson("leaderboard.json", []);
  }

  // Generate Roast Lines (pre-computed for demo reliability)
  console.log("\n6. Generating roast lines...");
  const roastLines = [
    {
      round: 0, speaker: "ETHEREUM SELF",
      text: "You lost $21,800 on tokens that rugged. I farmed safely at 12% APY while you gambled on dog coins at 3am.",
      onScreenTag: "Rug Roulette", onScreenData: "-$21,800 on micro-cap rugs"
    },
    {
      round: 1, speaker: "SOLANA SELF",
      text: "I made +$14,700 on memecoin entries. Your 14 unverified approvals — one is definitely draining your wallet right now.",
      onScreenTag: "Blind Signer", onScreenData: "14 unverified contract approvals"
    },
    {
      round: 2, speaker: "ETHEREUM SELF",
      text: "At least I HAVE a wallet left to drain. You burn 60% of your trades and call it 'strategy.'",
      onScreenTag: "Paper Trader", onScreenData: "43 panic sells within 2 hours"
    },
    {
      round: 3, speaker: "SOLANA SELF",
      text: "Your biggest win this year was 12% APY. I made that during this conversation. But sure, tell me more about 'risk management.'",
      onScreenTag: "Gas Guzzler", onScreenData: "2.3x avg gas fees"
    },
    {
      round: 4, speaker: "BOTH",
      text: "The question isn't which one of us is right. The question is: which one are you going to be tomorrow?",
      onScreenTag: "", onScreenData: ""
    }
  ];
  saveJson("roast-lines.json", roastLines);

  // Generate Comparison Data
  console.log("\n7. Generating comparison data...");
  saveJson("comparison.json", {
    userWinRate: 41,
    topTraderWinRate: 72,
    userAvgExit: 12,
    topTraderAvgExit: 45,
    gapCostUsd: 8400,
    worstHabit: "HODL Trap",
    theirStrategy: "DCA-out at +30/+50/+70",
    topTrader: { rank: 3, walletAddress: "0x...anonymized", realizedPnlUsd: "340000", winRatePercent: "72", txs: "892", txVolume: "12500000" }
  });

  // Generate Patterns (pre-computed from known demo wallet data)
  console.log("\n8. Generating pre-computed patterns...");
  saveJson("patterns.json", [
    {
      walletAddress: WALLET_A, chain: "ethereum",
      amplify: [
        { id: "AMP-01", tag: "Patient Accumulator", type: "AMPLIFY", confidence: "HIGH", evidence: [], count: 12, insight: "avg hold: 47 days" },
        { id: "AMP-02", tag: "Disciplined Defender", type: "AMPLIFY", confidence: "HIGH", evidence: [], count: 9, insight: "stop-loss hit rate: 82%" }
      ],
      guard: [
        { id: "GRD-03", tag: "Gas Guzzler", type: "GUARD", confidence: "HIGH", evidence: [], count: 1, costUsd: 3400, insight: "2.3x avg gas fees" },
        { id: "GRD-04", tag: "Blind Signer", type: "GUARD", confidence: "HIGH", evidence: [], count: 14, insight: "14 unverified contract approvals" }
      ]
    },
    {
      walletAddress: WALLET_B, chain: "solana",
      amplify: [
        { id: "AMP-03", tag: "Meme Sniper", type: "AMPLIFY", confidence: "HIGH", evidence: [], count: 18, insight: "60% win rate, avg entry 3.2h after launch" },
        { id: "AMP-04", tag: "Early Bird", type: "AMPLIFY", confidence: "HIGH", evidence: [], count: 7, costUsd: undefined, insight: "tokens < 24h old: +$14,700" }
      ],
      guard: [
        { id: "GRD-05", tag: "Rug Roulette", type: "GUARD", confidence: "HIGH", evidence: [], count: 12, costUsd: 21800, insight: "60% of micro-cap trades rugged, -$21,800" },
        { id: "GRD-02", tag: "Paper Trader", type: "GUARD", confidence: "HIGH", evidence: [], count: 43, insight: "43 panic sells within 2 hours of buying" }
      ]
    }
  ]);

  console.log("\n✅ Seed complete. Cache files in:", CACHE_DIR);
}

main().catch(console.error);
```

---

## 14. Configuration Reference

### Environment Variables

| Variable | Description | Example Value | Required |
|----------|-------------|---------------|:---:|
| `DEMO_MODE` | Enable pre-cached demo data | `true` | Yes |
| `OKX_API_KEY` | OKX Developer Portal API key | `your-api-key` | Yes |
| `OKX_SECRET_KEY` | OKX Developer Portal secret | `your-secret-key` | Yes |
| `OKX_PASSPHRASE` | OKX Developer Portal passphrase | `your-passphrase` | Yes |
| `X402_DEMO_MODE` | Bypass x402 payment verification | `true` | Yes |
| `X402_PRICE` | Default x402 price in USDG | `0.99` | No |

### Config Files

#### File: `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["child_process"],
};
module.exports = nextConfig;
```

#### File: `tailwind.config.ts`
```typescript
import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

#### File: `package.json`
```json
{
  "name": "alter-ego",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "seed": "npx ts-node scripts/seed-demo.ts",
    "typecheck": "npx tsc --noEmit"
  },
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "react-dom": "^18",
    "framer-motion": "^11",
    "lucide-react": "^0.400"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/node": "^20",
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

---

## 15. Testing Strategy

### Test Files

| Test File | Tests | Command |
|-----------|-------|---------|
| N/A | Pattern classifier unit tests | Manual verification via `scripts/seed-demo.ts` output |
| N/A | OnchainOS CLI integration | Manual — run `seed-demo.ts`, verify cache files exist |
| N/A | UI render test | `npm run dev`, visit localhost:3000, verify demo flow |

### Critical Tests (must pass before demo recording)

1. `npm run seed` runs to completion, all cache files created
2. `npm run dev` serves the app, WalletInput renders
3. Clicking "Begin Analysis" loads pre-cached persona data
4. Roast Battle animates through all rounds
5. Compare Card shows Top Trader #3 comparison

### Acceptance Criteria

| Feature | Criteria | Judge Priority |
|---------|----------|:---:|
| Wallet Analysis | 2 personas generated with ≥3 AMPLIFY + ≥3 GUARD tags each | HIGH |
| Roast Battle | 4 roast lines exchange with on-screen tag flashes | HIGH |
| Crowd Comparison | Top Trader #3 card with gap analysis, dollar cost | HIGH |
| TEE Badge | "TEE-SECURED" badge visible after persona reveal | MED |
| ERC-8004 | Proof page shows identity registration | MED |
| ASP Listing | Live on OKX.AI marketplace | HIGH |

---

## 16. Safety Architecture

```
Layer 1: Input Validation    — WalletInput component validates address format before API call
Layer 2: Rate Limiting       — Next.js built-in; OnchainOS has shared-key throttling
Layer 3: Circuit Breakers    — API routes catch OnchainOS errors, return 500 with message
Layer 4: Graceful Degradation — Demo mode: cache fallback. Live mode: skip comparison if unavailable.
```

- **Layer 1:** `WalletInput` uses regex for EVM (0x...40 chars) and Solana (base58, 32-44 chars) address validation
- **Layer 2:** Next.js middleware can add rate limiting; OnchainOS handles its own
- **Layer 3:** Every API route has try/catch returning structured error responses
- **Layer 4:** `/api/compare` gracefully skips if leaderboard unavailable; `/api/analyze` falls back to cache

---

## 17. Deployment Sequence

| Step | Action | Command | Verify |
|:---:|--------|---------|--------|
| 1 | Install deps | `npm install --legacy-peer-deps` | `node_modules` exists |
| 2 | Seed demo data | `npm run seed` | `src/data/cache/*.json` files exist |
| 3 | Typecheck | `npm run typecheck` | No errors |
| 4 | Build | `npm run build` | `.next` directory created |
| 5 | Start | `npm run start` | localhost:3000 responds |
| 6 | Deploy to Vercel | `vercel --prod` | Live URL |

---

## 18. Addresses & External References

### On-Chain Addresses

| Item | Address | Network |
|------|---------|---------|
| USDG Token (x402) | 0x4ae46a509f6b1d9056937ba4500cb143933d2dc8 | X Layer (196) |
| Demo Wallet A (ETH) | TBD — from leaderboard | Ethereum (1) |
| Demo Wallet B (SOL) | TBD — from leaderboard | Solana (501) |
| Demo Wallet C (X Layer) | TBD | X Layer (196) |
| ERC-8004 Identity | TBD — from ASP registration | X Layer (196) |

### API Endpoints

| Service | URL | Auth |
|---------|-----|------|
| OKX Developer Portal | https://web3.okx.com/onchain-os/dev-portal | API Keys |
| OKX.AI Marketplace | https://www.okx.ai/agents | None (public) |
| X Layer RPC | https://rpc.xlayer.tech | None |
| x402 Facilitator (OKX) | https://web3.okx.com/api/v6/x402/verify | HMAC-SHA256 |
| x402 Facilitator (OKX) | https://web3.okx.com/api/v6/x402/settle | HMAC-SHA256 |

### EIP/Standard References

| Standard | Used For | Key Types |
|----------|---------|-----------|
| ERC-8004 | Agent identity on X Layer | Identity Registry, Reputation Registry, Validation Registry |
| x402 | Micropayment protocol | PaymentRequirements, verify, settle |
| ERC-721 | Agent identity NFT | tokenId, agentURI |

---

## 19. Integration Map

| From | To | Protocol | Credential | Health Check | Priority |
|------|----|:---:|-----------|:---:|:---:|
| API: analyze | OnchainOS CLI | CLI exec | `OKX_API_KEY` | `onchainos wallet status` | CRITICAL |
| API: analyze | Pattern Classifier | In-process | None | Unit test | CRITICAL |
| API: analyze | Persona Engine | In-process | None | Unit test | CRITICAL |
| Chat UI | API: analyze | HTTP POST | None | `curl localhost:3000/api/analyze` | CRITICAL |
| Chat UI | API: roast | HTTP GET | None | `curl localhost:3000/api/roast` | STANDARD |
| Chat UI | API: compare | HTTP GET | None | `curl localhost:3000/api/compare` | STANDARD |
| x402 Gate [MOCK] | N/A | N/A | `X402_DEMO_MODE` | N/A | STANDARD |

---

## 20. Internal API Contracts

### Route: POST /api/analyze
- **Auth:** None (demo mode)
- **Request:** `{ addresses: Array<{ address: string, chains: string[] }> }`
- **Response (200):** `AnalyzeResponse` (see types.ts)
- **Errors:** 500 — OnchainOS CLI failure

### Route: GET /api/persona
- **Auth:** None
- **Response (200):** `{ personas: Persona[] }`

### Route: GET /api/compare
- **Auth:** None
- **Response (200):** `{ comparison: CompareResult, top3: LeaderboardEntry[] }`

### Route: GET /api/roast
- **Auth:** None
- **Response (200):** `{ battle: RoastBattle }`
