import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/account";
import { deleteAlumni, getAlumnus, setVerified, updateAlumnus } from "@/lib/store";
import { validateRegistration } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/alumni/:id  (admin only)
export async function GET(req: Request, { params }: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const a = getAlumnus((await params).id);
  return a ? NextResponse.json(a) : NextResponse.json({ message: "Not found" }, { status: 404 });
}

// PATCH /api/alumni/:id  { verified?: boolean, fields?: {...registration fields}, notes?: string }  (admin only)
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (typeof body.verified === "boolean") setVerified([id], body.verified);

  let fields = null;
  if (body.fields && typeof body.fields === "object") {
    const v = validateRegistration(body.fields, { requireConsent: false });
    if (!v.ok) return NextResponse.json({ message: "Please correct the highlighted fields.", errors: v.errors }, { status: 400 });
    fields = v.value;
  }
  const notes = typeof body.notes === "string" ? body.notes : undefined;
  const res = fields || notes !== undefined ? updateAlumnus(id, fields, notes) : getAlumnus(id);
  if (res === "conflict") return NextResponse.json({ message: "Another record already has this name and year group." }, { status: 409 });
  return res ? NextResponse.json(res) : NextResponse.json({ message: "Not found" }, { status: 404 });
}

// DELETE /api/alumni/:id  (admin only)
export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const n = deleteAlumni([(await params).id]);
  return n ? NextResponse.json({ removed: n }) : NextResponse.json({ message: "Not found" }, { status: 404 });
}
