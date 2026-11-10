import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/health -> for uptime monitors and container health checks
export async function GET() {
  try {
    return NextResponse.json({ ok: healthCheck(), time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
