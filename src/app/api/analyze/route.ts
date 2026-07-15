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
      const cached = await loadAllDemoData();

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
