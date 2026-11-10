"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Brand from "@/app/Brand";
import ThemeToggle from "@/app/ThemeToggle";
import { IconActivity, IconAlert, IconChart, IconList, IconLogout, IconSparkle, IconUsers, IconX } from "@/app/components/Icons";
import type { Alumnus } from "@/lib/types";
import type { AdminAccount } from "@/lib/account";
import Directory from "./_components/Directory";
import RecordDrawer from "./_components/RecordDrawer";
import Reports from "./_components/Reports";
import Activity from "./_components/Activity";
import Account from "./_components/Account";
import { useToasts } from "./_components/Toasts";
import { useConfirm } from "./_components/Confirm";
import { api } from "./_components/util";

type Tab = "dir" | "rep" | "act" | "acct";
const POLL_MS = 15000;
const SEEN_KEY = "nar.lastSeen";

const readSeen = () => { try { return localStorage.getItem(SEEN_KEY) || ""; } catch { return ""; } };
const writeSeen = (v: string) => { try { localStorage.setItem(SEEN_KEY, v); } catch { /* ignore */ } };

export default function AdminPage() {
  const [data, setData] = useState<Alumnus[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("dir");
  const [openId, setOpenId] = useState<string | null>(null);
  const [seen, setSeen] = useState("");
  const [toasts, toast] = useToasts();
  const [dialog, confirm] = useConfirm();
  const known = useRef<Set<string> | null>(null);
  const [admin, setAdmin] = useState<AdminAccount | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api<Alumnus[]>("/api/alumni");
      // Announce registrations that arrive while the dashboard is open
      if (known.current) {
        const fresh = list.filter((a) => !known.current!.has(a.id) && !a.sample);
        if (fresh.length) toast("success", fresh.length === 1 ? `New registration: ${fresh[0].name}` : `${fresh.length} new registrations`);
      }
      known.current = new Set(list.map((a) => a.id));
      setData(list);
      setLoadError("");
    } catch (e) {
      if ((e as Error).message !== "Signed out") setLoadError("Couldn't reach the server. Retrying automatically…");
    }
  }, [toast]);

  useEffect(() => {
    setSeen(readSeen());
    load();
    api<AdminAccount>("/api/account").then(setAdmin).catch(() => {});
    const t = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);

  const list = data ?? [];
  const newCount = seen ? list.filter((a) => !a.sample && a.submittedAt > seen).length : 0;
  const markSeen = useCallback(() => {
    const latest = (data ?? []).reduce((m, a) => (a.submittedAt > m ? a.submittedAt : m), readSeen() || new Date(0).toISOString());
    writeSeen(latest);
    setSeen(latest);
  }, [data]);
  // First visit ever: treat everything already there as seen.
  useEffect(() => { if (data && !readSeen()) markSeen(); }, [data, markSeen]);

  const open = list.find((a) => a.id === openId) || null;

  function onChanged(updated: Alumnus | null) {
    if (!updated) { setData((d) => d?.filter((a) => a.id !== openId) ?? d); setOpenId(null); return; }
    setData((d) => d?.map((a) => (a.id === updated.id ? updated : a)) ?? d);
  }

  async function onBulk(action: "verify" | "unverify" | "delete", ids: string[]) {
    if (action === "delete") {
      const ok = await confirm({ title: `Delete ${ids.length} record${ids.length > 1 ? "s" : ""}?`, body: "These records will be permanently removed from the register. This can't be undone.", confirm: "Delete", danger: true });
      if (!ok) return false;
    }
    try {
      const { changed } = await api<{ changed: number }>("/api/alumni/bulk", { method: "POST", json: { action, ids } });
      const verb = action === "verify" ? "verified" : action === "unverify" ? "marked unverified" : "deleted";
      toast("success", `${changed} record${changed === 1 ? "" : "s"} ${verb}.`);
      await load();
      return true;
    } catch (e) { toast("error", (e as Error).message); return false; }
  }

  async function copyLink() {
    const url = `${window.location.origin}/register`;
    try { await navigator.clipboard.writeText(url); toast("success", "Registration link copied. Paste it into WhatsApp, email or SMS."); }
    catch { window.prompt("Copy this registration link:", url); }
  }

  async function removeSamples() {
    const n = list.filter((a) => a.sample).length;
    if (!(await confirm({ title: `Remove ${n} sample records?`, body: "Only the fictional sample records are removed. Real registrations are kept.", confirm: "Remove samples", danger: true }))) return;
    try { await api("/api/alumni?sample=1", { method: "DELETE" }); toast("success", "Sample records removed."); load(); }
    catch (e) { toast("error", (e as Error).message); }
  }

  async function signOut() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  }

  const samples = list.filter((a) => a.sample).length;
  const pending = list.filter((a) => !a.verified).length;
  const TABS: [Tab, string, React.ReactNode, number][] = [
    ["dir", "Directory", <IconList key="l" size={16} />, pending],
    ["rep", "Reports", <IconChart key="c" size={16} />, 0],
    ["act", "Activity", <IconActivity key="a" size={16} />, 0],
    ["acct", "Account", <IconUsers key="u" size={16} />, admin?.usingInitialPassword ? 1 : 0],
  ];

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <div className="bar">
            <Brand />
            <div className="header-actions">
              <ThemeToggle />
              {admin && (
                <button className="btn on-dark hide-xs" onClick={() => setTab("acct")} title="Your account">
                  <span className="avatar" style={{ width: 24, height: 24, fontSize: 10.5, background: "var(--gold)", color: "#132d0b" }}>{admin.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span>{admin.name}
                </button>
              )}
              <button className="btn on-dark" onClick={signOut} aria-label="Sign out"><IconLogout size={16} /><span className="hide-xs">Sign out</span></button>
            </div>
          </div>
          <nav className="tabs" role="tablist" aria-label="Dashboard sections">
            {TABS.map(([t, label, icon, badge]) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {icon}{label}{badge > 0 && <span className="count" title={t === "acct" ? "Set your own password" : `${badge} awaiting verification`}>{t === "acct" ? "!" : badge}</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="page">
        <div className="wrap stack">
          {loadError && <div className="alert error"><IconAlert />{loadError}</div>}

          {newCount > 0 && tab === "dir" && (
            <div className="alert info" style={{ alignItems: "center" }}>
              <IconSparkle />
              <span style={{ flex: 1 }}>{newCount} new registration{newCount > 1 ? "s" : ""} since your last visit, highlighted below.</span>
              <button className="btn secondary sm" onClick={markSeen}>Mark as seen</button>
            </div>
          )}

          {samples > 0 && tab === "dir" && (
            <div className="alert info" style={{ alignItems: "center" }}>
              <IconAlert />
              <span style={{ flex: 1 }}>The directory includes {samples} fictional sample records for testing.</span>
              <button className="btn secondary sm" onClick={removeSamples}><IconX size={14} />Remove samples</button>
            </div>
          )}

          {tab === "dir" && <Directory data={data} seen={seen} onOpen={(a) => setOpenId(a.id)} onBulk={onBulk} onCopyLink={copyLink} />}
          {tab === "rep" && <Reports data={list} />}
          {tab === "act" && <Activity />}
          {tab === "acct" && <Account toast={toast} onProfile={setAdmin} />}
        </div>
      </main>

      {open && <RecordDrawer record={open} onClose={() => setOpenId(null)} onChanged={onChanged} toast={toast} confirm={confirm} />}
      {dialog}
      {toasts}
    </>
  );
}
