import { NextResponse } from "next/server";
import { loadRoastBattle } from "@/lib/cache";

export async function GET() {
  try {
    const battle = await loadRoastBattle();
    return NextResponse.json({ battle });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
