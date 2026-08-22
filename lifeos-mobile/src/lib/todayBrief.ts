import type { CalendarEvent, DayMemory, HubRecord, SettingsState, Task } from "../types";
import { eventOccursOnDate, formatDueDate, formatEventTime, PRIORITY_RANK, taskIsOpen, toDateKey } from "./helpers";
import { isHabitDone } from "./habits";
import { expandEventsInRange } from "./recurrence";

export type BriefCardKind = "overdue" | "due" | "event" | "focus" | "habit" | "memory";

export type BriefCard = {
  id: string;
  kind: BriefCardKind;
  title: string;
  body: string;
  actionLabel: string;
  taskId?: number;
  habitId?: string;
  eventId?: string;
};

function dueKey(due?: string): string | null {
  if (!due) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(due)) return due.slice(0, 10);
  const lower = due.toLowerCase();
  if (lower === "today") return toDateKey(new Date());
  if (lower === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateKey(d);
  }
  return null;
}

/** Deterministic “what matters today” cards — one clear action each. */
export function buildTodayBrief(input: {
  tasks: Task[];
  calendar: CalendarEvent[];
  habits: HubRecord[];
  settings: SettingsState;
  memories?: DayMemory[];
  now?: Date;
}): BriefCard[] {
  const now = input.now ?? new Date();
  const today = toDateKey(now);
  const cards: BriefCard[] = [];
  const open = input.tasks.filter(taskIsOpen);

  const overdue = open
    .filter((t) => {
      const key = dueKey(t.due);
      return key != null && key < today;
    })
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority ?? "Medium"] ?? 1) - (PRIORITY_RANK[b.priority ?? "Medium"] ?? 1) ||
        String(a.due).localeCompare(String(b.due)),
    );

  for (const task of overdue.slice(0, 2)) {
    cards.push({
      id: `overdue-${task.id}`,
      kind: "overdue",
      title: task.title,
      body: `Overdue · was due ${formatDueDate(task.due)}`,
      actionLabel: "Set as Now",
      taskId: task.id,
    });
  }

  const dueToday = open
    .filter((t) => dueKey(t.due) === today)
    .filter((t) => !overdue.some((o) => o.id === t.id))
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority ?? "Medium"] ?? 1) - (PRIORITY_RANK[b.priority ?? "Medium"] ?? 1),
    );

  for (const task of dueToday.slice(0, 2)) {
    cards.push({
      id: `due-${task.id}`,
      kind: "due",
      title: task.title,
      body: `${task.project || "Personal"} · due today`,
      actionLabel: "Set as Now",
      taskId: task.id,
    });
  }

  const focusId = input.settings.nowTaskId;
  const focusTask = focusId != null ? open.find((t) => t.id === focusId) : undefined;
  if (focusTask && !cards.some((c) => c.taskId === focusTask.id)) {
    cards.push({
      id: `focus-${focusTask.id}`,
      kind: "focus",
      title: focusTask.title,
      body: `Your Now · ${focusTask.focusMinutes ?? 25} min`,
      actionLabel: "Focus",
      taskId: focusTask.id,
    });
  }

  const expanded = expandEventsInRange(input.calendar, today, today);
  const todayEvents = expanded
    .filter((e) => eventOccursOnDate(e, today))
    .sort((a, b) => a.start.localeCompare(b.start));
  const upcoming =
    todayEvents.find((e) => new Date(e.start).getTime() >= now.getTime()) ?? todayEvents[0];
  if (upcoming) {
    cards.push({
      id: `event-${upcoming.id}`,
      kind: "event",
      title: upcoming.title,
      body: `Calendar · ${formatEventTime(upcoming.start)}`,
      actionLabel: "Open calendar",
      eventId: upcoming.id,
    });
  }

  const openHabits = input.habits.filter((h) => !isHabitDone(h, today));
  if (openHabits.length === 1) {
    const habit = openHabits[0];
    cards.push({
      id: `habit-${habit.id}`,
      kind: "habit",
      title: habit.title,
      body: "Habit still open today",
      actionLabel: "Log habit",
      habitId: habit.id,
    });
  } else if (openHabits.length > 1) {
    cards.push({
      id: `habits-${today}`,
      kind: "habit",
      title: `${openHabits.length} habits left`,
      body: openHabits
        .slice(0, 3)
        .map((h) => h.title)
        .join(" · "),
      actionLabel: "Open habits",
    });
  }

  const memoriesToday = (input.memories ?? input.settings.dayMemories ?? []).filter(
    (m) => m.dayKey === today,
  );
  if (memoriesToday.length === 0 && cards.length < 5) {
    cards.push({
      id: `memory-prompt-${today}`,
      kind: "memory",
      title: "Capture a memory",
      body: "Say what mattered today — it lands on Day signals.",
      actionLabel: "Record",
    });
  }

  return cards.slice(0, 5);
}
