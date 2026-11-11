/** Titles shown before a person's name. */
export const HONORIFICS = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Rev", "Pastor", "Hon", "Nana"];
/** Extra title choice. People who pick it type their own title, and what they type is saved. */
export const OTHER_HONORIFIC = "Other";
/** True for a title someone typed in, i.e. one that isn't in HONORIFICS. */
export const isOtherHonorific = (honorific: string) => !!honorific && !HONORIFICS.includes(honorific);
/** "Dr" + "Ama Mensah" -> "Dr Ama Mensah". */
export const fullName = (a: { honorific?: string; name: string }) => (a.honorific ? `${a.honorific} ${a.name}` : a.name);

export const EMPLOYMENT_STATUSES = [
  "Employed (full-time)",
  "Employed (part-time)",
  "Self-employed",
  "Unemployed",
  "Student",
  "Retired",
];

export const REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
];
/** Extra region choice. People who pick it type their own region, and what they type is saved. */
export const OTHER_REGION = "Other";
/** True for a region someone typed in, i.e. one that isn't in REGIONS. */
export const isOtherRegion = (region: string) => !!region && !REGIONS.includes(region);
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
/** Extra industry choice. People who pick it type their own industry, and what they type is saved. */
export const OTHER_INDUSTRY = "Other";
/** True for an industry someone typed in, i.e. one that isn't in INDUSTRIES. */
export const isOtherIndustry = (industry: string) => !!industry && !INDUSTRIES.includes(industry);
export const CHAPTERS = [
  "Accra",
  "Kumasi",
  "Takoradi",
  "Cape Coast",
  "Ho",
  "Tamale",
  "International",
];
/**
 * People who choose the International chapter also type their country.
 * It is saved in the chapter itself as "International (Canada)".
 */
export const INTERNATIONAL_CHAPTER = "International";
export const internationalChapter = (country: string) => `${INTERNATIONAL_CHAPTER} (${country})`;
/** "International (Canada)" -> "Canada". Anything else -> "". */
export function chapterCountry(chapter: string) {
  const m = /^International \((.*)\)$/.exec(chapter);
  return m ? m[1].trim() : "";
}
/** The chapter without the country: "International (Canada)" -> "International". */
export const chapterGroup = (chapter: string) =>
  chapter.startsWith(`${INTERNATIONAL_CHAPTER} (`) ? INTERNATIONAL_CHAPTER : chapter;
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
