/**
 * Tasks × Calendar linking helpers.
 * Reuses Task.calendarEventId as the primary Route-to-Task link.
 * Optional CalendarEvent.linkedTaskId enables multiple scheduled sessions per task.
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
  source: "LifeOS" | "iCal" | "Google" | "Outlook" | "Work" | "Synapse";
  color: string;
  notes?: string;
  location?: string;
  url?: string;
  weekdaysOnly?: boolean;
  /** Reverse link for scheduled work sessions (and Route to Task). */
  linkedTaskId?: number;
};

export type CalendarLayerKind = "event" | "deadline" | "scheduledTask";

export type CalendarLayerVisibility = {
  events: boolean;
  deadlines: boolean;
  scheduledTasks: boolean;
};

export const DEFAULT_CALENDAR_LAYER_VISIBILITY: CalendarLayerVisibility = {
  events: true,
  deadlines: true,
  scheduledTasks: true,
};

export function normalizeCalendarLayerVisibility(
  value: Partial<CalendarLayerVisibility> | null | undefined,
): CalendarLayerVisibility {
  return {
    events: value?.events !== false,
    deadlines: value?.deadlines !== false,
    scheduledTasks: value?.scheduledTasks !== false,
  };
}

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

/** Timed blocks from due + startTime when no primary calendarEventId (existing behavior). */
export function tasksToScheduledTaskEvents(tasks: TaskCalendarRef[]): CalendarEventRef[] {
  return tasks
    .filter(
      (task) =>
        isTaskOpen(task) &&
        taskDueDateKey(task.due) &&
        !task.calendarEventId &&
        Boolean(task.startTime?.trim()),
    )
    .map((task) => {
      const dueKey = taskDueDateKey(task.due)!;
      const time = normalizeTaskStartTime(task.startTime);
      const focusMinutes = task.focusMinutes ?? 30;
      const end = `${dueKey}T${addMinutesToTime(time, focusMinutes)}`;
      return {
        id: `task-${task.id}`,
        title: task.title,
        start: `${dueKey}T${time}`,
        end,
        color: task.color || "#4b8bdc",
        source: "LifeOS" as const,
        notes: `${task.project || "Inbox"} · ${focusMinutes}m · ${task.energy || "Medium"}`,
        linkedTaskId: task.id,
      };
    });
}

/** All-day deadline indicators — not persisted calendar records. */
export function tasksToDeadlineEvents(tasks: TaskCalendarRef[]): CalendarEventRef[] {
  return tasks
    .filter((task) => isTaskOpen(task) && taskDueDateKey(task.due))
    .map((task) => {
      const dueKey = taskDueDateKey(task.due)!;
      return {
        id: `deadline-${task.id}`,
        title: task.title,
        start: `${dueKey}T00:00`,
        end: `${dueKey}T23:59`,
        color: task.color || "#d99b38",
        source: "LifeOS" as const,
        notes: `Deadline · ${task.project || "Inbox"}`,
        linkedTaskId: task.id,
      };
    });
}

export function classifyCalendarItem(
  event: Pick<CalendarEventRef, "id" | "linkedTaskId" | "source">,
): CalendarLayerKind {
  if (event.id.startsWith("deadline-")) return "deadline";
  if (event.id.startsWith("task-")) return "scheduledTask";
  if (typeof event.linkedTaskId === "number") return "scheduledTask";
  return "event";
}

export function filterCalendarFeedByLayers<T extends CalendarEventRef>(
  events: T[],
  visibility: Partial<CalendarLayerVisibility> | null | undefined,
): T[] {
  const layers = normalizeCalendarLayerVisibility(visibility);
  return events.filter((event) => {
    const kind = classifyCalendarItem(event);
    if (kind === "deadline") return layers.deadlines;
    if (kind === "scheduledTask") return layers.scheduledTasks;
    return layers.events;
  });
}

/** Build display feed: real events + optional deadline markers + synthetic startTime blocks. */
export function buildTaskCalendarOverlay(
  tasks: TaskCalendarRef[],
  visibility: Partial<CalendarLayerVisibility> | null | undefined = DEFAULT_CALENDAR_LAYER_VISIBILITY,
): CalendarEventRef[] {
  const layers = normalizeCalendarLayerVisibility(visibility);
  const items: CalendarEventRef[] = [];
  if (layers.deadlines) items.push(...tasksToDeadlineEvents(tasks));
  if (layers.scheduledTasks) items.push(...tasksToScheduledTaskEvents(tasks));
  return items;
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

export type RouteToTaskResult<T extends TaskCalendarRef> = T[];

/** Apply Route to Task on the task list (1 primary calendarEventId; clear others). */
export function applyRouteEventToTask<T extends TaskCalendarRef>(
  tasks: T[],
  event: Pick<CalendarEventRef, "id" | "start">,
  taskId: number,
): RouteToTaskResult<T> {
  const target = tasks.find((task) => task.id === taskId);
  if (!target) return tasks;
  const due = /^\d{4}-\d{2}-\d{2}/.test(event.start) ? event.start.slice(0, 10) : target.due;
  const startTime = /^\d{2}:\d{2}/.test(event.start.slice(11, 16))
    ? event.start.slice(11, 16)
    : target.startTime;
  return tasks.map((task) => {
    if (task.id === taskId) {
      return { ...task, calendarEventId: event.id, due: due || task.due, startTime };
    }
    if (task.calendarEventId === event.id) {
      return { ...task, calendarEventId: undefined };
    }
    return task;
  });
}

/** Clear primary task links pointing at this event id. */
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

export function layerLabel(kind: CalendarLayerKind): string {
  if (kind === "deadline") return "Deadline";
  if (kind === "scheduledTask") return "Scheduled task";
  return "Event";
}

/** Remove specific calendar events by id (used when completing/deleting a task). */
export function removeEventsByIds<T extends CalendarEventRef>(
  events: T[],
  eventIds: Iterable<string>,
): T[] {
  const remove = new Set(eventIds);
  return events.filter((event) => !remove.has(event.id));
}

/** Clear primary calendarEventId when those events were removed. */
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

/** Clear reverse links when deleting a task but keeping calendar events. */
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

/**
 * Apply the completion choice for future linked sessions.
 * Past/historical sessions are never removed here.
 */
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

/**
 * Apply the delete-task choice for linked calendar events.
 * Never deletes events silently — caller must pass an explicit choice when links exist.
 */
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
