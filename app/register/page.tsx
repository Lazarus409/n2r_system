"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import Brand from "@/app/Brand";
import ThemeToggle from "@/app/ThemeToggle";
import { IconAlert, IconCheck, IconChevronLeft, IconChevronRight, IconLock, IconMail, IconPhone } from "@/app/components/Icons";
import { CHAPTERS, GENDERS, INDUSTRIES, PROGRAMMES, REGIONS, yearGroups } from "@/lib/constants";
import { fieldErrors, formatPhone, normalise } from "@/lib/validate";
import type { RegistrationField } from "@/lib/types";

type Values = Omit<Record<RegistrationField, string>, "consent"> & { consent: boolean };

const EMPTY: Values = {
  name: "", gender: "", year: "", prog: "", phone: "", email: "", region: "", city: "",
  employer: "", title: "", industry: "", chapter: "", consent: false,
};

const STEPS: { title: string; sub: string; fields: RegistrationField[] }[] = [
  { title: "About you", sub: "Tell us who you are and when you were at ODASCO.", fields: ["name", "gender", "year", "prog"] },
  { title: "Contact & location", sub: "How the association can reach you, and where you are now.", fields: ["phone", "email", "region", "city"] },
  { title: "Work & chapter", sub: "Your current work and the chapter you'd like to belong to.", fields: ["employer", "title", "industry", "chapter", "consent"] },
];

const LABELS: Record<RegistrationField, string> = {
  name: "Full name", gender: "Gender", year: "Year group", prog: "Programme", phone: "Phone number", email: "Email address",
  region: "Region", city: "City or town", employer: "Employer", title: "Job title", industry: "Industry", chapter: "Chapter", consent: "Consent",
};

const asRaw = (v: Values) => v as unknown as Record<string, unknown>;

export default function RegisterPage() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Set<RegistrationField>>(new Set());
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverFieldErrors, setServerFieldErrors] = useState<Partial<Record<RegistrationField, string>>>({});
  const [done, setDone] = useState<null | { name: string; updated: boolean }>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const hpRef = useRef<HTMLInputElement>(null);

  const errors = useMemo(() => ({ ...fieldErrors(normalise(asRaw(values))), ...serverFieldErrors }), [values, serverFieldErrors]);
  const errorFor = (f: RegistrationField) => (touched.has(f) ? errors[f] : undefined);

  const set = (f: RegistrationField, v: string | boolean) => {
    setValues((s) => ({ ...s, [f]: v }));
    setServerFieldErrors((e) => { const n = { ...e }; delete n[f]; return n; });
  };
  const touch = (f: RegistrationField) => setTouched((t) => new Set(t).add(f));

  function focusFirstError(fields: RegistrationField[]) {
    const first = fields.find((f) => errors[f]);
    if (first) requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
    return !!first;
  }

  function next() {
    const fields = STEPS[step].fields;
    setTouched((t) => new Set([...t, ...fields]));
    if (focusFirstError(fields)) return;
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) return next();
    setTouched(new Set(STEPS.flatMap((s) => s.fields)));
    const badStep = STEPS.findIndex((s) => s.fields.some((f) => errors[f]));
    if (badStep !== -1) { setStep(badStep); focusFirstError(STEPS[badStep].fields); return; }

    setBusy(true);
    setServerError("");
    try {
      const res = await fetch("/api/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, website: hpRef.current?.value || "" }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (out.errors) {
          setServerFieldErrors(out.errors);
          const s = STEPS.findIndex((st) => st.fields.some((f) => out.errors[f]));
          if (s !== -1) setStep(s);
        }
        setServerError(out.message || "Something went wrong. Please try again.");
        return;
      }
      setDone({ name: normalise(asRaw(values)).name, updated: out.status === "updated" });
      window.scrollTo({ top: 0 });
    } catch {
      setServerError("We couldn't reach the server. Check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = (f: RegistrationField, control: React.ReactNode, opts: { optional?: boolean; help?: string; full?: boolean } = {}) => {
    const err = errorFor(f);
    return (
      <div className={`field${opts.full ? " full" : ""}`}>
        <label htmlFor={f}>
          {LABELS[f]} {opts.optional && <span className="opt">(optional)</span>}
        </label>
        {control}
        {err ? (
          <span className="err" id={`${f}-err`} role="alert"><IconAlert size={15} />{err}</span>
        ) : opts.help ? (
          <span className="help" id={`${f}-help`}>{opts.help}</span>
        ) : null}
      </div>
    );
  };
  const common = (f: RegistrationField) => ({
    id: f, name: f, "aria-invalid": !!errorFor(f) || undefined,
    "aria-describedby": errorFor(f) ? `${f}-err` : `${f}-help`, onBlur: () => touch(f),
  });
  const select = (f: RegistrationField, list: (string | number)[], placeholder: string) => (
    <select {...common(f)} value={String(values[f])} onChange={(e) => { set(f, e.target.value); touch(f); }}>
      <option value="" disabled>{placeholder}</option>
      {list.map((x) => <option key={x} value={x}>{x}</option>)}
    </select>
  );
  const text = (f: RegistrationField, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input {...common(f)} value={String(values[f])} onChange={(e) => set(f, e.target.value)} {...props} />
  );

  return (
    <>
      <header className="site-header">
        <div className="wrap narrow">
          <div className="bar">
            <Brand />
            <div className="header-actions"><ThemeToggle /></div>
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap narrow">
          {done ? (
            <section className="card success-hero" aria-live="polite">
              <div className="tick"><IconCheck size={36} /></div>
              <h2 style={{ fontSize: 24 }}>{done.updated ? "Your details have been updated" : `Welcome to the register, ${done.name.split(" ")[0]}!`}</h2>
              <p className="muted" style={{ maxWidth: 460, margin: "8px auto 22px" }}>
                Thank you for registering with the ODASCO Past Students Association. The alumni office will verify your details, and
                your chapter will be in touch about events and activities.
              </p>
              <button className="btn secondary" onClick={() => { setDone(null); setValues(EMPTY); setTouched(new Set()); setStep(0); }}>
                Register another person
              </button>
            </section>
          ) : (
            <form ref={formRef} className="card" onSubmit={submit} noValidate style={{ padding: "24px clamp(18px, 4vw, 32px) 28px" }}>
              <ol className="stepper" aria-label="Registration progress">
                {STEPS.map((s, i) => (
                  <li key={s.title} className={i < step ? "done" : i === step ? "current" : ""} aria-current={i === step ? "step" : undefined}>
                    <span className="track"><i /></span>
                    <span><span className="num">Step {i + 1}</span><br />{s.title}</span>
                  </li>
                ))}
              </ol>

              <h2 className="step-title">{STEPS[step].title}</h2>
              <p className="step-sub">{STEPS[step].sub}</p>

              {serverError && <div className="alert error" role="alert" style={{ marginBottom: 18 }}><IconAlert />{serverError}</div>}

              {step === 0 && (
                <div className="fields">
                  {field("name", text("name", { autoComplete: "name", placeholder: "e.g. Ama Mensah" }), { full: true })}
                  {field("gender", select("gender", GENDERS, "Select…"))}
                  {field("year", select("year", yearGroups(), "Select year…"), { help: "The year you completed school." })}
                  {field("prog", select("prog", PROGRAMMES, "Select programme…"), { full: true })}
                </div>
              )}

              {step === 1 && (
                <div className="fields">
                  {field("phone", (
                    <div className="input-icon"><IconPhone size={16} />
                      {text("phone", {
                        type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "024 412 3456",
                        onBlur: () => { touch("phone"); const n = normalise({ phone: values.phone }).phone; if (/^\d{10}$/.test(n)) set("phone", formatPhone(n)); },
                      })}
                    </div>
                  ))}
                  {field("email", (
                    <div className="input-icon"><IconMail size={16} />{text("email", { type: "email", inputMode: "email", autoComplete: "email", placeholder: "name@example.com" })}</div>
                  ))}
                  {field("region", select("region", REGIONS, "Select region…"))}
                  {field("city", text("city", { autoComplete: "address-level2", placeholder: "e.g. Kumasi" }))}
                </div>
              )}

              {step === 2 && (
                <div className="stack">
                  <div className="fields">
                    {field("employer", text("employer", { autoComplete: "organization", placeholder: "e.g. Ghana Education Service" }), { optional: true })}
                    {field("title", text("title", { autoComplete: "organization-title", placeholder: "e.g. Teacher" }), { optional: true })}
                    {field("industry", select("industry", INDUSTRIES, "Select industry…"))}
                    {field("chapter", select("chapter", CHAPTERS, "Select chapter…"), { help: "Usually the one closest to where you live." })}
                  </div>

                  <div>
                    <p className="section-label">Review your details</p>
                    <dl className="review">
                      {(["name", "year", "prog", "phone", "email", "city", "region"] as RegistrationField[]).map((f) => (
                        <div key={f}><dt>{LABELS[f]}</dt><dd>{String(values[f]) || "—"}</dd></div>
                      ))}
                    </dl>
                    <button type="button" className="btn ghost sm" style={{ marginTop: 6 }} onClick={() => setStep(0)}>Edit these details</button>
                  </div>

                  <div className="field">
                    <label className="check">
                      <input type="checkbox" name="consent" checked={values.consent} aria-invalid={!!errorFor("consent") || undefined}
                        onChange={(e) => { set("consent", e.target.checked); touch("consent"); }} />
                      <span>I agree to the ODASCO Past Students Association storing my details and sharing my name, year group, chapter and work with other registered alumni.</span>
                    </label>
                    {errorFor("consent") && <span className="err" role="alert"><IconAlert size={15} />{errorFor("consent")}</span>}
                    <details className="policy">
                      <summary>How we use your data</summary>
                      <ul>
                        <li>Your phone number and email are only seen by the alumni office.</li>
                        <li>We use your details to verify membership, organise chapters and share association news.</li>
                        <li>You can ask the alumni office to correct or delete your record at any time.</li>
                      </ul>
                    </details>
                  </div>
                </div>
              )}

              <label className="hp" aria-hidden="true">Website<input ref={hpRef} name="website" tabIndex={-1} autoComplete="off" /></label>

              <div className="form-nav">
                {step > 0 ? (
                  <button type="button" className="btn secondary" onClick={() => setStep((s) => s - 1)}><IconChevronLeft size={16} />Back</button>
                ) : <span />}
                {step < STEPS.length - 1 ? (
                  <button type="submit" className="btn lg">Continue<IconChevronRight size={16} /></button>
                ) : (
                  <button type="submit" className="btn lg" disabled={busy}>
                    {busy ? <><span className="spinner" />Submitting…</> : <><IconCheck size={16} />Submit registration</>}
                  </button>
                )}
              </div>
            </form>
          )}
          <p className="site-footer"><IconLock size={13} /> Your details are sent securely to the ODASCO Past Students Association.</p>
        </div>
      </main>
    </>
  );
}
