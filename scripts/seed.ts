// Adds 28 fictional sample records to the database (flagged as samples so they can be removed from the dashboard in one click).
// Usage: npm run seed
import { randomUUID } from "crypto";
import { db } from "../lib/db";
import { CHAPTERS, INDUSTRIES, PROGRAMMES, REGIONS } from "../lib/constants";

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

function main() {
  const d = db();
  const existing = (d.prepare("SELECT COUNT(*) n FROM alumni WHERE sample = 1").get() as { n: number }).n;
  if (existing) {
    console.log("Sample records are already present. Nothing to do.");
    return;
  }
  const insert = d.prepare(`INSERT OR IGNORE INTO alumni
    (id,name,name_key,gender,year,prog,phone,email,region,city,employer,title,industry,chapter,consent,verified,submitted_at,verified_at,sample)
    VALUES (@id,@name,@name_key,@gender,@year,@prog,@phone,@email,@region,@city,@employer,@title,@industry,@chapter,1,@verified,@submitted,@verifiedAt,1)`);
  let added = 0;
  d.transaction(() => {
    for (let i = 0; i < 28; i++) {
      const fn = FIRST_NAMES[(i * 3) % FIRST_NAMES.length];
      const ln = LAST_NAMES[(i * 5 + 2) % LAST_NAMES.length];
      const region = REGIONS[rnd(i, REGIONS.length)];
      const ix = rnd(i + 3, INDUSTRIES.length);
      const name = `${fn} ${ln}`;
      const submitted = new Date(Date.now() - ((i * 13) % 330) * 86400_000).toISOString();
      const verified = i % 3 !== 0;
      added += insert.run({
        id: randomUUID(), name, name_key: name.toLowerCase(), gender: i % 2 ? "Male" : "Female",
        year: SAMPLE_YEARS[(i * 3) % SAMPLE_YEARS.length], prog: PROGRAMMES[i % PROGRAMMES.length],
        phone: "024" + (4100000 + i * 37311).toString().slice(0, 7), email: `${fn}.${ln}@example.com`.toLowerCase(),
        region, city: CAPITALS[region], employer: EMPLOYERS[ix], title: TITLES[ix], industry: INDUSTRIES[ix],
        chapter: CHAPTERS[rnd(i, CHAPTERS.length)], verified: verified ? 1 : 0, submitted, verifiedAt: verified ? submitted : null,
      }).changes;
    }
  })();
  console.log(`Added ${added} sample records.`);
}

main();
