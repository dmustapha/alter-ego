import { NextResponse } from "next/server";
import type { AnalyzeRequest, AnalyzeResponse, WalletData } from "@/lib/types";
import {
  getWalletTxns,
  getWalletBalances,
  getTxDetail,
  buildWalletSignals,
  deriveTrades,
} from "@/lib/okx-api";
import { classifyPatterns } from "@/lib/classifier";
import { generatePersona } from "@/lib/persona";
import { loadComparison } from "@/lib/cache";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Chain name to OKX numeric chainIndex
const CHAIN_INDEX: Record<string, string> = {
  ethereum: "1",
  solana: "501",
  xlayer: "196",
};

const MAX_CHAINS = 5;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(ip);
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": String(rl.retryAfter) },
      });
    }

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

    // Demo mode: use pre-cached data
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

    // Validate chain names before starting async work
    for (const addr of body.addresses) {
      if (!addr.chains || !Array.isArray(addr.chains) || addr.chains.length === 0) {
        return NextResponse.json({ error: `Missing or invalid chains for address: ${addr.address?.slice(0, 10)}...` }, { status: 400 });
      }
      if (addr.chains.length > MAX_CHAINS) {
        return NextResponse.json({ error: `Maximum ${MAX_CHAINS} chains per wallet` }, { status: 400 });
      }
      for (const chainName of addr.chains) {
        if (!CHAIN_INDEX[chainName]) {
          return NextResponse.json(
            { error: `Unknown chain "${chainName}". Supported: ethereum, solana, xlayer` },
            { status: 400 }
          );
        }
      }
    }

    // Live mode: build one WalletData per address, aggregated across all its chains
    const walletResults: WalletData[] = await Promise.all(
      body.addresses.map(async (addr) => {
        const allTxns: unknown[] = [];
        const allBalances: unknown[] = [];

        // Fetch per chain -- EVM and Solana must never be mixed in one call
        for (const chainName of addr.chains) {
          const chainIndex = CHAIN_INDEX[chainName]!;
          const [txns, balances] = await Promise.all([
            getWalletTxns(addr.address, chainIndex),
            getWalletBalances(addr.address, chainIndex),
          ]);
          allTxns.push(...txns.map((tx) => ({ ...(tx as object), _chainIndex: chainIndex })));
          allBalances.push(...balances);
        }

        // Sample up to 25 txns for detail/gas data
        const sampleTxns = allTxns.slice(0, 25) as Array<{ txHash?: string; _chainIndex?: string }>;
        const details = await Promise.all(
          sampleTxns
            .filter((tx) => tx.txHash)
            .map((tx) => {
              const chainIndex = tx._chainIndex ?? CHAIN_INDEX[addr.chains[0]]!;
              return getTxDetail(chainIndex, tx.txHash!);
            })
        );

        const primaryChainIndex = CHAIN_INDEX[addr.chains[0]]!;
        const signals = buildWalletSignals(allTxns, allBalances, details, primaryChainIndex, Date.now());
        const trades = deriveTrades(allTxns, addr.address, primaryChainIndex);

        return {
          address: addr.address,
          chain: addr.chains[0],
          chainId: Number(primaryChainIndex),
          totalTxns: signals.totalTxns,
          avgGasGwei: signals.avgGasGwei,
          networkMedianGasGwei: signals.networkMedianGasGwei,
          trades,
          signals,
          approvals: [],
          tokenScans: [],
          realizedPnl: 0,
          winRate: 0,
        } satisfies WalletData;
      })
    );

    const allPatterns = walletResults.map((w) => classifyPatterns(w));
    const personas = allPatterns.map((p, i) =>
      generatePersona(
        p,
        walletResults[i].chain === "solana" ? "SOLANA SELF" : "ETHEREUM SELF",
        walletResults[i].realizedPnl
      )
    );

    let comparison = null;
    try {
      comparison = loadComparison();
    } catch {
      // Comparison unavailable -- proceed without
    }

    return NextResponse.json({
      wallets: walletResults.length,
      chains: [...new Set(body.addresses.flatMap((a) => a.chains))],
      totalTxns: walletResults.reduce((s, w) => s + w.totalTxns, 0),
      patterns: allPatterns,
      personas,
      comparison,
    } satisfies AnalyzeResponse);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[API] POST /api/analyze:`, msg);
    const message = process.env.NODE_ENV === "production" ? "Internal server error" : msg;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
