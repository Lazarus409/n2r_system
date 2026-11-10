/**
 * Admin session tokens. Edge-safe (Web Crypto only) so middleware.ts can verify them.
 *
 * Cookie value: `<expiry>.<version>.<signature>`, HMAC-SHA256 signed with the session secret.
 * `version` matches admin_account.session_version in the database; changing the password bumps it,
 * and server routes (lib/account.ts → requireAdmin) reject tokens with an old version.
 */
export const SESSION_COOKIE = "nar_admin";
export const SESSION_HOURS = 12;

const enc = new TextEncoder();

/** Key used to sign sessions. SESSION_SECRET if set, otherwise ADMIN_PASSWORD (the initial password from the environment). */
export function sessionSecret(): string | undefined {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || undefined;
}

/** True when no secret is configured in development: admin pages are left open for local work. */
export function devOpenAccess(): boolean {
  return !sessionSecret() && process.env.NODE_ENV !== "production";
}

async function sign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compares two strings in time that doesn't depend on where they differ. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession(version: number): Promise<{ value: string; maxAge: number }> {
  const secret = sessionSecret();
  if (!secret) throw new Error("Set SESSION_SECRET or ADMIN_PASSWORD");
  const maxAge = SESSION_HOURS * 3600;
  const payload = `${Date.now() + maxAge * 1000}.${version}`;
  return { value: `${payload}.${await sign(payload, secret)}`, maxAge };
}

/** Checks signature and expiry. Returns the session version, or null if invalid. */
export async function readSession(value: string | undefined): Promise<number | null> {
  const secret = sessionSecret();
  if (!secret || !value) return null;
  const [exp, ver, sig] = value.split(".");
  if (!exp || !ver || !sig || Number(exp) < Date.now()) return null;
  return safeEqual(sig, await sign(`${exp}.${ver}`, secret)) ? Number(ver) : null;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
  path: "/",
};
