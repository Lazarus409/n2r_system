"use client";

import { useEffect, useState } from "react";
import { IconActivity, IconAlert, IconCheck, IconEdit, IconLock, IconRefresh, IconTrash, IconUserPlus } from "@/app/components/Icons";
import type { AuditEntry } from "@/lib/types";
import { api, fullDate, timeAgo } from "./util";

const ICONS: Record<string, [React.ReactNode, string]> = {
  "registration.created": [<IconUserPlus key="a" size={16} />, ""],
  "registration.updated": [<IconEdit key="b" size={16} />, "gold"],
  "record.verified": [<IconCheck key="c" size={16} />, ""],
  "record.unverified": [<IconAlert key="d" size={16} />, "gold"],
  "record.edited": [<IconEdit key="e" size={16} />, "gold"],
  "record.notes": [<IconEdit key="f" size={16} />, "gold"],
  "record.deleted": [<IconTrash key="g" size={16} />, "warn"],
  "samples.removed": [<IconTrash key="h" size={16} />, "warn"],
  "auth.login": [<IconLock key="i" size={16} />, ""],
  "auth.failed": [<IconLock key="j" size={16} />, "warn"],
};

export default function Activity() {
  const [items, setItems] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    api<AuditEntry[]>("/api/audit").then(setItems).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  return (
    <section className="card">
      <div className="card-head">
        <div><h2>Activity log</h2><p className="muted">Every registration and admin action, newest first.</p></div>
        <button className="btn secondary" onClick={load}><IconRefresh size={16} />Refresh</button>
      </div>
      {error && <div className="alert error" style={{ margin: 16 }}><IconAlert />{error}</div>}
      {items === null && !error && <div className="card-pad"><span className="skeleton" style={{ width: "60%" }} /></div>}
      {items?.length === 0 && <div className="empty"><IconActivity size={40} /><h3>No activity yet</h3></div>}
      <ul className="activity">
        {items?.map((it) => {
          const [icon, tone] = ICONS[it.action] || [<IconActivity key="z" size={16} />, ""];
          return (
            <li key={it.id}>
              <span className={`ico ${tone}`}>{icon}</span>
              <span>{it.summary}<span className="muted" style={{ fontSize: 12.5 }}> · by {it.actor}</span></span>
              <time dateTime={it.at} title={fullDate(it.at)}>{timeAgo(it.at)}</time>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
