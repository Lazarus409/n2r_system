import { CHAPTERS, GENDERS, INDUSTRIES, PROGRAMMES, REGIONS, yearGroups } from "./constants";
import type { RegistrationField, RegistrationInput } from "./types";

const str = (v: unknown, max = 120) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

export type FieldErrors = Partial<Record<RegistrationField, string>>;

/** Turns raw form/JSON input into a clean record. Never throws. */
export function normalise(raw: Record<string, unknown>): RegistrationInput {
  return {
    name: str(raw.name, 100),
    gender: str(raw.gender),
    year: Number(raw.year),
    prog: str(raw.prog),
    phone: str(raw.phone, 20).replace(/[\s()-]/g, "").replace(/^\+233/, "0"),
    email: str(raw.email, 120).toLowerCase(),
    region: str(raw.region),
    city: str(raw.city, 80),
    employer: str(raw.employer, 120),
    title: str(raw.title, 120),
    industry: str(raw.industry),
    chapter: str(raw.chapter),
    consent: raw.consent === true || raw.consent === "on" || raw.consent === "true",
  };
}

/** Field-by-field checks. Shared by the registration form, the admin editor and the API. */
export function fieldErrors(v: RegistrationInput, opts: { requireConsent?: boolean } = {}): FieldErrors {
  const e: FieldErrors = {};
  if (v.name.length < 3 || !/\s/.test(v.name)) e.name = "Enter your first and last name.";
  else if (!/^[\p{L}\p{M}' .-]+$/u.test(v.name)) e.name = "Use letters only.";
  if (!GENDERS.includes(v.gender)) e.gender = "Choose an option.";
  if (!yearGroups().includes(v.year)) e.year = "Choose your year group.";
  if (!PROGRAMMES.includes(v.prog)) e.prog = "Choose your programme.";
  if (!/^0[235]\d{8}$/.test(v.phone)) e.phone = "Enter a 10-digit Ghana number, e.g. 024 412 3456.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) e.email = "Enter a valid email address.";
  if (!REGIONS.includes(v.region)) e.region = "Choose your region.";
  if (v.city.length < 2) e.city = "Enter your city or town.";
  if (!INDUSTRIES.includes(v.industry)) e.industry = "Choose an industry.";
  if (!CHAPTERS.includes(v.chapter)) e.chapter = "Choose a chapter.";
  if (opts.requireConsent !== false && !v.consent) e.consent = "Please give consent so we can add you to the register.";
  return e;
}

export function validateRegistration(raw: Record<string, unknown>, opts?: { requireConsent?: boolean }):
  { ok: true; value: RegistrationInput } | { ok: false; errors: FieldErrors } {
  const value = normalise(raw);
  const errors = fieldErrors(value, opts);
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

/** "0244123456" -> "024 412 3456" */
export function formatPhone(p: string) {
  return /^\d{10}$/.test(p) ? `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}` : p;
}
