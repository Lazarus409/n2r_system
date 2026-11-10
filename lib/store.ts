import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Alumnus, RegistrationInput } from "./types";

/**
 * Records are kept in a JSON file on the server (data/alumni.json).
 * Fine for a single server or a VPS. To deploy on a host with a read-only filesystem (e.g. Vercel),
 * swap these functions for a database; nothing else in the app needs to change.
 */
const FILE = path.join(process.cwd(), "data", "alumni.json");

let queue: Promise<unknown> = Promise.resolve();
/** Serialise all read-modify-write operations so two simultaneous registrations can't overwrite each other. */
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<Alumnus[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function writeAll(list: Alumnus[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(list, null, 2));
  await fs.rename(tmp, FILE); // atomic replace, so a crash never leaves a half-written file
}

const key = (a: { name: string; year: number }) => a.name.toLowerCase() + "|" + a.year;

export function listAlumni() {
  return locked(readAll);
}

export type AddResult = { status: "created" | "updated"; record: Alumnus } | { status: "duplicate" };

/** Adds a registration. A repeat from the same person (name + year group) updates their record while it is still unverified. */
export function addAlumnus(input: RegistrationInput): Promise<AddResult> {
  return locked(async () => {
    const list = await readAll();
    const existing = list.find((a) => key(a) === key(input));
    const now = new Date().toISOString();
    if (existing) {
      if (existing.verified) return { status: "duplicate" as const };
      Object.assign(existing, { ...input, consent: true, submittedAt: now });
      await writeAll(list);
      return { status: "updated" as const, record: existing };
    }
    const record: Alumnus = { ...input, consent: true, id: randomUUID(), verified: false, submittedAt: now };
    list.push(record);
    await writeAll(list);
    return { status: "created" as const, record };
  });
}

export function setVerified(id: string, verified: boolean) {
  return locked(async () => {
    const list = await readAll();
    const a = list.find((x) => x.id === id);
    if (!a) return null;
    a.verified = verified;
    a.verifiedAt = verified ? new Date().toISOString() : undefined;
    await writeAll(list);
    return a;
  });
}

export function deleteAlumni(ids: string[]) {
  return locked(async () => {
    const list = await readAll();
    const keep = list.filter((a) => !ids.includes(a.id));
    await writeAll(keep);
    return list.length - keep.length;
  });
}
