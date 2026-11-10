"use client";

import { useEffect, useState, type FormEvent } from "react";
import { IconAlert, IconCheck, IconLock, IconMail, IconPhone, IconShield, IconUsers } from "@/app/components/Icons";
import { passwordProblem, passwordScore } from "@/lib/passwordRules";
import type { AdminAccount } from "@/lib/account";
import { api, fullDate, timeAgo } from "./util";
import type { PushToast } from "./Toasts";

type Errors = Record<string, string>;
const SCORE_LABEL = ["", "Too weak", "Okay", "Good", "Strong"];
const SCORE_COLOR = ["var(--line)", "var(--red)", "var(--chart-b)", "var(--green)", "var(--green)"];

function Err({ msg }: { msg?: string }) {
  return msg ? <span className="err" role="alert"><IconAlert size={14} />{msg}</span> : null;
}

export default function Account({ toast, onProfile }: { toast: PushToast; onProfile: (a: AdminAccount) => void }) {
  const [acct, setAcct] = useState<AdminAccount | null>(null);
  const [loadError, setLoadError] = useState("");

  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [pErrors, setPErrors] = useState<Errors>({});
  const [pBusy, setPBusy] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [wErrors, setWErrors] = useState<Errors>({});
  const [wBusy, setWBusy] = useState(false);

  useEffect(() => {
    api<AdminAccount>("/api/account")
      .then((a) => { setAcct(a); setProfile({ name: a.name, email: a.email, phone: a.phone }); })
      .catch((e) => setLoadError(e.message));
  }, []);

  const dirty = !!acct && (profile.name !== acct.name || profile.email !== acct.email || profile.phone !== acct.phone);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setPBusy(true);
    setPErrors({});
    try {
      const a = await api<AdminAccount>("/api/account", { method: "PATCH", json: profile });
      setAcct(a);
      setProfile({ name: a.name, email: a.email, phone: a.phone });
      onProfile(a);
      toast("success", "Profile updated.");
    } catch (err) {
      setPErrors((err as { details?: { errors?: Errors } }).details?.errors || {});
      toast("error", (err as Error).message);
    } finally { setPBusy(false); }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    const errs: Errors = {};
    if (!pw.current) errs.current = "Enter your current password.";
    const prob = passwordProblem(pw.next);
    if (prob) errs.next = prob;
    if (pw.next !== pw.confirm) errs.confirm = "The two new passwords don't match.";
    setWErrors(errs);
    if (Object.keys(errs).length) return;

    setWBusy(true);
    try {
      await api("/api/account/password", { method: "POST", json: { current: pw.current, next: pw.next } });
      setPw({ current: "", next: "", confirm: "" });
      setAcct((a) => (a ? { ...a, usingInitialPassword: false, passwordChangedAt: new Date().toISOString() } : a));
      toast("success", "Password changed. Other devices have been signed out.");
    } catch (err) {
      setWErrors((err as { details?: { errors?: Errors } }).details?.errors || { current: (err as Error).message });
    } finally { setWBusy(false); }
  }

  const score = passwordScore(pw.next);

  if (loadError) return <div className="alert error"><IconAlert />{loadError}</div>;
  if (!acct) return <div className="card card-pad"><span className="skeleton" style={{ width: "40%" }} /></div>;

  return (
    <div className="stack">
      {acct.usingInitialPassword && (
        <div className="alert info">
          <IconShield />
          <span>You&apos;re still using the password from the server setup file. Choose your own password below. Once you do, the one in the setup file stops working.</span>
        </div>
      )}

      <div className="charts">
        <form className="card" onSubmit={saveProfile} noValidate>
          <div className="card-head"><div><h2>Admin profile</h2><p className="muted">Who manages the register. Shown in the dashboard header.</p></div><IconUsers /></div>
          <div className="card-pad stack" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="a-name">Name</label>
              <input id="a-name" value={profile.name} autoComplete="name" aria-invalid={!!pErrors.name || undefined}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="e.g. Alumni office" />
              <Err msg={pErrors.name} />
            </div>
            <div className="field">
              <label htmlFor="a-email">Email <span className="opt">(optional)</span></label>
              <div className="input-icon"><IconMail size={16} />
                <input id="a-email" type="email" value={profile.email} autoComplete="email" aria-invalid={!!pErrors.email || undefined}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="office@example.com" />
              </div>
              <Err msg={pErrors.email} />
            </div>
            <div className="field">
              <label htmlFor="a-phone">Phone <span className="opt">(optional)</span></label>
              <div className="input-icon"><IconPhone size={16} />
                <input id="a-phone" type="tel" value={profile.phone} autoComplete="tel" aria-invalid={!!pErrors.phone || undefined}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="024 412 3456" />
              </div>
              <Err msg={pErrors.phone} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn" type="submit" disabled={!dirty || pBusy}>{pBusy ? <><span className="spinner" />Saving…</> : <><IconCheck size={16} />Save profile</>}</button>
              {dirty && <button type="button" className="btn ghost" onClick={() => setProfile({ name: acct.name, email: acct.email, phone: acct.phone })}>Discard</button>}
              <span className="muted" style={{ fontSize: 12.5, marginLeft: "auto" }}>Updated {timeAgo(acct.updatedAt)}</span>
            </div>
          </div>
        </form>

        <form className="card" onSubmit={changePassword} noValidate>
          <div className="card-head">
            <div><h2>Change password</h2><p className="muted">{acct.passwordChangedAt ? `Last changed ${timeAgo(acct.passwordChangedAt)}` : "Not changed since setup"}</p></div>
            <IconLock />
          </div>
          <div className="card-pad stack" style={{ gap: 16 }}>
            {/* Hidden username field helps password managers save the new password against the right account */}
            <input type="text" name="username" autoComplete="username" value={acct.email || "admin"} readOnly hidden />
            <div className="field">
              <label htmlFor="pw-current">Current password</label>
              <input id="pw-current" type={show ? "text" : "password"} autoComplete="current-password" value={pw.current} aria-invalid={!!wErrors.current || undefined}
                onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              <Err msg={wErrors.current} />
            </div>
            <div className="field">
              <label htmlFor="pw-next">New password</label>
              <input id="pw-next" type={show ? "text" : "password"} autoComplete="new-password" value={pw.next} aria-invalid={!!wErrors.next || undefined}
                aria-describedby="pw-help" onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              <div className="meter" aria-hidden="true" style={{ marginTop: 2 }}>
                <i style={{ width: `${score * 25}%`, background: SCORE_COLOR[score], transition: "width .2s" }} />
              </div>
              {wErrors.next ? <Err msg={wErrors.next} /> : (
                <span className="help" id="pw-help">
                  {pw.next ? <>Strength: <b>{SCORE_LABEL[score]}</b>{score === 1 && ` · ${passwordProblem(pw.next)}`}</> : "At least 10 characters with a mix of letters, numbers and symbols, or a long passphrase."}
                </span>
              )}
            </div>
            <div className="field">
              <label htmlFor="pw-confirm">Confirm new password</label>
              <input id="pw-confirm" type={show ? "text" : "password"} autoComplete="new-password" value={pw.confirm} aria-invalid={!!wErrors.confirm || undefined}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              <Err msg={wErrors.confirm} />
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />Show passwords
            </label>
            <div>
              <button className="btn" type="submit" disabled={wBusy || !pw.current || !pw.next}>
                {wBusy ? <><span className="spinner" />Updating…</> : <><IconLock size={16} />Update password</>}
              </button>
            </div>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>Changing your password signs out every other device. You stay signed in here.</p>
          </div>
        </form>
      </div>

      <section className="card card-pad">
        <p className="section-label">Account details</p>
        <dl className="details">
          <dt>Password last changed</dt><dd>{acct.passwordChangedAt ? fullDate(acct.passwordChangedAt) : "Never (still the setup password)"}</dd>
          <dt>Profile last updated</dt><dd>{fullDate(acct.updatedAt)}</dd>
          <dt>Session length</dt><dd>12 hours, then you&apos;ll be asked to sign in again</dd>
        </dl>
      </section>
    </div>
  );
}
