import { NextResponse } from "next/server";
import { addAlumnus, deleteAlumni, listAlumni } from "@/lib/store";
import { validateRegistration } from "@/lib/validate";

export const dynamic = "force-dynamic";

// GET  /api/alumni  -> full list (admin only; protected by middleware.ts)
export async function GET() {
  return NextResponse.json(await listAlumni(), { headers: { "Cache-Control": "no-store" } });
}

// POST /api/alumni  -> public registration from the /register page
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ errors: ["Invalid request."] }, { status: 400 });
  }
  // Honeypot: real people never see or fill the "website" field, bots often do.
  if (body.website) return NextResponse.json({ status: "created" }, { status: 201 });

  const v = validateRegistration(body);
  if (!v.ok) return NextResponse.json({ errors: v.errors }, { status: 400 });

  const res = await addAlumnus(v.value);
  if (res.status === "duplicate") {
    return NextResponse.json(
      { errors: ["You are already on the register for this year group. Contact the alumni office to change your details."] },
      { status: 409 }
    );
  }
  return NextResponse.json({ status: res.status }, { status: res.status === "created" ? 201 : 200 });
}

// DELETE /api/alumni?sample=1 -> remove all sample records (admin only)
export async function DELETE(req: Request) {
  if (new URL(req.url).searchParams.get("sample") !== "1") {
    return NextResponse.json({ error: "Specify ?sample=1" }, { status: 400 });
  }
  const ids = (await listAlumni()).filter((a) => a.sample).map((a) => a.id);
  return NextResponse.json({ removed: await deleteAlumni(ids) });
}
