import { NextResponse } from "next/server";
import type { AnalyzeRequest } from "@/lib/types";
import { analyzeWallets, ValidationError } from "@/lib/analyze";
import { cacheExists, loadAllDemoData } from "@/lib/cache";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    try {
      const result = await analyzeWallets(body.addresses);
      return NextResponse.json(result);
    } catch (e) {
      if (e instanceof ValidationError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      // Hard failure: fall back to demo cache if present
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[API] POST /api/analyze live fetch failed:`, msg);
      if (cacheExists()) {
        const cached = await loadAllDemoData();
        return NextResponse.json({
          wallets: 3,
          chains: ["ethereum", "solana", "xlayer"],
          totalTxns: cached.walletA.totalTxns + cached.walletB.totalTxns + cached.walletC.totalTxns,
          patterns: cached.patterns,
          personas: cached.personas,
          comparison: cached.comparison,
        });
      }
      const message = process.env.NODE_ENV === "production" ? "Internal server error" : msg;
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[API] POST /api/analyze:`, msg);
    const message = process.env.NODE_ENV === "production" ? "Internal server error" : msg;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
