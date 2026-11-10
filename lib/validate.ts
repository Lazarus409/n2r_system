import { CHAPTERS, GENDERS, INDUSTRIES, PROGRAMMES, REGIONS, yearGroups } from "./constants";
import type { RegistrationInput } from "./types";

const str = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);

/** Normalises raw form/JSON input and returns either a clean record or a list of human-readable errors. Used by both the form and the API. */
export function validateRegistration(raw: Record<string, unknown>): { ok: true; value: RegistrationInput } | { ok: false; errors: string[] } {
  const v: RegistrationInput = {
    name: str(raw.name),
    gender: str(raw.gender),
    year: Number(raw.year),
    prog: str(raw.prog),
    phone: str(raw.phone).replace(/[\s-]/g, ""),
    email: str(raw.email).toLowerCase(),
    region: str(raw.region),
    city: str(raw.city),
    employer: str(raw.employer),
    title: str(raw.title),
    industry: str(raw.industry),
    chapter: str(raw.chapter),
    consent: raw.consent === true || raw.consent === "on" || raw.consent === "true",
  };
  const errors: string[] = [];
  if (!v.name) errors.push("Enter your full name.");
  if (!/^0\d{9}$/.test(v.phone)) errors.push("Phone must be 10 digits starting with 0, for example 0244123456.");
  if (!/^\S+@\S+\.\S+$/.test(v.email)) errors.push("Enter a valid email address.");
  if (!v.city) errors.push("Enter your city or town.");
  if (!v.consent) errors.push("Tick the consent box to register.");
  if (!GENDERS.includes(v.gender)) errors.push("Choose a gender.");
  if (!yearGroups().includes(v.year)) errors.push("Choose a year group.");
  if (!PROGRAMMES.includes(v.prog)) errors.push("Choose a programme.");
  if (!REGIONS.includes(v.region)) errors.push("Choose a region.");
  if (!INDUSTRIES.includes(v.industry)) errors.push("Choose an industry.");
  if (!CHAPTERS.includes(v.chapter)) errors.push("Choose a chapter.");
  return errors.length ? { ok: false, errors } : { ok: true, value: v };
}
