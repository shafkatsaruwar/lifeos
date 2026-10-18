import {
  adjacentTaskStatus,
  DEFAULT_TASKS_VIEW_MODE,
  groupTasksByStatus,
  normalizeTasksViewMode,
  resolveTaskBoardStatus,
  statusMutationPatch,
  TASK_STATUS_COLUMNS,
} from "../lib/tasksView";

describe("tasksView", () => {
  it("defaults view mode to list", () => {
    expect(normalizeTasksViewMode(undefined)).toBe(DEFAULT_TASKS_VIEW_MODE);
    expect(normalizeTasksViewMode("board")).toBe("board");
    expect(normalizeTasksViewMode("nope")).toBe("list");
  });

  it("resolves status from flags when status missing", () => {
    expect(resolveTaskBoardStatus({ done: true })).toBe("Done");
    expect(resolveTaskBoardStatus({ canceled: true })).toBe("Canceled");
    expect(resolveTaskBoardStatus({})).toBe("Not started");
    expect(resolveTaskBoardStatus({ status: "Waiting" })).toBe("Waiting");
  });

  it("groups by existing status columns only", () => {
    const groups = groupTasksByStatus([
      { id: 1, status: "In progress" },
      { id: 2, done: true },
      { id: 3 },
    ]);
    expect(Object.keys(groups)).toEqual([...TASK_STATUS_COLUMNS]);
    expect(groups["In progress"].map((t) => t.id)).toEqual([1]);
    expect(groups.Done.map((t) => t.id)).toEqual([2]);
    expect(groups["Not started"].map((t) => t.id)).toEqual([3]);
  });

  it("moves adjacent for keyboard alternative", () => {
    expect(adjacentTaskStatus("Not started", "next")).toBe("In progress");
    expect(adjacentTaskStatus("Not started", "prev")).toBe("Not started");
    expect(adjacentTaskStatus("Canceled", "next")).toBe("Canceled");
  });

  it("status mutation mirrors app done/canceled coupling", () => {
    const done = statusMutationPatch("Done");
    expect(done.done).toBe(true);
    expect(done.canceled).toBe(false);
    expect(done.completedAt).toBeTruthy();
    const open = statusMutationPatch("Not started");
    expect(open.done).toBe(false);
    expect(open.completedAt).toBeUndefined();
  });
});
