import { NextResponse } from "next/server";
import { addAlumnus, deleteSamples, listAlumni } from "@/lib/store";
import { validateRegistration } from "@/lib/validate";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/alumni -> full list (admin only; protected by middleware.ts)
export async function GET() {
  return NextResponse.json(listAlumni(), { headers: { "Cache-Control": "no-store" } });
}

// POST /api/alumni -> public registration from the /register page
export async function POST(req: Request) {
  const limit = rateLimit("register:" + clientIp(req), 8, 15 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { message: "Too many submissions from this connection. Please try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }
  // Honeypot: real people never see or fill the "website" field; bots often do.
  if (body.website) return NextResponse.json({ status: "created" }, { status: 201 });

  const v = validateRegistration(body);
  if (!v.ok) return NextResponse.json({ message: "Please correct the highlighted fields.", errors: v.errors }, { status: 400 });

  try {
    const res = addAlumnus(v.value);
    if (res.status === "duplicate") {
      return NextResponse.json(
        { message: "You're already on the register for this year group. Contact the alumni office if your details have changed." },
        { status: 409 }
      );
    }
    return NextResponse.json({ status: res.status }, { status: res.status === "created" ? 201 : 200 });
  } catch (e) {
    console.error("[register]", e);
    return NextResponse.json({ message: "We couldn't save your registration. Please try again shortly." }, { status: 500 });
  }
}

// DELETE /api/alumni?sample=1 -> remove all sample records (admin only)
export async function DELETE(req: Request) {
  if (new URL(req.url).searchParams.get("sample") !== "1") {
    return NextResponse.json({ message: "Specify ?sample=1" }, { status: 400 });
  }
  return NextResponse.json({ removed: deleteSamples() });
}
