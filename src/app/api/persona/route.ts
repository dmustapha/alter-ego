import { NextResponse } from "next/server";
import { loadPersonas } from "@/lib/cache";

export async function GET() {
  try {
    const personas = await loadPersonas();
    return NextResponse.json({ personas });
  } catch (error: any) {
    console.error(`[API] GET /api/persona:`, error.message);
    const message = process.env.NODE_ENV === "production" ? "Internal server error" : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
