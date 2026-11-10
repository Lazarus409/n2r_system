import { NextResponse } from "next/server";
import { adminPassword, checkPassword, createSession, SESSION_COOKIE } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { recordLogin } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
  path: "/",
};

// POST /api/auth  { password }  -> sign in
export async function POST(req: Request) {
  if (!adminPassword()) {
    return NextResponse.json({ message: "ADMIN_PASSWORD is not set on the server. Add it to .env.local and restart." }, { status: 503 });
  }
  const ip = clientIp(req);
  const limit = rateLimit("login:" + ip, 10, 15 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { message: `Too many sign-in attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }
  const body = await req.json().catch(() => ({}));
  if (!checkPassword(String(body.password ?? ""))) {
    recordLogin(false, ip);
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return NextResponse.json({ message: "That password isn't right." }, { status: 401 });
  }
  recordLogin(true, ip);
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
