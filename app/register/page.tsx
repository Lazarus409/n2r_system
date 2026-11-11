"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import Brand from "@/app/Brand";
import ThemeToggle from "@/app/ThemeToggle";
import {
  IconAlert,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconLock,
  IconMail,
  IconPhone,
} from "@/app/components/Icons";
import {
  CHAPTERS,
  GENDERS,
  INDUSTRIES,
  INTERNATIONAL_CHAPTER,
  OTHER_INDUSTRY,
  OTHER_REGION,
  PROGRAMMES,
  REGIONS,
  chapterGroup,
  internationalChapter,
  yearGroups,
} from "@/lib/constants";
import { fieldErrors, formatPhone, normalise } from "@/lib/validate";
import type { RegistrationField } from "@/lib/types";

type Values = Omit<Record<RegistrationField, string>, "consent"> & {
  consent: boolean;
};

const EMPTY: Values = {
  name: "",
  gender: "",
  year: "",
  prog: "",
  phone: "",
  email: "",
  region: "",
  city: "",
  employer: "",
  title: "",
  industry: "",
  chapter: "",
  consent: false,
};

const STEPS: { title: string; sub: string; fields: RegistrationField[] }[] = [
  {
    title: "About You",
    sub: "Tell us who you are and when you were at ODASCO.",
    fields: ["name", "gender", "year", "prog"],
  },
  {
    title: "Contact & Location",
    sub: "How the association can reach you, and where you are now.",
    fields: ["phone", "email", "region", "city"],
  },
  {
    title: "Work & Chapter",
    sub: "Your current work and the chapter you'd like to belong to.",
    fields: ["employer", "title", "industry", "chapter", "consent"],
  },
];

const LABELS: Record<RegistrationField, string> = {
  name: "Full Name",
  gender: "Gender",
  year: "Year Group",
  prog: "Programme",
  phone: "Phone Number",
  email: "Email Address",
  region: "Region",
  city: "City/Town",
  employer: "Employer",
  title: "Job Title",
  industry: "Industry",
  chapter: "Chapter",
  consent: "Consent",
};

const asRaw = (v: Values) => v as unknown as Record<string, unknown>;

export default function RegisterPage() {
  const [values, setValues] = useState<Values>(EMPTY);
  // "Other" industry chosen: the text box holds the industry itself.
  const [otherIndustry, setOtherIndustry] = useState(false);
  // "Other" region chosen: the text box holds the region itself.
  const [otherRegion, setOtherRegion] = useState(false);
  // Country typed for the International chapter, kept as typed so spaces work while typing.
  const [country, setCountry] = useState("");
  const international = chapterGroup(values.chapter) === INTERNATIONAL_CHAPTER;
  const [touched, setTouched] = useState<Set<RegistrationField>>(new Set());
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Partial<Record<RegistrationField, string>>
  >({});
  const [done, setDone] = useState<null | { name: string; updated: boolean }>(
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const hpRef = useRef<HTMLInputElement>(null);

  const errors = useMemo(
    () => ({ ...fieldErrors(normalise(asRaw(values))), ...serverFieldErrors }),
    [values, serverFieldErrors],
  );
  const errorFor = (f: RegistrationField) =>
    touched.has(f) ? errors[f] : undefined;

  const set = (f: RegistrationField, v: string | boolean) => {
    setValues((s) => ({ ...s, [f]: v }));
    setServerFieldErrors((e) => {
      const n = { ...e };
      delete n[f];
      return n;
    });
  };
  const touch = (f: RegistrationField) => setTouched((t) => new Set(t).add(f));

  function focusFirstError(fields: RegistrationField[]) {
    const first = fields.find((f) => errors[f]);
    if (first)
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>(`[name="${first}"]`)
          ?.focus(),
      );
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
    if (badStep !== -1) {
      setStep(badStep);
      focusFirstError(STEPS[badStep].fields);
      return;
    }

    setBusy(true);
    setServerError("");
    try {
      const res = await fetch("/api/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          website: hpRef.current?.value || "",
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (out.errors) {
          setServerFieldErrors(out.errors);
          const s = STEPS.findIndex((st) =>
            st.fields.some((f) => out.errors[f]),
          );
          if (s !== -1) setStep(s);
        }
        setServerError(
          out.message || "Something went wrong. Please try again.",
        );
        return;
      }
      setDone({
        name: normalise(asRaw(values)).name,
        updated: out.status === "updated",
      });
      window.scrollTo({ top: 0 });
    } catch {
      setServerError(
        "We couldn't reach the server. Check your internet connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const field = (
    f: RegistrationField,
    control: React.ReactNode,
    opts: { optional?: boolean; help?: string; full?: boolean } = {},
  ) => {
    const err = errorFor(f);
    return (
      <div className={`field${opts.full ? " full" : ""}`}>
        <label htmlFor={f}>
          {LABELS[f]} {opts.optional && <span className="opt">(optional)</span>}
        </label>
        {control}
        {err ? (
          <span className="err" id={`${f}-err`} role="alert">
            <IconAlert size={15} />
            {err}
          </span>
        ) : opts.help ? (
          <span className="help" id={`${f}-help`}>
            {opts.help}
          </span>
        ) : null}
      </div>
    );
  };
  const common = (f: RegistrationField) => ({
    id: f,
    name: f,
    "aria-invalid": !!errorFor(f) || undefined,
    "aria-describedby": errorFor(f) ? `${f}-err` : `${f}-help`,
    onBlur: () => touch(f),
  });
  const select = (
    f: RegistrationField,
    list: (string | number)[],
    placeholder: string,
  ) => (
    <select
      {...common(f)}
      value={String(values[f])}
      onChange={(e) => {
        set(f, e.target.value);
        touch(f);
      }}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {list.map((x) => (
        <option key={x} value={x}>
          {x}
        </option>
      ))}
    </select>
  );
  // A dropdown where one choice (`other.choice`) opens a text box underneath for typing in.
  // While the box is open it takes the field's name, so "fix this" focus lands on the box.
  const selectOrType = (
    f: "industry" | "chapter" | "region",
    list: string[],
    placeholder: string,
    other: {
      choice: string;
      open: boolean;
      pick: (value: string) => void;
      value: string;
      onType: (typed: string) => void;
      label: string;
      placeholder: string;
    },
  ) => (
    <>
      <select
        {...common(f)}
        name={other.open ? `${f}Choice` : f}
        value={other.open ? other.choice : String(values[f])}
        onChange={(e) => {
          other.pick(e.target.value);
          if (e.target.value === other.choice)
            requestAnimationFrame(() =>
              document.getElementById(`${f}-other`)?.focus(),
            );
          else touch(f);
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {list.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      {other.open && (
        <input
          {...common(f)}
          id={`${f}-other`}
          aria-label={other.label}
          placeholder={other.placeholder}
          maxLength={60}
          value={other.value}
          onChange={(e) => other.onType(e.target.value)}
          style={{ marginTop: 8 }}
        />
      )}
    </>
  );
  const text = (
    f: RegistrationField,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <input
      {...common(f)}
      value={String(values[f])}
      onChange={(e) => set(f, e.target.value)}
      {...props}
    />
  );

  return (
    <>
      <header className="site-header">
        <div className="wrap narrow">
          <div className="bar">
            <Brand />
            <div className="header-actions">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap narrow">
          {done ? (
            <section className="card success-hero" aria-live="polite">
              <div className="tick">
                <IconCheck size={36} />
              </div>
              <h2 style={{ fontSize: 24 }}>
                {done.updated
                  ? "Your Details Have Been Updated"
                  : `Thank You For Registering, ${done.name.split(" ")[0]}!`}
              </h2>
              <p
                className="muted"
                style={{ maxWidth: 460, margin: "8px auto 22px" }}
              >
                Your details have been successfully submitted to the ODASCO Past
                Students Association. The Alumni Office will review and verify
                your information. Once verified, your chapter will contact you
                about upcoming events and activities.
              </p>
              <button
                className="btn secondary"
                onClick={() => {
                  setDone(null);
                  setValues(EMPTY);
                  setOtherIndustry(false);
                  setOtherRegion(false);
                  setCountry("");
                  setTouched(new Set());
                  setStep(0);
                }}
              >
                Register Another Person
              </button>
            </section>
          ) : (
            <form
              ref={formRef}
              className="card"
              onSubmit={submit}
              noValidate
              style={{ padding: "24px clamp(18px, 4vw, 32px) 28px" }}
            >
              <ol className="stepper" aria-label="Registration progress">
                {STEPS.map((s, i) => (
                  <li
                    key={s.title}
                    className={i < step ? "done" : i === step ? "current" : ""}
                    aria-current={i === step ? "step" : undefined}
                  >
                    <span className="track">
                      <i />
                    </span>
                    <span>
                      <span className="num">Step {i + 1}</span>
                      <br />
                      {s.title}
                    </span>
                  </li>
                ))}
              </ol>

              <h2 className="step-title">{STEPS[step].title}</h2>
              <p className="step-sub">{STEPS[step].sub}</p>

              {serverError && (
                <div
                  className="alert error"
                  role="alert"
                  style={{ marginBottom: 18 }}
                >
                  <IconAlert />
                  {serverError}
                </div>
              )}

              {step === 0 && (
                <div className="fields">
                  {field(
                    "name",
                    text("name", {
                      autoComplete: "name",
                      placeholder: "e.g. Ama Mensah",
                    }),
                    { full: true },
                  )}
                  {field("gender", select("gender", GENDERS, "Select…"))}
                  {field("year", select("year", yearGroups(), "Select year…"), {
                    help: "The year you completed school.",
                  })}
                  {field(
                    "prog",
                    select("prog", PROGRAMMES, "Select programme…"),
                    { full: true },
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="fields">
                  {field(
                    "phone",
                    <div className="input-icon">
                      <IconPhone size={16} />
                      {text("phone", {
                        type: "tel",
                        inputMode: "tel",
                        autoComplete: "tel",
                        placeholder: "024 412 3456",
                        onBlur: () => {
                          touch("phone");
                          const n = normalise({ phone: values.phone }).phone;
                          if (/^\d{10}$/.test(n)) set("phone", formatPhone(n));
                        },
                      })}
                    </div>,
                  )}
                  {field(
                    "email",
                    <div className="input-icon">
                      <IconMail size={16} />
                      {text("email", {
                        type: "email",
                        inputMode: "email",
                        autoComplete: "email",
                        placeholder: "name@example.com",
                      })}
                    </div>,
                  )}
                  {field(
                    "region",
                    selectOrType(
                      "region",
                      [...REGIONS, OTHER_REGION],
                      "Select region…",
                      {
                        choice: OTHER_REGION,
                        open: otherRegion,
                        pick: (v) => {
                          const other = v === OTHER_REGION;
                          setOtherRegion(other);
                          set("region", other ? "" : v);
                        },
                        value: values.region,
                        onType: (s) => set("region", s),
                        label: "Your region",
                        placeholder: "Type your region or state",
                      },
                    ),
                    otherRegion
                      ? { help: "Type the region or state you live in." }
                      : {},
                  )}
                  {field(
                    "city",
                    text("city", {
                      autoComplete: "address-level2",
                      placeholder: "e.g. Kumasi",
                    }),
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="stack">
                  <div className="fields">
                    {field(
                      "employer",
                      text("employer", {
                        autoComplete: "organization",
                        placeholder: "e.g. Ghana Education Service",
                      }),
                      { optional: true },
                    )}
                    {field(
                      "title",
                      text("title", {
                        autoComplete: "organization-title",
                        placeholder: "e.g. Teacher",
                      }),
                      { optional: true },
                    )}
                    {field(
                      "industry",
                      selectOrType(
                        "industry",
                        [...INDUSTRIES, OTHER_INDUSTRY],
                        "Select industry…",
                        {
                          choice: OTHER_INDUSTRY,
                          open: otherIndustry,
                          pick: (v) => {
                            const other = v === OTHER_INDUSTRY;
                            setOtherIndustry(other);
                            set("industry", other ? "" : v);
                          },
                          value: values.industry,
                          onType: (s) => set("industry", s),
                          label: "Your industry",
                          placeholder: "Type your industry, e.g. Hospitality",
                        },
                      ),
                      otherIndustry
                        ? { help: "Type the industry you work in." }
                        : {},
                    )}
                    {field(
                      "chapter",
                      selectOrType("chapter", CHAPTERS, "Select chapter…", {
                        choice: INTERNATIONAL_CHAPTER,
                        open: international,
                        pick: (v) =>
                          set(
                            "chapter",
                            v === INTERNATIONAL_CHAPTER && country.trim()
                              ? internationalChapter(country.trim())
                              : v,
                          ),
                        value: country,
                        onType: (s) => {
                          setCountry(s);
                          set(
                            "chapter",
                            s.trim()
                              ? internationalChapter(s.trim())
                              : INTERNATIONAL_CHAPTER,
                          );
                        },
                        label: "Country you live in",
                        placeholder: "Type your country, e.g. Canada",
                      }),
                      {
                        help: international
                          ? "Type the country you live in."
                          : "Usually the one closest to where you live.",
                      },
                    )}
                  </div>

                  <div>
                    <p className="section-label">Review your details</p>
                    <dl className="review">
                      {(
                        [
                          "name",
                          "year",
                          "prog",
                          "phone",
                          "email",
                          "city",
                          "region",
                        ] as RegistrationField[]
                      ).map((f) => (
                        <div key={f}>
                          <dt>{LABELS[f]}</dt>
                          <dd>{String(values[f]) || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                    <button
                      type="button"
                      className="btn ghost sm"
                      style={{ marginTop: 6 }}
                      onClick={() => setStep(0)}
                    >
                      Edit these details
                    </button>
                  </div>

                  <div className="field">
                    <label className="check">
                      <input
                        type="checkbox"
                        name="consent"
                        checked={values.consent}
                        aria-invalid={!!errorFor("consent") || undefined}
                        onChange={(e) => {
                          set("consent", e.target.checked);
                          touch("consent");
                        }}
                      />
                      <span>
                        I agree to the ODASCO Past Students Association storing
                        my details and sharing my name, year group, chapter and
                        work with other registered alumni.
                      </span>
                    </label>
                    {errorFor("consent") && (
                      <span className="err" role="alert">
                        <IconAlert size={15} />
                        {errorFor("consent")}
                      </span>
                    )}
                    <details className="policy">
                      <summary>How we use your data</summary>
                      <ul>
                        <li>
                          Your Phone Number and Email are <b>ONLY</b> seen by
                          the <b>Alumni Office.</b>
                        </li>
                        <li>
                          We use your <b>details to verify membership</b>,
                        </li>
                        <li>
                          You can ask the Alumni Office to
                          <b> CORRECT or DELETE </b>
                          your record at any time.
                        </li>
                      </ul>
                    </details>
                  </div>
                </div>
              )}

              <label className="hp" aria-hidden="true">
                Website
                <input
                  ref={hpRef}
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>

              <div className="form-nav">
                {step > 0 ? (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setStep((s) => s - 1)}
                  >
                    <IconChevronLeft size={16} />
                    Back
                  </button>
                ) : (
                  <span />
                )}
                {step < STEPS.length - 1 ? (
                  <button type="submit" className="btn lg">
                    Continue
                    <IconChevronRight size={16} />
                  </button>
                ) : (
                  <button type="submit" className="btn lg" disabled={busy}>
                    {busy ? (
                      <>
                        <span className="spinner" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <IconCheck size={16} />
                        Submit registration
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}
          <p className="site-footer">
            <IconLock size={13} />{" "}
            <b>
              Your details are sent securely to the ODASCO Past Students
              Association.
            </b>
          </p>
        </div>
      </main>
    </>
  );
}
