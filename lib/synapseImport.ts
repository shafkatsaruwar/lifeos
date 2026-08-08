/** Synapse → LifeOS day-plan import helpers (shared by web + mobile). */

export type SynapseCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  source: "Synapse";
  color: string;
  notes?: string;
  location?: string;
};

export type SynapseDayPlanPayload = {
  v: 1;
  exportedAt?: string;
  windowDays?: number;
  events: SynapseCalendarEvent[];
};

export function isSynapseEventId(id: string) {
  return id.startsWith("synapse-");
}

function base64UrlToUtf8(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const b64 = padded + pad;
  const atobFn =
    typeof globalThis.atob === "function"
      ? globalThis.atob.bind(globalThis)
      : typeof Buffer !== "undefined"
        ? (input: string) => Buffer.from(input, "base64").toString("binary")
        : null;
  if (!atobFn) throw new Error("Base64 decoding is unavailable.");
  const binary = atobFn(b64);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizeEvent(raw: unknown): SynapseCalendarEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const event = raw as Record<string, unknown>;
  if (typeof event.id !== "string" || !event.id.startsWith("synapse-")) return null;
  if (typeof event.title !== "string" || !event.title.trim()) return null;
  if (typeof event.start !== "string" || !event.start.trim()) return null;
  return {
    id: event.id,
    title: event.title.trim(),
    start: event.start,
    end: typeof event.end === "string" && event.end ? event.end : undefined,
    source: "Synapse",
    color: typeof event.color === "string" && event.color ? event.color : "#4b8bdc",
    notes: typeof event.notes === "string" && event.notes ? event.notes : undefined,
    location: typeof event.location === "string" && event.location ? event.location : undefined,
  };
}

/** Parse JSON day-plan text, a bare events array, or a deep-link URL with ?payload=. */
export function parseSynapseDayPlan(raw: string): SynapseCalendarEvent[] {
  const text = raw.trim();
  if (!text) return [];

  if (text.startsWith("lifeos://") || text.includes("payload=")) {
    try {
      const match = text.match(/[?&]payload=([^&]+)/);
      if (match?.[1]) return parseSynapseDayPlan(base64UrlToUtf8(decodeURIComponent(match[1])));
      const url = new URL(text.includes("://") ? text : `https://lifeos.local/import/synapse?${text.replace(/^\?/, "")}`);
      const payload = url.searchParams.get("payload");
      if (payload) return parseSynapseDayPlan(base64UrlToUtf8(payload));
    } catch {
      // fall through to JSON parse
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Paste a Synapse day-plan JSON export (from Synapse → Settings → LifeOS).");
  }

  if (Array.isArray(parsed)) {
    return parsed.map(normalizeEvent).filter((item): item is SynapseCalendarEvent => item != null);
  }

  if (parsed && typeof parsed === "object") {
    const payload = parsed as SynapseDayPlanPayload;
    if (Array.isArray(payload.events)) {
      return payload.events.map(normalizeEvent).filter((item): item is SynapseCalendarEvent => item != null);
    }
  }

  throw new Error("Unrecognized Synapse day-plan format.");
}

/** Replace prior Synapse-sourced events (by id prefix) with the latest import. */
export function mergeSynapseCalendarEvents<T extends { id: string }>(
  existing: T[],
  incoming: SynapseCalendarEvent[],
): Array<T | SynapseCalendarEvent> {
  const kept = existing.filter((event) => !isSynapseEventId(event.id));
  return [...kept, ...incoming];
}
