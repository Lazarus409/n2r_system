import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

/**
 * SQLite database (one file, no separate server).
 * Location: DATABASE_PATH env var, or data/alumni.db in the project folder.
 * WAL mode lets the dashboard read while registrations are being written.
 */
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "alumni.db");

const MIGRATIONS: string[] = [
  // v1
  `CREATE TABLE alumni (
     id            TEXT PRIMARY KEY,
     name          TEXT NOT NULL,
     name_key      TEXT NOT NULL,
     gender        TEXT NOT NULL,
     year          INTEGER NOT NULL,
     prog          TEXT NOT NULL,
     phone         TEXT NOT NULL,
     email         TEXT NOT NULL,
     region        TEXT NOT NULL,
     city          TEXT NOT NULL,
     employer      TEXT NOT NULL DEFAULT '',
     title         TEXT NOT NULL DEFAULT '',
     industry      TEXT NOT NULL,
     chapter       TEXT NOT NULL,
     consent       INTEGER NOT NULL DEFAULT 1,
     verified      INTEGER NOT NULL DEFAULT 0,
     submitted_at  TEXT NOT NULL,
     verified_at   TEXT,
     updated_at    TEXT,
     notes         TEXT NOT NULL DEFAULT '',
     sample        INTEGER NOT NULL DEFAULT 0
   );
   CREATE UNIQUE INDEX alumni_person ON alumni(name_key, year);
   CREATE INDEX alumni_submitted ON alumni(submitted_at);
   CREATE TABLE audit_log (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     at         TEXT NOT NULL,
     actor      TEXT NOT NULL,
     action     TEXT NOT NULL,
     record_id  TEXT,
     summary    TEXT NOT NULL DEFAULT ''
   );
   CREATE INDEX audit_at ON audit_log(at);`,
  // v2: the admin account (single row). Created on first sign-in from ADMIN_PASSWORD, then managed in the dashboard.
  `CREATE TABLE admin_account (
     id                   INTEGER PRIMARY KEY CHECK (id = 1),
     name                 TEXT NOT NULL,
     email                TEXT NOT NULL DEFAULT '',
     phone                TEXT NOT NULL DEFAULT '',
     password_hash        TEXT NOT NULL,
     session_version      INTEGER NOT NULL DEFAULT 1,
     password_changed_at  TEXT,
     updated_at           TEXT NOT NULL
   );`,
];

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  const version = db.pragma("user_version", { simple: true }) as number;
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
  importLegacyJson(db);
  return db;
}

/** One-time import of records from the earlier JSON-file storage (data/alumni.json). */
function importLegacyJson(db: Database.Database) {
  const legacy = path.join(path.dirname(DB_PATH), "alumni.json");
  if (!fs.existsSync(legacy)) return;
  const count = (db.prepare("SELECT COUNT(*) n FROM alumni").get() as { n: number }).n;
  if (count > 0) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = JSON.parse(fs.readFileSync(legacy, "utf8"));
  const insert = db.prepare(`INSERT OR IGNORE INTO alumni
    (id,name,name_key,gender,year,prog,phone,email,region,city,employer,title,industry,chapter,consent,verified,submitted_at,verified_at,sample)
    VALUES (@id,@name,@name_key,@gender,@year,@prog,@phone,@email,@region,@city,@employer,@title,@industry,@chapter,1,@verified,@submittedAt,@verifiedAt,@sample)`);
  db.transaction(() => {
    for (const r of rows) {
      insert.run({
        ...r, name_key: String(r.name).toLowerCase(), employer: r.employer || "", title: r.title || "",
        verified: r.verified ? 1 : 0, verifiedAt: r.verifiedAt || null, sample: r.sample ? 1 : 0,
      });
    }
  })();
  fs.renameSync(legacy, legacy + ".imported");
  console.log(`[db] Imported ${rows.length} records from ${legacy}`);
}

// Reuse one connection across hot reloads in development.
const g = globalThis as unknown as { __narDb?: Database.Database };
export function db(): Database.Database {
  if (!g.__narDb) g.__narDb = open();
  return g.__narDb;
}
