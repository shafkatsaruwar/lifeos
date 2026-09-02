import type { CalendarEvent, Task } from "../types";
import { taskIsOpen } from "./helpers";

/** Normalize task due strings to YYYY-MM-DD when possible. */
export function taskDueDateKey(due?: string): string | null {
  if (!due) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(due)) return due.slice(0, 10);
  return null;
}

function normalizeTaskStartTime(value?: string): string {
  if (!value?.trim()) return "09:00";
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "09:00";
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Open dated tasks as synthetic calendar events (parity with web calendarFeed). */
export function tasksToCalendarEvents(tasks: Task[]): CalendarEvent[] {
  return tasks
    .filter(
      (task) =>
        taskIsOpen(task) &&
        taskDueDateKey(task.due) &&
        !task.calendarEventId &&
        Boolean(task.startTime?.trim()),
    )
    .map((task) => {
      const dueKey = taskDueDateKey(task.due)!;
      const time = normalizeTaskStartTime(task.startTime);
      const project = task.project?.trim() || "Inbox";
      const focusMinutes = task.focusMinutes ?? 30;
      const energy = task.energy ?? "Medium";
      return {
        id: `task-${task.id}`,
        title: task.title,
        start: `${dueKey}T${time}`,
        color: task.color,
        source: "LifeOS" as const,
        notes: `${project} · ${focusMinutes}m · ${energy}`,
      };
    });
}

/** Tasks due on a day without a start time — shown in Ready to place. */
export function tasksReadyToPlaceOnDay(tasks: Task[], dayKey: string): Task[] {
  return tasks.filter(
    (task) =>
      taskIsOpen(task) &&
      !task.calendarEventId &&
      taskDueDateKey(task.due) === dayKey &&
      !task.startTime?.trim(),
  );
}

export function parseTaskCalendarEventId(eventId: string): number | null {
  if (!eventId.startsWith("task-")) return null;
  const parsed = Number(eventId.slice(5));
  return Number.isFinite(parsed) ? parsed : null;
}
