import type { KeptCommand, KeptPrivacy } from "./types";

const SAVE_RE =
  /^(?:keep|kept|remember|save|put|place|stash|store)\s+(?:(?:my|the|a|an)\s+)?(.+?)\s+(?:in|on|at|inside|under|behind|near)\s+(?:(?:the|my|a|an)\s+)?(.+)$/i;

const FIND_RE =
  /^(?:where(?:'s| is| are)?|find|locate|look\s+for|what(?:'s| is)?\s+(?:the\s+)?(?:location|place)\s+of)\s+(?:(?:my|the|a|an)\s+)?(.+?)(?:\??)$/i;

const UPDATE_RE =
  /^(?:move|update|relocate|put|place)\s+(?:(?:my|the|a|an)\s+)?(.+?)\s+(?:to|in|on|at)\s+(?:(?:the|my|a|an)\s+)?(.+)$/i;

const LIST_RE =
  /^(?:what(?:'s| is| are)?\s+(?:in|at|on)|list(?:\s+(?:items?|things?))?\s+(?:in|at|on)|show(?:\s+me)?\s+(?:everything|things?|items?)\s+(?:in|at|on))\s+(?:(?:the|my|a|an)\s+)?(.+?)(?:\??)$/i;

const FORGET_RE =
  /^(?:forget|delete|remove|archive)\s+(?:(?:my|the|a|an)\s+)?(.+)$/i;

const PRIVATE_HINT = /\b(private|secret|don'?t\s+index|no\s+spotlight)\b/i;

function cleanPhrase(value: string): string {
  return value
    .replace(/[.?!,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function privacyFromText(text: string): KeptPrivacy | undefined {
  return PRIVATE_HINT.test(text) ? "private" : undefined;
}

/**
 * Deterministic utterance → command. Returns null when the phrase is too
 * ambiguous for a heuristic (caller may ask AI or CLARIFY).
 */
export function parseKeptUtterance(raw: string): KeptCommand | null {
  const text = cleanPhrase(raw);
  if (!text || text.length < 2) return null;

  const privacy = privacyFromText(text);
  const stripped = text.replace(PRIVATE_HINT, " ").replace(/\s+/g, " ").trim();

  const save = stripped.match(SAVE_RE);
  if (save) {
    const name = cleanPhrase(save[1]);
    const location = cleanPhrase(save[2]);
    if (name && location && name.toLowerCase() !== location.toLowerCase()) {
      return { kind: "SAVE", name, location, ...(privacy ? { privacy } : {}) };
    }
  }

  const update = stripped.match(UPDATE_RE);
  if (update) {
    const query = cleanPhrase(update[1]);
    const location = cleanPhrase(update[2]);
    if (query && location) {
      return { kind: "UPDATE", query, location, ...(privacy ? { privacy } : {}) };
    }
  }

  const list = stripped.match(LIST_RE);
  if (list) {
    const location = cleanPhrase(list[1]);
    if (location) return { kind: "LIST_BY_LOCATION", location };
  }

  const find = stripped.match(FIND_RE);
  if (find) {
    const query = cleanPhrase(find[1]);
    if (query) return { kind: "FIND", query };
  }

  const forget = stripped.match(FORGET_RE);
  if (forget) {
    const query = cleanPhrase(forget[1]);
    if (query) return { kind: "FORGET", query };
  }

  // Soft: "keys kitchen drawer" → SAVE when two+ chunks look like name + place
  const soft = stripped.match(
    /^(?:(?:my|the|a|an)\s+)?([a-z0-9][\w\s'-]{0,40}?)\s+(?:in|on|at)\s+(?:(?:the|my|a|an)\s+)?(.+)$/i,
  );
  if (soft) {
    const name = cleanPhrase(soft[1]);
    const location = cleanPhrase(soft[2]);
    if (name && location && name.split(" ").length <= 5) {
      return { kind: "SAVE", name, location, ...(privacy ? { privacy } : {}) };
    }
  }

  return null;
}

export function summarizeCommand(command: KeptCommand): string {
  switch (command.kind) {
    case "SAVE":
      return `Remember ${command.name} at ${command.location}`;
    case "FIND":
      return `Find ${command.query}`;
    case "UPDATE":
      if (command.location) {
        return `Update ${command.query || command.itemId || "item"} → ${command.location}`;
      }
      return `Update ${command.query || command.itemId || "item"}`;
    case "LIST_BY_LOCATION":
      return `List items at ${command.location}`;
    case "FORGET":
      return `Forget ${command.query || command.itemId || "item"}`;
    case "CLARIFY":
      return command.question;
    default:
      return "Kept";
  }
}
