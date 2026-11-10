"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Brand from "@/app/Brand";
import { INDUSTRIES, REGIONS, yearGroups } from "@/lib/constants";
import type { Alumnus } from "@/lib/types";

type Tab = "dir" | "rep";
type SortKey = "name" | "year" | "prog" | "region" | "employer" | "phone" | "chapter" | "verified" | "submittedAt";

const COLS: [SortKey, string][] = [
  ["name", "Name"], ["year", "Year"], ["prog", "Programme"], ["region", "Location"],
  ["employer", "Work"], ["phone", "Contact"], ["chapter", "Chapter"], ["verified", "Status"],
];
const POLL_MS = 15000;
const SEEN_KEY = "nar.lastSeen";

function readSeen() {
  try { return localStorage.getItem(SEEN_KEY) || ""; } catch { return ""; }
}
function writeSeen(v: string) {
  try { localStorage.setItem(SEEN_KEY, v); } catch { /* ignore */ }
}

export default function AdminPage() {
  const [data, setData] = useState<Alumnus[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("dir");
  const [q, setQ] = useState("");
  const [fy, setFy] = useState("");
  const [fr, setFr] = useState("");
  const [fi, setFi] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<{ k: SortKey; d: 1 | -1 }>({ k: "submittedAt", d: -1 });
  const [seen, setSeen] = useState<string | null>(null); // timestamp of the newest record the admin has already seen
  const [copied, setCopied] = useState(false);
  const [registerUrl, setRegisterUrl] = useState("/register");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/alumni", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login?next=/admin"; // session expired
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setLoadError("");
    } catch {
      setLoadError("Couldn't load the register. Retrying automatically…");
    }
  }, []);

  useEffect(() => {
    setSeen(readSeen());
    setRegisterUrl(window.location.origin + "/register");
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [load]);

  const list = data ?? [];
  const newOnes = seen === null ? [] : list.filter((a) => !a.sample && a.submittedAt > seen);
  const markSeen = () => {
    const latest = list.reduce((m, a) => (a.submittedAt > m ? a.submittedAt : m), seen || "");
    writeSeen(latest);
    setSeen(latest);
  };

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return list
      .filter((a) =>
        (!fy || String(a.year) === fy) &&
        (!fr || a.region === fr) &&
        (!fi || a.industry === fi) &&
        (!status || (status === "v") === a.verified) &&
        (!ql || [a.name, a.employer, a.city, a.title, a.email, a.phone].join(" ").toLowerCase().includes(ql)))
      .sort((a, b) => {
        const x = a[sort.k] ?? "", y = b[sort.k] ?? "";
        return (x > y ? 1 : x < y ? -1 : 0) * sort.d;
      });
  }, [list, q, fy, fr, fi, status, sort]);

  async function verify(a: Alumnus) {
    const res = await fetch(`/api/alumni/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verified: true }) });
    if (res.ok) load();
  }
  async function remove(a: Alumnus) {
    if (!confirm(`Delete the record for ${a.name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/alumni/${a.id}`, { method: "DELETE" });
    if (res.ok) load();
  }
  async function removeSamples() {
    const n = list.filter((a) => a.sample).length;
    if (!n || !confirm(`Remove the ${n} sample records? Real registrations are kept.`)) return;
    await fetch("/api/alumni?sample=1", { method: "DELETE" });
    load();
  }

  function exportCsv() {
    const h: (keyof Alumnus)[] = ["name", "gender", "year", "prog", "phone", "email", "region", "city", "employer", "title", "industry", "chapter", "verified", "submittedAt"];
    const cell = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formula injection from member-entered text
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const csv = [h.join(","), ...filtered.map((a) => h.map((k) => cell(a[k])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `alumni-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function signOut() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  }

  function copyLink() {
    navigator.clipboard?.writeText(registerUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const verifiedCount = list.filter((a) => a.verified).length;
  const sampleCount = list.filter((a) => a.sample).length;
  const sortBy = (k: SortKey) => setSort((s) => ({ k, d: s.k === k ? (s.d === 1 ? -1 : 1) : 1 }));

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <Brand />
            <button className="btn alt" style={{ color: "var(--headtxt)", borderColor: "var(--gold)" }} onClick={signOut}>Sign out</button>
          </div>
          <p>
            Admin dashboard. New registrations appear here automatically. Share the{" "}
            <a href="/register" target="_blank">registration form</a> with members.
          </p>
          <nav className="tabs" role="tablist">
            {([["dir", "Directory"], ["rep", "Reports"]] as [Tab, string][]).map(([t, label]) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{label}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="wrap">
        {loadError && <div className="msg e">{loadError}</div>}

        {tab === "dir" && (
          <section>
            {newOnes.length > 0 && (
              <div className="msg g" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                <span>
                  {newOnes.length} new registration{newOnes.length > 1 ? "s" : ""} since your last visit: {newOnes.slice(0, 5).map((a) => a.name).join(", ")}
                  {newOnes.length > 5 ? "…" : ""}
                </span>
                <button className="btn alt" onClick={markSeen}>Mark as seen</button>
              </div>
            )}

            <div className="stats">
              {[
                [list.length, "alumni records"],
                [new Set(list.map((a) => a.year)).size, "year groups covered"],
                [`${new Set(list.map((a) => a.region)).size} of ${REGIONS.length}`, "regions represented"],
                [list.length - verifiedCount, "awaiting verification"],
              ].map(([v, l]) => (
                <div className="stat" key={String(l)}><b>{v}</b><span>{l}</span></div>
              ))}
            </div>

            <div className="panel">
              <div className="filters">
                <input type="search" placeholder="Search name, employer, city, email, phone" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
                <select aria-label="Year group" value={fy} onChange={(e) => setFy(e.target.value)}>
                  <option value="">All year groups</option>
                  {yearGroups().map((y) => <option key={y}>{y}</option>)}
                </select>
                <select aria-label="Region" value={fr} onChange={(e) => setFr(e.target.value)}>
                  <option value="">All regions</option>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <select aria-label="Industry" value={fi} onChange={(e) => setFi(e.target.value)}>
                  <option value="">All industries</option>
                  {INDUSTRIES.map((r) => <option key={r}>{r}</option>)}
                </select>
                <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Any status</option>
                  <option value="u">Unverified</option>
                  <option value="v">Verified</option>
                </select>
                <button className="btn alt" onClick={() => { setQ(""); setFy(""); setFr(""); setFi(""); setStatus(""); }}>Clear filters</button>
                <button className="btn" onClick={exportCsv}>Export CSV</button>
              </div>
              <p className="muted" style={{ margin: "0 0 8px" }}>
                {data === null ? "Loading…" : `Showing ${filtered.length} of ${list.length} alumni, newest first by default`}
              </p>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      {COLS.map(([k, l]) => (
                        <th key={k} aria-sort={sort.k === k ? (sort.d === 1 ? "ascending" : "descending") : undefined}>
                          <button onClick={() => sortBy(k)}>{l}{sort.k === k ? (sort.d === 1 ? " ▲" : " ▼") : ""}</button>
                        </th>
                      ))}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data !== null && filtered.length === 0 && (
                      <tr><td colSpan={9}>{list.length ? "No alumni match these filters." : "No registrations yet. Share the registration form with members."}</td></tr>
                    )}
                    {filtered.map((a) => (
                      <tr key={a.id} className={newOnes.includes(a) ? "new" : undefined}>
                        <td><b>{a.name}</b><small>{a.gender}</small></td>
                        <td>{a.year}</td>
                        <td>{a.prog}</td>
                        <td>{a.city}<small>{a.region}</small></td>
                        <td>{a.employer || "-"}<small>{a.title}</small></td>
                        <td>{a.phone}<small>{a.email}</small></td>
                        <td>{a.chapter}</td>
                        <td>
                          <span className={`tag ${a.verified ? "ok" : "pend"}`}>{a.verified ? "Verified" : "Unverified"}</span>
                          {!a.verified && (
                            <><br /><button className="link green" onClick={() => verify(a)} aria-label={`Verify ${a.name}`}>Verify</button></>
                          )}
                          {!a.sample && <small>{new Date(a.submittedAt).toLocaleDateString()}</small>}
                        </td>
                        <td><button className="link red" onClick={() => remove(a)} aria-label={`Delete ${a.name}`}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <h2>Registration link</h2>
              <p style={{ marginTop: 0 }}>Send this link to members. Their registrations appear in the directory above as Unverified.</p>
              <div className="filters">
                <input readOnly value={registerUrl} aria-label="Registration link" onFocus={(e) => e.target.select()} />
                <button className="btn" onClick={copyLink}>{copied ? "Copied" : "Copy link"}</button>
                {sampleCount > 0 && <button className="btn alt" onClick={removeSamples}>Remove {sampleCount} sample records</button>}
              </div>
            </div>
          </section>
        )}

        {tab === "rep" && (
          <section>
            <Bars title="Alumni by region" list={list} by={(a) => a.region} />
            <Bars title="Alumni by year group" list={list} by={(a) => String(a.year)} />
            <Bars title="Alumni by industry" list={list} by={(a) => a.industry} />
          </section>
        )}

      </main>
    </>
  );
}

function Bars({ title, list, by }: { title: string; list: Alumnus[]; by: (a: Alumnus) => string }) {
  const counts: Record<string, number> = {};
  list.forEach((a) => { counts[by(a)] = (counts[by(a)] || 0) + 1; });
  const keys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const max = counts[keys[0]] || 1;
  return (
    <div className="panel">
      <h2>{title}</h2>
      {keys.length === 0 && <p className="muted">No data yet.</p>}
      {keys.map((k) => (
        <div className="bar" key={k}>
          <em>{k}</em>
          <i style={{ width: `${(counts[k] / max) * 60}%` }} />
          {counts[k]}
        </div>
      ))}
    </div>
  );
}
