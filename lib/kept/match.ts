import { activeKeptItems } from "./normalize";
import type { KeptHub, KeptItem } from "./types";

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return fold(value).split(" ").filter((t) => t.length > 1);
}

/** Score how well a query matches an item (0–1). */
export function scoreKeptMatch(item: KeptItem, query: string): number {
  const q = fold(query);
  if (!q) return 0;

  const names = [item.name, ...item.aliases].map(fold).filter(Boolean);
  const loc = fold(item.location);
  const notes = fold(item.notes);

  for (const name of names) {
    if (name === q) return 1;
    if (name.startsWith(q) || q.startsWith(name)) return 0.95;
    if (name.includes(q) || q.includes(name)) return 0.88;
  }

  if (loc === q) return 0.7;
  if (loc.includes(q) || q.includes(loc)) return 0.55;

  const qTokens = tokens(query);
  if (!qTokens.length) return 0;

  let best = 0;
  for (const name of names) {
    const nameTokens = new Set(tokens(name));
    const hit = qTokens.filter((t) => nameTokens.has(t)).length;
    best = Math.max(best, hit / qTokens.length);
  }

  const locTokens = new Set(tokens(item.location));
  const locHit = qTokens.filter((t) => locTokens.has(t)).length / qTokens.length;
  best = Math.max(best, locHit * 0.65);

  if (notes) {
    const noteHit = qTokens.filter((t) => notes.includes(t)).length / qTokens.length;
    best = Math.max(best, noteHit * 0.4);
  }

  return best;
}

export type KeptMatch = { item: KeptItem; score: number };

export function matchKeptItems(
  hub: KeptHub,
  query: string,
  opts?: { includePrivate?: boolean; limit?: number; minScore?: number },
): KeptMatch[] {
  const minScore = opts?.minScore ?? 0.35;
  const limit = opts?.limit ?? 8;
  const pool = activeKeptItems(hub, { includePrivate: opts?.includePrivate });

  return pool
    .map((item) => ({ item, score: scoreKeptMatch(item, query) }))
    .filter((row) => row.score >= minScore)
    .sort((a, b) => b.score - a.score || Date.parse(b.item.updatedAt) - Date.parse(a.item.updatedAt))
    .slice(0, limit);
}

export function matchByLocation(
  hub: KeptHub,
  location: string,
  opts?: { includePrivate?: boolean },
): KeptItem[] {
  const q = fold(location);
  if (!q) return [];
  return activeKeptItems(hub, { includePrivate: opts?.includePrivate }).filter((item) => {
    const loc = fold(item.location);
    return loc === q || loc.includes(q) || q.includes(loc);
  });
}

/** Targeted retrieval for AI — never send the whole collection. */
export function retrievalSnippet(
  hub: KeptHub,
  query: string,
  opts?: { includePrivate?: boolean; limit?: number },
): Array<{ id: string; name: string; location: string; aliases: string[] }> {
  const matches = matchKeptItems(hub, query, {
    includePrivate: opts?.includePrivate,
    limit: opts?.limit ?? 6,
    minScore: 0.2,
  });
  return matches.map(({ item }) => ({
    id: item.id,
    name: item.name,
    location: item.location,
    aliases: item.aliases.slice(0, 4),
  }));
}
