// Adds 28 fictional sample records to data/alumni.json (marked sample: true so they can be removed from the dashboard).
// Usage: npm run seed
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { CHAPTERS, INDUSTRIES, REGIONS } from "../lib/constants";
import type { Alumnus } from "../lib/types";

const FILE = path.join(process.cwd(), "data", "alumni.json");

const FIRST_NAMES = ["Ama", "Kwame", "Esi", "Kofi", "Abena", "Yaw", "Akosua", "Kojo", "Efua", "Kwesi", "Adwoa", "Nana", "Fiifi", "Maame", "Selorm", "Dela", "Zainab", "Ibrahim", "Mariam", "Yakubu"];
const LAST_NAMES = ["Mensah", "Owusu", "Boateng", "Asante", "Appiah", "Quaye", "Tetteh", "Agyeman", "Danso", "Ofori", "Amoah", "Adjei", "Sarpong", "Nkrumah", "Abdulai", "Kuffour", "Darko", "Annan"];
const CAPITALS: Record<string, string> = {
  "Greater Accra": "Accra", Ashanti: "Kumasi", Western: "Takoradi", Central: "Cape Coast", Eastern: "Koforidua",
  Volta: "Ho", Northern: "Tamale", "Upper East": "Bolgatanga", "Upper West": "Wa", Bono: "Sunyani",
};
const EMPLOYERS = ["Korle Bu Teaching Hospital", "GCB Bank", "Ghana Education Service", "Meltwater", "Ministry of Finance", "Fidelity Bank", "Joy FM", "Kasapreko", "University of Ghana", "Self-employed"];
const TITLES = ["Teacher", "Nurse", "Analyst", "Software developer", "Farm manager", "Lawyer", "Civil engineer", "Administrator", "Producer", "Trader"];
const SAMPLE_YEARS = Array.from({ length: 30 }, (_, i) => 2024 - i);

/** Deterministic pseudo-random index so the sample set is the same every time. */
const rnd = (i: number, n: number) => (i * 7 + i * i * 3 + 11) % n;

async function readExisting(): Promise<Alumnus[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Alumnus[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

function makeSamples(count: number): Alumnus[] {
  return Array.from({ length: count }, (_, i) => {
    const fn = FIRST_NAMES[(i * 3) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 5 + 2) % LAST_NAMES.length];
    const region = REGIONS[rnd(i, REGIONS.length)];
    const ix = rnd(i + 3, INDUSTRIES.length);
    return {
      id: randomUUID(),
      name: `${fn} ${ln}`,
      gender: i % 2 ? "Male" : "Female",
      year: SAMPLE_YEARS[(i * 3) % SAMPLE_YEARS.length],
      prog: ["General Arts", "General Science", "Business"][i % 3],
      phone: "024" + (4100000 + i * 37311).toString().slice(0, 7),
      email: `${fn}.${ln}@example.com`.toLowerCase(),
      region,
      city: CAPITALS[region],
      employer: EMPLOYERS[ix],
      title: TITLES[ix],
      industry: INDUSTRIES[ix],
      chapter: CHAPTERS[rnd(i, CHAPTERS.length)],
      verified: i % 3 !== 0,
      consent: true,
      submittedAt: "2020-01-01T00:00:00.000Z",
      sample: true,
    };
  });
}

async function main() {
  const existing = await readExisting();
  if (existing.some((a) => a.sample)) {
    console.log("Sample records are already present. Nothing to do.");
    return;
  }
  const samples = makeSamples(28);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify([...existing, ...samples], null, 2));
  console.log(`Added ${samples.length} sample records to ${FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
