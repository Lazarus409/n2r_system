"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
        <p className="muted" style={{ margin: "8px 0 20px" }}>
          An unexpected error occurred. Please try again. If it keeps happening, contact the alumni office.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button className="btn" onClick={reset}>Try again</button>
          <a className="btn secondary" href="/register">Go to registration</a>
        </div>
        {error.digest && <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>Reference: {error.digest}</p>}
      </section>
    </main>
  );
}
