import {
  KEPT_MAX_ALIASES,
  KEPT_MAX_LOCATION,
  KEPT_MAX_LOCATION_HISTORY,
  KEPT_MAX_NAME,
  KEPT_MAX_NOTES,
  emptyKeptHub,
  type KeptHub,
  type KeptItem,
  type KeptLocationEntry,
  type KeptPrivacy,
} from "./types";

const ISOish = /^\d{4}-\d{2}-\d{2}T/;

function asString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function asPrivacy(value: unknown): KeptPrivacy {
  return value === "private" ? "private" : "normal";
}

function asIso(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return fallback;
  return new Date(t).toISOString();
}

function asId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim().slice(0, 64);
  return id.length > 0 ? id : null;
}

export function normalizeLocationEntry(raw: unknown, now: string): KeptLocationEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;
  const location = asString(entry.location, KEPT_MAX_LOCATION);
  if (!location) return null;
  const note = asString(entry.note, 280);
  return {
    location,
    at: asIso(entry.at, now),
    ...(note ? { note } : {}),
  };
}

/** Newest-first, deduped consecutive locations, hard-capped. */
export function boundLocationHistory(
  entries: KeptLocationEntry[],
  max = KEPT_MAX_LOCATION_HISTORY,
): KeptLocationEntry[] {
  const sorted = [...entries].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const out: KeptLocationEntry[] = [];
  for (const entry of sorted) {
    const prev = out[out.length - 1];
    if (prev && prev.location.toLowerCase() === entry.location.toLowerCase()) {
      // Keep the newer timestamp; skip duplicate consecutive place.
      continue;
    }
    out.push(entry);
    if (out.length >= max) break;
  }
  return out;
}

export function normalizeKeptItem(raw: unknown, now = new Date().toISOString()): KeptItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = asId(row.id);
  const name = asString(row.name, KEPT_MAX_NAME);
  const location = asString(row.location, KEPT_MAX_LOCATION);
  if (!id || !name || !location) return null;

  const aliasesRaw = Array.isArray(row.aliases) ? row.aliases : [];
  const aliases = aliasesRaw
    .filter((a): a is string => typeof a === "string")
    .map((a) => a.trim().slice(0, KEPT_MAX_NAME))
    .filter(Boolean)
    .slice(0, KEPT_MAX_ALIASES);

  const historyRaw = Array.isArray(row.locationHistory) ? row.locationHistory : [];
  const locationHistory = boundLocationHistory(
    historyRaw
      .map((e) => normalizeLocationEntry(e, now))
      .filter((e): e is KeptLocationEntry => Boolean(e)),
  );

  const createdAt = asIso(row.createdAt, now);
  const updatedAt = asIso(row.updatedAt, createdAt);
  const notes = asString(row.notes, KEPT_MAX_NOTES);
  const photoUrl =
    typeof row.photoUrl === "string" && row.photoUrl.trim().startsWith("http")
      ? row.photoUrl.trim().slice(0, 2_000)
      : undefined;
  const forgottenAt =
    typeof row.forgottenAt === "string" && ISOish.test(row.forgottenAt)
      ? asIso(row.forgottenAt, updatedAt)
      : undefined;

  // Never trust client-supplied ownerId — strip if present.
  return {
    id,
    name,
    aliases,
    location,
    locationHistory,
    notes,
    ...(photoUrl ? { photoUrl } : {}),
    privacy: asPrivacy(row.privacy),
    archived: Boolean(row.archived),
    createdAt,
    updatedAt,
    ...(forgottenAt ? { forgottenAt } : {}),
  };
}

export function normalizeKeptHub(raw: unknown, now = new Date().toISOString()): KeptHub {
  if (!raw || typeof raw !== "object") return emptyKeptHub();
  const hub = raw as Record<string, unknown>;
  const list = Array.isArray(hub.items)
    ? hub.items
    : hub.items && typeof hub.items === "object"
      ? Object.values(hub.items as Record<string, unknown>)
      : [];

  const items: KeptItem[] = [];
  const seen = new Set<string>();
  for (const row of list) {
    const item = normalizeKeptItem(row, now);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }

  items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  return {
    items,
    updatedAt: asIso(hub.updatedAt, items[0]?.updatedAt ?? now),
  };
}

export function newKeptId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `kept_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function activeKeptItems(hub: KeptHub, opts?: { includePrivate?: boolean }): KeptItem[] {
  const includePrivate = opts?.includePrivate !== false;
  return hub.items.filter((item) => {
    if (item.forgottenAt) return false;
    if (item.archived) return false;
    if (!includePrivate && item.privacy === "private") return false;
    return true;
  });
}
