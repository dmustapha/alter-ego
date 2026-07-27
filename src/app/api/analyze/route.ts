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

    const body: AnalyzeRequest & { deep?: boolean } = await req.json();

    // ── Streaming path (opt-in) ──────────────────────
    // Frontend requests ?stream=1 (or Accept: application/x-ndjson) to receive
    // honest, real-time progress over one open connection, then the final
    // result -- the serverless-correct way to stream progress without a shared
    // cross-instance job store. The JSON path below is unchanged for tests.
    const url = new URL(req.url);
    const wantsStream =
      url.searchParams.get("stream") === "1" ||
      (req.headers.get("accept") || "").includes("application/x-ndjson");

    if (wantsStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (obj: unknown) =>
            controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
          try {
            const result = await analyzeWallets(body.addresses, {
              deep: !!body.deep,
              onProgress: (p) => send({ type: "progress", ...p }),
            });
            send({ type: "done", result });
          } catch (e) {
            if (e instanceof ValidationError) {
              send({ type: "error", error: e.message });
            } else {
              const msg = e instanceof Error ? e.message : String(e);
              console.error(`[API] stream analyze failed:`, msg);
              if (cacheExists()) {
                const cached = await loadAllDemoData();
                send({
                  type: "done",
                  result: {
                    wallets: 3,
                    chains: ["ethereum", "solana", "xlayer"],
                    totalTxns:
                      cached.walletA.totalTxns + cached.walletB.totalTxns + cached.walletC.totalTxns,
                    patterns: cached.patterns,
                    personas: cached.personas,
                    comparison: cached.comparison,
                  },
                });
              } else {
                send({
                  type: "error",
                  error: process.env.NODE_ENV === "production" ? "Internal server error" : msg,
                });
              }
            }
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          "content-type": "application/x-ndjson; charset=utf-8",
          "cache-control": "no-store",
          "x-accel-buffering": "no",
        },
      });
    }

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
