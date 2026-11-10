import Image from "next/image";

export default function NotFound() {
  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <Image src="/logo.png" alt="ODASCO Past Students Association" width={72} height={72} />
        <h1 style={{ fontSize: 24 }}>Page not found</h1>
        <p className="muted" style={{ margin: "8px 0 20px" }}>The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <a className="btn" href="/register">Go to the registration form</a>
      </section>
    </main>
  );
}
