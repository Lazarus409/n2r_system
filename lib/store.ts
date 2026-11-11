import { randomUUID } from "crypto";
import { db } from "./db";
import type { Alumnus, AuditEntry, RegistrationInput } from "./types";

type Row = {
  id: string; honorific: string; name: string; gender: string; year: number; prog: string; phone: string; email: string;
  region: string; city: string; employment: string; employer: string; title: string; industry: string; chapter: string;
  verified: number; submitted_at: string; verified_at: string | null; updated_at: string | null; notes: string; sample: number;
};

const toAlumnus = (r: Row): Alumnus => ({
  id: r.id, honorific: r.honorific, name: r.name, gender: r.gender, year: r.year, prog: r.prog, phone: r.phone, email: r.email,
  region: r.region, city: r.city, employment: r.employment, employer: r.employer, title: r.title, industry: r.industry, chapter: r.chapter,
  consent: true, verified: !!r.verified, submittedAt: r.submitted_at, verifiedAt: r.verified_at,
  updatedAt: r.updated_at, notes: r.notes, sample: !!r.sample || undefined,
});

const now = () => new Date().toISOString();

function audit(actor: string, action: string, recordId: string | null, summary: string) {
  db().prepare("INSERT INTO audit_log (at, actor, action, record_id, summary) VALUES (?,?,?,?,?)").run(now(), actor, action, recordId, summary);
}

export function listAlumni(): Alumnus[] {
  return (db().prepare("SELECT * FROM alumni ORDER BY submitted_at DESC").all() as Row[]).map(toAlumnus);
}

export function getAlumnus(id: string): Alumnus | null {
  const r = db().prepare("SELECT * FROM alumni WHERE id = ?").get(id) as Row | undefined;
  return r ? toAlumnus(r) : null;
}

export type AddResult = { status: "created" | "updated"; record: Alumnus } | { status: "duplicate" };

/** Adds a registration. A repeat from the same person (name + year group) updates their record while it is still unverified. */
export function addAlumnus(v: RegistrationInput): AddResult {
  const d = db();
  return d.transaction((): AddResult => {
    const key = v.name.toLowerCase();
    const existing = d.prepare("SELECT * FROM alumni WHERE name_key = ? AND year = ?").get(key, v.year) as Row | undefined;
    const fields = { honorific: v.honorific, name: v.name, name_key: key, gender: v.gender, year: v.year, prog: v.prog, phone: v.phone, email: v.email,
      region: v.region, city: v.city, employment: v.employment, employer: v.employer, title: v.title, industry: v.industry, chapter: v.chapter };
    if (existing) {
      if (existing.verified) return { status: "duplicate" };
      d.prepare(`UPDATE alumni SET honorific=@honorific, name=@name, name_key=@name_key, gender=@gender, prog=@prog, phone=@phone, email=@email, region=@region,
        city=@city, employment=@employment, employer=@employer, title=@title, industry=@industry, chapter=@chapter, submitted_at=@at, updated_at=@at WHERE id=@id`)
        .run({ ...fields, at: now(), id: existing.id });
      audit("member", "registration.updated", existing.id, `${v.name} (${v.year}) resubmitted their details`);
      return { status: "updated", record: getAlumnus(existing.id)! };
    }
    const id = randomUUID();
    d.prepare(`INSERT INTO alumni (id,honorific,name,name_key,gender,year,prog,phone,email,region,city,employment,employer,title,industry,chapter,consent,verified,submitted_at)
      VALUES (@id,@honorific,@name,@name_key,@gender,@year,@prog,@phone,@email,@region,@city,@employment,@employer,@title,@industry,@chapter,1,0,@at)`)
      .run({ ...fields, id, at: now() });
    audit("member", "registration.created", id, `${v.name} (${v.year}) registered`);
    return { status: "created", record: getAlumnus(id)! };
  })();
}

/** Admin edit of a record's details and/or internal notes. Returns null if not found, "conflict" if it would duplicate another person. */
export function updateAlumnus(id: string, v: RegistrationInput | null, notes?: string): Alumnus | null | "conflict" {
  const d = db();
  return d.transaction(() => {
    const cur = getAlumnus(id);
    if (!cur) return null;
    if (v) {
      const clash = d.prepare("SELECT id FROM alumni WHERE name_key = ? AND year = ? AND id != ?").get(v.name.toLowerCase(), v.year, id);
      if (clash) return "conflict" as const;
      const changed = (Object.keys(v) as (keyof RegistrationInput)[]).filter((k) => k !== "consent" && String(cur[k as keyof Alumnus]) !== String(v[k]));
      d.prepare(`UPDATE alumni SET honorific=@honorific, name=@name, name_key=@name_key, gender=@gender, year=@year, prog=@prog, phone=@phone, email=@email, region=@region,
        city=@city, employment=@employment, employer=@employer, title=@title, industry=@industry, chapter=@chapter, updated_at=@at WHERE id=@id`)
        .run({ honorific: v.honorific, name: v.name, name_key: v.name.toLowerCase(), gender: v.gender, year: v.year, prog: v.prog, phone: v.phone, email: v.email,
          region: v.region, city: v.city, employment: v.employment, employer: v.employer, title: v.title, industry: v.industry, chapter: v.chapter, at: now(), id });
      if (changed.length) audit("admin", "record.edited", id, `Edited ${v.name}: ${changed.join(", ")}`);
    }
    if (notes !== undefined && notes !== cur.notes) {
      d.prepare("UPDATE alumni SET notes = ?, updated_at = ? WHERE id = ?").run(notes.slice(0, 2000), now(), id);
      audit("admin", "record.notes", id, `Updated notes for ${v?.name ?? cur.name}`);
    }
    return getAlumnus(id);
  })();
}

export function setVerified(ids: string[], verified: boolean): number {
  const d = db();
  return d.transaction(() => {
    let n = 0;
    const at = verified ? now() : null;
    for (const id of ids) {
      const r = d.prepare("UPDATE alumni SET verified = ?, verified_at = ?, updated_at = ? WHERE id = ? AND verified != ?")
        .run(verified ? 1 : 0, at, now(), id, verified ? 1 : 0);
      if (r.changes) {
        n++;
        const a = getAlumnus(id);
        audit("admin", verified ? "record.verified" : "record.unverified", id, `${verified ? "Verified" : "Marked unverified"}: ${a?.name}`);
      }
    }
    return n;
  })();
}

export function deleteAlumni(ids: string[]): number {
  const d = db();
  return d.transaction(() => {
    let n = 0;
    for (const id of ids) {
      const a = getAlumnus(id);
      if (!a) continue;
      d.prepare("DELETE FROM alumni WHERE id = ?").run(id);
      if (!a.sample) audit("admin", "record.deleted", id, `Deleted ${a.name} (${a.year})`);
      n++;
    }
    return n;
  })();
}

export function deleteSamples(): number {
  const n = db().prepare("DELETE FROM alumni WHERE sample = 1").run().changes;
  if (n) audit("admin", "samples.removed", null, `Removed ${n} sample records`);
  return n;
}

export function recordLogin(ok: boolean, ip: string) {
  audit("admin", ok ? "auth.login" : "auth.failed", null, ok ? "Signed in" : `Failed sign-in attempt from ${ip}`);
}

export function listAudit(limit = 200): AuditEntry[] {
  return (db().prepare("SELECT id, at, actor, action, record_id recordId, summary FROM audit_log ORDER BY id DESC LIMIT ?").all(limit)) as AuditEntry[];
}

export function healthCheck(): boolean {
  return (db().prepare("SELECT 1 ok").get() as { ok: number }).ok === 1;
}
