/**
 * LifeOS 3.0 Phase 5 — Activity rings from real task / focus fields.
 * No mock metrics. Commitments / calendar attendance are intentionally omitted
 * (time passing ≠ confirmed attendance).
 */

export type ActivityRingsPeriod = "daily" | "weekly";

export type ActivityRingsGoals = {
  period: ActivityRingsPeriod;
  /** Completed tasks target for the period. */
  tasksTarget: number;
  /** Focus minutes target for the period. */
  focusMinutesTarget: number;
};

export const DEFAULT_ACTIVITY_RINGS_GOALS: ActivityRingsGoals = {
  period: "daily",
  tasksTarget: 3,
  focusMinutesTarget: 90,
};

export type ActivityRingId = "tasks" | "focus";

export type ActivityRingSnapshot = {
  id: ActivityRingId;
  label: string;
  /** Plain-language what this ring measures. */
  explanation: string;
  current: number;
  target: number;
  /** 0–100 for SVG arc. */
  percent: number;
  unit: "tasks" | "minutes";
  empty: boolean;
};

export type ActivityRingsSnapshot = {
  period: ActivityRingsPeriod;
  periodLabel: string;
  rangeStart: string;
  rangeEnd: string;
  rings: ActivityRingSnapshot[];
};

export type RingTaskLike = {
  done?: boolean;
  canceled?: boolean;
  completedAt?: string;
  focusMinutes?: number;
  focusRemainingSeconds?: number;
  focusSessionStarted?: boolean;
  focusUpdatedAt?: string;
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function normalizeActivityRingsGoals(raw?: Partial<ActivityRingsGoals> | null): ActivityRingsGoals {
  const period = raw?.period === "weekly" ? "weekly" : "daily";
  return {
    period,
    tasksTarget: clampInt(raw?.tasksTarget, 1, 50, DEFAULT_ACTIVITY_RINGS_GOALS.tasksTarget),
    focusMinutesTarget: clampInt(
      raw?.focusMinutesTarget,
      15,
      1200,
      DEFAULT_ACTIVITY_RINGS_GOALS.focusMinutesTarget,
    ),
  };
}

/** Local YYYY-MM-DD for a Date. */
export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIsoDay(iso: string | undefined): string | null {
  if (!iso || typeof iso !== "string") return null;
  const day = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/** Monday-start week containing `dayKey` (local). */
export function weekRangeContaining(dayKey: string, weekStartsMonday = true): { start: string; end: string } {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0 Sun
  const offset = weekStartsMonday ? (dow === 0 ? -6 : 1 - dow) : -dow;
  const start = new Date(date);
  start.setDate(date.getDate() + offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toLocalDateKey(start), end: toLocalDateKey(end) };
}

function inRange(day: string | null, start: string, end: string): boolean {
  return Boolean(day && day >= start && day <= end);
}

function percentOf(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

/**
 * Tasks completed in range — uses `completedAt` (ISO). Done without completedAt
 * is not counted (avoids inventing a day).
 */
export function countTasksCompletedInRange(
  tasks: RingTaskLike[],
  rangeStart: string,
  rangeEnd: string,
): number {
  let count = 0;
  for (const task of tasks) {
    if (task.canceled) continue;
    if (!task.done && !task.completedAt) continue;
    const day = parseIsoDay(task.completedAt);
    if (inRange(day, rangeStart, rangeEnd)) count += 1;
  }
  return count;
}

/**
 * Focus minutes accrued in range from session fields only.
 * Counts elapsed = focusMinutes − remaining/60 when focusUpdatedAt falls in range
 * (or completedAt in range with a started session). Never invents minutes.
 */
export function sumFocusMinutesInRange(
  tasks: RingTaskLike[],
  rangeStart: string,
  rangeEnd: string,
): number {
  let total = 0;
  for (const task of tasks) {
    const planned = Math.max(0, Number(task.focusMinutes) || 0);
    if (planned <= 0) continue;
    const remainingRaw = task.focusRemainingSeconds;
    const remaining =
      typeof remainingRaw === "number" && Number.isFinite(remainingRaw)
        ? Math.max(0, Math.min(planned * 60, remainingRaw))
        : planned * 60;
    const started = Boolean(task.focusSessionStarted) || remaining < planned * 60;
    if (!started) continue;
    const updatedDay = parseIsoDay(task.focusUpdatedAt);
    const completedDay = parseIsoDay(task.completedAt);
    const touches =
      inRange(updatedDay, rangeStart, rangeEnd) ||
      (inRange(completedDay, rangeStart, rangeEnd) && started);
    if (!touches) continue;
    const elapsed = Math.max(0, planned - remaining / 60);
    total += elapsed;
  }
  return Math.round(total);
}

export function computeActivityRings(options: {
  tasks: RingTaskLike[];
  goals?: Partial<ActivityRingsGoals> | null;
  now?: Date;
  weekStartsMonday?: boolean;
}): ActivityRingsSnapshot {
  const goals = normalizeActivityRingsGoals(options.goals);
  const now = options.now ?? new Date();
  const today = toLocalDateKey(now);
  const range =
    goals.period === "weekly"
      ? weekRangeContaining(today, options.weekStartsMonday !== false)
      : { start: today, end: today };

  const tasksDone = countTasksCompletedInRange(options.tasks, range.start, range.end);
  const focusMinutes = sumFocusMinutesInRange(options.tasks, range.start, range.end);

  const periodLabel = goals.period === "weekly" ? "This week" : "Today";

  const rings: ActivityRingSnapshot[] = [
    {
      id: "tasks",
      label: "Tasks",
      explanation:
        goals.period === "weekly"
          ? "Tasks marked done this week (from completion timestamps)."
          : "Tasks marked done today (from completion timestamps).",
      current: tasksDone,
      target: goals.tasksTarget,
      percent: percentOf(tasksDone, goals.tasksTarget),
      unit: "tasks",
      empty: tasksDone === 0,
    },
    {
      id: "focus",
      label: "Focus",
      explanation:
        goals.period === "weekly"
          ? "Focus minutes from sessions updated this week — not calendar blocks."
          : "Focus minutes from sessions updated today — not calendar blocks.",
      current: focusMinutes,
      target: goals.focusMinutesTarget,
      percent: percentOf(focusMinutes, goals.focusMinutesTarget),
      unit: "minutes",
      empty: focusMinutes === 0,
    },
  ];

  return {
    period: goals.period,
    periodLabel,
    rangeStart: range.start,
    rangeEnd: range.end,
    rings,
  };
}

export const ACTIVITY_RING_META: Record<
  ActivityRingId,
  { stroke: string; ariaVerb: string }
> = {
  tasks: { stroke: "var(--accent)", ariaVerb: "completed" },
  focus: { stroke: "var(--accent-teal, #0D9488)", ariaVerb: "focused" },
};
