import type { CalendarEvent, Task } from "../types";
import { taskIsOpen } from "./helpers";

/**
 * Mobile mirror of root `lib/taskCalendar.ts` linking helpers.
 * Expo cannot import the Next.js root package; keep behavior identical.
 */

export type TaskCalendarRef = {
  id: number;
  title: string;
  project?: string;
  color?: string;
  due?: string;
  startTime?: string;
  focusMinutes?: number;
  energy?: string;
  done?: boolean;
  canceled?: boolean;
  calendarEventId?: string;
};

export type CalendarEventRef = {
  id: string;
  title: string;
  start: string;
  end?: string;
  source?: "LifeOS" | "iCal" | "Google" | "Outlook" | "Work" | "Synapse";
  color?: string;
  notes?: string;
  location?: string;
  url?: string;
  weekdaysOnly?: boolean;
  linkedTaskId?: number;
};

/** Normalize task due strings to YYYY-MM-DD when possible. */
export function taskDueDateKey(due?: string): string | null {
  if (!due) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(due)) return due.slice(0, 10);
  return null;
}

export function isTaskOpen(task: Pick<TaskCalendarRef, "done" | "canceled">): boolean {
  return !task.done && !task.canceled;
}

export function parseTaskCalendarEventId(eventId: string): number | null {
  if (!eventId.startsWith("task-")) return null;
  const parsed = Number(eventId.slice(5));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDeadlineEventId(eventId: string): number | null {
  if (!eventId.startsWith("deadline-")) return null;
  const parsed = Number(eventId.slice(9));
  return Number.isFinite(parsed) ? parsed : null;
}

export function isSyntheticTaskEventId(eventId: string): boolean {
  return eventId.startsWith("task-") || eventId.startsWith("deadline-");
}

export function normalizeTaskStartTime(value?: string): string {
  if (!value?.trim()) return "09:00";
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "09:00";
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [h, m] = normalizeTaskStartTime(time).split(":").map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + Math.max(15, minutesToAdd));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
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
        end: `${dueKey}T${addMinutesToTime(time, focusMinutes)}`,
        color: task.color,
        source: "LifeOS" as const,
        notes: `${project} · ${focusMinutes}m · ${energy}`,
        linkedTaskId: task.id,
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

export function eventsLinkedToTask(
  task: Pick<TaskCalendarRef, "id" | "calendarEventId">,
  events: CalendarEventRef[],
): CalendarEventRef[] {
  const seen = new Set<string>();
  const linked: CalendarEventRef[] = [];
  for (const event of events) {
    if (isSyntheticTaskEventId(event.id)) continue;
    const isPrimary = task.calendarEventId != null && event.id === task.calendarEventId;
    const isSession = event.linkedTaskId === task.id;
    if (!isPrimary && !isSession) continue;
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    linked.push(event);
  }
  return linked.sort((a, b) => a.start.localeCompare(b.start));
}

export function findTaskForCalendarEvent(
  event: Pick<CalendarEventRef, "id" | "linkedTaskId">,
  tasks: TaskCalendarRef[],
): TaskCalendarRef | undefined {
  const fromSynthetic =
    parseTaskCalendarEventId(event.id) ?? parseDeadlineEventId(event.id);
  if (fromSynthetic != null) return tasks.find((task) => task.id === fromSynthetic);
  if (typeof event.linkedTaskId === "number") {
    const byReverse = tasks.find((task) => task.id === event.linkedTaskId);
    if (byReverse) return byReverse;
  }
  return tasks.find((task) => task.calendarEventId === event.id);
}

export function clearTaskLinksToEvent<T extends TaskCalendarRef>(tasks: T[], eventId: string): T[] {
  return tasks.map((task) =>
    task.calendarEventId === eventId ? { ...task, calendarEventId: undefined } : task,
  );
}

export function unlinkTaskFromEvent<T extends TaskCalendarRef>(
  tasks: T[],
  taskId: number,
  eventId: string,
): T[] {
  return tasks.map((task) => {
    if (task.id !== taskId) return task;
    if (task.calendarEventId !== eventId) return task;
    return { ...task, calendarEventId: undefined };
  });
}

export function clearLinkedTaskIdOnEvent<T extends CalendarEventRef>(
  events: T[],
  eventId: string,
): T[] {
  return events.map((event) =>
    event.id === eventId ? { ...event, linkedTaskId: undefined } : event,
  );
}

export function setLinkedTaskIdOnEvent<T extends CalendarEventRef>(
  events: T[],
  eventId: string,
  taskId: number,
): T[] {
  return events.map((event) =>
    event.id === eventId ? { ...event, linkedTaskId: taskId } : event,
  );
}

export type ScheduleSessionInput = {
  task: TaskCalendarRef;
  day: string;
  start: string;
  end: string;
  nowMs?: number;
};

/** Build a LifeOS work-session event linked to a task (caller persists after confirm). */
export function buildScheduledSessionEvent(input: ScheduleSessionInput): CalendarEventRef {
  const day = taskDueDateKey(input.day) || input.day.slice(0, 10);
  const start = normalizeTaskStartTime(input.start);
  const end = normalizeTaskStartTime(input.end);
  const stamp = input.nowMs ?? Date.now();
  return {
    id: `lifeos-session-${input.task.id}-${stamp}`,
    title: input.task.title,
    start: `${day}T${start}`,
    end: `${day}T${end}`,
    source: "LifeOS",
    color: input.task.color || "#4b8bdc",
    notes: `Work session · ${input.task.project || "Inbox"}`,
    linkedTaskId: input.task.id,
  };
}

export function suggestedSessionEnd(start: string, focusMinutes?: number): string {
  return addMinutesToTime(start, focusMinutes ?? 45);
}

export function futureLinkedSessions(
  task: Pick<TaskCalendarRef, "id" | "calendarEventId">,
  events: CalendarEventRef[],
  todayKey: string,
): CalendarEventRef[] {
  return eventsLinkedToTask(task, events).filter((event) => {
    const key = event.start.slice(0, 10);
    return key >= todayKey;
  });
}

export function historicalLinkedSessions(
  task: Pick<TaskCalendarRef, "id" | "calendarEventId">,
  events: CalendarEventRef[],
  todayKey: string,
): CalendarEventRef[] {
  return eventsLinkedToTask(task, events).filter((event) => event.start.slice(0, 10) < todayKey);
}

export function removeEventsByIds<T extends CalendarEventRef>(
  events: T[],
  eventIds: Iterable<string>,
): T[] {
  const remove = new Set(eventIds);
  return events.filter((event) => !remove.has(event.id));
}

export function clearPrimaryLinksIfRemoved<T extends TaskCalendarRef>(
  tasks: T[],
  taskId: number,
  removedEventIds: Iterable<string>,
): T[] {
  const remove = new Set(removedEventIds);
  return tasks.map((task) =>
    task.id === taskId && task.calendarEventId && remove.has(task.calendarEventId)
      ? { ...task, calendarEventId: undefined }
      : task,
  );
}

export function clearLinkedTaskIdsForTask<T extends CalendarEventRef>(
  events: T[],
  taskId: number,
): T[] {
  return events.map((event) =>
    event.linkedTaskId === taskId ? { ...event, linkedTaskId: undefined } : event,
  );
}

export type CompleteTaskSessionChoice = "keep" | "removeFuture";
export type DeleteTaskEventChoice = "keep" | "deleteLinked";

export function applyCompleteTaskSessionChoice<
  TEvent extends CalendarEventRef,
  TTask extends TaskCalendarRef,
>(input: {
  tasks: TTask[];
  events: TEvent[];
  taskId: number;
  todayKey: string;
  choice: CompleteTaskSessionChoice;
}): { tasks: TTask[]; events: TEvent[] } {
  if (input.choice === "keep") return { tasks: input.tasks, events: input.events };
  const task = input.tasks.find((item) => item.id === input.taskId);
  if (!task) return { tasks: input.tasks, events: input.events };
  const upcoming = futureLinkedSessions(task, input.events, input.todayKey);
  if (!upcoming.length) return { tasks: input.tasks, events: input.events };
  const removeIds = upcoming.map((event) => event.id);
  return {
    events: removeEventsByIds(input.events, removeIds),
    tasks: clearPrimaryLinksIfRemoved(input.tasks, input.taskId, removeIds),
  };
}

export function applyDeleteTaskEventChoice<
  TEvent extends CalendarEventRef,
  TTask extends TaskCalendarRef,
>(input: {
  tasks: TTask[];
  events: TEvent[];
  taskId: number;
  choice: DeleteTaskEventChoice;
}): { tasks: TTask[]; events: TEvent[] } {
  const task = input.tasks.find((item) => item.id === input.taskId);
  const linked = task ? eventsLinkedToTask(task, input.events) : [];
  let events = input.events;
  if (linked.length) {
    if (input.choice === "deleteLinked") {
      events = removeEventsByIds(events, linked.map((event) => event.id));
    } else {
      events = clearLinkedTaskIdsForTask(events, input.taskId);
    }
  }
  return {
    tasks: input.tasks.filter((item) => item.id !== input.taskId),
    events,
  };
}

/** Format a short range label for session rows. */
export function formatSessionRange(event: Pick<CalendarEventRef, "start" | "end">): string {
  const day = event.start.slice(0, 10);
  const start = event.start.slice(11, 16) || "09:00";
  const end = event.end?.slice(11, 16);
  const dayLabel = (() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
    const [y, m, d] = day.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  })();
  if (!end) return `${dayLabel} · ${start}`;
  return `${dayLabel} · ${start}–${end}`;
}
