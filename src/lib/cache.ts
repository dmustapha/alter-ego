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
  const { generatePersona } = await import("./persona");
  return patterns.map((p) => generatePersona(p, p.walletAddress, 0));
}

export function loadComparison(): CompareResult {
  return loadJson<CompareResult>("comparison.json");
}

export async function loadRoastBattle(): Promise<RoastBattle> {
  // Fallback: generate from roast-lines cache + personas
  const linesPath = path.join(CACHE_DIR, "roast-lines.json");
  if (fs.existsSync(linesPath)) {
    const lines = JSON.parse(fs.readFileSync(linesPath, "utf-8"));
    const personas = await loadPersonas();
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

export async function loadAllDemoData(): Promise<CachedDemoData> {
  return {
    walletA: loadWalletA(),
    walletB: loadWalletB(),
    walletC: loadWalletC(),
    patterns: loadPatterns(),
    personas: await loadPersonas(),
    comparison: loadComparison(),
    roastBattle: await loadRoastBattle(),
    leaderboard: loadLeaderboard(),
  };
}

export function cacheExists(): boolean {
  return fs.existsSync(path.join(CACHE_DIR, "wallet-a-ethereum.json"));
}
