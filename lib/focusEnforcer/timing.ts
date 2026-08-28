import type { FocusCheck, FocusCheckKind, FocusEnforcerPrefs } from "./types";
import { DEFAULT_FOCUS_ENFORCER_PREFS } from "./types";

export const ON_TIME_THRESHOLD_MIN = 2;

/**
 * Absolute offsets (minutes) from scheduledStartAt for escalation notifications.
 * escalateOffsetsMin: [5, 10, 15] → fire at T+5, T+10, T+15 — NOT sequential gaps.
 */
export function escalationFireTimes(
  scheduledStartAt: Date,
  escalateOffsetsMin: [number, number, number] = DEFAULT_FOCUS_ENFORCER_PREFS.escalateOffsetsMin,
): Date[] {
  return escalateOffsetsMin.map(
    (offsetMin) => new Date(scheduledStartAt.getTime() + offsetMin * 60_000),
  );
}

export function startNotificationTime(scheduledStartAt: Date): Date {
  return new Date(scheduledStartAt.getTime());
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Randomized mid-session check offsets (minutes after actualStart). */
export function buildCheckOffsetsMin(
  expectedDurationMin: number,
  photoCheckChance: number = DEFAULT_FOCUS_ENFORCER_PREFS.photoCheckChance,
  random: () => number = Math.random,
): { offsetMin: number; kind: FocusCheckKind }[] {
  const D = clamp(expectedDurationMin, 5, 240);

  const pickInWindow = (loFrac: number, hiFrac: number) => {
    const lo = D * loFrac;
    const hi = D * hiFrac;
    return lo + random() * (hi - lo);
  };

  const kindFor = (): FocusCheckKind => (random() < photoCheckChance ? "photo" : "ack");

  if (D < 25) {
    return [{ offsetMin: pickInWindow(0.4, 0.7), kind: kindFor() }];
  }

  const first = pickInWindow(0.25, 0.4);
  let second = pickInWindow(0.55, 0.8);
  if (second - first < 8) second = first + 8;

  const checks: { offsetMin: number; kind: FocusCheckKind }[] = [
    { offsetMin: first, kind: kindFor() },
    { offsetMin: Math.min(second, D * 0.95), kind: kindFor() },
  ];

  if (D > 90) {
    let third = pickInWindow(0.85, 0.95);
    const last = checks[checks.length - 1].offsetMin;
    if (third - last < 8) third = last + 8;
    checks.push({ offsetMin: Math.min(third, D * 0.98), kind: kindFor() });
  }

  return checks;
}

export function buildChecksForSession(
  actualStartAt: Date,
  expectedDurationMin: number,
  prefs: Pick<FocusEnforcerPrefs, "photoCheckChance"> = DEFAULT_FOCUS_ENFORCER_PREFS,
  random: () => number = Math.random,
  idFactory: () => string = () => `chk_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
): FocusCheck[] {
  return buildCheckOffsetsMin(expectedDurationMin, prefs.photoCheckChance, random).map((item) => ({
    id: idFactory(),
    scheduledAt: new Date(actualStartAt.getTime() + item.offsetMin * 60_000).toISOString(),
    kind: item.kind,
  }));
}

export function startDelayMinutes(scheduledStartAt: string, actualStartAt: string): number {
  const delayMs = new Date(actualStartAt).getTime() - new Date(scheduledStartAt).getTime();
  return Math.max(0, Math.round(delayMs / 60_000));
}

export function isOnTimeStart(startDelayMin: number | undefined): boolean {
  if (startDelayMin == null || Number.isNaN(startDelayMin)) return false;
  return startDelayMin <= ON_TIME_THRESHOLD_MIN;
}
