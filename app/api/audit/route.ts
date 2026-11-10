import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/account";
import { listAudit } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/audit -> recent activity (admin only)
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json(listAudit(300), { headers: { "Cache-Control": "no-store" } });
}
