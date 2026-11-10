/** Password strength rules, shared by the browser (live feedback) and the server (enforcement). */

/** Returns a reason the password is too weak, or null if it's acceptable. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 200) return "Use 200 characters or fewer.";
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (kinds < 3 && pw.length < 16) return "Mix upper and lower case letters, numbers and symbols, or use a longer passphrase (16+ characters).";
  if (/^(.)\1+$/.test(pw) || /password|odasco|alumni|change-?me|123456|qwerty/i.test(pw)) return "That password is too easy to guess.";
  return null;
}

/** 0 (empty) to 4 (strong), for the strength meter. */
export function passwordScore(pw: string): number {
  if (!pw) return 0;
  if (passwordProblem(pw)) return 1;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  return pw.length >= 16 || (pw.length >= 12 && kinds === 4) ? 4 : pw.length >= 12 ? 3 : 2;
}
