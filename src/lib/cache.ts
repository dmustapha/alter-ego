import fs from "fs";
import path from "path";
import type { CachedDemoData, WalletData, PatternResult, Persona, CompareResult, RoastBattle, LeaderboardEntry } from "./types";
import { buildRoastFacts, generateRoast } from "./roast";

const CACHE_DIR = path.join(process.cwd(), "src/data/cache");

// In-memory cache for roast battles: keyed by a fingerprint of wallet addresses + signals.
// Prevents re-billing the LLM for repeated /api/roast GETs within the same process session.
const roastCache = new Map<string, RoastBattle>();

function roastCacheKey(
  ethAddress: string,
  solAddress: string,
  ethSignals: WalletData["signals"],
  solSignals: WalletData["signals"],
): string {
  const sigFingerprint = [
    ethSignals.totalTxns,
    ethSignals.swapCount,
    ethSignals.uniqueTokens,
    solSignals.totalTxns,
    solSignals.swapCount,
    solSignals.uniqueTokens,
  ].join(",");
  return `${ethAddress}:${solAddress}:${sigFingerprint}`;
}

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
    const cached = JSON.parse(fs.readFileSync(personaPath, "utf-8")) as Persona[];
    // Self-healing guard: if cache is empty or predates the grade field, fall through to regenerate.
    // personas.json written before the grade field was added will crash PersonaCard (grade.letter).
    if (cached.length > 0 && cached[0].grade !== undefined) return cached;
    // else fall through to regenerate with grade
  }
  // Dynamic generation - use ESM dynamic import (no require() in ESM context)
  const { generatePersona, ZERO_GRADE } = await import("./persona");
  const { computeBehavioralGrade } = await import("./grade");
  // Load wallet signals from cached wallet data when available for a real grade.
  const wallets: Record<string, import("./types").WalletData | null> = {};
  try { wallets["ethereum"] = loadWalletA(); } catch { wallets["ethereum"] = null; }
  try { wallets["solana"] = loadWalletB(); } catch { wallets["solana"] = null; }
  const NULL_PNL = { realizedPnl: null as null, winRate: null as null };
  return patterns
    .filter(p => p.chain !== "xlayer")
    .map((p) => {
      const walletData = wallets[p.chain] ?? null;
      const grade = walletData ? computeBehavioralGrade(walletData.signals) : ZERO_GRADE;
      return generatePersona(p, p.chain === "solana" ? "SOLANA SELF" : "ETHEREUM SELF", grade, NULL_PNL);
    });
}

export function loadComparison(): CompareResult {
  return loadJson<CompareResult>("comparison.json");
}

export async function loadRoastBattle(): Promise<RoastBattle> {
  try {
    // Load wallet data for signals (ethereum = walletA, solana = walletB)
    const walletEth = loadWalletA();
    const walletSol = loadWalletB();

    // Check in-memory cache before doing any LLM work
    const cacheKey = roastCacheKey(
      walletEth.address,
      walletSol.address,
      walletEth.signals,
      walletSol.signals,
    );
    const cached = roastCache.get(cacheKey);
    if (cached) return cached;

    // Load patterns (array: find by chain, fallback by index)
    const allPatterns = loadPatterns();
    const patternsEth = allPatterns.find(p => p.chain === "ethereum") ?? allPatterns[0];
    const patternsSol = allPatterns.find(p => p.chain === "solana") ?? allPatterns[1];

    // Load personas (filtered to non-xlayer: index 0 = ethereum, index 1 = solana)
    const personas = await loadPersonas();
    const personaEth = personas[0];
    const personaSol = personas[1];

    // Build grounded facts and generate roast (LLM or deterministic fallback)
    const facts = buildRoastFacts(
      personaEth,
      personaSol,
      patternsEth,
      patternsSol,
      walletEth.signals,
      walletSol.signals,
    );
    const lines = await generateRoast(facts);

    const battle: RoastBattle = { walletA: personaEth, walletB: personaSol, lines };

    // Store in in-memory cache for session reuse
    roastCache.set(cacheKey, battle);
    return battle;
  } catch {
    // Last-resort fallback: read from roast-lines.json if personas/patterns fail to load
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
    // Final fallback: pre-generated roast-battle.json
    return loadJson<RoastBattle>("roast-battle.json");
  }
}

/** Exported for testing: allows tests to reset the in-memory roast cache. */
export function clearRoastCache(): void {
  roastCache.clear();
}

export function loadLeaderboard(): LeaderboardEntry[] {
  const raw = loadJson<any>("leaderboard.json");

  // Handle seed-script format: { solana: "{...json...}", ethereum: "{...json...}" }
  if (raw && typeof raw === "object" && !Array.isArray(raw) && (raw.solana || raw.ethereum)) {
    const entries: LeaderboardEntry[] = [];
    for (const chain of ["solana", "ethereum"] as const) {
      if (raw[chain]) {
        try {
          const parsed = typeof raw[chain] === "string" ? JSON.parse(raw[chain]) : raw[chain];
          if (parsed?.ok && Array.isArray(parsed.data)) {
            entries.push(...parsed.data);
          }
        } catch { /* skip malformed chain data */ }
      }
    }
    return entries;
  }

  // Handle plain array format
  if (Array.isArray(raw)) return raw as LeaderboardEntry[];

  return [];
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
