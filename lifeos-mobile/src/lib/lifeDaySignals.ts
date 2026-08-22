import type { DayMemory, HubRecord, LifeHubState, MomentumEntry, Task } from "../types";
import { habitProgress, habitProgressLabel, isHabitDone } from "./habits";

/** Categories that show as colored dots under a calendar day. */
export type LifeSignalKind =
  | "habit"
  | "focus"
  | "done"
  | "capture"
  | "memory"
  | "photo"
  | "body"
  | "food"
  | "trip";

export type LifeSignal = {
  id: string;
  kind: LifeSignalKind;
  title: string;
  meta?: string;
  dayKey: string;
  /** Optional deep-link hints for the UI. */
  habitId?: string;
  taskId?: number;
  memoryId?: string;
  collection?: keyof LifeHubState;
  recordId?: string;
};

export const LIFE_SIGNAL_LEGEND: { kind: LifeSignalKind; label: string }[] = [
  { kind: "habit", label: "Habits" },
  { kind: "focus", label: "Focus" },
  { kind: "done", label: "Done" },
  { kind: "capture", label: "Capture" },
  { kind: "memory", label: "Memories" },
  { kind: "photo", label: "Photos" },
  { kind: "body", label: "Body" },
  { kind: "food", label: "Food" },
  { kind: "trip", label: "Trips" },
];

export function lifeSignalColor(
  kind: LifeSignalKind,
  theme: { accent: string; blue: string; success: string; warning: string; danger: string },
): string {
  switch (kind) {
    case "habit":
      return theme.accent;
    case "focus":
      return theme.blue;
    case "done":
      return theme.success;
    case "capture":
      return theme.warning;
    case "memory":
      return "#7c3aed";
    case "photo":
      return "#0d9488";
    case "body":
      return "#db2777";
    case "food":
      return "#ea580c";
    case "trip":
      return "#0ea5e9";
    default:
      return theme.accent;
  }
}

function recordDayKey(record: HubRecord): string | null {
  if (record.date && /^\d{4}-\d{2}-\d{2}/.test(record.date)) return record.date.slice(0, 10);
  if (record.createdAt && record.createdAt.length >= 10) return record.createdAt.slice(0, 10);
  return null;
}

function pushHubDay(
  out: LifeSignal[],
  records: HubRecord[],
  kind: LifeSignalKind,
  collection: keyof LifeHubState,
  metaLabel: string,
) {
  for (const record of records) {
    const dayKey = recordDayKey(record);
    if (!dayKey) continue;
    out.push({
      id: `${collection}-${record.id}`,
      kind,
      title: record.title,
      meta: record.subtitle || metaLabel,
      dayKey,
      collection,
      recordId: record.id,
    });
  }
}

/** Aggregate structured “something happened that day” signals from workspace data. */
export function collectLifeDaySignals(input: {
  life: LifeHubState;
  tasks: Task[];
  momentumLog?: MomentumEntry[];
  dayMemories?: DayMemory[];
}): LifeSignal[] {
  const out: LifeSignal[] = [];

  for (const habit of input.life.habits) {
    const dayKeys = new Set<string>([
      ...(habit.completedDates ?? []),
      ...Object.keys(habit.progressByDate ?? {}),
    ]);
    for (const dayKey of dayKeys) {
      const progress = habitProgress(habit, dayKey);
      if (progress <= 0 && !isHabitDone(habit, dayKey)) continue;
      out.push({
        id: `habit-${habit.id}-${dayKey}`,
        kind: "habit",
        title: habit.title,
        meta: habitProgressLabel(habit, dayKey),
        dayKey,
        habitId: habit.id,
        collection: "habits",
        recordId: habit.id,
      });
    }
  }

  for (const entry of input.momentumLog ?? []) {
    if (!entry.at || entry.at.length < 10) continue;
    const dayKey = entry.at.slice(0, 10);
    const kind: LifeSignalKind =
      entry.type === "focus" ? "focus" : entry.type === "capture" ? "capture" : "done";
    const time = new Date(entry.at).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    out.push({
      id: `momentum-${entry.id}`,
      kind,
      title: entry.title,
      meta: `${entry.type === "focus" ? "Focus" : entry.type === "capture" ? "Capture" : "Done"} · ${time}`,
      dayKey,
    });
  }

  for (const task of input.tasks) {
    const isDone = Boolean(task.done) || task.status === "Done";
    if (!isDone || !task.completedAt || task.completedAt.length < 10) continue;
    out.push({
      id: `task-${task.id}`,
      kind: "done",
      title: task.title,
      meta: task.project ? `Task · ${task.project}` : "Task completed",
      dayKey: task.completedAt.slice(0, 10),
      taskId: task.id,
    });
  }

  for (const memory of input.dayMemories ?? []) {
    if (!memory.dayKey) continue;
    const time = new Date(memory.at).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const snippet = memory.transcript.trim().replace(/\s+/g, " ");
    out.push({
      id: `memory-${memory.id}`,
      kind: "memory",
      title: memory.title || snippet.slice(0, 56) || "Memory",
      meta: memory.localAudioUri
        ? `Voice · ${time}`
        : snippet.length > 80
          ? `${snippet.slice(0, 77)}…`
          : `Memory · ${time}`,
      dayKey: memory.dayKey,
      memoryId: memory.id,
    });
  }

  pushHubDay(out, input.life.gallery, "photo", "gallery", "Gallery");
  pushHubDay(out, input.life.vision, "photo", "vision", "Vision");
  pushHubDay(out, input.life.exercises, "body", "exercises", "Exercise");
  pushHubDay(out, input.life.trainings, "body", "trainings", "Training");
  pushHubDay(out, input.life.food, "food", "food", "Food");
  pushHubDay(out, input.life.recipes, "food", "recipes", "Recipe");
  pushHubDay(out, input.life.trips, "trip", "trips", "Trip");

  return out;
}

export function signalsForDay(signals: LifeSignal[], dayKey: string): LifeSignal[] {
  return signals
    .filter((s) => s.dayKey === dayKey)
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
}

/** Unique kinds present on a day, capped for the mini-dot row. */
export function daySignalKinds(signals: LifeSignal[], dayKey: string, limit = 4): LifeSignalKind[] {
  const seen = new Set<LifeSignalKind>();
  const kinds: LifeSignalKind[] = [];
  for (const signal of signals) {
    if (signal.dayKey !== dayKey) continue;
    if (seen.has(signal.kind)) continue;
    seen.add(signal.kind);
    kinds.push(signal.kind);
    if (kinds.length >= limit) break;
  }
  return kinds;
}

export function countSignalsByKind(signals: LifeSignal[], dayKey: string): Partial<Record<LifeSignalKind, number>> {
  const counts: Partial<Record<LifeSignalKind, number>> = {};
  for (const signal of signals) {
    if (signal.dayKey !== dayKey) continue;
    counts[signal.kind] = (counts[signal.kind] ?? 0) + 1;
  }
  return counts;
}
