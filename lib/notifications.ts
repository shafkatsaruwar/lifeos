import { toDateKey } from "@/lib/helpers";
import type { WorkHubState, WorkView } from "@/app/components/OSDashboards";

export type NotificationSource = "work" | "life" | "school" | "calendar";
export type NotificationKind = "task" | "deliverable" | "meeting" | "event";
export type NotificationUrgency = "overdue" | "today" | "soon";

export type NotificationAction =
  | { type: "work"; view: WorkView; itemId?: string }
  | { type: "life-task"; taskId: number }
  | { type: "school-task"; taskId: number }
  | { type: "calendar"; eventId?: string }
  | { type: "now" };

export type LifeOSNotification = {
  id: string;
  title: string;
  subtitle?: string;
  source: NotificationSource;
  kind: NotificationKind;
  urgency: NotificationUrgency;
  dueIn: string;
  sortAt: number;
  action: NotificationAction;
};

type LifeTaskInput = {
  id: number;
  title: string;
  due?: string;
  done?: boolean;
  canceled?: boolean;
  classId?: string;
  project?: string;
  priority?: string;
  color?: string;
};

type CalendarEventInput = {
  id: string;
  title: string;
  start: string;
};

type NotificationSettings = {
  calendarAlerts?: boolean;
  enableWorkOS?: boolean;
  enableSchoolOS?: boolean;
  enableLifeOS?: boolean;
};

const dateOnly = (value: string) => value.slice(0, 10);
const atLocalNoon = (dateKey: string) => new Date(`${dateKey}T12:00:00`).getTime();
const atDateTime = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? atLocalNoon(dateOnly(value)) : parsed.getTime();
};

const formatDueIn = (targetMs: number, nowMs: number, dateKeyValue?: string) => {
  const today = toDateKey(new Date(nowMs));
  if (dateKeyValue && dateKeyValue < today) return "Overdue";
  if (dateKeyValue && dateKeyValue === today) return "Due today";

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return "Overdue";

  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `in ${Math.max(1, minutes)}m`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours}h`;

  const days = Math.round(hours / 24);
  if (days === 1) return "Tomorrow";
  return `in ${days}d`;
};

const urgencyFrom = (targetMs: number, nowMs: number, dateKeyValue?: string): NotificationUrgency => {
  const today = toDateKey(new Date(nowMs));
  if (dateKeyValue && dateKeyValue < today) return "overdue";
  if (targetMs <= nowMs) return "overdue";
  if (dateKeyValue && dateKeyValue === today) return "today";
  if (targetMs - nowMs <= 2 * 60 * 60 * 1000) return "soon";
  return "soon";
};

const pushUnique = (list: LifeOSNotification[], item: LifeOSNotification) => {
  if (!list.some(entry => entry.id === item.id)) list.push(item);
};

export function generateLifeOSNotifications(input: {
  now?: Date;
  workHub: WorkHubState;
  tasks: LifeTaskInput[];
  events: CalendarEventInput[];
  settings?: NotificationSettings;
}): LifeOSNotification[] {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const today = toDateKey(now);
  const soonLimit = nowMs + 2 * 60 * 60 * 1000;
  const weekLimit = nowMs + 7 * 24 * 60 * 60 * 1000;
  const settings = input.settings ?? {};
  const notifications: LifeOSNotification[] = [];

  if (settings.enableWorkOS !== false) {
    input.workHub.tasks.forEach(task => {
      if (task.status === "done" || !task.dueDate) return;
      const dueKey = dateOnly(task.dueDate);
      const dueMs = atLocalNoon(dueKey);
      const include = dueKey <= today || dueMs <= weekLimit;
      if (!include) return;

      pushUnique(notifications, {
        id: `work-task-${task.id}`,
        title: task.title,
        subtitle: "Work task",
        source: "work",
        kind: "task",
        urgency: urgencyFrom(dueMs, nowMs, dueKey),
        dueIn: formatDueIn(dueMs, nowMs, dueKey),
        sortAt: dueMs,
        action: { type: "work", view: "tasks", itemId: task.id },
      });
    });

    input.workHub.deliverables.forEach(deliverable => {
      if (deliverable.status === "delivered" || deliverable.status === "canceled") return;
      const dueKey = dateOnly(deliverable.dueDate);
      const dueMs = atLocalNoon(dueKey);
      if (dueKey > today && dueMs > weekLimit) return;

      pushUnique(notifications, {
        id: `work-deliverable-${deliverable.id}`,
        title: deliverable.title,
        subtitle: "Deliverable",
        source: "work",
        kind: "deliverable",
        urgency: urgencyFrom(dueMs, nowMs, dueKey),
        dueIn: formatDueIn(dueMs, nowMs, dueKey),
        sortAt: dueMs,
        action: { type: "work", view: "deliverables", itemId: deliverable.id },
      });
    });

    input.workHub.meetings.forEach(meeting => {
      const startMs = atDateTime(meeting.start);
      if (startMs < nowMs - 15 * 60_000 || startMs > soonLimit) return;

      pushUnique(notifications, {
        id: `work-meeting-${meeting.id}`,
        title: meeting.title,
        subtitle: "Meeting",
        source: "work",
        kind: "meeting",
        urgency: startMs <= nowMs + 60 * 60_000 ? "today" : "soon",
        dueIn: formatDueIn(startMs, nowMs),
        sortAt: startMs,
        action: { type: "work", view: "calendar", itemId: meeting.id },
      });
    });
  }

  if (settings.enableLifeOS !== false) {
    input.tasks.filter(task => !task.classId && !task.done && !task.canceled && task.due).forEach(task => {
      const dueKey = dateOnly(task.due!);
      const dueMs = atLocalNoon(dueKey);
      if (dueKey > today && dueMs > weekLimit) return;

      pushUnique(notifications, {
        id: `life-task-${task.id}`,
        title: task.title,
        subtitle: task.project || "Personal task",
        source: "life",
        kind: "task",
        urgency: urgencyFrom(dueMs, nowMs, dueKey),
        dueIn: formatDueIn(dueMs, nowMs, dueKey),
        sortAt: dueMs,
        action: { type: "life-task", taskId: task.id },
      });
    });
  }

  if (settings.enableSchoolOS !== false) {
    input.tasks.filter(task => task.classId && !task.done && !task.canceled && task.due).forEach(task => {
      const dueKey = dateOnly(task.due!);
      const dueMs = atLocalNoon(dueKey);
      if (dueKey > today && dueMs > weekLimit) return;

      pushUnique(notifications, {
        id: `school-task-${task.id}`,
        title: task.title,
        subtitle: "School task",
        source: "school",
        kind: "task",
        urgency: urgencyFrom(dueMs, nowMs, dueKey),
        dueIn: formatDueIn(dueMs, nowMs, dueKey),
        sortAt: dueMs,
        action: { type: "school-task", taskId: task.id },
      });
    });
  }

  if (settings.calendarAlerts !== false) {
    input.events.forEach(event => {
      const startMs = atDateTime(event.start);
      if (startMs < nowMs - 15 * 60_000 || startMs > soonLimit) return;

      pushUnique(notifications, {
        id: `calendar-${event.id}`,
        title: event.title,
        subtitle: "Calendar",
        source: "calendar",
        kind: "event",
        urgency: startMs <= nowMs + 60 * 60_000 ? "today" : "soon",
        dueIn: formatDueIn(startMs, nowMs),
        sortAt: startMs,
        action: { type: "calendar", eventId: event.id },
      });
    });
  }

  const urgencyRank: Record<NotificationUrgency, number> = { overdue: 0, today: 1, soon: 2 };
  return notifications.sort((a, b) => {
    const urgencyDiff = urgencyRank[a.urgency] - urgencyRank[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    return a.sortAt - b.sortAt;
  });
}

export const notificationSourceLabel: Record<NotificationSource, string> = {
  work: "Work",
  life: "Life",
  school: "School",
  calendar: "Calendar",
};

export const notificationSourceOrder: NotificationSource[] = ["calendar", "work", "school", "life"];

export const notificationSourceAccent: Record<NotificationSource, string> = {
  work: "#625af6",
  life: "#47a47b",
  school: "#4b8bdc",
  calendar: "#e48b6b",
};

export function groupNotificationsBySource(notifications: LifeOSNotification[]) {
  const groups: { source: NotificationSource; items: LifeOSNotification[] }[] = [];
  notificationSourceOrder.forEach(source => {
    const items = notifications.filter(item => item.source === source);
    if (items.length) groups.push({ source, items });
  });
  return groups;
}

export function isBannerCandidate(notification: LifeOSNotification) {
  if (notification.kind === "meeting" || notification.kind === "event") return true;
  if (notification.urgency === "soon") return true;
  return false;
}

export function formatNotificationTime(sortAt: number, now = Date.now()) {
  const diffMs = sortAt - now;
  if (Math.abs(diffMs) < 60_000) return "now";
  if (diffMs > 0 && diffMs < 3_600_000) return `in ${Math.max(1, Math.round(diffMs / 60_000))}m`;
  return new Date(sortAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export const DISMISSED_NOTIFICATIONS_KEY = "lifeos-dismissed-notifications";

export function loadDismissedNotificationIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

export function saveDismissedNotificationIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify([...ids].slice(0, 200)));
}
