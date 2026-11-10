import { NextResponse } from "next/server";
import { listAudit } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/audit -> recent activity (admin only)
export async function GET() {
  return NextResponse.json(listAudit(300), { headers: { "Cache-Control": "no-store" } });
}
