"use client";

import { Suspense, useState, type FormEvent } from "react";
import Brand from "@/app/Brand";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      setError((await res.json().catch(() => ({}))).error || "Sign-in failed.");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Admin sign in</h2>
      {error && <div className="msg e" role="alert">{error}</div>}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" autoFocus required />
        </label>
        <div>
          <button className="btn" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </div>
      </form>
    </section>
  );
}

export default function LoginPage() {
  return (
    <>
      <header className="top solo">
        <div className="wrap" style={{ maxWidth: 420 }}>
          <Brand />
          <p>Alumni office dashboard</p>
        </div>
      </header>
      <main className="wrap" style={{ maxWidth: 420 }}>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="muted">
          Looking to join the register? <a href="/register">Go to the registration form</a>.
        </p>
      </main>
    </>
  );
}
