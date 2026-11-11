"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconArrowDown, IconArrowUp, IconArrowUpDown, IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconCopy, IconDownload,
  IconInbox, IconSearch, IconShield, IconTrash, IconUserPlus, IconUsers, IconX,
} from "@/app/components/Icons";
import { CHAPTERS, INDUSTRIES, OTHER_INDUSTRY, REGIONS, chapterGroup, isOtherIndustry, yearGroups } from "@/lib/constants";
import { formatPhone } from "@/lib/validate";
import type { Alumnus } from "@/lib/types";
import { downloadCsv, initials, timeAgo } from "./util";

type SortKey = "name" | "year" | "prog" | "region" | "employer" | "chapter" | "verified" | "submittedAt";
type Filters = { year: string; region: string; industry: string; chapter: string; status: string };
const NO_FILTERS: Filters = { year: "", region: "", industry: "", chapter: "", status: "" };
const WEEK = 7 * 86400_000;

type Props = {
  data: Alumnus[] | null;
  seen: string;
  onOpen: (a: Alumnus) => void;
  onBulk: (action: "verify" | "unverify" | "delete", ids: string[]) => Promise<boolean>;
  onCopyLink: () => void;
};

export default function Directory({ data, seen, onOpen, onBulk, onCopyLink }: Props) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<{ k: SortKey; d: 1 | -1 }>({ k: "submittedAt", d: -1 });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const list = useMemo(() => data ?? [], [data]);
  useEffect(() => { setPage(1); }, [q, f, size]);
  // Drop selections for records that no longer exist
  useEffect(() => { setSelected((s) => new Set([...s].filter((id) => list.some((a) => a.id === id)))); }, [list]);

  const filtered = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return list
      .filter((a) =>
        (!f.year || String(a.year) === f.year) && (!f.region || a.region === f.region) && (!f.industry || (f.industry === OTHER_INDUSTRY ? isOtherIndustry(a.industry) : a.industry === f.industry)) &&
        (!f.chapter || chapterGroup(a.chapter) === f.chapter) && (!f.status || (f.status === "v") === a.verified) &&
        terms.every((t) => [a.name, a.employer, a.city, a.title, a.industry, a.chapter, a.email, a.phone, a.prog, String(a.year)].join(" ").toLowerCase().includes(t)))
      .sort((x, y) => {
        const a = x[sort.k] ?? "", b = y[sort.k] ?? "";
        return (a > b ? 1 : a < b ? -1 : 0) * sort.d;
      });
  }, [list, q, f, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * size, cur * size);

  const total = list.length;
  const verified = list.filter((a) => a.verified).length;
  const thisWeek = list.filter((a) => !a.sample && Date.now() - new Date(a.submittedAt).getTime() < WEEK).length;
  const pending = total - verified;
  const isNew = (a: Alumnus) => !a.sample && !!seen && a.submittedAt > seen;

  const active = (Object.keys(f) as (keyof Filters)[]).filter((k) => f[k]);
  const chipLabel = (k: keyof Filters) => (k === "status" ? (f.status === "v" ? "Verified" : "Unverified") : k === "year" ? `Class of ${f.year}` : f[k]);

  const allOnPage = rows.length > 0 && rows.every((a) => selected.has(a.id));
  const toggleAll = () => setSelected((s) => {
    const n = new Set(s);
    rows.forEach((a) => (allOnPage ? n.delete(a.id) : n.add(a.id)));
    return n;
  });
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function bulk(action: "verify" | "unverify" | "delete") {
    if (await onBulk(action, [...selected])) setSelected(new Set());
  }

  const sortBy = (k: SortKey) => setSort((s) => ({ k, d: s.k === k ? (s.d === 1 ? -1 : 1) : k === "submittedAt" ? -1 : 1 }));
  const SortHead = ({ k, label }: { k: SortKey; label: string }) => (
    <th aria-sort={sort.k === k ? (sort.d === 1 ? "ascending" : "descending") : undefined}>
      <button onClick={() => sortBy(k)}>
        {label}
        {sort.k === k ? (sort.d === 1 ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />) : <IconArrowUpDown size={12} className="muted" />}
      </button>
    </th>
  );

  const loading = data === null;

  return (
    <div className="stack">
      <div className="kpis">
        <div className="card kpi">
          <div className="kpi-top">Total alumni <IconUsers /></div>
          <span className="value">{loading ? "—" : total.toLocaleString()}</span>
          <div className="sub">{new Set(list.map((a) => a.year)).size} year groups · {new Set(list.map((a) => a.region)).size} of {REGIONS.length} regions</div>
        </div>
        <div className="card kpi">
          <div className="kpi-top">New this week <IconUserPlus /></div>
          <span className="value">{loading ? "—" : thisWeek}</span>
          <div className="sub">Registrations in the last 7 days</div>
        </div>
        <div className="card kpi gold">
          <div className="kpi-top">Awaiting verification <IconClock /></div>
          <span className="value">{loading ? "—" : pending}</span>
          <div className="sub">{pending ? <button className="btn ghost sm" style={{ marginLeft: -11 }} onClick={() => setF({ ...NO_FILTERS, status: "u" })}>Review them →</button> : "All caught up"}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-top">Verified <IconShield /></div>
          <span className="value">{loading || !total ? "—" : `${Math.round((verified / total) * 100)}%`}</span>
          <div className="meter" aria-hidden="true"><i style={{ width: `${total ? (verified / total) * 100 : 0}%` }} /></div>
        </div>
      </div>

      <section className="card" aria-label="Alumni directory">
        <div className="card-head">
          <div>
            <h2>Directory</h2>
            <p className="muted">{loading ? "Loading records…" : `${filtered.length.toLocaleString()} of ${total.toLocaleString()} alumni`}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn secondary" onClick={onCopyLink}><IconCopy size={16} />Copy registration link</button>
            <button className="btn" onClick={() => downloadCsv(filtered, `alumni-${new Date().toISOString().slice(0, 10)}.csv`)} disabled={!filtered.length}>
              <IconDownload size={16} />Export {active.length || q ? "filtered" : "all"}
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="input-icon search">
            <IconSearch size={16} />
            <input type="search" placeholder="Search name, email, phone, employer, city…" aria-label="Search alumni" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select aria-label="Year group" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })}>
            <option value="">All years</option>{yearGroups().map((y) => <option key={y}>{y}</option>)}
          </select>
          <select aria-label="Region" value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })}>
            <option value="">All regions</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <select aria-label="Industry" value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })}>
            <option value="">All industries</option>{INDUSTRIES.map((r) => <option key={r}>{r}</option>)}
            <option value={OTHER_INDUSTRY}>Other (typed in)</option>
          </select>
          <select aria-label="Chapter" value={f.chapter} onChange={(e) => setF({ ...f, chapter: e.target.value })}>
            <option value="">All chapters</option>{CHAPTERS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <select aria-label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="">Any status</option><option value="u">Unverified</option><option value="v">Verified</option>
          </select>
        </div>

        {(active.length > 0 || q) && (
          <div className="chips" style={{ paddingBottom: 10 }}>
            {q && <span className="chip">“{q}”<button onClick={() => setQ("")} aria-label="Clear search"><IconX size={12} /></button></span>}
            {active.map((k) => (
              <span className="chip" key={k}>{chipLabel(k)}<button onClick={() => setF({ ...f, [k]: "" })} aria-label={`Remove ${chipLabel(k)} filter`}><IconX size={12} /></button></span>
            ))}
            <button className="btn ghost sm" onClick={() => { setF(NO_FILTERS); setQ(""); }}>Clear all</button>
          </div>
        )}

        {selected.size > 0 && (
          <div className="bulkbar" role="region" aria-label="Bulk actions">
            <span>{selected.size} selected</span>
            <button className="btn sm" onClick={() => bulk("verify")}><IconCheck size={14} />Verify</button>
            <button className="btn secondary sm" onClick={() => bulk("unverify")}>Mark unverified</button>
            <button className="btn secondary sm" onClick={() => downloadCsv(list.filter((a) => selected.has(a.id)), `alumni-selected-${new Date().toISOString().slice(0, 10)}.csv`)}>
              <IconDownload size={14} />Export
            </button>
            <button className="btn danger sm" onClick={() => bulk("delete")}><IconTrash size={14} />Delete</button>
            <span className="spacer" />
            <button className="btn ghost sm" onClick={() => setSelected(new Set())}>Clear selection</button>
          </div>
        )}

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th className="col-check"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all on this page" disabled={!rows.length} /></th>
                <SortHead k="name" label="Name" />
                <SortHead k="year" label="Year" />
                <SortHead k="region" label="Location" />
                <SortHead k="employer" label="Work" />
                <th>Contact</th>
                <SortHead k="chapter" label="Chapter" />
                <SortHead k="verified" label="Status" />
                <SortHead k="submittedAt" label="Registered" />
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }, (_, i) => (
                <tr key={i} aria-hidden="true" style={{ cursor: "default" }}>
                  <td className="col-check" />
                  <td><div className="person"><span className="avatar" /><span className="skeleton" style={{ width: 120 }} /></div></td>
                  {Array.from({ length: 7 }, (_, j) => <td key={j}><span className="skeleton" style={{ width: 50 + ((i + j) % 3) * 25 }} /></td>)}
                </tr>
              ))}
              {!loading && rows.map((a) => (
                <tr key={a.id} className={`${selected.has(a.id) ? "selected" : ""} ${isNew(a) ? "is-new" : ""}`} onClick={() => onOpen(a)}
                  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onOpen(a); }} aria-label={`Open ${a.name}`}>
                  <td className="col-check" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} aria-label={`Select ${a.name}`} />
                  </td>
                  <td>
                    <div className="person">
                      <span className="avatar">{initials(a.name)}</span>
                      <div>
                        <b>{a.name}</b> {isNew(a) && <span className="badge new">New</span>}
                        <span className="sub">{a.prog}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Year">{a.year}</td>
                  <td data-label="Location">{a.city}<span className="sub">{a.region}</span></td>
                  <td className="hide-sm">{a.employer || <span className="muted">—</span>}<span className="sub">{a.title}</span></td>
                  <td className="hide-sm">{formatPhone(a.phone)}<span className="sub">{a.email}</span></td>
                  <td data-label="Chapter">{a.chapter}</td>
                  <td><span className={`badge ${a.verified ? "ok" : "pend"}`}>{a.verified ? <><IconCheck size={12} />Verified</> : "Unverified"}</span></td>
                  <td className="hide-sm" title={new Date(a.submittedAt).toLocaleString()}>{a.sample ? <span className="badge neutral">Sample</span> : timeAgo(a.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <div className="empty">
              <IconInbox size={44} />
              {total ? (
                <><h3>No alumni match</h3><p>Try a different search or <button className="btn ghost sm" onClick={() => { setF(NO_FILTERS); setQ(""); }}>clear all filters</button></p></>
              ) : (
                <><h3>No registrations yet</h3><p>Share the registration link with members. New sign-ups appear here automatically.</p>
                  <button className="btn" onClick={onCopyLink}><IconCopy size={16} />Copy registration link</button></>
              )}
            </div>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <div className="pager">
            <span>
              Showing {((cur - 1) * size + 1).toLocaleString()}–{Math.min(cur * size, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}
            </span>
            <div className="pages">
              <label className="muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                Rows
                <select value={size} onChange={(e) => setSize(+e.target.value)}>{[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}</select>
              </label>
              <button className="btn secondary icon" onClick={() => setPage(cur - 1)} disabled={cur === 1} aria-label="Previous page"><IconChevronLeft size={16} /></button>
              <span>Page {cur} of {pages}</span>
              <button className="btn secondary icon" onClick={() => setPage(cur + 1)} disabled={cur === pages} aria-label="Next page"><IconChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
