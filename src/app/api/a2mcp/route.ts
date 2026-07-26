import { NextRequest, NextResponse } from "next/server";
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
import { withX402, x402ResourceServer } from "@okxweb3/x402-next";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const NETWORK: `${string}:${string}` = "eip155:196";
const CHAIN_INDEX: Record<string, string> = { ethereum: "1", solana: "501", xlayer: "196" };
const MAX_CHAINS = 5;

// ─── Official OKX Payment SDK seller integration ──────────────────────────────
// @okxweb3/x402-next `withX402` is the official seller wrapper: it issues the standard
// 402 challenge on unpaid requests and settles the payment via the OKX facilitator only
// after a successful (<400) response. Built lazily so there is no network at import.
let serverSingleton: ReturnType<x402ResourceServer["register"]> | null = null;
function resourceServer() {
  if (!serverSingleton) {
    const facilitator = new OKXFacilitatorClient({
      apiKey: process.env.OKX_API_KEY || "",
      secretKey: process.env.OKX_SECRET_KEY || "",
      passphrase: process.env.OKX_PASSPHRASE || "",
      syncSettle: true,
    });
    serverSingleton = new x402ResourceServer(facilitator).register(NETWORK, new ExactEvmScheme());
  }
  return serverSingleton;
}

function routeConfig() {
  return {
    accepts: {
      scheme: "exact",
      network: NETWORK,
      price: process.env.X402_PRICE || "$1",
      payTo: process.env.X402_PAYTO_ADDRESS || "",
      maxTimeoutSeconds: 300,
    },
    description: "Alter Ego wallet analysis",
    mimeType: "application/json",
  };
}

// ─── Paid service handler (runs only AFTER withX402 verifies payment) ─────────
async function serviceHandler(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => ({}));
  const inbound = classifyInbound(body);

  // Demo mode, and any bodyless/unrecognised paid request, serve the pre-cached persona.
  if (process.env.DEMO_MODE === "true" || inbound.kind === "empty") {
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

  // Live analyze path.
  const addresses: AnalyzeRequest["addresses"] = inbound.kind === "analyze" ? inbound.addresses : [];
  if (addresses.length === 0) {
    return NextResponse.json({ error: "At least one address required" }, { status: 400 });
  }
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
    const chains = addr.chains || [];
    if (chains.length === 0) {
      return NextResponse.json({ error: `Missing chains for address: ${addr.address?.slice(0, 10)}...` }, { status: 400 });
    }
    if (chains.length > MAX_CHAINS) {
      return NextResponse.json({ error: `Maximum ${MAX_CHAINS} chains per wallet` }, { status: 400 });
    }
    for (const chainName of chains) {
      if (!CHAIN_INDEX[chainName]) {
        return NextResponse.json({ error: `Unknown chain "${chainName}". Supported: ethereum, solana, xlayer` }, { status: 400 });
      }
    }
  }

  const walletResults: WalletData[] = await Promise.all(
    addresses.map(async (addr) => {
      const allTxns: unknown[] = [];
      const allBalances: unknown[] = [];
      for (const chainName of addr.chains || []) {
        const chainIndex = CHAIN_INDEX[chainName]!;
        const [txns, balances] = await Promise.all([
          getWalletTxns(addr.address, chainIndex),
          getWalletBalances(addr.address, chainIndex),
        ]);
        allTxns.push(...txns.map((tx) => ({ ...(tx as object), _chainIndex: chainIndex })));
        allBalances.push(...balances);
      }
      const sampleTxns = allTxns.slice(0, 25) as Array<{ txHash?: string; _chainIndex?: string }>;
      const details = await Promise.all(
        sampleTxns.filter((tx) => tx.txHash).map((tx) => {
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

  if (walletResults.length === 0 && cacheExists()) {
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

  const allPatterns = walletResults.map((w) => classifyPatterns(w));
  const personas = allPatterns.map((p, i) =>
    generatePersona(p, walletResults[i].chain === "solana" ? "SOLANA SELF" : "ETHEREUM SELF", walletResults[i].realizedPnl)
  );
  let comparison = null;
  try {
    comparison = loadComparison();
  } catch {
    // proceed without comparison
  }
  return NextResponse.json({
    wallets: walletResults.length,
    chains: [...new Set(addresses.flatMap((a) => a.chains || []))],
    totalTxns: walletResults.reduce((s, w) => s + w.totalTxns, 0),
    patterns: allPatterns,
    personas,
    comparison,
  } satisfies AnalyzeResponse);
}

// ─── Route handlers ───────────────────────────────────────────────────────────
/**
 * POST: paid A2MCP service via the official withX402 wrapper. A2A task-lifecycle
 * envelopes (system events / agent-chat) are acknowledged unpaid before the gate,
 * since they are not paid service invocations. Everything else must pay (402 unpaid).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  }
  // Peek (via a clone so the original body stays readable) for unpaid A2A envelopes.
  const peek = await req.clone().json().catch(() => ({}));
  const inbound = classifyInbound(peek);
  if (inbound.kind === "a2a-system" || inbound.kind === "a2a-chat") {
    return NextResponse.json(a2aAck(inbound));
  }
  return withX402(serviceHandler, routeConfig(), resourceServer())(req as NextRequest);
}

/**
 * GET: also x402-gated (OKX validates that a bodyless GET returns a 402). The agent
 * card is embedded in the 402 body (unpaidResponseBody) so discovery still works.
 */
export function GET(req: Request): Promise<NextResponse> {
  const cardHandler = async () => NextResponse.json(buildAgentCard());
  return withX402(cardHandler, routeConfig(), resourceServer())(req as NextRequest);
}
