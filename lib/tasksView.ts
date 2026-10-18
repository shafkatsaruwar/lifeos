/**
 * LifeOS 3.0 Phase 6 — Tasks view mode (list / board / calendar handoff).
 * Board columns map to existing TaskStatus values — no invented statuses.
 */

export type TasksViewMode = "list" | "board" | "calendar";

/** Existing task status strings used across web + mobile. */
export const TASK_STATUS_COLUMNS = [
  "Not started",
  "In progress",
  "Waiting",
  "Blocked",
  "Done",
  "Canceled",
] as const;

export type TaskStatusColumn = (typeof TASK_STATUS_COLUMNS)[number];

export const DEFAULT_TASKS_VIEW_MODE: TasksViewMode = "list";

export function isTasksViewMode(value: unknown): value is TasksViewMode {
  return value === "list" || value === "board" || value === "calendar";
}

export function normalizeTasksViewMode(value: unknown): TasksViewMode {
  return isTasksViewMode(value) ? value : DEFAULT_TASKS_VIEW_MODE;
}

export function isTaskStatusColumn(value: unknown): value is TaskStatusColumn {
  return typeof value === "string" && (TASK_STATUS_COLUMNS as readonly string[]).includes(value);
}

/** Resolve status from optional status + done/canceled flags (matches page getTaskStatus). */
export function resolveTaskBoardStatus(task: {
  status?: string;
  done?: boolean;
  canceled?: boolean;
}): TaskStatusColumn {
  if (isTaskStatusColumn(task.status)) return task.status;
  if (task.canceled) return "Canceled";
  if (task.done) return "Done";
  return "Not started";
}

export function groupTasksByStatus<T extends { status?: string; done?: boolean; canceled?: boolean }>(
  tasks: T[],
): Record<TaskStatusColumn, T[]> {
  const groups = Object.fromEntries(TASK_STATUS_COLUMNS.map((s) => [s, [] as T[]])) as Record<
    TaskStatusColumn,
    T[]
  >;
  for (const task of tasks) {
    groups[resolveTaskBoardStatus(task)].push(task);
  }
  return groups;
}

/** Adjacent status for keyboard / non-drag column moves. */
export function adjacentTaskStatus(
  current: TaskStatusColumn,
  direction: "prev" | "next",
): TaskStatusColumn {
  const idx = TASK_STATUS_COLUMNS.indexOf(current);
  if (idx < 0) return "Not started";
  const next = direction === "next" ? idx + 1 : idx - 1;
  if (next < 0 || next >= TASK_STATUS_COLUMNS.length) return current;
  return TASK_STATUS_COLUMNS[next];
}

export function statusMutationPatch(status: TaskStatusColumn): {
  status: TaskStatusColumn;
  done: boolean;
  canceled: boolean;
  completedAt?: string | undefined;
} {
  const done = status === "Done";
  const canceled = status === "Canceled";
  return {
    status,
    done,
    canceled,
    completedAt: done ? new Date().toISOString() : undefined,
  };
}
