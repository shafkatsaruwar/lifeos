import type { CalendarEvent, DayMemory, HubRecord, SettingsState, Task } from "../types";
import { eventOccursOnDate, formatEventTime, taskIsOpen, toDateKey } from "./helpers";
import { isHabitDone } from "./habits";
import { expandEventsInRange } from "./recurrence";

function startOfWeek(date: Date, monday: boolean) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = next.getDay();
  const offset = monday ? (day === 0 ? -6 : 1 - day) : -day;
  next.setDate(next.getDate() + offset);
  return next;
}

function dueKey(due?: string, today?: string): string | null {
  if (!due) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(due)) return due.slice(0, 10);
  const lower = due.toLowerCase();
  if (lower === "today") return today ?? toDateKey(new Date());
  if (lower === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateKey(d);
  }
  return null;
}

export type NowGlance = {
  rangeLabel: string;
  line: string;
  percent: number;
  tasksOpen: number;
  habitsKept: number;
  habitsTotal: number;
  nextEventLabel: string;
  memoriesToday: number;
};

/** Live counts for the conjoined “house” block on Now. */
export function buildNowGlance(input: {
  tasks: Task[];
  calendar: CalendarEvent[];
  habits: HubRecord[];
  settings: SettingsState;
  memories?: DayMemory[];
  now?: Date;
}): NowGlance {
  const now = input.now ?? new Date();
  const today = toDateKey(now);
  const monday = Boolean(input.settings.weekStartsMonday);
  const weekStart = startOfWeek(now, monday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const startKey = toDateKey(weekStart);
  const endKey = toDateKey(weekEnd);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  const rangeLabel = `${fmt(weekStart)}–${fmt(weekEnd)}`;

  const open = input.tasks.filter(taskIsOpen);
  const finished = input.tasks.filter((t) => {
    if (taskIsOpen(t) || !t.completedAt) return false;
    const key = t.completedAt.slice(0, 10);
    return key >= startKey && key <= endKey;
  }).length;
  const stillOpen = open.filter((t) => {
    const key = dueKey(t.due, today);
    if (!key) return false;
    return key >= startKey && key <= endKey;
  }).length;
  const denom = finished + stillOpen;
  const percent = denom === 0 ? 0 : Math.round((finished / denom) * 100);
  const line =
    denom === 0
      ? "Nothing dated this week yet."
      : `${finished} finished. ${stillOpen} still open.`;

  const habits = input.habits;
  const habitsKept = habits.filter((h) => isHabitDone(h, today)).length;

  const expanded = expandEventsInRange(input.calendar, today, today);
  const todayEvents = expanded
    .filter((e) => eventOccursOnDate(e, today))
    .sort((a, b) => a.start.localeCompare(b.start));
  const upcoming =
    todayEvents.find((e) => new Date(e.start).getTime() >= now.getTime()) ?? todayEvents[0];
  const nextEventLabel = upcoming
    ? `${upcoming.title} · ${formatEventTime(upcoming.start)}`
    : "nothing later today";

  const memoriesToday = (input.memories ?? input.settings.dayMemories ?? []).filter(
    (m) => m.dayKey === today,
  ).length;

  return {
    rangeLabel,
    line,
    percent,
    tasksOpen: open.length,
    habitsKept,
    habitsTotal: habits.length,
    nextEventLabel,
    memoriesToday,
  };
}
