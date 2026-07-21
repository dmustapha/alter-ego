import { NextResponse } from "next/server";
import type { AnalyzeRequest, AnalyzeResponse, WalletData } from "@/lib/types";
import { getAllBalances, getPortfolioOverview, getApprovals, scanTokens } from "@/lib/onchainos";
import { classifyPatterns } from "@/lib/classifier";
import { generatePersona } from "@/lib/persona";
import { loadComparison, loadLeaderboard } from "@/lib/cache";

export async function POST(req: Request) {
  try {
    const body: AnalyzeRequest = await req.json();

    // Input validation
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
      if (!addr.address || typeof addr.address !== "string" || addr.address.length < 6 || addr.address.length > 100) {
        return NextResponse.json({ error: `Invalid address: ${addr.address?.slice(0, 10)}...` }, { status: 400 });
      }
      if (/[<>"'&`\\]/.test(addr.address)) {
        return NextResponse.json({ error: "Invalid address: contains disallowed characters" }, { status: 400 });
      }
    }

    // In demo mode, use pre-cached data
    if (process.env.DEMO_MODE === "true") {
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
      // Validate chains before use
      if (!addr.chains || !Array.isArray(addr.chains) || addr.chains.length === 0) {
        return NextResponse.json({ error: `Missing or invalid chains for address: ${addr.address?.slice(0, 10)}...` }, { status: 400 });
      }
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
          signals: { totalTxns: 0, daysSinceLastTx: 0, activeSpanDays: 0, uniqueTokens: 0, uniqueChains: 0, swapCount: 0, tokensHeld: 0, riskTokenCount: 0, riskTokenPct: 0, topHoldingPct: 0, avgGasGwei: 0, networkMedianGasGwei: 0 },
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
          signals: { totalTxns: 0, daysSinceLastTx: 0, activeSpanDays: 0, uniqueTokens: 0, uniqueChains: 0, swapCount: 0, tokensHeld: 0, riskTokenCount: 0, riskTokenPct: 0, topHoldingPct: 0, avgGasGwei: 0, networkMedianGasGwei: 0 },
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
    console.error(`[API] POST /api/analyze:`, error.message);
    const message = process.env.NODE_ENV === "production" ? "Internal server error" : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
