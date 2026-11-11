export const REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Volta",
  "Northern",
  "Upper East",
  "Upper West",
  "Bono",
];
export const INDUSTRIES = [
  "Education",
  "Health",
  "Finance",
  "Technology",
  "Agriculture",
  "Law",
  "Engineering",
  "Public Service",
  "Media",
  "Trade",
];
export const CHAPTERS = [
  "Accra",
  "Kumasi",
  "Takoradi",
  "Cape Coast",
  "Ho",
  "Tamale",
  "International",
];
export const PROGRAMMES = [
  "General Arts",
  "General Science",
  "Business",
  "Visual Arts",
  "Home Economics",
  "Agriculture",
];
export const GENDERS = ["Female", "Male"];
export const FIRST_YEAR = 1960;

export function yearGroups(): number[] {
  const out: number[] = [];
  for (let y = new Date().getFullYear(); y >= FIRST_YEAR; y--) out.push(y);
  return out;
}
