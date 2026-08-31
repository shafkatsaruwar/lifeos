import type { CalendarEvent, Task } from "../types";

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDueDate(dateStr?: string): string {
  if (!dateStr) return "No due date";
  const value = /^\d{4}-\d{2}-\d{2}/.test(dateStr) ? dateStr.slice(0, 10) : dateStr;
  const today = new Date();
  const todayKey = toDateKey(today);
  if (value === todayKey) return "Today";
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === toDateKey(tomorrow)) return "Tomorrow";
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDate(value?: string) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function taskIsOpen(task: Task) {
  return !task.done && !task.canceled && task.status !== "Done" && task.status !== "Canceled";
}

export function taskIsRecentlyDone(task: Task, days = 10) {
  if (taskIsOpen(task) || task.canceled || task.status === "Canceled") return false;
  if (!task.done && task.status !== "Done") return false;
  if (!task.completedAt) return false;
  const stamp = Date.parse(task.completedAt);
  if (Number.isNaN(stamp)) return false;
  return stamp >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export function getTaskStatus(task: Task) {
  return task.status ?? (task.canceled ? "Canceled" : task.done ? "Done" : "Not started");
}

export function taskRemaining(task: Task) {
  const baseline = task.focusRemainingSeconds ?? (task.focusMinutes ?? 25) * 60;
  if (!task.focusSessionRunning || !task.focusUpdatedAt) return Math.max(0, baseline);
  const elapsed = Math.floor((Date.now() - new Date(task.focusUpdatedAt).getTime()) / 1000);
  return Math.max(0, baseline - elapsed);
}

export function durationText(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const totalMinutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(totalMinutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export function dueRank(due?: string) {
  if (!due) return 999;
  const value = due.toLowerCase();
  if (value === "today") return 0;
  if (value === "tomorrow") return 1;
  const parsed = Date.parse(due);
  return Number.isNaN(parsed) ? 999 : parsed;
}

export function getGreeting(date: Date, name = "there") {
  const hour = date.getHours();
  if (hour < 5) return `Still up, ${name}?`;
  if (hour < 12) return `Good morning, ${name}.`;
  if (hour < 17) return `Good afternoon, ${name}.`;
  if (hour < 22) return `Good evening, ${name}.`;
  return `Good night, ${name}.`;
}

export function formatEventTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function getEventDateRange(event: CalendarEvent) {
  const startKey = event.start.slice(0, 10);
  const candidateEnd = event.end?.slice(0, 10) ?? startKey;
  return { startKey, endKey: candidateEnd < startKey ? startKey : candidateEnd };
}

function isWeekendDateKey(dateKey: string): boolean {
  const day = new Date(`${dateKey}T12:00:00`).getDay();
  return day === 0 || day === 6;
}

export function eventOccursOnDate(event: CalendarEvent, dateKey: string) {
  const { startKey, endKey } = getEventDateRange(event);
  if (dateKey < startKey || dateKey > endKey) return false;
  if (event.weekdaysOnly && isWeekendDateKey(dateKey)) return false;
  return true;
}

export function formatEventRange(event: CalendarEvent) {
  const { startKey, endKey } = getEventDateRange(event);
  const weekdayNote = event.weekdaysOnly ? " · weekdays" : "";
  if (startKey === endKey) {
    return `${formatEventTime(event.start)}${event.end ? ` – ${formatEventTime(event.end)}` : ""}${weekdayNote}`;
  }
  const start = new Date(event.start);
  const end = new Date(event.end ?? `${endKey}T23:59`);
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${startLabel}, ${formatEventTime(event.start)} → ${endLabel}, ${formatEventTime(event.end ?? `${endKey}T23:59`)}${weekdayNote}`;
}

export function formatAmbientDuration(milliseconds: number) {
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  if (minutes < 1) return "just started";
  if (minutes < 60) return String(minutes) + " min";
  return String(Math.floor(minutes / 60)) + "h " + String(minutes % 60) + "m";
}

export function formatResourceSize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${Math.round((bytes / Math.pow(1024, unit)) * 10) / 10} ${units[unit]}`;
}

/** Strip web rich-text HTML so mobile TextInputs can show the same note body. */
export function htmlToPlainText(value: string): string {
  if (!value) return "";
  if (!/<\/?[a-z][\s\S]*>/i.test(value)) return value;
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
