import type { Alumnus } from "@/lib/types";

export const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(s);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
export const fullDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export function downloadCsv(rows: Alumnus[], filename: string) {
  const cols: [keyof Alumnus, string][] = [
    ["name", "Full name"], ["gender", "Gender"], ["year", "Year group"], ["prog", "Programme"], ["phone", "Phone"], ["email", "Email"],
    ["region", "Region"], ["city", "City"], ["employer", "Employer"], ["title", "Job title"], ["industry", "Industry"],
    ["chapter", "Chapter"], ["verified", "Verified"], ["submittedAt", "Registered"], ["verifiedAt", "Verified on"], ["notes", "Notes"],
  ];
  const cell = (v: unknown) => {
    let s = typeof v === "boolean" ? (v ? "Yes" : "No") : String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection from member-entered text
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const csv = [cols.map((c) => c[1]).join(","), ...rows.map((a) => cols.map(([k]) => cell(a[k])).join(","))].join("\r\n");
  // BOM so Excel opens names with accents correctly
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** fetch wrapper: JSON in/out, throws Error(message) on failure, redirects to login on 401. */
export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  if (res.status === 401) {
    window.location.href = "/login?next=/admin";
    throw new Error("Signed out");
  }
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(out.message || `Request failed (${res.status})`), { details: out });
  return out as T;
}
