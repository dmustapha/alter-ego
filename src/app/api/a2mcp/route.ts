import { NextRequest, NextResponse } from "next/server";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/types";
import { analyzeWallets, ValidationError } from "@/lib/analyze";
import { loadAllDemoData, cacheExists } from "@/lib/cache";
import { rateLimit } from "@/lib/ratelimit";
import { buildAgentCard } from "@/lib/a2mcp/agent-card";
import { classifyInbound, a2aAck } from "@/lib/a2mcp/envelope";
import { withX402, x402ResourceServer } from "@okxweb3/x402-next";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { reasonReply } from "@/lib/agent-reason";

export const runtime = "nodejs";
export const maxDuration = 60;

const NETWORK: `${string}:${string}` = "eip155:196";

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
  const question = typeof body.question === "string" && body.question ? body.question : undefined;

  // Helper: attach optional per-request reasoning to a result without mutating it.
  async function withReasoning(result: AnalyzeResponse): Promise<Record<string, unknown>> {
    const base: Record<string, unknown> = { ...result };
    if (question) {
      base.reasoning = await reasonReply(result, { ask: question }).catch(() => undefined);
    }
    return base;
  }

  // Demo mode, and any bodyless/unrecognised paid request, serve the pre-cached persona.
  if (process.env.DEMO_MODE === "true" || inbound.kind === "empty") {
    const cached = await loadAllDemoData();
    const result: AnalyzeResponse = {
      wallets: 3,
      chains: ["ethereum", "solana", "xlayer"],
      totalTxns: cached.walletA.totalTxns + cached.walletB.totalTxns + cached.walletC.totalTxns,
      patterns: cached.patterns,
      personas: cached.personas,
      comparison: cached.comparison,
    };
    return NextResponse.json(await withReasoning(result));
  }

  // Live analyze path.
  const addresses: AnalyzeRequest["addresses"] = inbound.kind === "analyze" ? inbound.addresses : [];

  try {
    const result = await analyzeWallets(addresses);
    return NextResponse.json(await withReasoning(result));
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    // Hard failure: fall back to demo cache if present
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[API] a2mcp serviceHandler live fetch failed:`, msg);
    if (cacheExists()) {
      const cached = await loadAllDemoData();
      const result: AnalyzeResponse = {
        wallets: 3,
        chains: ["ethereum", "solana", "xlayer"],
        totalTxns: cached.walletA.totalTxns + cached.walletB.totalTxns + cached.walletC.totalTxns,
        patterns: cached.patterns,
        personas: cached.personas,
        comparison: cached.comparison,
      };
      return NextResponse.json(await withReasoning(result));
    }
    const message = process.env.NODE_ENV === "production" ? "Internal server error" : msg;
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
