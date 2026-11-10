"use client";

import { Suspense, useState, type FormEvent } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import ThemeToggle from "@/app/ThemeToggle";
import { IconAlert, IconLock } from "@/app/components/Icons";

function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const next = params.get("next");
        // Only follow same-site paths, never an external URL.
        window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
        return;
      }
      setError((await res.json().catch(() => ({}))).message || "Sign-in failed.");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <div className="alert error" role="alert"><IconAlert />{error}</div>}
      <div className="field">
        <label htmlFor="password">Admin password</label>
        <div className="input-icon" style={{ position: "relative" }}>
          <IconLock size={16} />
          <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" autoFocus required style={{ paddingRight: 64 }} />
          <button type="button" className="btn ghost sm" onClick={() => setShow((s) => !s)}
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }} aria-pressed={show}>
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <button className="btn lg" type="submit" disabled={busy}>
        {busy ? <><span className="spinner" />Signing in…</> : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <div className="corner"><ThemeToggle /></div>
        <Image src="/logo.png" alt="ODASCO Past Students Association, Nananom" width={88} height={88} priority />
        <span className="section-label" style={{ display: "block", color: "var(--goldtxt)" }}>ODASCO Past Students Association</span>
        <h1 style={{ fontSize: 26 }}>Alumni office</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Sign in to manage the National Alumni Register.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="muted" style={{ fontSize: 13.5, margin: "20px 0 0" }}>
          Looking to join? <a href="/register">Go to the registration form</a>
        </p>
      </section>
    </main>
  );
}
