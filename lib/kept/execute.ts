import { matchByLocation, matchKeptItems } from "./match";
import {
  activeKeptItems,
  boundLocationHistory,
  newKeptId,
  normalizeKeptHub,
} from "./normalize";
import {
  KEPT_MAX_ITEMS,
  KEPT_MAX_LOCATION,
  KEPT_MAX_NAME,
  KEPT_MAX_NOTES,
  type KeptCommand,
  type KeptExecuteResult,
  type KeptHub,
  type KeptItem,
} from "./types";

function nowIso(serverNow?: string): string {
  if (serverNow) {
    const t = Date.parse(serverNow);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return new Date().toISOString();
}

function touchHub(hub: KeptHub, items: KeptItem[], at: string): KeptHub {
  return normalizeKeptHub({ items, updatedAt: at }, at);
}

function resolveTarget(
  hub: KeptHub,
  command: Extract<KeptCommand, { kind: "UPDATE" | "FORGET" | "FIND" }>,
  includePrivate: boolean,
): { item?: KeptItem; ambiguous?: KeptItem[]; missing?: true } {
  if ("itemId" in command && command.itemId) {
    const item = activeKeptItems(hub, { includePrivate }).find((i) => i.id === command.itemId);
    return item ? { item } : { missing: true };
  }
  const query = "query" in command ? command.query : undefined;
  if (!query) return { missing: true };
  const matches = matchKeptItems(hub, query, { includePrivate, limit: 5, minScore: 0.4 });
  if (matches.length === 1) return { item: matches[0].item };
  if (matches.length > 1) return { ambiguous: matches.map((m) => m.item) };
  return { missing: true };
}

export function executeKeptCommand(
  hub: KeptHub,
  command: KeptCommand,
  opts?: { serverNow?: string; includePrivate?: boolean },
): KeptExecuteResult {
  const at = nowIso(opts?.serverNow);
  const includePrivate = opts?.includePrivate !== false;
  const base = normalizeKeptHub(hub, at);

  switch (command.kind) {
    case "CLARIFY":
      return {
        ok: false,
        message: command.question,
        clarify: command,
        hub: base,
      };

    case "SAVE": {
      const name = command.name.trim().slice(0, KEPT_MAX_NAME);
      const location = command.location.trim().slice(0, KEPT_MAX_LOCATION);
      if (!name || !location) {
        return { ok: false, message: "Need both an object and a place.", hub: base };
      }

      const existing = matchKeptItems(base, name, { includePrivate, limit: 1, minScore: 0.9 })[0]?.item;
      if (existing) {
        const history = boundLocationHistory([
          { location: existing.location, at: existing.updatedAt },
          ...existing.locationHistory,
          ...(existing.location.toLowerCase() === location.toLowerCase()
            ? []
            : [{ location: existing.location, at: existing.updatedAt }]),
        ]);
        // Prefer explicit history push when location changes
        const nextHistory =
          existing.location.toLowerCase() === location.toLowerCase()
            ? existing.locationHistory
            : boundLocationHistory([{ location: existing.location, at: existing.updatedAt }, ...existing.locationHistory]);

        const updated: KeptItem = {
          ...existing,
          name,
          location,
          locationHistory: nextHistory.length ? nextHistory : history,
          notes: command.notes?.trim().slice(0, KEPT_MAX_NOTES) || existing.notes,
          privacy: command.privacy ?? existing.privacy,
          aliases: command.aliases?.length
            ? [...new Set([...existing.aliases, ...command.aliases])].slice(0, 12)
            : existing.aliases,
          updatedAt: at,
          forgottenAt: undefined,
          archived: false,
        };
        const items = base.items.map((i) => (i.id === updated.id ? updated : i));
        const next = touchHub(base, items, at);
        return {
          ok: true,
          message: `Updated — ${updated.name} is at ${updated.location}.`,
          item: updated,
          hub: next,
        };
      }

      if (base.items.filter((i) => !i.forgottenAt).length >= KEPT_MAX_ITEMS) {
        return { ok: false, message: "Kept is full. Forget something first.", hub: base };
      }

      const item: KeptItem = {
        id: newKeptId(),
        name,
        aliases: (command.aliases ?? []).slice(0, 12),
        location,
        locationHistory: [],
        notes: command.notes?.trim().slice(0, KEPT_MAX_NOTES) || "",
        privacy: command.privacy ?? "normal",
        archived: false,
        createdAt: at,
        updatedAt: at,
      };
      const next = touchHub(base, [item, ...base.items], at);
      return { ok: true, message: `Kept — ${item.name} is at ${item.location}.`, item, hub: next };
    }

    case "FIND": {
      const matches = matchKeptItems(base, command.query, { includePrivate, limit: 5 });
      if (!matches.length) {
        return { ok: false, message: `Nothing matching “${command.query}”.`, hub: base };
      }
      if (matches.length === 1) {
        const item = matches[0].item;
        return {
          ok: true,
          message: `${item.name} is at ${item.location}.`,
          item,
          items: [item],
          hub: base,
        };
      }
      return {
        ok: true,
        message: `Found ${matches.length} matches.`,
        items: matches.map((m) => m.item),
        hub: base,
      };
    }

    case "LIST_BY_LOCATION": {
      const items = matchByLocation(base, command.location, { includePrivate });
      if (!items.length) {
        return { ok: false, message: `Nothing listed at “${command.location}”.`, hub: base };
      }
      return {
        ok: true,
        message: `${items.length} item${items.length === 1 ? "" : "s"} at ${command.location}.`,
        items,
        hub: base,
      };
    }

    case "UPDATE": {
      const target = resolveTarget(base, command, includePrivate);
      if (target.ambiguous) {
        return {
          ok: false,
          message: "Which item should I update?",
          clarify: {
            kind: "CLARIFY",
            question: "Which item should I update?",
            options: target.ambiguous.map((i) => `${i.name} (${i.location})`),
            pendingKind: "UPDATE",
          },
          hub: base,
        };
      }
      if (!target.item) {
        return { ok: false, message: "I couldn't find that item to update.", hub: base };
      }

      const prev = target.item;
      const nextLocation = command.location?.trim().slice(0, KEPT_MAX_LOCATION);
      let locationHistory = prev.locationHistory;
      if (nextLocation && nextLocation.toLowerCase() !== prev.location.toLowerCase()) {
        locationHistory = boundLocationHistory([
          { location: prev.location, at: prev.updatedAt },
          ...prev.locationHistory,
        ]);
      }

      const updated: KeptItem = {
        ...prev,
        name: command.name?.trim().slice(0, KEPT_MAX_NAME) || prev.name,
        location: nextLocation || prev.location,
        locationHistory,
        notes:
          command.notes !== undefined
            ? command.notes.trim().slice(0, KEPT_MAX_NOTES)
            : prev.notes,
        privacy: command.privacy ?? prev.privacy,
        archived: command.archived ?? prev.archived,
        photoUrl:
          command.photoUrl === null
            ? undefined
            : command.photoUrl !== undefined
              ? command.photoUrl
              : prev.photoUrl,
        updatedAt: at,
      };

      const items = base.items.map((i) => (i.id === updated.id ? updated : i));
      const next = touchHub(base, items, at);
      return {
        ok: true,
        message: nextLocation
          ? `Moved ${updated.name} to ${updated.location}.`
          : `Updated ${updated.name}.`,
        item: updated,
        hub: next,
      };
    }

    case "FORGET": {
      const target = resolveTarget(base, command, includePrivate);
      if (target.ambiguous) {
        return {
          ok: false,
          message: "Which item should I forget?",
          clarify: {
            kind: "CLARIFY",
            question: "Which item should I forget?",
            options: target.ambiguous.map((i) => `${i.name} (${i.location})`),
            pendingKind: "FORGET",
          },
          hub: base,
        };
      }
      if (!target.item) {
        return { ok: false, message: "Nothing to forget.", hub: base };
      }

      const items = command.hard
        ? base.items.filter((i) => i.id !== target.item!.id)
        : base.items.map((i) =>
            i.id === target.item!.id ? { ...i, forgottenAt: at, updatedAt: at, archived: true } : i,
          );
      const next = touchHub(base, items, at);
      return {
        ok: true,
        message: `Forgot ${target.item.name}.`,
        hub: next,
      };
    }

    default:
      return { ok: false, message: "Unknown Kept command.", hub: base };
  }
}

/** Search / browse helpers for UI. */
export function searchKept(
  hub: KeptHub,
  query: string,
  opts?: { includePrivate?: boolean; includeArchived?: boolean },
): KeptItem[] {
  const q = query.trim().toLowerCase();
  const pool = hub.items.filter((item) => {
    if (item.forgottenAt) return false;
    if (!opts?.includeArchived && item.archived) return false;
    if (opts?.includePrivate === false && item.privacy === "private") return false;
    return true;
  });
  if (!q) {
    return [...pool].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }
  return matchKeptItems(
    { ...hub, items: pool },
    query,
    { includePrivate: opts?.includePrivate !== false, limit: 40, minScore: 0.25 },
  ).map((m) => m.item);
}

export function recentKept(hub: KeptHub, limit = 12, includePrivate = true): KeptItem[] {
  return activeKeptItems(hub, { includePrivate })
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit);
}

export function locationsIndex(hub: KeptHub, includePrivate = true): Array<{ location: string; count: number }> {
  const map = new Map<string, number>();
  for (const item of activeKeptItems(hub, { includePrivate })) {
    const key = item.location.trim();
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location));
}
