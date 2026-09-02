import {
  parseTaskCalendarEventId,
  taskDueDateKey,
  tasksReadyToPlaceOnDay,
  tasksToCalendarEvents,
} from "../lifeos-mobile/src/lib/calendarTasks";
import type { Task } from "../lifeos-mobile/src/types";

function task(partial: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    project: "Inbox",
    focusMinutes: 30,
    energy: "Medium",
    done: false,
    canceled: false,
    ...partial,
  };
}

describe("calendarTasks", () => {
  it("maps scheduled tasks to synthetic calendar events", () => {
    const events = tasksToCalendarEvents([
      task({ id: 1, title: "Write essay", due: "2026-09-02", startTime: "14:30", color: "#47a47b" }),
      task({ id: 2, title: "No time yet", due: "2026-09-02" }),
      task({ id: 3, title: "Done task", due: "2026-09-02", startTime: "10:00", done: true }),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "task-1",
      title: "Write essay",
      start: "2026-09-02T14:30",
      color: "#47a47b",
    });
  });

  it("lists unscheduled tasks due on the selected day for Ready to place", () => {
    const ready = tasksReadyToPlaceOnDay(
      [
        task({ id: 1, title: "Iron clothes", due: "2026-09-02" }),
        task({ id: 2, title: "Scheduled", due: "2026-09-02", startTime: "09:00" }),
        task({ id: 3, title: "Other day", due: "2026-09-03" }),
      ],
      "2026-09-02",
    );
    expect(ready.map((t) => t.id)).toEqual([1]);
  });

  it("parses task calendar ids", () => {
    expect(parseTaskCalendarEventId("task-42")).toBe(42);
    expect(parseTaskCalendarEventId("lifeos-1")).toBeNull();
  });

  it("normalizes due date keys", () => {
    expect(taskDueDateKey("2026-09-02T00:00:00")).toBe("2026-09-02");
    expect(taskDueDateKey("today")).toBeNull();
  });
});
