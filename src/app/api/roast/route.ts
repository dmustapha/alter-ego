import { NextResponse } from "next/server";
import { loadRoastBattle } from "@/lib/cache";

export async function GET() {
  try {
    const battle = await loadRoastBattle();
    return NextResponse.json({ battle });
  } catch (error: any) {
    console.error(`[API] GET /api/roast:`, error.message);
    const message = process.env.NODE_ENV === "production" ? "Internal server error" : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
