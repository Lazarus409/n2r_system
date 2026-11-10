import { NextResponse } from "next/server";
import { adminPassword, checkPassword, createSession, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

// POST /api/auth  { password }  -> sign in
export async function POST(req: Request) {
  if (!adminPassword()) {
    return NextResponse.json({ error: "ADMIN_PASSWORD is not set on the server. Add it to .env.local and restart." }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  if (!checkPassword(String(body.password ?? ""))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down password guessing
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  const session = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session.value, { ...cookieOptions, maxAge: session.maxAge });
  return res;
}

// DELETE /api/auth  -> sign out
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
