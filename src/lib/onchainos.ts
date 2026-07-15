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
