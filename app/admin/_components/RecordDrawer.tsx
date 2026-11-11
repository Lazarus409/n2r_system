"use client";

import { useEffect, useRef, useState } from "react";
import { IconAlert, IconCheck, IconEdit, IconMail, IconPhone, IconTrash, IconX } from "@/app/components/Icons";
import {
  CHAPTERS, GENDERS, INDUSTRIES, INTERNATIONAL_CHAPTER, OTHER_INDUSTRY, OTHER_REGION, PROGRAMMES, REGIONS,
  chapterCountry, chapterGroup, internationalChapter, isOtherIndustry, isOtherRegion, yearGroups,
} from "@/lib/constants";
import { fieldErrors, formatPhone, normalise, type FieldErrors } from "@/lib/validate";
import type { Alumnus, RegistrationField } from "@/lib/types";
import { api, fullDate, initials, timeAgo } from "./util";
import type { PushToast } from "./Toasts";

type Props = {
  record: Alumnus;
  onClose: () => void;
  onChanged: (updated: Alumnus | null) => void;
  toast: PushToast;
  confirm: (o: { title: string; body: string; confirm: string; danger?: boolean }) => Promise<boolean>;
};

// `other`: the dropdown choice that opens a text box (an "Other" region or industry, or the country for International).
const EDITABLE: { f: RegistrationField; label: string; list?: (string | number)[]; other?: { choice: string; label: string } }[] = [
  { f: "name", label: "Full name" }, { f: "gender", label: "Gender", list: GENDERS }, { f: "year", label: "Year group", list: yearGroups() },
  { f: "prog", label: "Programme", list: PROGRAMMES }, { f: "phone", label: "Phone" }, { f: "email", label: "Email" },
  { f: "region", label: "Region", list: [...REGIONS, OTHER_REGION], other: { choice: OTHER_REGION, label: "Type the region" } }, { f: "city", label: "City or town" }, { f: "employer", label: "Employer" },
  { f: "title", label: "Job title" }, { f: "industry", label: "Industry", list: [...INDUSTRIES, OTHER_INDUSTRY], other: { choice: OTHER_INDUSTRY, label: "Type the industry" } },
  { f: "chapter", label: "Chapter", list: CHAPTERS, other: { choice: INTERNATIONAL_CHAPTER, label: "Type the country" } },
];

export default function RecordDrawer({ record: a, onClose, onChanged, toast, confirm }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notes, setNotes] = useState(a.notes);
  const [busy, setBusy] = useState<"" | "save" | "notes" | "verify" | "delete">("");
  const panel = useRef<HTMLDivElement>(null);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => { setNotes(a.notes); }, [a.id, a.notes]);
  // Focus the panel once when it opens (not on every refresh), and close on Esc unless a confirm dialog is open.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector("dialog[open]")) closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); opener?.focus?.(); };
  }, []);

  function startEdit() {
    const d: Record<string, string> = Object.fromEntries(EDITABLE.map(({ f }) => [f, String(a[f as keyof Alumnus] ?? "")]));
    // Split typed-in values back into "dropdown choice" + "text box".
    if (isOtherIndustry(a.industry)) Object.assign(d, { industry: OTHER_INDUSTRY, industry_typed: a.industry });
    if (isOtherRegion(a.region)) Object.assign(d, { region: OTHER_REGION, region_typed: a.region });
    if (chapterGroup(a.chapter) === INTERNATIONAL_CHAPTER)
      Object.assign(d, { chapter: INTERNATIONAL_CHAPTER, chapter_typed: chapterCountry(a.chapter) });
    setDraft(d);
    setErrors({});
    setEditing(true);
  }

  async function save() {
    // Join each dropdown choice with its text box into the value that gets saved.
    const typed = (f: string) => (draft[`${f}_typed`] ?? "").trim();
    const fields: Record<string, string> = Object.fromEntries(EDITABLE.map(({ f }) => [f, draft[f]]));
    if (fields.industry === OTHER_INDUSTRY) fields.industry = typed("industry");
    if (fields.region === OTHER_REGION) fields.region = typed("region");
    if (fields.chapter === INTERNATIONAL_CHAPTER && typed("chapter")) fields.chapter = internationalChapter(typed("chapter"));
    const v = normalise(fields);
    const errs = fieldErrors(v, { requireConsent: false });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy("save");
    try {
      const updated = await api<Alumnus>(`/api/alumni/${a.id}`, { method: "PATCH", json: { fields } });
      onChanged(updated);
      setEditing(false);
      toast("success", "Changes saved.");
    } catch (e) {
      const d = (e as { details?: { errors?: FieldErrors } }).details;
      if (d?.errors) setErrors(d.errors);
      toast("error", (e as Error).message);
    } finally { setBusy(""); }
  }

  async function saveNotes() {
    setBusy("notes");
    try {
      onChanged(await api<Alumnus>(`/api/alumni/${a.id}`, { method: "PATCH", json: { notes } }));
      toast("success", "Notes saved.");
    } catch (e) { toast("error", (e as Error).message); } finally { setBusy(""); }
  }

  async function toggleVerify() {
    setBusy("verify");
    try {
      onChanged(await api<Alumnus>(`/api/alumni/${a.id}`, { method: "PATCH", json: { verified: !a.verified } }));
      toast("success", a.verified ? `${a.name} marked as unverified.` : `${a.name} verified.`);
    } catch (e) { toast("error", (e as Error).message); } finally { setBusy(""); }
  }

  async function remove() {
    const ok = await confirm({ title: `Delete ${a.name}?`, body: "This permanently removes their record from the register. This can't be undone.", confirm: "Delete record", danger: true });
    if (!ok) return;
    setBusy("delete");
    try {
      await api(`/api/alumni/${a.id}`, { method: "DELETE" });
      onChanged(null);
      toast("success", `${a.name} deleted.`);
    } catch (e) { toast("error", (e as Error).message); setBusy(""); }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" ref={panel} tabIndex={-1}>
        <div className="drawer-head">
          <span className="avatar lg">{initials(a.name)}</span>
          <div className="grow">
            <h2 id="drawer-title" style={{ margin: 0 }}>{a.name}</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
              <span className={`badge ${a.verified ? "ok" : "pend"}`}>{a.verified ? <><IconCheck size={12} />Verified</> : "Awaiting verification"}</span>
              <span className="muted" style={{ fontSize: 13 }}>Class of {a.year} · {a.chapter} chapter</span>
              {a.sample && <span className="badge neutral">Sample</span>}
            </div>
          </div>
          <button className="btn ghost icon" onClick={onClose} aria-label="Close"><IconX /></button>
        </div>

        <div className="drawer-body">
          {editing ? (
            <div className="fields" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              {EDITABLE.map(({ f, label, list, other }) => (
                <div className="field" key={f}>
                  <label htmlFor={`e-${f}`}>{label}</label>
                  {list ? (
                    <select id={`e-${f}`} value={draft[f]} aria-invalid={!!errors[f] || undefined} onChange={(e) => setDraft((d) => ({ ...d, [f]: e.target.value }))}>
                      {list.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  ) : (
                    <input id={`e-${f}`} value={draft[f]} aria-invalid={!!errors[f] || undefined} onChange={(e) => setDraft((d) => ({ ...d, [f]: e.target.value }))} />
                  )}
                  {other && draft[f] === other.choice && (
                    <input aria-label={other.label} placeholder={other.label} value={draft[`${f}_typed`] ?? ""} aria-invalid={!!errors[f] || undefined}
                      style={{ marginTop: 6 }} onChange={(e) => setDraft((d) => ({ ...d, [`${f}_typed`]: e.target.value }))} />
                  )}
                  {errors[f] && <span className="err"><IconAlert size={14} />{errors[f]}</span>}
                </div>
              ))}
            </div>
          ) : (
            <>
              <section>
                <p className="section-label">Contact</p>
                <dl className="details">
                  <dt>Phone</dt><dd><a href={`tel:${a.phone}`}><IconPhone size={13} /> {formatPhone(a.phone)}</a></dd>
                  <dt>Email</dt><dd><a href={`mailto:${a.email}`}><IconMail size={13} /> {a.email}</a></dd>
                  <dt>Location</dt><dd>{a.city}, {a.region}</dd>
                </dl>
              </section>
              <section>
                <p className="section-label">School & work</p>
                <dl className="details">
                  <dt>Gender</dt><dd>{a.gender}</dd>
                  <dt>Year group</dt><dd>{a.year}</dd>
                  <dt>Programme</dt><dd>{a.prog}</dd>
                  <dt>Employer</dt><dd>{a.employer || <span className="muted">Not given</span>}</dd>
                  <dt>Job title</dt><dd>{a.title || <span className="muted">Not given</span>}</dd>
                  <dt>Industry</dt><dd>{a.industry}</dd>
                  <dt>Chapter</dt><dd>{a.chapter}</dd>
                </dl>
              </section>
              <section>
                <p className="section-label">History</p>
                <ul className="timeline">
                  <li><span>Registered {timeAgo(a.submittedAt)} <span className="muted">· {fullDate(a.submittedAt)}</span></span></li>
                  {a.verifiedAt && <li><span>Verified {timeAgo(a.verifiedAt)} <span className="muted">· {fullDate(a.verifiedAt)}</span></span></li>}
                  {a.updatedAt && <li><span>Last updated {timeAgo(a.updatedAt)} <span className="muted">· {fullDate(a.updatedAt)}</span></span></li>}
                </ul>
              </section>
            </>
          )}

          <section className="field">
            <label htmlFor="notes" className="section-label" style={{ margin: 0 }}>Internal notes</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000}
              placeholder="Only visible to the alumni office, e.g. how this person was verified." />
            {notes !== a.notes && (
              <div><button className="btn sm" onClick={saveNotes} disabled={busy === "notes"}>{busy === "notes" ? "Saving…" : "Save notes"}</button></div>
            )}
          </section>
        </div>

        <div className="drawer-foot">
          {editing ? (
            <>
              <button className="btn" onClick={save} disabled={busy === "save"}>{busy === "save" ? <><span className="spinner" />Saving…</> : "Save changes"}</button>
              <button className="btn secondary" onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button className={`btn ${a.verified ? "secondary" : ""}`} onClick={toggleVerify} disabled={!!busy}>
                {busy === "verify" ? <span className="spinner" /> : <IconCheck size={16} />}{a.verified ? "Mark unverified" : "Verify"}
              </button>
              <button className="btn secondary" onClick={startEdit}><IconEdit size={16} />Edit</button>
              <span className="spacer" />
              <button className="btn ghost" style={{ color: "var(--red)" }} onClick={remove} disabled={!!busy}><IconTrash size={16} />Delete</button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
