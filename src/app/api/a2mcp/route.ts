import { NextResponse } from "next/server";
import type { AnalyzeRequest, AnalyzeResponse, WalletData } from "@/lib/types";
import { getAllBalances, getPortfolioOverview, getApprovals, scanTokens } from "@/lib/onchainos";
import { classifyPatterns } from "@/lib/classifier";
import { generatePersona } from "@/lib/persona";
import { loadComparison, loadAllDemoData, cacheExists } from "@/lib/cache";

/**
 * A2MCP endpoint — OKX.AI marketplace integration.
 *
 * POST: Analyze wallet addresses. In live mode, calls OnchainOS CLI for real data.
 *       Falls back to demo cache if DEMO_MODE=true or cache files exist and CLI fails.
 * GET: Health check with agent metadata.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Extract addresses from flexible formats
    const addresses: AnalyzeRequest["addresses"] = [];
    if (body.addresses && Array.isArray(body.addresses)) {
      addresses.push(...body.addresses);
    } else if (body.address && typeof body.address === "string") {
      addresses.push({ address: body.address, chains: body.chains || ["ethereum"] });
    }

    // If no addresses provided, return demo data as a showcase
    if (addresses.length === 0) {
      if (process.env.DEMO_MODE === "true" || cacheExists()) {
        const cached = await loadAllDemoData();
        return NextResponse.json({
          wallets: 3,
          chains: ["ethereum", "solana", "xlayer"],
          totalTxns: cached.walletA.totalTxns + cached.walletB.totalTxns + cached.walletC.totalTxns,
          patterns: cached.patterns,
          personas: cached.personas,
          comparison: cached.comparison,
        } satisfies AnalyzeResponse);
      }
      return NextResponse.json(
        { error: "No wallet addresses provided. Send { addresses: [{ address, chains }] }" },
        { status: 400 }
      );
    }

    // Input validation
    if (addresses.length > 5) {
      return NextResponse.json({ error: "Maximum 5 wallets per analysis" }, { status: 400 });
    }

    // Live mode: call OnchainOS CLI for real blockchain data
    const walletResults: WalletData[] = [];
    const debugErrors: string[] = [];
    for (const addr of addresses) {
      const evmChains = (addr.chains || []).filter((c) => c !== "solana");
      const hasSolana = (addr.chains || []).includes("solana");

      if (evmChains.length > 0) {
        try {
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
        } catch (err: any) {
          console.error(`[A2MCP] EVM fetch failed for ${addr.address}:`, err.message);
          debugErrors.push(`EVM(${addr.address.slice(0,10)}): ${err.message}`);
        }
      }

      if (hasSolana) {
        try {
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
        } catch (err: any) {
          console.error(`[A2MCP] Solana fetch failed for ${addr.address}:`, err.message);
          debugErrors.push(`SOL(${addr.address.slice(0,10)}): ${err.message}`);
        }
      }
    }

    // If live mode failed (no wallets fetched), fall back to demo
    if (walletResults.length === 0) {
      if (cacheExists()) {
        const cached = await loadAllDemoData();
        return NextResponse.json({
          wallets: 3,
          chains: ["ethereum", "solana", "xlayer"],
          totalTxns: cached.walletA.totalTxns + cached.walletB.totalTxns + cached.walletC.totalTxns,
          patterns: cached.patterns,
          personas: cached.personas,
          comparison: cached.comparison,
          _debug: { mode: "demo_fallback", errors: debugErrors },
        } satisfies AnalyzeResponse & { _debug: any });
      }
      return NextResponse.json(
        { error: "Could not fetch wallet data. OnchainOS CLI may not be configured." },
        { status: 503 }
      );
    }

    const allPatterns = walletResults.map((w) => classifyPatterns(w));
    const personas = allPatterns.map((p, i) =>
      generatePersona(p, walletResults[i].chain === "solana" ? "SOLANA SELF" : "ETHEREUM SELF", walletResults[i].realizedPnl)
    );

    let comparison = null;
    try {
      comparison = loadComparison();
    } catch { /* comparison unavailable */ }

    return NextResponse.json({
      wallets: walletResults.length,
      chains: [...new Set((addresses || []).flatMap((a: any) => a.chains || []))],
      totalTxns: walletResults.reduce((s, w) => s + w.totalTxns, 0),
      patterns: allPatterns,
      personas,
      comparison,
    } satisfies AnalyzeResponse);
  } catch (error: any) {
    console.error("[A2MCP] Error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    agent: "Alter Ego",
    version: "1.0.0",
    status: "online",
    service: "Trading Persona Analysis",
    description:
      "Multi-chain, multi-wallet behavioral fingerprinting. AMPLIFY your strengths, GUARD against costly patterns.",
    endpoints: {
      analyze: "/api/a2mcp",
      persona: "/api/persona",
      compare: "/api/compare",
      roast: "/api/roast",
    },
  });
}
