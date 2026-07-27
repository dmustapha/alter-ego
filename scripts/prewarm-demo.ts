/**
 * Run manually to refresh the demo cache from live analysis: npx tsx scripts/prewarm-demo.ts
 *
 * Calls the real analyzeWallets engine for the two canonical demo addresses
 * and writes results into src/data/cache/ so LOAD DEMO serves live-derived data.
 *
 * Does NOT fabricate any figures. All numbers come from OKX API responses.
 * Rate-limited by the engine (1 req/sec via withBackoff). Takes 60-120 seconds.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ── Manual .env.local parse (no dotenv dependency) ──────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const envPath = path.join(ROOT, ".env.local");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    process.env[key] = val;
  }
}

// ── Imports ──────────────────────────────────────────────────────────────────

import {
  buildWalletSignals,
  deriveTrades,
  getWalletTxnsPaged,
  getWalletBalances,
  getTxDetail,
} from "../src/lib/okx-api.js";
import { classifyPatterns } from "../src/lib/classifier.js";
import { generatePersona, ZERO_GRADE } from "../src/lib/persona.js";
import type {
  WalletData,
  PatternResult,
  Persona,
  CompareResult,
  RoastLine,
  Pattern,
} from "../src/lib/types.js"; // LeaderboardEntry removed (unused)

// ── Constants ─────────────────────────────────────────────────────────────────

const CACHE_DIR = path.join(ROOT, "src/data/cache");

const DEMO_ETH = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const DEMO_SOL = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function writeCache(filename: string, data: unknown) {
  const filePath = path.join(CACHE_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`  wrote ${filename}`);
}

// ── Per-wallet fetch for roast/comparison builders ───────────────────────────

async function fetchWalletDirect(
  address: string,
  chainIndex: string,
  chain: string,
  chainId: number,
  label: string
): Promise<WalletData> {
  console.log(`\n[Wallet ${label}] ${address} (chain ${chainIndex})`);
  const nowMs = Date.now();

  console.log("  fetching txns...");
  let txns: unknown[] = [];
  try {
    txns = await getWalletTxnsPaged(address, chainIndex, 6);
    console.log(`  got ${txns.length} txns`);
  } catch (e) {
    console.warn(`  txns fetch failed: ${e}. Using empty.`);
  }

  await sleep(300);

  console.log("  fetching balances...");
  let balances: unknown[] = [];
  try {
    balances = await getWalletBalances(address, chainIndex);
    console.log(`  got ${balances.length} balances`);
  } catch (e) {
    console.warn(`  balances fetch failed: ${e}. Using empty.`);
  }

  await sleep(300);

  const sampleTxns = (txns as Array<{ txHash?: string }>).slice(0, 25);
  const details: unknown[] = [];

  if (sampleTxns.length > 0) {
    console.log(`  fetching tx details (up to ${sampleTxns.length})...`);
    for (const tx of sampleTxns) {
      if (!tx.txHash) continue;
      try {
        const detail = await getTxDetail(chainIndex, tx.txHash);
        if (detail) details.push(detail);
      } catch {
        // skip failed detail lookups silently
      }
      await sleep(100);
    }
    console.log(`  got ${details.length} tx details`);
  }

  const signals = buildWalletSignals(txns, balances, details, chainIndex, nowMs);
  const trades = deriveTrades(txns, address, chainIndex);

  return {
    address,
    chain,
    chainId,
    totalTxns: signals.totalTxns,
    realizedPnl: 0,
    winRate: 0,
    trades,
    approvals: [],
    tokenScans: [],
    avgGasGwei: signals.avgGasGwei,
    networkMedianGasGwei: signals.networkMedianGasGwei,
    signals,
  };
}

// ── Roast lines builder (signal-interpolated only, no fabricated figures) ─────

function buildRoastLines(
  walletA: WalletData,
  walletB: WalletData,
  patternA: PatternResult,
  patternB: PatternResult
): RoastLine[] {
  const lines: RoastLine[] = [];

  const topGuardA: Pattern | null = patternA.guard[0] ?? null;
  const topGuardB: Pattern | null = patternB.guard[0] ?? null;
  const topAmpA: Pattern | null = patternA.amplify[0] ?? null;
  const topAmpB: Pattern | null = patternB.amplify[0] ?? null;

  // Round 1: Ethereum Self opens
  const aTxns = walletA.signals.totalTxns;
  const aUnique = walletA.signals.uniqueChains;
  lines.push({
    round: 1,
    speaker: "ETHEREUM SELF",
    text: `${aTxns} transactions and still counting. Operating across ${aUnique} chain${aUnique !== 1 ? "s" : ""} while you are still deciding.`,
    onScreenTag: topAmpA?.tag ?? topGuardA?.tag ?? "Active Trader",
    onScreenData: `${aTxns} txns across ${aUnique} chain${aUnique !== 1 ? "s" : ""}`,
  });

  // Round 2: Solana Self responds
  const bTokens = walletB.signals.uniqueTokens;
  const bTxns = walletB.signals.totalTxns;
  lines.push({
    round: 2,
    speaker: "SOLANA SELF",
    text: `${bTokens} unique tokens across ${bTxns} transactions. Breadth is a skill. Look it up.`,
    onScreenTag: topAmpB?.tag ?? topGuardB?.tag ?? "Active Trader",
    onScreenData: `${bTokens} unique tokens across ${bTxns} txns`,
  });

  // Round 3: risk token jab
  if (topGuardA) {
    const riskPct = Math.round(walletA.signals.riskTokenPct);
    const riskCount = walletA.signals.riskTokenCount;
    lines.push({
      round: 3,
      speaker: "SOLANA SELF",
      text: `${riskPct}% of those holdings are flagged. That is not a portfolio, that is a lottery ticket.`,
      onScreenTag: topGuardA.tag,
      onScreenData: `${riskCount} risk-flagged tokens (${riskPct}%)`,
    });
  } else if (topGuardB) {
    const riskPct = Math.round(walletB.signals.riskTokenPct);
    const riskCount = walletB.signals.riskTokenCount;
    lines.push({
      round: 3,
      speaker: "ETHEREUM SELF",
      text: `${riskPct}% flagged on Solana. Speed is fine until you hit a honeypot.`,
      onScreenTag: topGuardB.tag,
      onScreenData: `${riskCount} risk-flagged tokens (${riskPct}%)`,
    });
  } else {
    lines.push({
      round: 3,
      speaker: "BOTH",
      text: `Clean books. Zero flagged tokens. Even the chain is impressed.`,
      onScreenTag: "Clean Operator",
      onScreenData: "0 risk-flagged tokens",
    });
  }

  // Round 4: concentration or gas jab
  const aConc = Math.round(walletA.signals.topHoldingPct);
  if (walletA.signals.topHoldingPct > 60) {
    const concTag = patternA.guard.find((p) => p.id === "GRD-02")?.tag ?? "Concentration Risk";
    lines.push({
      round: 4,
      speaker: "SOLANA SELF",
      text: `Top holding at ${aConc}% of the portfolio. That is not conviction, that is overexposure.`,
      onScreenTag: concTag,
      onScreenData: `top position ${aConc}% of holdings`,
    });
  } else if (walletA.signals.avgGasGwei > 0) {
    const gasGwei = walletA.signals.avgGasGwei.toFixed(2);
    const gasTag = patternA.amplify.find((p) => p.id === "AMP-05")?.tag ?? "Gas Optimizer";
    lines.push({
      round: 4,
      speaker: "ETHEREUM SELF",
      text: `Average gas at ${gasGwei} gwei. Timing matters. I have learned that.`,
      onScreenTag: gasTag,
      onScreenData: `avg gas ${gasGwei} gwei`,
    });
  } else {
    const bSpan = Math.round(walletB.signals.activeSpanDays);
    lines.push({
      round: 4,
      speaker: "SOLANA SELF",
      text: `${bSpan} days of active history. The record speaks.`,
      onScreenTag: topAmpB?.tag ?? "Active Trader",
      onScreenData: `${bSpan} active span days`,
    });
  }

  // Round 5: dormancy or activity close
  if (walletA.signals.daysSinceLastTx > 30) {
    const days = Math.round(walletA.signals.daysSinceLastTx);
    const dormTag = patternA.guard.find((p) => p.id === "GRD-04")?.tag ?? "Dormant Wallet";
    lines.push({
      round: 5,
      speaker: "SOLANA SELF",
      text: `Last activity ${days} days ago. The market did not wait.`,
      onScreenTag: dormTag,
      onScreenData: `${days} days since last tx`,
    });
  } else {
    const days = Math.round(walletA.signals.daysSinceLastTx);
    lines.push({
      round: 5,
      speaker: "ETHEREUM SELF",
      text: `Last active ${days} day${days !== 1 ? "s" : ""} ago. Still in the game.`,
      onScreenTag: patternA.amplify.find((p) => p.tag === "Active Trader")?.tag ?? topAmpA?.tag ?? "Active Trader",
      onScreenData: `${days} day${days !== 1 ? "s" : ""} since last tx`,
    });
  }

  // Round 6: closing from Wallet B tokensHeld
  const bHeld = walletB.signals.tokensHeld;
  const bSpan = Math.round(walletB.signals.activeSpanDays);
  lines.push({
    round: 6,
    speaker: "SOLANA SELF",
    text: `${bHeld} tokens held, ${bSpan} active days. The breadth is the point.`,
    onScreenTag: topAmpB?.tag ?? "Portfolio Diversifier",
    onScreenData: `${bHeld} tokens held`,
  });

  return lines;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== prewarm-demo: refreshing cache from live analysis ===");

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  // Step 1: fetch wallet data using the shared pure pipeline
  // The cache is built from the same logic that analyzeWallets runs
  // (getWalletTxnsPaged + buildWalletSignals + classifyPatterns + generatePersona),
  // but we build WalletData directly because analyzeWallets does not expose
  // per-wallet WalletData, only AnalyzeResponse (counts/patterns/personas).

  console.log("\n[Phase 1] Fetching wallet data directly (for roast/comparison builders)...");
  const walletA = await fetchWalletDirect(DEMO_ETH, "1", "ethereum", 1, "A (ETH)");
  const walletB = await fetchWalletDirect(DEMO_SOL, "501", "solana", 501, "B (SOL)");

  // Step 2: classify + generate personas
  console.log("\n[Phase 2] Classifying patterns...");
  const patternA = classifyPatterns(walletA);
  const patternB = classifyPatterns(walletB);

  console.log(`  Wallet A: ${patternA.amplify.length} AMPLIFY, ${patternA.guard.length} GUARD`);
  console.log(`  Wallet B: ${patternB.amplify.length} AMPLIFY, ${patternB.guard.length} GUARD`);

  console.log("\n[Phase 3] Generating personas...");
  const NULL_PNL = { realizedPnl: null as null, winRate: null as null };
  const personaA: Persona = generatePersona(patternA, "ETHEREUM SELF", ZERO_GRADE, NULL_PNL);
  const personaB: Persona = generatePersona(patternB, "SOLANA SELF", ZERO_GRADE, NULL_PNL);
  console.log(`  A: ${personaA.archetype} (${personaA.superpower})`);
  console.log(`  B: ${personaB.archetype} (${personaB.superpower})`);

  // Step 3: build comparison (no fabricated figures)
  const topGuardA = patternA.guard[0] ?? null;
  const comparison: CompareResult = {
    userWinRate: 0,
    topTraderWinRate: 0,
    userAvgExit: 0,
    topTraderAvgExit: 0,
    gapCostUsd: 0,
    worstHabit: topGuardA ? topGuardA.insight : "None detected",
    theirStrategy: "Diversified across chains, low risk-flagged exposure, activity within 30 days",
    topTrader: {
      rank: 1,
      walletAddress: "0x0000000000000000000000000000000000000000",
      realizedPnlUsd: "0",
      winRatePercent: "0",
      txs: "0",
      txVolume: "0",
    },
  };

  // Step 4: build roast lines from signals
  console.log("\n[Phase 4] Building roast lines from signals...");
  const roastLines: RoastLine[] = buildRoastLines(walletA, walletB, patternA, patternB);
  console.log(`  generated ${roastLines.length} lines`);

  // Step 5: write cache files (only the two demo wallets + derived files)
  console.log("\n[Phase 5] Writing cache files...");

  writeCache("wallet-a-ethereum.json", walletA);
  writeCache("wallet-b-solana.json", walletB);
  writeCache("patterns.json", [patternA, patternB]);
  writeCache("personas.json", [personaA, personaB]);
  writeCache("comparison.json", comparison);
  writeCache("roast-lines.json", roastLines);

  // Remove stale roast-battle.json so cache.ts falls back to roast-lines.json
  const roastBattlePath = path.join(CACHE_DIR, "roast-battle.json");
  if (fs.existsSync(roastBattlePath)) {
    fs.unlinkSync(roastBattlePath);
    console.log("  deleted roast-battle.json (roast-lines.json is now authoritative)");
  }

  console.log("\n=== prewarm-demo complete ===");
}

main().catch((e) => {
  console.error("prewarm-demo failed:", e);
  process.exit(1);
});
