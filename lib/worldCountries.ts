/** Canonical country list for Study Abroad pickers — prevents free-text duplicates. */

export type WorldCountry = {
  name: string;
  code: string; // ISO 3166-1 alpha-2
  aliases?: string[];
};

export const WORLD_COUNTRIES: WorldCountry[] = [
  { name: "Afghanistan", code: "AF" },
  { name: "Albania", code: "AL" },
  { name: "Algeria", code: "DZ" },
  { name: "Argentina", code: "AR" },
  { name: "Armenia", code: "AM" },
  { name: "Australia", code: "AU" },
  { name: "Austria", code: "AT" },
  { name: "Azerbaijan", code: "AZ" },
  { name: "Bahrain", code: "BH" },
  { name: "Bangladesh", code: "BD" },
  { name: "Belarus", code: "BY" },
  { name: "Belgium", code: "BE" },
  { name: "Bosnia and Herzegovina", code: "BA", aliases: ["bosnia"] },
  { name: "Brazil", code: "BR" },
  { name: "Bulgaria", code: "BG" },
  { name: "Canada", code: "CA" },
  { name: "Chile", code: "CL" },
  { name: "China", code: "CN", aliases: ["prc"] },
  { name: "Colombia", code: "CO" },
  { name: "Croatia", code: "HR" },
  { name: "Cyprus", code: "CY" },
  { name: "Czechia", code: "CZ", aliases: ["czech republic", "czechia"] },
  { name: "Denmark", code: "DK" },
  { name: "Egypt", code: "EG" },
  { name: "Estonia", code: "EE" },
  { name: "Finland", code: "FI" },
  { name: "France", code: "FR" },
  { name: "Georgia", code: "GE" },
  { name: "Germany", code: "DE", aliases: ["deutschland"] },
  { name: "Ghana", code: "GH" },
  { name: "Greece", code: "GR" },
  { name: "Hong Kong", code: "HK" },
  { name: "Hungary", code: "HU" },
  { name: "Iceland", code: "IS" },
  { name: "India", code: "IN" },
  { name: "Indonesia", code: "ID" },
  { name: "Iran", code: "IR" },
  { name: "Iraq", code: "IQ" },
  { name: "Ireland", code: "IE", aliases: ["republic of ireland", "eire"] },
  { name: "Israel", code: "IL" },
  { name: "Italy", code: "IT" },
  { name: "Japan", code: "JP" },
  { name: "Jordan", code: "JO" },
  { name: "Kazakhstan", code: "KZ" },
  { name: "Kenya", code: "KE" },
  { name: "South Korea", code: "KR", aliases: ["korea", "republic of korea"] },
  { name: "Kuwait", code: "KW" },
  { name: "Latvia", code: "LV" },
  { name: "Lebanon", code: "LB" },
  { name: "Lithuania", code: "LT" },
  { name: "Luxembourg", code: "LU" },
  { name: "Malaysia", code: "MY" },
  { name: "Malta", code: "MT" },
  { name: "Mexico", code: "MX" },
  { name: "Morocco", code: "MA" },
  { name: "Nepal", code: "NP" },
  { name: "Netherlands", code: "NL", aliases: ["holland", "the netherlands"] },
  { name: "New Zealand", code: "NZ" },
  { name: "Nigeria", code: "NG" },
  { name: "Norway", code: "NO" },
  { name: "Oman", code: "OM" },
  { name: "Pakistan", code: "PK" },
  { name: "Palestine", code: "PS" },
  { name: "Peru", code: "PE" },
  { name: "Philippines", code: "PH" },
  { name: "Poland", code: "PL" },
  { name: "Portugal", code: "PT" },
  { name: "Qatar", code: "QA" },
  { name: "Romania", code: "RO" },
  { name: "Russia", code: "RU", aliases: ["russian federation"] },
  { name: "Saudi Arabia", code: "SA" },
  { name: "Serbia", code: "RS" },
  { name: "Singapore", code: "SG" },
  { name: "Slovakia", code: "SK" },
  { name: "Slovenia", code: "SI" },
  { name: "South Africa", code: "ZA" },
  { name: "Spain", code: "ES" },
  { name: "Sri Lanka", code: "LK" },
  { name: "Sweden", code: "SE" },
  { name: "Switzerland", code: "CH" },
  { name: "Taiwan", code: "TW" },
  { name: "Thailand", code: "TH" },
  { name: "Turkey", code: "TR", aliases: ["türkiye", "turkiye"] },
  { name: "Ukraine", code: "UA" },
  { name: "United Arab Emirates", code: "AE", aliases: ["uae", "emirates"] },
  { name: "United Kingdom", code: "GB", aliases: ["uk", "britain", "great britain", "england", "scotland", "wales"] },
  { name: "United States", code: "US", aliases: ["usa", "america", "united states of america"] },
  { name: "Uzbekistan", code: "UZ" },
  { name: "Vietnam", code: "VN" },
];

export function countryFlagEmoji(code?: string) {
  if (!code || code.length !== 2) return "🏳️";
  const upper = code.toUpperCase();
  return String.fromCodePoint(...[...upper].map((char) => 127397 + char.charCodeAt(0)));
}

export function findWorldCountry(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return WORLD_COUNTRIES.find((item) =>
    item.name.toLowerCase() === q
    || item.code.toLowerCase() === q
    || item.aliases?.some((alias) => alias === q),
  );
}

export function searchWorldCountries(query: string, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return WORLD_COUNTRIES.slice(0, limit);
  const scored = WORLD_COUNTRIES.map((item) => {
    const name = item.name.toLowerCase();
    const code = item.code.toLowerCase();
    const aliasHit = item.aliases?.some((alias) => alias.includes(q) || q.includes(alias));
    let score = 0;
    if (name === q || code === q) score = 100;
    else if (name.startsWith(q) || code.startsWith(q)) score = 80;
    else if (aliasHit) score = 70;
    else if (name.includes(q)) score = 40;
    return { item, score };
  }).filter((entry) => entry.score > 0);
  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return scored.slice(0, limit).map((entry) => entry.item);
}
