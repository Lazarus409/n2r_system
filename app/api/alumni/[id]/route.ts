import { NextResponse } from "next/server";
import { deleteAlumni, setVerified } from "@/lib/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/alumni/:id  { verified: boolean }  (admin only)
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const rec = await setVerified(id, body.verified !== false);
  return rec ? NextResponse.json(rec) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

// DELETE /api/alumni/:id  (admin only)
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const n = await deleteAlumni([id]);
  return n ? NextResponse.json({ removed: n }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
