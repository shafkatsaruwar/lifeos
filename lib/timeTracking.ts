export type TimeEntry = {
  id: string;
  clockInAt: string;
  clockOutAt?: string;
  durationMinutes?: number;
  projectId?: string;
  clientName?: string;
  title?: string;
  note?: string;
  source: "manual" | "clock";
  createdAt: string;
  updatedAt: string;
};

export type TimeTrackingState = {
  entries: TimeEntry[];
};

export const emptyTimeTracking = (): TimeTrackingState => ({ entries: [] });

export function normalizeTimeTracking(value: unknown): TimeTrackingState {
  if (!value || typeof value !== "object") return emptyTimeTracking();
  const entries = Array.isArray((value as TimeTrackingState).entries)
    ? (value as TimeTrackingState).entries.filter((entry) => entry && typeof entry.id === "string" && typeof entry.clockInAt === "string")
    : [];
  return { entries };
}

export function getActiveEntry(state: TimeTrackingState): TimeEntry | undefined {
  return state.entries.find((entry) => !entry.clockOutAt);
}

export function entryDurationMinutes(entry: TimeEntry, now = Date.now()): number {
  const start = Date.parse(entry.clockInAt);
  const end = entry.clockOutAt ? Date.parse(entry.clockOutAt) : now;
  if (!Number.isNaN(start) && !Number.isNaN(end)) {
    return Math.max(0, Math.round((end - start) / 60_000));
  }
  if (entry.durationMinutes != null) return entry.durationMinutes;
  return 0;
}

export function formatDurationMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours <= 0) return `${rem}m`;
  if (rem === 0) return `${hours}h`;
  return `${hours}h ${rem}m`;
}

export function formatClockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatClockDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function weekStartKey(date = new Date(), weekStartsMonday = false): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const offset = weekStartsMonday ? (day === 0 ? -6 : 1 - day) : -day;
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysToDateKey(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function entriesForWeek(state: TimeTrackingState, weekKey: string): TimeEntry[] {
  const weekEnd = addDaysToDateKey(weekKey, 7);
  return [...state.entries]
    .filter((entry) => {
      const day = entry.clockInAt.slice(0, 10);
      return day >= weekKey && day < weekEnd;
    })
    .sort((a, b) => a.clockInAt.localeCompare(b.clockInAt));
}

export function weekTotalMinutes(entries: TimeEntry[], now = Date.now()): number {
  return entries.reduce((sum, entry) => sum + entryDurationMinutes(entry, now), 0);
}

export function clockIn(
  state: TimeTrackingState,
  input: { projectId?: string; clientName?: string; title?: string; note?: string },
  now = new Date(),
): TimeTrackingState {
  const active = getActiveEntry(state);
  if (active) return state;
  const stamp = now.toISOString();
  const entry: TimeEntry = {
    id: `time-${now.getTime()}`,
    clockInAt: stamp,
    projectId: input.projectId,
    clientName: input.clientName?.trim() || undefined,
    title: input.title?.trim() || undefined,
    note: input.note?.trim() || undefined,
    source: "clock",
    createdAt: stamp,
    updatedAt: stamp,
  };
  return { entries: [entry, ...state.entries] };
}

export function clockOut(state: TimeTrackingState, now = new Date()): TimeTrackingState {
  const active = getActiveEntry(state);
  if (!active) return state;
  const stamp = now.toISOString();
  const durationMinutes = entryDurationMinutes({ ...active, clockOutAt: stamp }, now.getTime());
  return {
    entries: state.entries.map((entry) =>
      entry.id === active.id
        ? { ...entry, clockOutAt: stamp, durationMinutes, updatedAt: stamp }
        : entry,
    ),
  };
}

export function updateTimeEntry(
  state: TimeTrackingState,
  id: string,
  patch: Partial<Pick<TimeEntry, "clockInAt" | "clockOutAt" | "projectId" | "clientName" | "title" | "note" | "durationMinutes">>,
): TimeTrackingState {
  const stamp = new Date().toISOString();
  return {
    entries: state.entries.map((entry) => {
      if (entry.id !== id) return entry;
      const next = { ...entry, ...patch, updatedAt: stamp, source: "manual" as const };
      if (next.clockInAt && next.clockOutAt) {
        next.durationMinutes = entryDurationMinutes({ ...next, durationMinutes: undefined });
      }
      return next;
    }),
  };
}

export function addManualEntry(
  state: TimeTrackingState,
  input: {
    clockInAt: string;
    clockOutAt: string;
    projectId?: string;
    clientName?: string;
    title?: string;
    note?: string;
  },
): TimeTrackingState {
  const createdAt = new Date().toISOString();
  const entry: TimeEntry = {
    id: `time-${Date.now()}`,
    clockInAt: input.clockInAt,
    clockOutAt: input.clockOutAt,
    projectId: input.projectId,
    clientName: input.clientName?.trim() || undefined,
    title: input.title?.trim() || undefined,
    note: input.note?.trim() || undefined,
    source: "manual",
    createdAt,
    updatedAt: createdAt,
    durationMinutes: entryDurationMinutes({
      id: "draft",
      clockInAt: input.clockInAt,
      clockOutAt: input.clockOutAt,
      source: "manual",
      createdAt,
      updatedAt: createdAt,
    }),
  };
  return { entries: [entry, ...state.entries] };
}

export function deleteTimeEntry(state: TimeTrackingState, id: string): TimeTrackingState {
  return { entries: state.entries.filter((entry) => entry.id !== id) };
}

export function exportTimesheetCsv(
  entries: TimeEntry[],
  projectName: (projectId?: string) => string,
): string {
  const header = ["Date", "Client", "Project", "Title", "Clock in", "Clock out", "Hours", "Note"];
  const rows = entries.map((entry) => {
    const minutes = entryDurationMinutes(entry);
    const hours = (minutes / 60).toFixed(2);
    return [
      entry.clockInAt.slice(0, 10),
      entry.clientName ?? "",
      projectName(entry.projectId),
      entry.title ?? "",
      formatClockTime(entry.clockInAt),
      entry.clockOutAt ? formatClockTime(entry.clockOutAt) : "",
      hours,
      (entry.note ?? "").replace(/\n/g, " "),
    ];
  });
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}
