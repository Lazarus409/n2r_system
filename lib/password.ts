import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Returns "scrypt$<salt>$<hash>" (base64). */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pw.normalize("NFKC"), salt, 64, PARAMS);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, s, h] = stored.split("$");
  if (alg !== "scrypt" || !s || !h) return false;
  const expected = Buffer.from(h, "base64");
  const actual = await scrypt(pw.normalize("NFKC"), Buffer.from(s, "base64"), expected.length, PARAMS);
  return timingSafeEqual(actual, expected);
}

export { passwordProblem } from "./passwordRules";
