import { NextResponse } from "next/server";
import { changePassword, requireAdmin } from "@/lib/account";
import { cookieOptions, createSession, SESSION_COOKIE } from "@/lib/auth";
import { passwordProblem } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/account/password { current, next } -> change the admin password; signs out every other session
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const limit = rateLimit("pwchange:" + clientIp(req), 5, 15 * 60_000);
  if (!limit.ok) return NextResponse.json({ message: "Too many attempts. Try again in a few minutes." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const current = String(body.current ?? "");
  const next = String(body.next ?? "");
  const problem = passwordProblem(next);
  if (problem) return NextResponse.json({ message: problem, errors: { next: problem } }, { status: 400 });

  const res = await changePassword(current, next);
  if (!res.ok) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ message: res.message, errors: { current: res.message } }, { status: 400 });
  }
  // Keep this browser signed in with a session for the new version.
  const session = await createSession(res.version);
  const out = NextResponse.json({ ok: true });
  out.cookies.set(SESSION_COOKIE, session.value, { ...cookieOptions, maxAge: session.maxAge });
  return out;
}
