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
