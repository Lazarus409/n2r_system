import { NextResponse } from "next/server";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { devOpenAccess, readSession, safeEqual, SESSION_COOKIE } from "./auth";

export interface AdminAccount {
  name: string;
  email: string;
  phone: string;
  passwordChangedAt: string | null;
  updatedAt: string;
  usingInitialPassword: boolean;
}

type Row = { name: string; email: string; phone: string; password_hash: string; session_version: number; password_changed_at: string | null; updated_at: string };

const row = () => db().prepare("SELECT * FROM admin_account WHERE id = 1").get() as Row | undefined;
const now = () => new Date().toISOString();

function audit(action: string, summary: string) {
  db().prepare("INSERT INTO audit_log (at, actor, action, record_id, summary) VALUES (?,?,?,?,?)").run(now(), "admin", action, null, summary);
}

export function getAccount(): AdminAccount | null {
  const r = row();
  return r ? { name: r.name, email: r.email, phone: r.phone, passwordChangedAt: r.password_changed_at, updatedAt: r.updated_at, usingInitialPassword: !r.password_changed_at } : null;
}

export function sessionVersion(): number {
  return row()?.session_version ?? 1;
}

/**
 * Checks a sign-in password. Before the account exists, the password must match ADMIN_PASSWORD;
 * the account is then created with that password hashed. Afterwards only the stored password works.
 */
export async function checkLogin(password: string): Promise<{ ok: boolean; noPassword?: boolean }> {
  const r = row();
  if (r) return { ok: await verifyPassword(password, r.password_hash) };
  const initial = process.env.ADMIN_PASSWORD;
  if (!initial) return { ok: false, noPassword: true };
  if (!safeEqual(password, initial)) return { ok: false };
  db().prepare("INSERT OR IGNORE INTO admin_account (id, name, password_hash, updated_at) VALUES (1, ?, ?, ?)")
    .run("Alumni office", await hashPassword(initial), now());
  return { ok: true };
}

export function updateProfile(p: { name: string; email: string; phone: string }): AdminAccount {
  const before = getAccount();
  db().prepare("UPDATE admin_account SET name = ?, email = ?, phone = ?, updated_at = ? WHERE id = 1").run(p.name, p.email, p.phone, now());
  const changed = before ? (["name", "email", "phone"] as const).filter((k) => before[k] !== p[k]) : [];
  if (changed.length) audit("account.updated", `Updated admin ${changed.join(", ")}`);
  return getAccount()!;
}

/** Verifies the current password, stores the new one and bumps the session version (signs out every other session). */
export async function changePassword(current: string, next: string): Promise<{ ok: true; version: number } | { ok: false; message: string }> {
  const r = row();
  if (!r) return { ok: false, message: "Admin account not found." };
  if (!(await verifyPassword(current, r.password_hash))) return { ok: false, message: "Your current password isn't right." };
  if (await verifyPassword(next, r.password_hash)) return { ok: false, message: "Choose a password you haven't used here before." };
  const version = r.session_version + 1;
  db().prepare("UPDATE admin_account SET password_hash = ?, session_version = ?, password_changed_at = ?, updated_at = ? WHERE id = 1")
    .run(await hashPassword(next), version, now(), now());
  audit("account.password", "Changed the admin password (other sessions signed out)");
  return { ok: true, version };
}

/**
 * Server-side guard for admin API routes. Checks the cookie's signature, expiry and session version.
 * Returns a 401 response to send back, or null if the request may proceed.
 */
export async function requireAdmin(req: Request): Promise<NextResponse | null> {
  if (devOpenAccess()) return null;
  const cookie = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(SESSION_COOKIE + "="))?.slice(SESSION_COOKIE.length + 1);
  const ver = await readSession(cookie);
  if (ver !== null && ver === sessionVersion()) return null;
  return NextResponse.json({ message: "Your session has ended. Please sign in again." }, { status: 401 });
}
