import { NextResponse } from "next/server";
import { deleteAlumni, setVerified } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/alumni/bulk  { action: "verify" | "unverify" | "delete", ids: string[] }  (admin only)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string").slice(0, 5000) : [];
  if (!ids.length) return NextResponse.json({ message: "No records selected." }, { status: 400 });

  switch (body.action) {
    case "verify":
      return NextResponse.json({ changed: setVerified(ids, true) });
    case "unverify":
      return NextResponse.json({ changed: setVerified(ids, false) });
    case "delete":
      return NextResponse.json({ changed: deleteAlumni(ids) });
    default:
      return NextResponse.json({ message: "Unknown action." }, { status: 400 });
  }
}
