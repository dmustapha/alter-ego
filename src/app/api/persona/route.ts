import { NextResponse } from "next/server";
import { loadPersonas } from "@/lib/cache";

export async function GET() {
  try {
    const personas = await loadPersonas();
    return NextResponse.json({ personas });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
