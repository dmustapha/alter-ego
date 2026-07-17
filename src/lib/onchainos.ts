import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import type { TokenAsset, PortfolioOverview, LeaderboardEntry, ApprovalEntry, TokenScanResult } from "./types";

// Use bundled binary on Linux (Vercel), system binary on macOS (dev)
// Pre-authenticated session is bundled at bin/.onchainos/ during build
function resolveCli(): string {
  if (process.platform === "linux") {
    const tmpBin = "/tmp/onchainos";
    if (fs.existsSync(tmpBin)) return tmpBin;

    const candidates = [
      path.join(process.cwd(), "bin", "onchainos"),
      path.join(process.cwd(), "public", "bin", "onchainos"),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        try { fs.copyFileSync(c, tmpBin); fs.chmodSync(tmpBin, 0o755); } catch {}
        // Restore bundled session if available
        const bundledSession = path.join(path.dirname(c), ".onchainos");
        const tmpSession = "/tmp/.onchainos";
        if (fs.existsSync(bundledSession) && !fs.existsSync(tmpSession)) {
          try { fs.cpSync(bundledSession, tmpSession, { recursive: true }); } catch {}
        }
        return tmpBin;
      }
    }

    // Last resort: download
    try {
      const VERSION = "v4.2.4";
      const url = `https://github.com/okx/onchainos-skills/releases/download/${VERSION}/onchainos-x86_64-unknown-linux-gnu`;
      spawnSync("curl", ["-sL", url, "-o", tmpBin], { timeout: 30000 });
      fs.chmodSync(tmpBin, 0o755);
      return tmpBin;
    } catch {}
    return "onchainos";
  }
  return "onchainos";
}

const CLI = resolveCli();

// Runtime env for onchainos: use bundled session if available, else /tmp
function onchainosEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (process.platform === "linux") {
    const bundledSession = "/tmp/.onchainos";
    if (fs.existsSync(bundledSession)) {
      env.ONCHAINOS_HOME = bundledSession;
    }
  }
  return env;
}

// Lazy-init login (only if no bundled session)
let loginChecked = false;
function ensureLogin(): void {
  if (loginChecked) return;
  loginChecked = true;
  if (process.platform !== "linux") return;
  if (!process.env.OKX_API_KEY) return;

  const env = onchainosEnv();

  try {
    const status = spawnSync(CLI, ["wallet", "status"], { encoding: "utf-8", timeout: 10000, env });
    const parsed = JSON.parse(status.stdout || "{}");
    if (parsed?.data?.loggedIn) return;
  } catch {}

  // Only attempt runtime login if no bundled session
  if (!fs.existsSync("/tmp/.onchainos/keyring.enc")) {
    console.log("[onchainos] Attempting runtime API key login...");
    try {
      spawnSync(CLI, ["wallet", "login", "--force"], { encoding: "utf-8", timeout: 15000, env });
    } catch (e: any) {
      console.error("[onchainos] Runtime login failed:", e.message);
    }
  }
}

function run(args: string[]): string {
  ensureLogin();
  try {
    const result = spawnSync(CLI, args, {
      encoding: "utf-8", maxBuffer: 10 * 1024 * 1024, timeout: 30000,
      env: onchainosEnv(),
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || `Exit code ${result.status}`);
    return result.stdout;
  } catch (e: any) {
    console.error(`OnchainOS command failed: ${CLI} ${args[0]}`);
    throw new Error(`OnchainOS error: ${e.message}`);
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
  const output = run(["portfolio", "all-balances", "--address", address, "--chains", chainsStr, "--filter", String(filter)]);
  return parseTokenAssets(output);
}

export function getTotalValue(address: string, chains: string[]): string {
  const chainsStr = chains.join(",");
  const output = run(["portfolio", "total-value", "--address", address, "--chains", chainsStr]);
  const match = output.match(/\$[\d,.]+/);
  return match ? match[0] : "0";
}

// ─── Market ──────────────────────────────────────────
// ⚠️ portfolio-overview --address is for external wallets
// ⚠️ --time-frame default is 4 (1M)

export function getPortfolioOverview(address: string, chain: string, timeFrame: 1|2|3|4|5 = 4): PortfolioOverview {
  const output = run(["market", "portfolio-overview", "--address", address, "--chain", chain, "--time-frame", String(timeFrame)]);
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
  const args = ["leaderboard", "list", "--chain", chain, "--time-frame", String(timeFrame), "--sort-by", String(sortBy)];
  if (walletType) args.push("--wallet-type", walletType);
  const output = run(args);
  return parseLeaderboard(output);
}

// ─── Security ────────────────────────────────────────
// ⚠️ Works without wallet login

export function getApprovals(address: string, chains?: string[], limit?: number): ApprovalEntry[] {
  const args = ["security", "approvals", "--address", address];
  if (chains?.length) { args.push("--chain", chains.join(",")); }
  if (limit) { args.push("--limit", String(limit)); }
  const output = run(args);
  return parseApprovals(output);
}

export function scanTokens(tokens: string[]): TokenScanResult[] {
  const tokensStr = tokens.join(",");
  const output = run(["security", "token-scan", "--tokens", tokensStr]);
  return parseTokenScans(output);
}

// ─── Wallet ──────────────────────────────────────────

export function checkWalletStatus(): boolean {
  const output = run(["wallet", "status"]);
  return output.includes('"loggedIn":true') || output.includes("logged in");
}

export function loginWallet(email: string): string {
  return run(["wallet", "login", email, "--locale", "en_US"]);
}

export function verifyOtp(code: string): string {
  return run(["wallet", "verify", code]);
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
