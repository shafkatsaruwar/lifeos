import type { CalendarEvent, UserCalendar } from "../types";

export const CAL_PERSONAL_ID = "cal-personal";
export const CAL_WORK_ID = "cal-work";
export const CAL_SCHOOL_ID = "cal-school";

/** Seed calendars when the user has none yet (iOS-style defaults). */
export const DEFAULT_CALENDARS: UserCalendar[] = [
  { id: CAL_PERSONAL_ID, name: "Personal", color: "#14B8A6", visible: true },
  { id: CAL_WORK_ID, name: "Work", color: "#3B82F6", visible: true },
  { id: CAL_SCHOOL_ID, name: "School", color: "#8B5CF6", visible: true },
];

export function normalizeCalendars(value: unknown): UserCalendar[] {
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_CALENDARS.map((c) => ({ ...c }));
  const cleaned = value
    .filter((item): item is UserCalendar => Boolean(item && typeof item === "object" && typeof (item as UserCalendar).id === "string"))
    .map((item) => ({
      id: String(item.id),
      name: (typeof item.name === "string" && item.name.trim()) || "Calendar",
      color: typeof item.color === "string" && item.color ? item.color : "#14B8A6",
      visible: item.visible !== false,
    }));
  return cleaned.length ? cleaned : DEFAULT_CALENDARS.map((c) => ({ ...c }));
}

/** Resolve which calendar an event belongs to (legacy events → Personal / Work). */
export function eventCalendarId(event: CalendarEvent): string {
  if (event.calendarId) return event.calendarId;
  if (event.source === "Work") return CAL_WORK_ID;
  return CAL_PERSONAL_ID;
}

export function findCalendar(calendars: UserCalendar[], id: string | undefined): UserCalendar | undefined {
  if (!id) return undefined;
  return calendars.find((c) => c.id === id);
}

export function eventDisplayColor(event: CalendarEvent, calendars: UserCalendar[]): string {
  const cal = findCalendar(calendars, eventCalendarId(event));
  return event.color || cal?.color || "#14B8A6";
}

export function isEventVisible(event: CalendarEvent, calendars: UserCalendar[]): boolean {
  const cal = findCalendar(calendars, eventCalendarId(event));
  // Unknown calendar id (deleted) — still show so events aren't lost.
  if (!cal) return true;
  return cal.visible !== false;
}

export function newCalendarId() {
  return `cal-${Date.now().toString(36)}`;
}
