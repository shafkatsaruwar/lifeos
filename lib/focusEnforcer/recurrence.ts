import type { FocusEnforcerRepeat } from "./types";

export const FOCUS_ENFORCER_REPEAT_OPTIONS: { key: FocusEnforcerRepeat; label: string }[] = [
  { key: "never", label: "Does not repeat" },
  { key: "daily", label: "Every day" },
  { key: "weekdays", label: "Weekdays (Mon–Fri)" },
  { key: "weekly", label: "Every week" },
];

export function focusEnforcerRepeatLabel(repeat?: FocusEnforcerRepeat): string {
  const key = repeat && repeat !== "never" ? repeat : "never";
  return FOCUS_ENFORCER_REPEAT_OPTIONS.find((option) => option.key === key)?.label ?? "Does not repeat";
}

export function normalizeFocusEnforcerRepeat(value: unknown): FocusEnforcerRepeat {
  return value === "daily" || value === "weekdays" || value === "weekly" || value === "never"
    ? value
    : "never";
}

function advanceOnePeriod(from: Date, repeat: Exclude<FocusEnforcerRepeat, "never">): Date {
  const next = new Date(from);
  if (repeat === "daily") {
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (repeat === "weekly") {
    next.setDate(next.getDate() + 7);
    return next;
  }
  // weekdays: next Mon–Fri
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() === 0 || next.getDay() === 6);
  return next;
}

/**
 * Next scheduled start for a repeating Focus Enforcer session.
 * Advances from the current occurrence's scheduledStartAt (same clock time),
 * skipping forward until the result is after `now`.
 */
export function nextFocusEnforcerStart(
  scheduledStartAt: Date | string,
  repeat: FocusEnforcerRepeat,
  now: Date = new Date(),
): Date | null {
  if (repeat === "never") return null;
  const start =
    scheduledStartAt instanceof Date ? new Date(scheduledStartAt.getTime()) : new Date(scheduledStartAt);
  if (Number.isNaN(start.getTime())) return null;

  let next = advanceOnePeriod(start, repeat);
  // Cap iterations so a stuck clock can't loop forever.
  for (let i = 0; i < 400 && next.getTime() <= now.getTime(); i += 1) {
    next = advanceOnePeriod(next, repeat);
  }
  if (next.getTime() <= now.getTime()) return null;
  return next;
}
