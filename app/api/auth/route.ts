import { NextResponse } from "next/server";
import { cookieOptions, createSession, SESSION_COOKIE, sessionSecret } from "@/lib/auth";
import { checkLogin, sessionVersion } from "@/lib/account";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { recordLogin } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/auth  { password }  -> sign in
export async function POST(req: Request) {
  if (!sessionSecret()) {
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
  let result: Awaited<ReturnType<typeof checkLogin>>;
  try {
    result = await checkLogin(String(body.password ?? ""));
  } catch (err) {
    console.error("[auth] Sign-in failed: could not use the database", err);
    return NextResponse.json(
      { message: "The server can't open its database. Check DATABASE_PATH and the disk in your hosting settings." },
      { status: 500 }
    );
  }
  if (result.noPassword) {
    return NextResponse.json({ message: "ADMIN_PASSWORD is not set on the server. Add it to .env.local and restart." }, { status: 503 });
  }
  if (!result.ok) {
    recordLogin(false, ip);
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return NextResponse.json({ message: "That password isn't right." }, { status: 401 });
  }
  recordLogin(true, ip);
  const session = await createSession(sessionVersion());
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
