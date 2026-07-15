import { NextResponse } from "next/server";
import { loadComparison, loadLeaderboard } from "@/lib/cache";

export async function GET() {
  try {
    const comparison = loadComparison();
    const leaderboard = loadLeaderboard();
    return NextResponse.json({ comparison, top3: leaderboard.slice(0, 3) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
