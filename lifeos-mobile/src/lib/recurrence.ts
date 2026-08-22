import type { CalendarEvent, EventRepeatFrequency } from "../types";
import { toDateKey } from "./helpers";

export const REPEAT_OPTIONS: { key: EventRepeatFrequency; label: string }[] = [
  { key: "never", label: "Never" },
  { key: "daily", label: "Every Day" },
  { key: "weekly", label: "Every Week" },
  { key: "biweekly", label: "Every 2 Weeks" },
  { key: "monthly", label: "Every Month" },
  { key: "yearly", label: "Every Year" },
];

export function repeatLabel(freq?: EventRepeatFrequency | null) {
  return REPEAT_OPTIONS.find((o) => o.key === (freq || "never"))?.label || "Never";
}

export function parseOccurrenceId(id: string): { seriesId: string; dateKey?: string } {
  const idx = id.indexOf("__");
  if (idx <= 0) return { seriesId: id };
  return { seriesId: id.slice(0, idx), dateKey: id.slice(idx + 2) };
}

export function makeOccurrenceId(seriesId: string, dateKey: string) {
  return `${seriesId}__${dateKey}`;
}

function parseDay(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

function advance(date: Date, freq: EventRepeatFrequency): Date {
  const next = new Date(date);
  switch (freq) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      break;
  }
  return next;
}

function eventOverlapsRange(event: CalendarEvent, rangeStart: string, rangeEnd: string) {
  const startKey = event.start.slice(0, 10);
  const endKey = (event.end ?? event.start).slice(0, 10);
  return endKey >= rangeStart && startKey <= rangeEnd;
}

function shiftDateTime(iso: string, fromKey: string, toKey: string): string {
  const time = iso.includes("T") ? iso.slice(11) : "09:00";
  return `${toKey}T${time.length >= 5 ? time.slice(0, 5) : time}`;
}

/**
 * Expand recurring masters into concrete occurrences inside [rangeStart, rangeEnd].
 * Non-recurring events that overlap the range are returned as-is.
 */
export function expandEventsInRange(
  events: CalendarEvent[],
  rangeStart: string,
  rangeEnd: string,
): CalendarEvent[] {
  const out: CalendarEvent[] = [];

  for (const event of events) {
    const freq = event.repeat && event.repeat !== "never" ? event.repeat : null;
    if (!freq) {
      if (eventOverlapsRange(event, rangeStart, rangeEnd)) out.push(event);
      continue;
    }

    const seriesStartKey = event.start.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(seriesStartKey)) continue;

    const exceptions = new Set(event.repeatExceptions || []);
    const untilKey = event.repeatUntil && /^\d{4}-\d{2}-\d{2}$/.test(event.repeatUntil)
      ? event.repeatUntil
      : null;

    let cursor = parseDay(seriesStartKey);
    let guard = 0;
    while (guard++ < 800) {
      const key = toDateKey(cursor);
      if (untilKey && key > untilKey) break;
      if (key > rangeEnd) break;

      if (key >= rangeStart && key >= seriesStartKey && !exceptions.has(key)) {
        out.push({
          ...event,
          id: makeOccurrenceId(event.id, key),
          start: shiftDateTime(event.start, seriesStartKey, key),
          end: event.end ? shiftDateTime(event.end, seriesStartKey, key) : undefined,
          recurringEventId: event.id,
        });
      }

      const next = advance(cursor, freq);
      if (next.getTime() <= cursor.getTime()) break;
      cursor = next;
    }
  }

  return out;
}
