import type { HabitKind, HabitSchedule, HubRecord } from "../types";

export function habitKind(habit: HubRecord): HabitKind {
  return habit.kind ?? "check";
}

export function habitSchedule(habit: HubRecord): HabitSchedule {
  return habit.schedule ?? "daily";
}

export function habitTarget(habit: HubRecord): number {
  const kind = habitKind(habit);
  if (typeof habit.target === "number" && habit.target > 0) return habit.target;
  if (kind === "scale") return 100;
  if (kind === "duration") return 30;
  if (kind === "count") return 8;
  return 1;
}

export function habitProgress(habit: HubRecord, dayKey: string): number {
  const kind = habitKind(habit);
  if (kind === "check") {
    return habit.completedDates?.includes(dayKey) ? 1 : 0;
  }
  const fromMap = habit.progressByDate?.[dayKey];
  if (typeof fromMap === "number" && Number.isFinite(fromMap)) return Math.max(0, fromMap);
  // Legacy: boolean completedDates counts as full target.
  if (habit.completedDates?.includes(dayKey)) return habitTarget(habit);
  return 0;
}

export function isHabitDone(habit: HubRecord, dayKey: string): boolean {
  const kind = habitKind(habit);
  if (kind === "check") return Boolean(habit.completedDates?.includes(dayKey));
  if (kind === "scale") {
    // Logging any mood/score for the day counts as done.
    return habitProgress(habit, dayKey) > 0 || Boolean(habit.completedDates?.includes(dayKey));
  }
  return habitProgress(habit, dayKey) >= habitTarget(habit);
}

/** Dual-write completedDates so day-signal dots + older clients keep working. */
function withCompletedSync(habit: HubRecord, dayKey: string, value: number, target: number, kind: HabitKind): HubRecord {
  const progressByDate = { ...(habit.progressByDate ?? {}) };
  if (value <= 0) {
    delete progressByDate[dayKey];
  } else {
    progressByDate[dayKey] = value;
  }

  const dates = new Set(habit.completedDates ?? []);
  const done =
    kind === "check"
      ? value >= 1
      : kind === "scale"
        ? value > 0
        : value >= target;
  if (done) dates.add(dayKey);
  else dates.delete(dayKey);

  return {
    ...habit,
    progressByDate: Object.keys(progressByDate).length ? progressByDate : undefined,
    completedDates: dates.size ? Array.from(dates).sort() : [],
  };
}

export function toggleHabitCheck(habit: HubRecord, dayKey: string): HubRecord {
  const done = isHabitDone(habit, dayKey);
  return withCompletedSync(habit, dayKey, done ? 0 : 1, 1, "check");
}

export function setHabitValue(habit: HubRecord, dayKey: string, value: number): HubRecord {
  const kind = habitKind(habit);
  const target = habitTarget(habit);
  const capped =
    kind === "scale"
      ? Math.max(0, Math.min(target, Math.round(value)))
      : Math.max(0, Math.round(value));
  return withCompletedSync(habit, dayKey, capped, target, kind);
}

export function bumpHabit(habit: HubRecord, dayKey: string, delta: number): HubRecord {
  const kind = habitKind(habit);
  if (kind === "check") {
    if (delta > 0 && !isHabitDone(habit, dayKey)) return toggleHabitCheck(habit, dayKey);
    if (delta < 0 && isHabitDone(habit, dayKey)) return toggleHabitCheck(habit, dayKey);
    return habit;
  }
  const next = habitProgress(habit, dayKey) + delta;
  return setHabitValue(habit, dayKey, next);
}

export function habitProgressLabel(habit: HubRecord, dayKey: string): string {
  const kind = habitKind(habit);
  const schedule = habitSchedule(habit);
  const scheduleTag = schedule === "weekly" ? "Weekly" : "Daily";
  if (kind === "check") {
    return isHabitDone(habit, dayKey) ? `${scheduleTag} · Done` : `${scheduleTag} · Tap to complete`;
  }
  const value = habitProgress(habit, dayKey);
  const target = habitTarget(habit);
  const unit = habit.unit?.trim();
  if (kind === "scale") {
    if (value <= 0) return `${scheduleTag} · Not logged`;
    const pct = target > 0 ? Math.round((value / target) * 100) : value;
    return `${scheduleTag} · ${pct}%${unit ? ` ${unit}` : ""}`;
  }
  if (kind === "duration") {
    const label = unit || "min";
    return `${scheduleTag} · ${value} / ${target} ${label}`;
  }
  // count
  const label = unit || "x";
  return `${scheduleTag} · ${value} / ${target} ${label}`;
}

export function habitKindLabel(kind: HabitKind): string {
  switch (kind) {
    case "count":
      return "Count";
    case "duration":
      return "Time";
    case "scale":
      return "Scale";
    default:
      return "Check";
  }
}

export function defaultTargetForKind(kind: HabitKind): number {
  switch (kind) {
    case "count":
      return 8;
    case "duration":
      return 30;
    case "scale":
      return 100;
    default:
      return 1;
  }
}

export function defaultUnitForKind(kind: HabitKind): string | undefined {
  switch (kind) {
    case "count":
      return "cups";
    case "duration":
      return "min";
    case "scale":
      return "mood";
    default:
      return undefined;
  }
}
