import {
  CHAPTERS, EMPLOYMENT_STATUSES, GENDERS, HONORIFICS, INDUSTRIES, INTERNATIONAL_CHAPTER, OTHER_HONORIFIC, OTHER_INDUSTRY,
  OTHER_REGION, PROGRAMMES, REGIONS,
  chapterCountry, chapterGroup, internationalChapter, yearGroups,
} from "./constants";
import type { RegistrationField, RegistrationInput } from "./types";

const str = (v: unknown, max = 120) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);
/** Ghana numbers are stored in local form: "0244123456". */
const GHANA_PHONE = /^0[235]\d{8}$/;
/** Any other country: "+" then the country code and number, 7–15 digits in all (the international standard). */
const INTL_PHONE = /^\+[1-9]\d{6,14}$/;
/**
 * Strips spaces, dots, dashes and brackets, turns a leading "00" into "+",
 * and stores Ghana numbers typed with +233 in local form ("+233 24 412 3456" -> "0244123456").
 */
function cleanPhone(p: string) {
  const s = p.replace(/[\s().-]/g, "").replace(/^00/, "+");
  return /^\+2330?\d{9}$/.test(s) ? "0" + s.slice(-9) : s;
}

/** Allowed characters for things people type in themselves (an industry or a country). */
const TYPED = /^[\p{L}\p{M}\p{N}&' .,/()-]+$/u;
/** Tidies "International ( canada )" into "International (canada)". Other chapters are unchanged. */
const cleanChapter = (c: string) =>
  chapterGroup(c) === INTERNATIONAL_CHAPTER && c !== INTERNATIONAL_CHAPTER ? internationalChapter(chapterCountry(c)) : c;

export type FieldErrors = Partial<Record<RegistrationField, string>>;

/** Turns raw form/JSON input into a clean record. Never throws. */
export function normalise(raw: Record<string, unknown>): RegistrationInput {
  return {
    honorific: str(raw.honorific, 30),
    name: str(raw.name, 100),
    gender: str(raw.gender),
    year: Number(raw.year),
    prog: str(raw.prog),
    phone: cleanPhone(str(raw.phone, 24)),
    email: str(raw.email, 120).toLowerCase(),
    region: str(raw.region, 60),
    city: str(raw.city, 80),
    employment: str(raw.employment),
    employer: str(raw.employer, 120),
    title: str(raw.title, 120),
    industry: str(raw.industry, 60),
    chapter: cleanChapter(str(raw.chapter, 80)),
    consent: raw.consent === true || raw.consent === "on" || raw.consent === "true",
  };
}

/** Field-by-field checks. Shared by the registration form, the admin editor and the API. */
export function fieldErrors(v: RegistrationInput, opts: { requireConsent?: boolean } = {}): FieldErrors {
  const e: FieldErrors = {};
  // Admin edits (requireConsent: false) may leave title and employment blank: records from before
  // those fields existed don't have them. New registrations must fill both in.
  const isAdminEdit = opts.requireConsent === false;
  if (v.honorific || !isAdminEdit) {
    if (!HONORIFICS.includes(v.honorific)) {
      // Not a listed title, so it must be one typed in after choosing "Other".
      if (v.honorific.length < 2 || v.honorific.toLowerCase() === OTHER_HONORIFIC.toLowerCase())
        e.honorific = "Choose your title, or choose Other and type yours.";
      else if (!TYPED.test(v.honorific)) e.honorific = "Use letters only.";
    }
  }
  if ((v.employment || !isAdminEdit) && !EMPLOYMENT_STATUSES.includes(v.employment))
    e.employment = "Choose your employment status.";
  if (v.name.length < 3 || !/\s/.test(v.name)) e.name = "Enter your first and last name.";
  else if (!/^[\p{L}\p{M}' .-]+$/u.test(v.name)) e.name = "Use letters only.";
  if (!GENDERS.includes(v.gender)) e.gender = "Choose an option.";
  if (!yearGroups().includes(v.year)) e.year = "Choose your year group.";
  if (!PROGRAMMES.includes(v.prog)) e.prog = "Choose your programme.";
  if (!GHANA_PHONE.test(v.phone) && !INTL_PHONE.test(v.phone))
    e.phone = v.phone.startsWith("+")
      ? "Enter the full number with its country code, e.g. +44 7700 900123."
      : "Enter a Ghana number (e.g. 024 412 3456), or + and the country code for other countries.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) e.email = "Enter a valid email address.";
  if (!REGIONS.includes(v.region)) {
    // Not a listed region, so it must be one typed in after choosing "Other".
    if (v.region.length < 2 || v.region.toLowerCase() === OTHER_REGION.toLowerCase())
      e.region = "Choose your region, or choose Other and type yours.";
    else if (!TYPED.test(v.region)) e.region = "Use letters and numbers only.";
  }
  if (v.city.length < 2) e.city = "Enter your city or town.";
  if (!INDUSTRIES.includes(v.industry)) {
    // Not a listed industry, so it must be one typed in after choosing "Other".
    if (v.industry.length < 2 || v.industry.toLowerCase() === OTHER_INDUSTRY.toLowerCase())
      e.industry = "Choose an industry, or choose Other and type yours.";
    else if (!TYPED.test(v.industry)) e.industry = "Use letters and numbers only.";
  }
  if (chapterGroup(v.chapter) === INTERNATIONAL_CHAPTER) {
    const country = chapterCountry(v.chapter);
    if (country.length < 2) e.chapter = "Type the country you live in.";
    else if (!TYPED.test(country)) e.chapter = "Use letters only for the country.";
  } else if (!CHAPTERS.includes(v.chapter)) e.chapter = "Choose a chapter.";
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
  // International numbers are shown as stored ("+14165550123"): grouping differs by country.
  return /^\d{10}$/.test(p) ? `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}` : p;
}
