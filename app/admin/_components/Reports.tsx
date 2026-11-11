"use client";

import { useMemo, useState } from "react";
import type { Alumnus } from "@/lib/types";
import { INTERNATIONAL_CHAPTER, chapterCountry, chapterGroup } from "@/lib/constants";

type Datum = { label: string; value: number; hint?: string };

function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function TableView({ data, unit }: { data: Datum[]; unit: string }) {
  return (
    <details className="table-view">
      <summary>Show as table</summary>
      <table>
        <thead><tr><th scope="col">Group</th><th scope="col" style={{ textAlign: "right" }}>{unit}</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.label}><td>{d.hint || d.label}</td><td style={{ textAlign: "right" }}>{d.value}</td></tr>)}</tbody>
      </table>
    </details>
  );
}

/** Vertical columns for ordered categories (months, year groups). */
function Columns({ data, unit }: { data: Datum[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 220, L = 30, B = 24, T = 8;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const band = (W - L) / Math.max(1, data.length);
  const bw = Math.max(3, Math.min(36, band - 2)); // 2px surface gap between adjacent bars
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const every = Math.ceil(data.length / 12);

  return (
    <div className="cols" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Column chart: ${data.map((d) => `${d.hint || d.label} ${d.value}`).join(", ")}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="gridline" x1={L} x2={W} y1={y(t)} y2={y(t)} />
            <text className="axis-label" x={L - 6} y={y(t) + 4} textAnchor="end">{Number.isInteger(t) ? t : ""}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = L + i * band + (band - bw) / 2;
          const h = Math.max(d.value ? 2 : 0, H - B - y(d.value));
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={d.label}>
              <rect className="hit" x={L + i * band} y={T} width={band} height={H - T - B} fill="transparent"
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${d.hint || d.label}: ${d.value}`} />
              {h > 0 && (
                <path className={`col${hover === i ? " active" : ""}`} pointerEvents="none" fill="var(--chart-a)"
                  d={`M${x},${H - B} V${H - B - h + r} Q${x},${H - B - h} ${x + r},${H - B - h} H${x + bw - r} Q${x + bw},${H - B - h} ${x + bw},${H - B - h + r} V${H - B} Z`} />
              )}
              {i % every === 0 && <text className="axis-label" x={x + bw / 2} y={H - 6} textAnchor="middle">{d.label}</text>}
            </g>
          );
        })}
        <line x1={L} x2={W} y1={H - B} y2={H - B} stroke="var(--line-strong)" />
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: `${((L + hover * band + band / 2) / W) * 100}%`, top: `${(y(data[hover].value) / H) * 100}%` }}>
          {data[hover].hint || data[hover].label}: <b>{data[hover].value}</b> {unit}
        </div>
      )}
    </div>
  );
}

/** Horizontal bars for unordered categories, sorted largest first. */
function Bars({ data, total }: { data: Datum[]; total: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div role="list">
      {data.map((d) => (
        <div className="hbar" role="listitem" key={d.label} title={`${d.label}: ${d.value} (${total ? Math.round((d.value / total) * 100) : 0}%)`}>
          <span className="lbl">{d.label}</span>
          <span className="track"><span className="fill" style={{ width: `${(d.value / max) * 100}%`, display: "block" }} /></span>
          <span className="num">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function count(list: Alumnus[], key: (a: Alumnus) => string): Datum[] {
  const m = new Map<string, number>();
  list.forEach((a) => m.set(key(a), (m.get(key(a)) || 0) + 1));
  return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export default function Reports({ data }: { data: Alumnus[] }) {
  const months = useMemo(() => {
    const out: Datum[] = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 11; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
      out.push({
        label: m.toLocaleDateString(undefined, { month: "short" }),
        hint: m.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        value: data.filter((a) => !a.sample && a.submittedAt.startsWith(key)).length,
      });
    }
    return out;
  }, [data]);

  const years = useMemo(() => {
    const c = count(data, (a) => String(a.year));
    return c.sort((a, b) => +a.label - +b.label).map((d) => ({ ...d, label: `'${d.label.slice(2)}`, hint: `Class of ${d.label}` }));
  }, [data]);

  const verified = data.filter((a) => a.verified).length;
  const pending = data.length - verified;
  const pct = (n: number) => (data.length ? Math.round((n / data.length) * 100) : 0);

  if (!data.length) {
    return <div className="card empty"><h3>No data yet</h3><p>Reports appear once members start registering.</p></div>;
  }

  const groups: [string, string, Datum[]][] = [
    ["Alumni by region", "Where members live now", count(data, (a) => a.region)],
    ["Alumni by chapter", "Chapter membership", count(data, (a) => chapterGroup(a.chapter))],
    ["Alumni by industry", "Current sector of work", count(data, (a) => a.industry)],
    ["Alumni by programme", "Programme studied at ODASCO", count(data, (a) => a.prog)],
  ];
  const abroad = data.filter((a) => chapterGroup(a.chapter) === INTERNATIONAL_CHAPTER);
  if (abroad.length)
    groups.push(["International members by country", "Countries typed in by International chapter members",
      count(abroad, (a) => chapterCountry(a.chapter) || "Not given")]);

  return (
    <div className="stack">
      <div className="charts">
        <section className="card chart-card">
          <div className="card-head"><div><h2>Registrations per month</h2><p className="chart-title">New sign-ups over the last 12 months</p></div></div>
          <div className="card-pad"><Columns data={months} unit="registrations" /><TableView data={months} unit="Registrations" /></div>
        </section>
        <section className="card chart-card">
          <div className="card-head"><div><h2>Verification</h2><p className="chart-title">How many records the alumni office has checked</p></div></div>
          <div className="card-pad">
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "8px 0 14px" }}>
              <span style={{ font: "800 40px/1 var(--font-display)" }}>{pct(verified)}%</span>
              <span className="muted">verified ({verified} of {data.length})</span>
            </div>
            <div className="split" role="img" aria-label={`${verified} verified, ${pending} awaiting verification`}>
              {verified > 0 && <i style={{ width: `${pct(verified)}%`, background: "var(--chart-a)", borderRadius: "5px 0 0 5px" }} />}
              {pending > 0 && <i style={{ flex: 1, background: "var(--chart-b)", borderRadius: verified ? "0 5px 5px 0" : 5 }} />}
            </div>
            <div className="legend">
              <span><i style={{ background: "var(--chart-a)" }} />Verified · {verified}</span>
              <span><i style={{ background: "var(--chart-b)" }} />Awaiting verification · {pending}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="card chart-card">
        <div className="card-head"><div><h2>Alumni by year group</h2><p className="chart-title">Members per graduating class</p></div></div>
        <div className="card-pad"><Columns data={years} unit="alumni" /><TableView data={years} unit="Alumni" /></div>
      </section>

      <div className="charts">
        {groups.map(([title, sub, d]) => (
          <section className="card chart-card" key={title}>
            <div className="card-head"><div><h2>{title}</h2><p className="chart-title">{sub}</p></div></div>
            <div className="card-pad"><Bars data={d} total={data.length} /><TableView data={d} unit="Alumni" /></div>
          </section>
        ))}
      </div>
    </div>
  );
}
