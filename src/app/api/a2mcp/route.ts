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
import { loadComparison, loadAllDemoData, cacheExists } from "@/lib/cache";
import { rateLimit } from "@/lib/ratelimit";
import { buildAgentCard } from "@/lib/a2mcp/agent-card";
import { classifyInbound, a2aAck } from "@/lib/a2mcp/envelope";
import { enforceX402 } from "@/lib/x402/okx-x402";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * A2MCP endpoint -- OKX.AI marketplace integration.
 *
 * POST: Analyze wallet addresses using the live OKX Web3 API.
 *       Falls back to demo cache if DEMO_MODE=true or no addresses provided.
 * GET: Health check with agent metadata.
 */

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

    const body = await req.json().catch(() => ({}));

    // Envelope shape wins over analyze detection (okx-ai "Inbound envelope activation").
    const inbound = classifyInbound(body);

    // A2A envelopes are acknowledged (no payment). Task lifecycle belongs to the OKX AI runtime.
    if (inbound.kind === "a2a-system" || inbound.kind === "a2a-chat") {
      return NextResponse.json(a2aAck(inbound));
    }

    // Payment gate FIRST. POST /api/a2mcp is the paid service surface, so EVERY non-A2A request
    // (bodyless, unrecognised, or a real analyze body) must carry a settled X-PAYMENT. Any unpaid
    // request receives the standard x402 402 challenge here. This is exactly what OKX's x402
    // validation requires: "unpaid requests must return a standard 402 challenge." The free
    // discovery surface is GET /api/a2mcp (the agent card), never POST.
    const gate = await enforceX402(req, new URL(req.url).toString());
    if (!gate.paid) return gate.challenge;
    const paymentResponse = gate.paymentResponse;

    // PAID from here (facilitator verified + settled the payment above). Demo mode, and any
    // bodyless/unrecognised paid request, serve the pre-cached persona showcase.
    if (process.env.DEMO_MODE === "true" || inbound.kind === "empty") {
      const cached = await loadAllDemoData();
      return NextResponse.json(
        {
          wallets: 3,
          chains: ["ethereum", "solana", "xlayer"],
          totalTxns: cached.walletA.totalTxns + cached.walletB.totalTxns + cached.walletC.totalTxns,
          patterns: cached.patterns,
          personas: cached.personas,
          comparison: cached.comparison,
        } satisfies AnalyzeResponse,
        paymentResponse ? { headers: { "PAYMENT-RESPONSE": paymentResponse } } : undefined
      );
    }

    // analyze path (live mode, paid)
    const addresses: AnalyzeRequest["addresses"] = inbound.addresses;

    // Input validation (mirrors analyze route)
    if (addresses.length > 5) {
      return NextResponse.json({ error: "Maximum 5 wallets per analysis" }, { status: 400 });
    }
    for (const addr of addresses) {
      if (!addr.address || typeof addr.address !== "string" || addr.address.length < 6 || addr.address.length > 100) {
        return NextResponse.json({ error: `Invalid address: ${addr.address?.slice(0, 10)}...` }, { status: 400 });
      }
      if (/[<>"'&`\\]/.test(addr.address)) {
        return NextResponse.json({ error: "Invalid address: contains disallowed characters" }, { status: 400 });
      }
    }

    // Validate chain names
    for (const addr of addresses) {
      const chains = addr.chains || [];
      if (chains.length === 0) {
        return NextResponse.json({ error: `Missing chains for address: ${addr.address?.slice(0, 10)}...` }, { status: 400 });
      }
      if (chains.length > MAX_CHAINS) {
        return NextResponse.json({ error: `Maximum ${MAX_CHAINS} chains per wallet` }, { status: 400 });
      }
      for (const chainName of chains) {
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
      addresses.map(async (addr) => {
        const allTxns: unknown[] = [];
        const allBalances: unknown[] = [];

        // Fetch per chain -- EVM and Solana must never be mixed in one call
        for (const chainName of addr.chains || []) {
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
              const chainIndex = tx._chainIndex ?? CHAIN_INDEX[(addr.chains || ["ethereum"])[0]]!;
              return getTxDetail(chainIndex, tx.txHash!);
            })
        );

        const primaryChainIndex = CHAIN_INDEX[(addr.chains || ["ethereum"])[0]]!;
        const signals = buildWalletSignals(allTxns, allBalances, details, primaryChainIndex, Date.now());
        const trades = deriveTrades(allTxns, addr.address, primaryChainIndex);

        return {
          address: addr.address,
          chain: (addr.chains || ["ethereum"])[0],
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

    // If live mode returned nothing, fall back to demo cache
    if (walletResults.length === 0 && cacheExists()) {
      const cached = await loadAllDemoData();
      return NextResponse.json(
        {
          wallets: 3,
          chains: ["ethereum", "solana", "xlayer"],
          totalTxns: cached.walletA.totalTxns + cached.walletB.totalTxns + cached.walletC.totalTxns,
          patterns: cached.patterns,
          personas: cached.personas,
          comparison: cached.comparison,
        } satisfies AnalyzeResponse,
        paymentResponse ? { headers: { "PAYMENT-RESPONSE": paymentResponse } } : undefined
      );
    }

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

    return NextResponse.json(
      {
        wallets: walletResults.length,
        chains: [...new Set(addresses.flatMap((a) => a.chains || []))],
        totalTxns: walletResults.reduce((s, w) => s + w.totalTxns, 0),
        patterns: allPatterns,
        personas,
        comparison,
      } satisfies AnalyzeResponse,
      paymentResponse ? { headers: { "PAYMENT-RESPONSE": paymentResponse } } : undefined
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[A2MCP] Error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(buildAgentCard());
}
