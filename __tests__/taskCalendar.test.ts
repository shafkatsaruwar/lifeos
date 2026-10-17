import {
  applyCompleteTaskSessionChoice,
  applyDeleteTaskEventChoice,
  applyRouteEventToTask,
  buildScheduledSessionEvent,
  buildTaskCalendarOverlay,
  classifyCalendarItem,
  clearTaskLinksToEvent,
  DEFAULT_CALENDAR_LAYER_VISIBILITY,
  eventsLinkedToTask,
  filterCalendarFeedByLayers,
  findTaskForCalendarEvent,
  futureLinkedSessions,
  normalizeCalendarLayerVisibility,
  parseDeadlineEventId,
  parseTaskCalendarEventId,
  suggestedSessionEnd,
  tasksToDeadlineEvents,
  tasksToScheduledTaskEvents,
  unlinkTaskFromEvent,
} from "../lib/taskCalendar";

const task = (partial: Partial<Parameters<typeof tasksToScheduledTaskEvents>[0][number]> & { id: number; title: string }) => ({
  project: "Inbox",
  color: "#4b8bdc",
  focusMinutes: 45,
  energy: "Medium",
  done: false,
  canceled: false,
  ...partial,
});

describe("taskCalendar linking", () => {
  it("routes an event to a task via calendarEventId and clears prior owners", () => {
    const event = { id: "lifeos-1", start: "2026-10-20T14:00" };
    const next = applyRouteEventToTask(
      [
        task({ id: 1, title: "A", calendarEventId: "lifeos-1" }),
        task({ id: 2, title: "B", due: "2026-10-01" }),
      ],
      event,
      2,
    );
    expect(next.find((t) => t.id === 2)).toMatchObject({
      calendarEventId: "lifeos-1",
      due: "2026-10-20",
      startTime: "14:00",
    });
    expect(next.find((t) => t.id === 1)?.calendarEventId).toBeUndefined();
  });

  it("lists multiple linked sessions via calendarEventId + linkedTaskId", () => {
    const t = task({ id: 9, title: "Essay", calendarEventId: "lifeos-a" });
    const events = [
      { id: "lifeos-a", title: "Essay", start: "2026-10-21T09:00", end: "2026-10-21T10:00", source: "LifeOS" as const, color: "#4b8bdc", linkedTaskId: 9 },
      { id: "lifeos-b", title: "Essay", start: "2026-10-22T13:00", end: "2026-10-22T14:00", source: "LifeOS" as const, color: "#4b8bdc", linkedTaskId: 9 },
      { id: "other", title: "Meeting", start: "2026-10-21T11:00", source: "LifeOS" as const, color: "#666" },
    ];
    expect(eventsLinkedToTask(t, events).map((e) => e.id)).toEqual(["lifeos-a", "lifeos-b"]);
  });

  it("unlinks without deleting either side", () => {
    const tasks = unlinkTaskFromEvent(
      [task({ id: 3, title: "X", calendarEventId: "ev-1" })],
      3,
      "ev-1",
    );
    expect(tasks[0].calendarEventId).toBeUndefined();
  });

  it("clears orphan task links when an event is deleted", () => {
    const next = clearTaskLinksToEvent(
      [task({ id: 1, title: "A", calendarEventId: "gone" }), task({ id: 2, title: "B", calendarEventId: "keep" })],
      "gone",
    );
    expect(next[0].calendarEventId).toBeUndefined();
    expect(next[1].calendarEventId).toBe("keep");
  });

  it("builds a confirmed work session from a task", () => {
    const session = buildScheduledSessionEvent({
      task: task({ id: 5, title: "Deep work", focusMinutes: 60, color: "#47a47b" }),
      day: "2026-10-25",
      start: "10:00",
      end: "11:00",
      nowMs: 1,
    });
    expect(session).toMatchObject({
      id: "lifeos-session-5-1",
      title: "Deep work",
      start: "2026-10-25T10:00",
      end: "2026-10-25T11:00",
      linkedTaskId: 5,
      source: "LifeOS",
    });
  });

  it("suggests session end from focus estimate", () => {
    expect(suggestedSessionEnd("09:00", 45)).toBe("09:45");
  });
});

describe("taskCalendar layers", () => {
  it("creates deadline indicators without requiring startTime", () => {
    const deadlines = tasksToDeadlineEvents([
      task({ id: 1, title: "Due only", due: "2026-10-20" }),
      task({ id: 2, title: "Done", due: "2026-10-20", done: true }),
    ]);
    expect(deadlines).toHaveLength(1);
    expect(deadlines[0].id).toBe("deadline-1");
    expect(classifyCalendarItem(deadlines[0])).toBe("deadline");
  });

  it("creates timed scheduled blocks only when startTime is set and no calendarEventId", () => {
    const blocks = tasksToScheduledTaskEvents([
      task({ id: 1, title: "Timed", due: "2026-10-20", startTime: "14:30" }),
      task({ id: 2, title: "Linked", due: "2026-10-20", startTime: "14:30", calendarEventId: "lifeos-x" }),
      task({ id: 3, title: "No time", due: "2026-10-20" }),
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe("task-1");
    expect(classifyCalendarItem(blocks[0])).toBe("scheduledTask");
  });

  it("respects layer visibility toggles", () => {
    const overlay = buildTaskCalendarOverlay(
      [task({ id: 1, title: "A", due: "2026-10-20", startTime: "09:00" })],
      { events: true, deadlines: false, scheduledTasks: true },
    );
    expect(overlay.every((e) => !e.id.startsWith("deadline-"))).toBe(true);
    expect(overlay.some((e) => e.id === "task-1")).toBe(true);

    const filtered = filterCalendarFeedByLayers(
      [
        { id: "lifeos-1", title: "Meet", start: "2026-10-20T10:00", source: "LifeOS" as const, color: "#1" },
        { id: "deadline-1", title: "Due", start: "2026-10-20T00:00", source: "LifeOS" as const, color: "#2" },
        { id: "task-1", title: "Block", start: "2026-10-20T09:00", source: "LifeOS" as const, color: "#3", linkedTaskId: 1 },
      ],
      { events: true, deadlines: false, scheduledTasks: false },
    );
    expect(filtered.map((e) => e.id)).toEqual(["lifeos-1"]);
  });

  it("defaults all layers visible", () => {
    expect(normalizeCalendarLayerVisibility(undefined)).toEqual(DEFAULT_CALENDAR_LAYER_VISIBILITY);
  });

  it("finds tasks from synthetic ids and reverse links", () => {
    const tasks = [task({ id: 7, title: "T", due: "2026-10-20", calendarEventId: "lifeos-z" })];
    expect(findTaskForCalendarEvent({ id: "deadline-7" }, tasks)?.id).toBe(7);
    expect(findTaskForCalendarEvent({ id: "task-7" }, tasks)?.id).toBe(7);
    expect(findTaskForCalendarEvent({ id: "lifeos-z" }, tasks)?.id).toBe(7);
    expect(findTaskForCalendarEvent({ id: "lifeos-other", linkedTaskId: 7 }, tasks)?.id).toBe(7);
  });

  it("parses synthetic ids", () => {
    expect(parseTaskCalendarEventId("task-42")).toBe(42);
    expect(parseDeadlineEventId("deadline-9")).toBe(9);
    expect(parseDeadlineEventId("task-9")).toBeNull();
  });

  it("separates future linked sessions for completion prompts", () => {
    const t = task({ id: 1, title: "A", calendarEventId: "a" });
    const events = [
      { id: "a", title: "Past", start: "2026-10-01T09:00", source: "LifeOS" as const, color: "#1", linkedTaskId: 1 },
      { id: "b", title: "Future", start: "2026-10-30T09:00", source: "LifeOS" as const, color: "#1", linkedTaskId: 1 },
    ];
    expect(futureLinkedSessions(t, events, "2026-10-17").map((e) => e.id)).toEqual(["b"]);
  });

  it("keeps historical sessions when completing with removeFuture", () => {
    const tasks = [task({ id: 1, title: "A", calendarEventId: "future" })];
    const events = [
      { id: "past", title: "Past", start: "2026-10-01T09:00", source: "LifeOS" as const, color: "#1", linkedTaskId: 1 },
      { id: "future", title: "Future", start: "2026-10-30T09:00", source: "LifeOS" as const, color: "#1", linkedTaskId: 1 },
    ];
    const kept = applyCompleteTaskSessionChoice({
      tasks,
      events,
      taskId: 1,
      todayKey: "2026-10-17",
      choice: "keep",
    });
    expect(kept.events.map((e) => e.id)).toEqual(["past", "future"]);

    const removed = applyCompleteTaskSessionChoice({
      tasks,
      events,
      taskId: 1,
      todayKey: "2026-10-17",
      choice: "removeFuture",
    });
    expect(removed.events.map((e) => e.id)).toEqual(["past"]);
    expect(removed.tasks[0].calendarEventId).toBeUndefined();
  });

  it("deletes or unlinks linked events when deleting a task", () => {
    const tasks = [task({ id: 1, title: "A", calendarEventId: "a" }), task({ id: 2, title: "B" })];
    const events = [
      { id: "a", title: "A", start: "2026-10-20T09:00", source: "LifeOS" as const, color: "#1", linkedTaskId: 1 },
      { id: "b", title: "Extra", start: "2026-10-21T09:00", source: "LifeOS" as const, color: "#1", linkedTaskId: 1 },
    ];
    const keep = applyDeleteTaskEventChoice({ tasks, events, taskId: 1, choice: "keep" });
    expect(keep.tasks.map((t) => t.id)).toEqual([2]);
    expect(keep.events).toHaveLength(2);
    expect(keep.events.every((e) => e.linkedTaskId === undefined)).toBe(true);

    const del = applyDeleteTaskEventChoice({ tasks, events, taskId: 1, choice: "deleteLinked" });
    expect(del.tasks.map((t) => t.id)).toEqual([2]);
    expect(del.events).toHaveLength(0);
  });
});
