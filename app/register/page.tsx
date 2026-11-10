"use client";

import { useState, type FormEvent } from "react";
import { CHAPTERS, GENDERS, INDUSTRIES, PROGRAMMES, REGIONS, yearGroups } from "@/lib/constants";
import { validateRegistration } from "@/lib/validate";

const Options = ({ list }: { list: (string | number)[] }) => (
  <>
    {list.map((x) => (
      <option key={x}>{x}</option>
    ))}
  </>
);

export default function RegisterPage() {
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { name: string; updated: boolean }>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form)) as Record<string, unknown>;
    const v = validateRegistration(raw);
    if (!v.ok) {
      setErrors(v.errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch("/api/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v.value, website: raw.website }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(out.errors || ["Something went wrong. Please try again."]);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setDone({ name: v.value.name, updated: out.status === "updated" });
      form.reset();
      window.scrollTo({ top: 0 });
    } catch {
      setErrors(["Couldn't reach the server. Check your internet connection and try again."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="top solo">
        <div className="wrap narrow">
          <h1>National Alumni Register</h1>
          <p>Fill in your details below to join the register. It takes about two minutes.</p>
        </div>
      </header>
      <main className="wrap narrow">
        {done ? (
          <section className="panel">
            <h2>Thank you, {done.name.split(" ")[0]}</h2>
            <p>
              {done.updated
                ? "Your details have been updated."
                : "Your registration has been received."}{" "}
              The alumni office will verify your details shortly.
            </p>
            <button className="btn alt" onClick={() => setDone(null)}>
              Register someone else
            </button>
          </section>
        ) : (
          <section className="panel">
            {errors.length > 0 && (
              <div className="msg e" role="alert">
                {errors.map((x) => (
                  <div key={x}>{x}</div>
                ))}
              </div>
            )}
            <form className="grid" onSubmit={onSubmit} noValidate>
              <label>
                Full name
                <input name="name" autoComplete="name" required />
              </label>
              <label>
                Gender
                <select name="gender">
                  <Options list={GENDERS} />
                </select>
              </label>
              <label>
                Year group <small>Year you completed school</small>
                <select name="year">
                  <Options list={yearGroups()} />
                </select>
              </label>
              <label>
                Programme <small>&nbsp;</small>
                <select name="prog">
                  <Options list={PROGRAMMES} />
                </select>
              </label>
              <label>
                Phone
                <input name="phone" type="tel" autoComplete="tel" placeholder="0244123456" required />
              </label>
              <label>
                Email
                <input name="email" type="email" autoComplete="email" placeholder="name@example.com" required />
              </label>
              <label>
                Region
                <select name="region">
                  <Options list={REGIONS} />
                </select>
              </label>
              <label>
                City or town
                <input name="city" autoComplete="address-level2" required />
              </label>
              <label>
                Employer
                <input name="employer" autoComplete="organization" />
              </label>
              <label>
                Job title
                <input name="title" autoComplete="organization-title" />
              </label>
              <label>
                Industry
                <select name="industry">
                  <Options list={INDUSTRIES} />
                </select>
              </label>
              <label>
                Chapter
                <select name="chapter">
                  <Options list={CHAPTERS} />
                </select>
              </label>
              <label className="hp" aria-hidden="true">
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              <label className="full check">
                <input type="checkbox" name="consent" />I agree to have my details stored and shared with other alumni, as set out in the data policy.
              </label>
              <div className="full">
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? "Submitting…" : "Submit registration"}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </>
  );
}
