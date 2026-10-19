import { matchKeptItems, retrievalSnippet } from "./match";
import { parseKeptUtterance, summarizeCommand } from "./parse";
import type { KeptCommand, KeptHub, KeptIntentResult } from "./types";

const COMMAND_KINDS = new Set([
  "SAVE",
  "FIND",
  "UPDATE",
  "LIST_BY_LOCATION",
  "FORGET",
  "CLARIFY",
]);

function asCommand(raw: unknown): KeptCommand | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const kind = typeof row.kind === "string" ? row.kind.toUpperCase() : "";
  if (!COMMAND_KINDS.has(kind)) return null;

  const str = (key: string, max = 200) =>
    typeof row[key] === "string" ? row[key].trim().slice(0, max) : undefined;

  switch (kind) {
    case "SAVE": {
      const name = str("name", 120);
      const location = str("location", 160);
      if (!name || !location) return null;
      return {
        kind: "SAVE",
        name,
        location,
        notes: str("notes", 2000),
        privacy: row.privacy === "private" ? "private" : row.privacy === "normal" ? "normal" : undefined,
      };
    }
    case "FIND": {
      const query = str("query", 160);
      if (!query) return null;
      return { kind: "FIND", query };
    }
    case "UPDATE": {
      const itemId = str("itemId", 64);
      const query = str("query", 160);
      if (!itemId && !query) return null;
      return {
        kind: "UPDATE",
        itemId,
        query,
        location: str("location", 160),
        notes: str("notes", 2000),
        name: str("name", 120),
        privacy: row.privacy === "private" ? "private" : row.privacy === "normal" ? "normal" : undefined,
        archived: typeof row.archived === "boolean" ? row.archived : undefined,
        photoUrl:
          row.photoUrl === null
            ? null
            : typeof row.photoUrl === "string"
              ? row.photoUrl.trim().slice(0, 2000)
              : undefined,
      };
    }
    case "LIST_BY_LOCATION": {
      const location = str("location", 160);
      if (!location) return null;
      return { kind: "LIST_BY_LOCATION", location };
    }
    case "FORGET": {
      const itemId = str("itemId", 64);
      const query = str("query", 160);
      if (!itemId && !query) return null;
      return { kind: "FORGET", itemId, query, hard: Boolean(row.hard) };
    }
    case "CLARIFY": {
      const question = str("question", 280);
      if (!question) return null;
      const options = Array.isArray(row.options)
        ? row.options.filter((o): o is string => typeof o === "string").map((o) => o.slice(0, 120)).slice(0, 6)
        : undefined;
      return { kind: "CLARIFY", question, options };
    }
    default:
      return null;
  }
}

/**
 * Schema-validate an AI-proposed command. Rejects fabricated locations by
 * requiring SAVE/UPDATE location strings to be non-empty client/AI text —
 * never inventing a place from thin air here.
 */
export function validateKeptCommand(raw: unknown): KeptCommand | null {
  return asCommand(raw);
}

/** Local intent resolution (no network). Prefer this when utterance parses cleanly. */
export function resolveKeptIntent(
  utterance: string,
  hub: KeptHub,
  opts?: { includePrivate?: boolean },
): KeptIntentResult {
  const parsed = parseKeptUtterance(utterance);
  if (!parsed) {
    return {
      command: {
        kind: "CLARIFY",
        question: "Is this a save (“keys in drawer”), find (“where are my keys”), or update?",
        options: ["Save", "Find", "Update", "List by place"],
      },
      confidence: 0.2,
      summary: "Need a clearer Kept command",
    };
  }

  if (parsed.kind === "FIND" || parsed.kind === "UPDATE" || parsed.kind === "FORGET") {
    const query =
      parsed.kind === "FIND"
        ? parsed.query
        : parsed.query || "";
    if (query) {
      const matches = matchKeptItems(hub, query, {
        includePrivate: opts?.includePrivate,
        limit: 5,
        minScore: 0.4,
      });
      if (parsed.kind === "FIND") {
        return {
          command: parsed,
          confidence: matches[0]?.score ?? 0.55,
          summary: summarizeCommand(parsed),
          candidateIds: matches.map((m) => m.item.id),
        };
      }
      if (matches.length === 1) {
        return {
          command: { ...parsed, itemId: matches[0].item.id },
          confidence: matches[0].score,
          summary: summarizeCommand(parsed),
          candidateIds: [matches[0].item.id],
        };
      }
      if (matches.length > 1) {
        return {
          command: {
            kind: "CLARIFY",
            question: `Which one did you mean?`,
            options: matches.map((m) => `${m.item.name} (${m.item.location})`),
            pendingKind: parsed.kind,
          },
          confidence: 0.45,
          summary: "Ambiguous item",
          candidateIds: matches.map((m) => m.item.id),
        };
      }
      if (parsed.kind === "UPDATE" || parsed.kind === "FORGET") {
        return {
          command: {
            kind: "CLARIFY",
            question: `I don't have anything matching “${query}”. Save it first?`,
            options: ["Save instead", "Cancel"],
            pendingKind: "SAVE",
          },
          confidence: 0.35,
          summary: "No match",
        };
      }
    }
  }

  return {
    command: parsed,
    confidence: 0.85,
    summary: summarizeCommand(parsed),
  };
}

/** Build a compact AI prompt context — never the whole hub. */
export function keptAiContext(utterance: string, hub: KeptHub, includePrivate = false) {
  return {
    utterance: utterance.trim().slice(0, 500),
    candidates: retrievalSnippet(hub, utterance, { includePrivate, limit: 6 }),
    knownLocations: [
      ...new Set(
        hub.items
          .filter((i) => !i.forgottenAt && !i.archived && (includePrivate || i.privacy !== "private"))
          .map((i) => i.location)
          .slice(0, 20),
      ),
    ],
    rules: [
      "Only physical objects and locations.",
      "Never invent a location that was not said or listed.",
      "Reply with one command JSON: kind SAVE|FIND|UPDATE|LIST_BY_LOCATION|FORGET|CLARIFY.",
      "Use candidate ids when matching existing items.",
    ],
  };
}

export function mergeAiIntent(
  utterance: string,
  hub: KeptHub,
  aiRaw: unknown,
  opts?: { includePrivate?: boolean },
): KeptIntentResult {
  const local = resolveKeptIntent(utterance, hub, opts);
  if (local.confidence >= 0.8 && local.command.kind !== "CLARIFY") {
    return local;
  }

  const validated = validateKeptCommand(aiRaw);
  if (!validated) return local;

  // Reject fabricated locations: SAVE must have a location that appears in
  // the utterance or known locations (case-insensitive substring).
  if (validated.kind === "SAVE" || (validated.kind === "UPDATE" && validated.location)) {
    const location =
      validated.kind === "SAVE" ? validated.location : validated.location || "";
    const said = utterance.toLowerCase();
    const known = keptAiContext(utterance, hub, opts?.includePrivate).knownLocations.map((l) =>
      l.toLowerCase(),
    );
    const ok =
      !location ||
      said.includes(location.toLowerCase()) ||
      known.some((k) => k === location.toLowerCase() || k.includes(location.toLowerCase()));
    if (!ok) {
      return {
        command: {
          kind: "CLARIFY",
          question: `I heard a place I can't verify (“${location}”). Where is it, exactly?`,
        },
        confidence: 0.3,
        summary: "Unverified location",
      };
    }
  }

  return {
    command: validated,
    confidence: 0.7,
    summary: summarizeCommand(validated),
  };
}
