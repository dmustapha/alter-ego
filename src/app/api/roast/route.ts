import { NextResponse } from "next/server";
import { loadRoastBattle } from "@/lib/cache";

export async function GET() {
  try {
    const battle = await loadRoastBattle();
    return NextResponse.json({ battle });
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error(`[API] GET /api/roast:`, detail);
    const message = process.env.NODE_ENV === "production" ? "Internal server error" : detail;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
