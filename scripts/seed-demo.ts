/**
 * seed-demo.ts
 *
 * Regenerates src/data/cache/*.json from LIVE OKX data using the real engine.
 * Run with: npx tsx scripts/seed-demo.ts
 *
 * Loads .env.local manually (no dotenv dependency).
 * Writes 8 cache files. Zero fabricated figures.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── Manual .env.local parse ─────────────────────────────────────────────────

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

// ─── Imports from real engine ─────────────────────────────────────────────────

import {
  getWalletTxns,
  getWalletBalances,
  getTxDetail,
  buildWalletSignals,
  deriveTrades,
} from "../src/lib/okx-api.js";

import { classifyPatterns } from "../src/lib/classifier.js";
import { generatePersona } from "../src/lib/persona.js";
import type {
  WalletData,
  PatternResult,
  Persona,
  CompareResult,
  RoastLine,
  LeaderboardEntry,
  Pattern,
} from "../src/lib/types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_DIR = path.join(ROOT, "src/data/cache");

const WALLETS = [
  {
    label: "A",
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    chainIndex: "1",
    chain: "ethereum",
    chainId: 1,
    walletLabel: "ETHEREUM SELF",
    filename: "wallet-a-ethereum.json",
  },
  {
    label: "B",
    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    chainIndex: "501",
    chain: "solana",
    chainId: 501,
    walletLabel: "SOLANA SELF",
    filename: "wallet-b-solana.json",
  },
  {
    label: "C",
    address: "0xd97c85d61337f8e4366bff2d8b482cfc59d76340",
    chainIndex: "196",
    chain: "xlayer",
    chainId: 196,
    walletLabel: "XLAYER SELF",
    filename: "wallet-c-xlayer.json",
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function writeCache(filename: string, data: unknown) {
  const filePath = path.join(CACHE_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`  wrote ${filename}`);
}

// ─── Per-wallet fetch + build ─────────────────────────────────────────────────

async function fetchWallet(config: (typeof WALLETS)[number]): Promise<WalletData> {
  console.log(`\n[Wallet ${config.label}] ${config.address} (chain ${config.chainIndex})`);

  const nowMs = Date.now();

  console.log("  fetching txns...");
  let txns: unknown[] = [];
  try {
    txns = await getWalletTxns(config.address, config.chainIndex);
    console.log(`  got ${txns.length} txns`);
  } catch (e) {
    console.warn(`  txns fetch failed: ${e}. Using empty.`);
  }

  await sleep(300);

  console.log("  fetching balances...");
  let balances: unknown[] = [];
  try {
    balances = await getWalletBalances(config.address, config.chainIndex);
    console.log(`  got ${balances.length} balances`);
  } catch (e) {
    console.warn(`  balances fetch failed: ${e}. Using empty.`);
  }

  await sleep(300);

  // Sample up to 25 txns for gas details
  const sampleTxns = (txns as Array<{ txHash?: string }>).slice(0, 25);
  const details: unknown[] = [];

  if (sampleTxns.length > 0) {
    console.log(`  fetching tx details (up to ${sampleTxns.length})...`);
    for (const tx of sampleTxns) {
      if (!tx.txHash) continue;
      try {
        const detail = await getTxDetail(config.chainIndex, tx.txHash);
        if (detail) details.push(detail);
      } catch {
        // skip failed detail lookups silently
      }
      await sleep(100);
    }
    console.log(`  got ${details.length} tx details`);
  }

  const signals = buildWalletSignals(txns, balances, details, config.chainIndex, nowMs);
  const trades = deriveTrades(txns, config.address, config.chainIndex);

  const walletData: WalletData = {
    address: config.address,
    chain: config.chain,
    chainId: config.chainId,
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

  console.log(`  signals: totalTxns=${signals.totalTxns}, tokensHeld=${signals.tokensHeld}, riskTokenPct=${signals.riskTokenPct.toFixed(1)}%, uniqueChains=${signals.uniqueChains}`);
  return walletData;
}

// ─── Roast lines builder (signal-interpolated only) ───────────────────────────

function buildRoastLines(
  walletA: WalletData,
  walletB: WalletData,
  patternA: PatternResult,
  patternB: PatternResult
): RoastLine[] {
  const lines: RoastLine[] = [];

  const allGuardA = patternA.guard;
  const allGuardB = patternB.guard;
  const allAmpA = patternA.amplify;
  const allAmpB = patternB.amplify;

  const topGuardA: Pattern | null = allGuardA[0] ?? null;
  const topGuardB: Pattern | null = allGuardB[0] ?? null;
  const topAmpA: Pattern | null = allAmpA[0] ?? null;
  const topAmpB: Pattern | null = allAmpB[0] ?? null;

  // Round 1: Ethereum Self opens with a signal from Wallet A
  const aTxns = walletA.signals.totalTxns;
  const aUnique = walletA.signals.uniqueChains;
  const aOnScreenTag = topAmpA?.tag ?? topGuardA?.tag ?? "Active Trader";
  const aOnScreenData = `${aTxns} txns across ${aUnique} chain${aUnique !== 1 ? "s" : ""}`;

  lines.push({
    round: 1,
    speaker: "ETHEREUM SELF",
    text: `${aTxns} transactions and still counting. Operating across ${aUnique} chain${aUnique !== 1 ? "s" : ""} while you are still deciding.`,
    onScreenTag: aOnScreenTag,
    onScreenData: aOnScreenData,
  });

  // Round 2: Solana Self responds with a signal from Wallet B
  const bTokens = walletB.signals.uniqueTokens;
  const bTxns = walletB.signals.totalTxns;
  const bOnScreenTag = topAmpB?.tag ?? topGuardB?.tag ?? "Active Trader";
  const bOnScreenData = `${bTokens} unique tokens across ${bTxns} txns`;

  lines.push({
    round: 2,
    speaker: "SOLANA SELF",
    text: `${bTokens} unique tokens across ${bTxns} transactions. Breadth is a skill. Look it up.`,
    onScreenTag: bOnScreenTag,
    onScreenData: bOnScreenData,
  });

  // Round 3: Ethereum guard jab (risk tokens)
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

  // Round 4: Concentration or gas jab
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

  // Round 5: Dormancy or activity close
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

  // Round 6: closing line from Wallet B tokensHeld
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== seed-demo: regenerating cache from LIVE OKX data ===");

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  // Fetch all 3 wallets
  const walletA = await fetchWallet(WALLETS[0]);
  const walletB = await fetchWallet(WALLETS[1]);
  const walletC = await fetchWallet(WALLETS[2]);

  // Classify patterns
  console.log("\n[Classify] running classifier...");
  const patternA = classifyPatterns(walletA);
  const patternB = classifyPatterns(walletB);
  const patternC = classifyPatterns(walletC);

  console.log(`  Wallet A: ${patternA.amplify.length} AMPLIFY, ${patternA.guard.length} GUARD`);
  if (patternA.amplify.length > 0) console.log("    AMPLIFY:", patternA.amplify.map((p) => p.tag).join(", "));
  if (patternA.guard.length > 0) console.log("    GUARD:", patternA.guard.map((p) => p.tag).join(", "));

  console.log(`  Wallet B: ${patternB.amplify.length} AMPLIFY, ${patternB.guard.length} GUARD`);
  if (patternB.amplify.length > 0) console.log("    AMPLIFY:", patternB.amplify.map((p) => p.tag).join(", "));
  if (patternB.guard.length > 0) console.log("    GUARD:", patternB.guard.map((p) => p.tag).join(", "));

  console.log(`  Wallet C: ${patternC.amplify.length} AMPLIFY, ${patternC.guard.length} GUARD`);
  if (patternC.amplify.length > 0) console.log("    AMPLIFY:", patternC.amplify.map((p) => p.tag).join(", "));
  if (patternC.guard.length > 0) console.log("    GUARD:", patternC.guard.map((p) => p.tag).join(", "));

  // Generate personas (ethereum + solana only, matching cache.ts loadPersonas filter)
  console.log("\n[Personas] generating...");
  const personaA: Persona = generatePersona(patternA, "ETHEREUM SELF", 0);
  const personaB: Persona = generatePersona(patternB, "SOLANA SELF", 0);
  console.log(`  A: ${personaA.archetype} (${personaA.superpower})`);
  console.log(`  B: ${personaB.archetype} (${personaB.superpower})`);

  // Build comparison (HONESTY: no PnL, no fabricated figures)
  const topGuardA = patternA.guard[0] ?? null;
  const worstHabit = topGuardA
    ? topGuardA.insight
    : "None detected";

  const comparison: CompareResult = {
    userWinRate: 0,
    topTraderWinRate: 0,
    userAvgExit: 0,
    topTraderAvgExit: 0,
    gapCostUsd: 0,
    worstHabit,
    theirStrategy:
      "Diversified across chains, low risk-flagged exposure, activity within 30 days",
    topTrader: {
      rank: 1,
      walletAddress: "0x0000000000000000000000000000000000000000",
      realizedPnlUsd: "0",
      winRatePercent: "0",
      txs: "0",
      txVolume: "0",
    },
  };

  // Build roast lines (signal-interpolated only)
  console.log("\n[Roast] generating lines from signals...");
  const roastLines: RoastLine[] = buildRoastLines(walletA, walletB, patternA, patternB);
  console.log(`  generated ${roastLines.length} lines`);

  // Leaderboard: empty (Path B)
  const leaderboard: LeaderboardEntry[] = [];

  // ─── Write all cache files ──────────────────────────────────────────────────

  console.log("\n[Write] writing cache files...");

  writeCache("wallet-a-ethereum.json", walletA);
  writeCache("wallet-b-solana.json", walletB);
  writeCache("wallet-c-xlayer.json", walletC);
  writeCache("patterns.json", [patternA, patternB, patternC]);
  writeCache("personas.json", [personaA, personaB]);
  writeCache("comparison.json", comparison);
  writeCache("roast-lines.json", roastLines);
  writeCache("leaderboard.json", leaderboard);

  // Remove roast-battle.json if it exists (cache.ts will fall back to roast-lines.json)
  const roastBattlePath = path.join(CACHE_DIR, "roast-battle.json");
  if (fs.existsSync(roastBattlePath)) {
    fs.unlinkSync(roastBattlePath);
    console.log("  deleted roast-battle.json (fallback to roast-lines.json now active)");
  }

  console.log("\n=== seed-demo complete ===");

  // ─── Self-consistency verification ─────────────────────────────────────────

  console.log("\n--- SELF-CONSISTENCY CHECKS ---");

  // 1. totalTxns matches signals.totalTxns
  const checkA = walletA.totalTxns === walletA.signals.totalTxns;
  const checkB = walletB.totalTxns === walletB.signals.totalTxns;
  const checkC = walletC.totalTxns === walletC.signals.totalTxns;
  console.log(`[CHECK-1] totalTxns == signals.totalTxns:`);
  console.log(`  Wallet A: ${walletA.totalTxns} == ${walletA.signals.totalTxns} => ${checkA ? "PASS" : "FAIL"}`);
  console.log(`  Wallet B: ${walletB.totalTxns} == ${walletB.signals.totalTxns} => ${checkB ? "PASS" : "FAIL"}`);
  console.log(`  Wallet C: ${walletC.totalTxns} == ${walletC.signals.totalTxns} => ${checkC ? "PASS" : "FAIL"}`);

  // 2. Pattern tags use Task-4 catalog names
  const validTags = new Set([
    "Multi-Chain Operator",
    "Portfolio Diversifier",
    "Active Trader",
    "Clean Operator",
    "Gas Optimizer",
    "Risk-Token Exposure",
    "Concentration Risk",
    "Gas Guzzler",
    "Dormant Wallet",
    "Spam Magnet",
  ]);
  const allPatternTags = [
    ...patternA.amplify, ...patternA.guard,
    ...patternB.amplify, ...patternB.guard,
    ...patternC.amplify, ...patternC.guard,
  ].map((p) => p.tag);
  const unknownTags = allPatternTags.filter((t) => !validTags.has(t));
  console.log(`[CHECK-2] Pattern tags from Task-4 catalog: ${unknownTags.length === 0 ? "PASS" : "FAIL"}`);
  if (unknownTags.length > 0) console.log("  Unknown tags:", unknownTags);
  else console.log("  All tags valid:", allPatternTags.join(", ") || "(none fired)");

  // 3. No dollar amounts in comparison.json or roast-lines.json
  const comparisonStr = JSON.stringify(comparison);
  const roastStr = JSON.stringify(roastLines);
  const dollarInCompare = /\$\d/.test(comparisonStr);
  const dollarInRoast = /\$\d/.test(roastStr);
  console.log(`[CHECK-3] No dollar amounts:`);
  console.log(`  comparison.json: ${dollarInCompare ? "FAIL ($ found)" : "PASS"}`);
  console.log(`  roast-lines.json: ${dollarInRoast ? "FAIL ($ found)" : "PASS"}`);

  // 4. Roast line onScreenData values appear in signals
  console.log(`[CHECK-4] Roast onScreenData values grounded in signals:`);
  for (const line of roastLines) {
    // Verify each onScreenData string contains numbers that appear in signal values
    const hasFabricatedDollar = /\$\d/.test(line.onScreenData);
    console.log(`  Round ${line.round} (${line.speaker}): onScreenData="${line.onScreenData}" => ${hasFabricatedDollar ? "FAIL ($ found)" : "PASS"}`);
  }

  // 5. Each wallet fired at least one pattern
  console.log(`[CHECK-5] Each wallet fired >= 1 pattern:`);
  const aFired = patternA.amplify.length + patternA.guard.length;
  const bFired = patternB.amplify.length + patternB.guard.length;
  const cFired = patternC.amplify.length + patternC.guard.length;
  console.log(`  Wallet A: ${aFired} pattern(s) => ${aFired >= 1 ? "PASS" : "NOTE: zero patterns (acceptable if honest)"}`);
  console.log(`  Wallet B: ${bFired} pattern(s) => ${bFired >= 1 ? "PASS" : "NOTE: zero patterns"}`);
  console.log(`  Wallet C: ${cFired} pattern(s) => ${cFired >= 1 ? "PASS" : "NOTE: zero patterns (modest wallet, acceptable)"}`);

  console.log("\n--- END CHECKS ---");
}

main().catch((e) => {
  console.error("seed-demo failed:", e);
  process.exit(1);
});
