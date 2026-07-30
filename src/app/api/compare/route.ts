import { NextResponse } from "next/server";
import { loadComparison, loadLeaderboard } from "@/lib/cache";

export async function GET() {
  try {
    const comparison = loadComparison();
    const leaderboard = loadLeaderboard();
    return NextResponse.json({ comparison, top3: leaderboard.slice(0, 3) });
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error(`[API] GET /api/compare:`, detail);
    const message = process.env.NODE_ENV === "production" ? "Internal server error" : detail;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
