import type { CalendarEvent, NotificationLead, SettingsState, Task, Workspace } from "../../types";
import { taskIsOpen, toDateKey } from "../helpers";
import { resolveNotificationPrefs } from "./prefs";
import { LEAD_MS, type InboxItem, type PlannedNotification } from "./types";

const ACADEMIC_DEADLINE = new Set(["Assignment", "Project", "Exam", "Quiz", "Lab"]);

function parseDueMs(due: string): { at: Date; dateOnly: boolean } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    // Date-only → 9:00 local on that day
    const d = new Date(`${due}T09:00:00`);
    return { at: d, dateOnly: true };
  }
  const parsed = new Date(due);
  if (!Number.isNaN(parsed.getTime())) return { at: parsed, dateOnly: false };
  const fallback = new Date(`${due.slice(0, 10)}T09:00:00`);
  return { at: fallback, dateOnly: true };
}

function isDeadlineTask(task: Task) {
  return Boolean(task.academicType && ACADEMIC_DEADLINE.has(task.academicType));
}

/** Cap leads to avoid spam — keep at most 3, preferring longer + exact. */
function pickLeads(leads: NotificationLead[], hasExactTime: boolean): NotificationLead[] {
  const order: NotificationLead[] = ["1d", "1h", "30m", "15m", "5m", "exact"];
  const enabled = new Set(leads);
  const picked: NotificationLead[] = [];
  for (const lead of order) {
    if (!enabled.has(lead)) continue;
    if (lead === "exact" && !hasExactTime && !enabled.has("exact")) continue;
    // For date-only, skip sub-hour leads (they'd all pile on the same morning).
    if (!hasExactTime && (lead === "5m" || lead === "15m" || lead === "30m")) continue;
    picked.push(lead);
    if (picked.length >= 3) break;
  }
  if (!picked.length && enabled.has("exact")) picked.push("exact");
  return picked;
}

function leadLabel(lead: NotificationLead, dateOnly: boolean): { title: string; bodyPrefix: string } {
  if (lead === "exact") return { title: dateOnly ? "Due today" : "Due now", bodyPrefix: "" };
  if (lead === "1d") return { title: "Due tomorrow", bodyPrefix: "" };
  if (lead === "1h") return { title: "Due soon", bodyPrefix: "in 1 hour — " };
  if (lead === "30m") return { title: "Due soon", bodyPrefix: "in 30 minutes — " };
  if (lead === "15m") return { title: "Due soon", bodyPrefix: "in 15 minutes — " };
  return { title: "Due soon", bodyPrefix: "in 5 minutes — " };
}

function eventLeadLabel(lead: NotificationLead): { title: string; bodyPrefix: string } {
  if (lead === "exact") return { title: "Starting now", bodyPrefix: "" };
  if (lead === "1d") return { title: "Tomorrow", bodyPrefix: "" };
  if (lead === "1h") return { title: "Coming up", bodyPrefix: "starts in 1 hour — " };
  if (lead === "30m") return { title: "Coming up", bodyPrefix: "starts in 30 minutes — " };
  if (lead === "15m") return { title: "Coming up", bodyPrefix: "starts in 15 minutes — " };
  return { title: "Coming up", bodyPrefix: "starts in 5 minutes — " };
}

function planTaskNotifications(
  task: Task,
  leads: NotificationLead[],
  prefs: ReturnType<typeof resolveNotificationPrefs>,
  now: Date,
): PlannedNotification[] {
  if (!task.due || !taskIsOpen(task)) return [];
  const deadline = isDeadlineTask(task);
  if (deadline && !prefs.deadlines) return [];
  if (!deadline && !prefs.tasks && !prefs.dueDates) return [];
  if (task.priority === "High" && prefs.important === false && !prefs.tasks) return [];

  const { at, dateOnly } = parseDueMs(task.due);
  const selected = pickLeads(leads, !dateOnly);
  const out: PlannedNotification[] = [];

  for (const lead of selected) {
    const fireAt = new Date(at.getTime() - LEAD_MS[lead]);
    if (fireAt.getTime() <= now.getTime() + 15_000) continue;
    const labels = leadLabel(lead, dateOnly);
    const kind = deadline ? "deadline" : task.priority === "High" ? "important" : "task";
    out.push({
      id: `task:${task.id}:${lead}`,
      title: deadline ? (lead === "1d" ? "Deadline tomorrow" : labels.title.replace("Due", "Deadline")) : labels.title,
      body: `${labels.bodyPrefix}${task.title}${deadline && task.academicType ? ` (${task.academicType})` : ""}`,
      fireAt,
      payload: { category: kind, targetId: String(task.id), path: `task/${task.id}` },
    });
  }

  // One overdue nudge the morning after a missed date-only due (or 1h after timed due).
  if (prefs.dueDates || prefs.deadlines) {
    const overdueAt = dateOnly
      ? new Date(`${toDateKey(new Date(at.getTime() + 24 * 60 * 60_000))}T09:30:00`)
      : new Date(at.getTime() + 60 * 60_000);
    if (overdueAt.getTime() > now.getTime() + 15_000 && overdueAt.getTime() < now.getTime() + 14 * 24 * 60 * 60_000) {
      out.push({
        id: `task:${task.id}:overdue`,
        title: "Overdue",
        body: `You have an overdue ${deadline ? "deadline" : "task"}: ${task.title}`,
        fireAt: overdueAt,
        payload: {
          category: deadline ? "deadline" : "task",
          targetId: String(task.id),
          path: `task/${task.id}`,
        },
      });
    }
  }

  return out;
}

function planEventNotifications(
  event: CalendarEvent,
  leads: NotificationLead[],
  now: Date,
): PlannedNotification[] {
  const start = new Date(event.start);
  if (Number.isNaN(start.getTime())) return [];
  const selected = pickLeads(leads, true);
  const out: PlannedNotification[] = [];
  for (const lead of selected) {
    const fireAt = new Date(start.getTime() - LEAD_MS[lead]);
    if (fireAt.getTime() <= now.getTime() + 15_000) continue;
    const labels = eventLeadLabel(lead);
    out.push({
      id: `event:${event.id}:${lead}`,
      title: labels.title,
      body: `${labels.bodyPrefix}${event.title}`,
      fireAt,
      payload: { category: "event", targetId: event.id, path: `event/${event.id}` },
    });
  }
  return out;
}

export function planWorkspaceNotifications(workspace: Workspace, now = new Date()): PlannedNotification[] {
  const prefs = resolveNotificationPrefs(workspace.settings);
  if (!prefs.enabled) return [];

  const planned: PlannedNotification[] = [];
  const horizon = now.getTime() + 21 * 24 * 60 * 60_000;

  if (prefs.tasks || prefs.dueDates || prefs.deadlines || prefs.important) {
    for (const task of workspace.tasks) {
      for (const item of planTaskNotifications(task, prefs.leads, prefs, now)) {
        if (item.fireAt.getTime() <= horizon) planned.push(item);
      }
    }
  }

  if (prefs.calendar) {
    for (const event of workspace.calendar) {
      for (const item of planEventNotifications(event, prefs.leads, now)) {
        if (item.fireAt.getTime() <= horizon) planned.push(item);
      }
    }
  }

  // Deduplicate by id
  const byId = new Map<string, PlannedNotification>();
  for (const item of planned) byId.set(item.id, item);
  return [...byId.values()];
}

export function buildInbox(workspace: Workspace, now = new Date()): InboxItem[] {
  const today = toDateKey(now);
  const week = new Date(now);
  week.setDate(week.getDate() + 7);
  const weekKey = toDateKey(week);
  const items: InboxItem[] = [];

  for (const task of workspace.tasks.filter(taskIsOpen)) {
    if (!task.due) continue;
    const key = task.due.slice(0, 10);
    const deadline = isDeadlineTask(task);
    const overdue = key < today;
    const isToday = key === today;
    if (!overdue && !isToday && key > weekKey) continue;
    const { at } = parseDueMs(task.due);
    items.push({
      id: `inbox-task-${task.id}`,
      title: overdue ? "Overdue" : isToday ? (deadline ? "Deadline today" : "Due today") : deadline ? "Deadline upcoming" : "Due soon",
      subtitle: task.title,
      whenLabel: overdue ? "Overdue" : isToday ? "Today" : formatShort(at),
      sortAt: at.getTime() - (overdue ? 1e12 : 0),
      bucket: overdue || isToday ? "today" : "upcoming",
      payload: {
        category: deadline ? "deadline" : "task",
        targetId: String(task.id),
        path: `task/${task.id}`,
      },
    });
  }

  for (const event of workspace.calendar) {
    const start = new Date(event.start);
    if (Number.isNaN(start.getTime())) continue;
    const key = toDateKey(start);
    if (key < today || key > weekKey) continue;
    items.push({
      id: `inbox-event-${event.id}`,
      title: key === today ? "Today" : "Upcoming",
      subtitle: event.title,
      whenLabel: key === today ? formatTime(start) : formatShort(start),
      sortAt: start.getTime(),
      bucket: key === today ? "today" : "upcoming",
      payload: { category: "event", targetId: event.id, path: `event/${event.id}` },
    });
  }

  const running = workspace.tasks.find((t) => t.focusSessionRunning);
  if (running) {
    items.unshift({
      id: `inbox-focus-${running.id}`,
      title: "Focus running",
      subtitle: running.title,
      whenLabel: "Now",
      sortAt: Date.now(),
      bucket: "today",
      payload: { category: "focus", targetId: String(running.id), path: "focus" },
    });
  }

  return items.sort((a, b) => a.sortAt - b.sortAt).slice(0, 24);
}

function formatShort(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function focusEndPlan(taskId: number, remainingSeconds: number, now = new Date()): PlannedNotification[] {
  if (remainingSeconds <= 5) return [];
  const endAt = new Date(now.getTime() + remainingSeconds * 1000);
  const minutes = Math.max(1, Math.round(remainingSeconds / 60));
  const out: PlannedNotification[] = [
    {
      id: `focus:${taskId}:end`,
      title: "Focus complete",
      body: `Your ${minutes}-minute focus session is finished.`,
      fireAt: endAt,
      payload: { category: "focus", targetId: String(taskId), path: "focus" },
    },
  ];
  if (remainingSeconds > 5 * 60) {
    out.push({
      id: `focus:${taskId}:warn`,
      title: "Almost done",
      body: "Your focus session ends in 2 minutes.",
      fireAt: new Date(endAt.getTime() - 2 * 60_000),
      payload: { category: "focus", targetId: String(taskId), path: "focus" },
    });
  }
  return out.filter((p) => p.fireAt.getTime() > now.getTime() + 5_000);
}
