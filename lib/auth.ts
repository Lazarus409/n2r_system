/**
 * Admin session handling. Works in both the Edge runtime (middleware) and Node (API routes) because it only uses Web Crypto.
 *
 * The session cookie is `<expiry>.<signature>`, signed with HMAC-SHA256 using ADMIN_PASSWORD as the key.
 * Changing ADMIN_PASSWORD therefore logs everyone out.
 */
export const SESSION_COOKIE = "nar_admin";
export const SESSION_HOURS = 12;

const enc = new TextEncoder();

async function sign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compares two strings in time that doesn't depend on where they differ. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function adminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD || undefined;
}

export function checkPassword(supplied: string): boolean {
  const pw = adminPassword();
  return !!pw && safeEqual(supplied, pw);
}

export async function createSession(): Promise<{ value: string; maxAge: number }> {
  const pw = adminPassword();
  if (!pw) throw new Error("ADMIN_PASSWORD is not set");
  const maxAge = SESSION_HOURS * 3600;
  const exp = String(Date.now() + maxAge * 1000);
  return { value: `${exp}.${await sign(exp, pw)}`, maxAge };
}

export async function verifySession(value: string | undefined): Promise<boolean> {
  const pw = adminPassword();
  if (!pw || !value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await sign(exp, pw));
}
