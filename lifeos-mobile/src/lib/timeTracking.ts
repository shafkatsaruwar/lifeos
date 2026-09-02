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

/** When enabled, the Now-page timesheet strip only appears during work hours ± padding. */
export type WorkHoursSchedule = {
  enabled: boolean;
  /** Local HH:mm, e.g. "09:00" */
  start: string;
  /** Local HH:mm, e.g. "17:00" */
  end: string;
  /** Minutes before start and after end to show the strip (default 60). */
  paddingMinutes?: number;
};

export type TimeTrackingState = {
  entries: TimeEntry[];
  /** Last-used contractor/client — pre-fills clock-in form */
  defaultClientName?: string;
  /** Saved contractor names for quick pick */
  savedClients?: string[];
  workHours?: WorkHoursSchedule;
};

export const DEFAULT_WORK_HOURS: WorkHoursSchedule = {
  enabled: false,
  start: "09:00",
  end: "17:00",
  paddingMinutes: 60,
};

export function parseHm(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

export function formatHmFromMinutes(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatHmDisplay(hm: string): string {
  const minutes = parseHm(hm);
  if (minutes == null) return hm;
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function normalizeWorkHours(value: unknown): WorkHoursSchedule | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as WorkHoursSchedule;
  const startMinutes = parseHm(typeof raw.start === "string" ? raw.start : "") ?? parseHm(DEFAULT_WORK_HOURS.start)!;
  const endMinutes = parseHm(typeof raw.end === "string" ? raw.end : "") ?? parseHm(DEFAULT_WORK_HOURS.end)!;
  const paddingRaw = Number(raw.paddingMinutes);
  const paddingMinutes = Number.isFinite(paddingRaw)
    ? Math.max(0, Math.min(180, Math.round(paddingRaw)))
    : DEFAULT_WORK_HOURS.paddingMinutes ?? 60;
  return {
    enabled: Boolean(raw.enabled),
    start: formatHmFromMinutes(startMinutes),
    end: formatHmFromMinutes(endMinutes),
    paddingMinutes,
  };
}

export function workHoursStripWindowLabel(schedule: WorkHoursSchedule): string {
  const padding = schedule.paddingMinutes ?? DEFAULT_WORK_HOURS.paddingMinutes ?? 60;
  const start = parseHm(schedule.start) ?? parseHm(DEFAULT_WORK_HOURS.start)!;
  const end = parseHm(schedule.end) ?? parseHm(DEFAULT_WORK_HOURS.end)!;
  return `${formatHmDisplay(formatHmFromMinutes(start - padding))} – ${formatHmDisplay(formatHmFromMinutes(end + padding))}`;
}

export function shouldShowTimesheetStrip(state: TimeTrackingState, now = new Date()): boolean {
  if (getActiveEntry(state)) return true;
  const schedule = state.workHours;
  if (!schedule?.enabled) return true;

  const padding = schedule.paddingMinutes ?? DEFAULT_WORK_HOURS.paddingMinutes ?? 60;
  const start = parseHm(schedule.start) ?? parseHm(DEFAULT_WORK_HOURS.start)!;
  const end = parseHm(schedule.end) ?? parseHm(DEFAULT_WORK_HOURS.end)!;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const windowStart = start - padding;
  const windowEnd = end + padding;

  if (end >= start) {
    return minutes >= windowStart && minutes <= windowEnd;
  }
  return minutes >= windowStart || minutes <= windowEnd;
}

export function updateWorkHours(state: TimeTrackingState, patch: Partial<WorkHoursSchedule>): TimeTrackingState {
  const current = state.workHours ?? { ...DEFAULT_WORK_HOURS };
  const workHours = normalizeWorkHours({ ...current, ...patch });
  return workHours ? { ...state, workHours } : state;
}

export const emptyTimeTracking = (): TimeTrackingState => ({ entries: [], savedClients: [] });

export function normalizeTimeTracking(value: unknown): TimeTrackingState {
  if (!value || typeof value !== "object") return emptyTimeTracking();
  const raw = value as TimeTrackingState;
  const entries = Array.isArray(raw.entries)
    ? raw.entries.filter((entry) => entry && typeof entry.id === "string" && typeof entry.clockInAt === "string")
    : [];
  const savedClients = Array.isArray(raw.savedClients)
    ? [...new Set(raw.savedClients.map((name) => (typeof name === "string" ? name.trim() : "")).filter(Boolean))]
    : [];
  let defaultClientName = typeof raw.defaultClientName === "string" ? raw.defaultClientName.trim() : undefined;
  if (!defaultClientName) {
    defaultClientName = entries.find((entry) => entry.clientName?.trim())?.clientName?.trim();
  }
  const mergedClients = defaultClientName && !savedClients.includes(defaultClientName)
    ? [defaultClientName, ...savedClients]
    : savedClients;
  return {
    entries,
    defaultClientName,
    savedClients: mergedClients.length ? mergedClients : undefined,
    workHours: normalizeWorkHours(raw.workHours),
  };
}

export function saveContractor(state: TimeTrackingState, name: string): TimeTrackingState {
  const trimmed = name.trim();
  if (!trimmed) return state;
  const savedClients = [...new Set([trimmed, ...(state.savedClients ?? [])])];
  return { ...state, defaultClientName: trimmed, savedClients };
}

function withDefaultClient(state: TimeTrackingState, clientName?: string): TimeTrackingState {
  return clientName?.trim() ? saveContractor(state, clientName) : state;
}

export function isActiveEntry(entry: TimeEntry): boolean {
  return !entry.clockOutAt || entry.clockOutAt.trim() === "";
}

export function getActiveEntry(state: TimeTrackingState): TimeEntry | undefined {
  return state.entries.find(isActiveEntry);
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
  return withDefaultClient({ ...state, entries: [entry, ...state.entries] }, input.clientName);
}

export function clockOut(state: TimeTrackingState, now = new Date()): TimeTrackingState {
  const active = getActiveEntry(state);
  if (!active) return state;
  const stamp = now.toISOString();
  const durationMinutes = entryDurationMinutes({ ...active, clockOutAt: stamp }, now.getTime());
  return {
    ...state,
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
    ...state,
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
  return withDefaultClient({ ...state, entries: [entry, ...state.entries] }, input.clientName);
}

export function deleteTimeEntry(state: TimeTrackingState, id: string): TimeTrackingState {
  return { ...state, entries: state.entries.filter((entry) => entry.id !== id) };
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
