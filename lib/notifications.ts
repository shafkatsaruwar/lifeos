import { toDateKey } from "@/lib/helpers";
import type { WorkHubState, WorkView } from "@/app/components/OSDashboards";

export type NotificationSource = "work" | "life" | "school" | "calendar";
export type NotificationKind = "task" | "project" | "assignment" | "deliverable" | "meeting" | "event";
export type NotificationUrgency = "overdue" | "today" | "soon";

export type NotificationAction =
  | { type: "work"; view: WorkView; itemId?: string }
  | { type: "life-task"; taskId: number }
  | { type: "life-project"; projectName: string }
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
  academicType?: string;
};

type LifeProjectInput = {
  name: string;
  kind: "maintenance" | "finishable";
};

type ClassInput = {
  id: string;
  code: string;
  archived?: boolean;
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
  // Date-only due dates (YYYY-MM-DD @ local noon) stay "today" all day —
  // only mark overdue when the calendar day has passed, or a real datetime is past.
  if (dateKeyValue && dateKeyValue < today) return "overdue";
  if (dateKeyValue && dateKeyValue === today) return "today";
  if (!dateKeyValue && targetMs <= nowMs) return "overdue";
  if (targetMs - nowMs <= 2 * 60 * 60 * 1000) return "soon";
  return "soon";
};

const pushUnique = (list: LifeOSNotification[], item: LifeOSNotification) => {
  if (!list.some(entry => entry.id === item.id)) list.push(item);
};

const withinNotificationWindow = (dueKey: string, dueMs: number, today: string, weekLimit: number) =>
  dueKey <= today || dueMs <= weekLimit;

const isWorkEnabled = (settings: NotificationSettings) => settings.enableWorkOS !== false;
const isLifeEnabled = (settings: NotificationSettings) => settings.enableLifeOS !== false;
const isSchoolEnabled = (settings: NotificationSettings) => settings.enableSchoolOS !== false;

const schoolKind = (academicType?: string): NotificationKind =>
  academicType === "Project" ? "project" : "assignment";

export function generateLifeOSNotifications(input: {
  now?: Date;
  workHub: WorkHubState;
  tasks: LifeTaskInput[];
  projects?: LifeProjectInput[];
  classes?: ClassInput[];
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
  const projects = input.projects ?? [];
  const classes = input.classes ?? [];
  const classFor = (classId?: string) => classes.find(item => item.id === classId && !item.archived);

  const knownProjectNames = new Set(projects.map(project => project.name));

  if (isWorkEnabled(settings)) {
    const workProjectById = (projectId?: string) =>
      projectId ? input.workHub.projects.find(project => project.id === projectId) : undefined;
    const workDeliverableById = (deliverableId?: string) =>
      deliverableId ? input.workHub.deliverables.find(item => item.id === deliverableId) : undefined;

    input.workHub.tasks.forEach(task => {
      if (task.status === "done" || !task.dueDate) return;
      const deliverable = workDeliverableById(task.deliverableId);
      const project = workProjectById(deliverable?.projectId);
      // Skip orphaned sample/legacy rows that no longer resolve to a real project.
      if (!deliverable || !project) return;

      const dueKey = dateOnly(task.dueDate);
      const dueMs = atLocalNoon(dueKey);
      if (!withinNotificationWindow(dueKey, dueMs, today, weekLimit)) return;

      pushUnique(notifications, {
        id: `work-task-${task.id}`,
        title: task.title,
        subtitle: project.name,
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
      const project = workProjectById(deliverable.projectId);
      if (!project) return;

      const dueKey = dateOnly(deliverable.dueDate);
      const dueMs = atLocalNoon(dueKey);
      if (!withinNotificationWindow(dueKey, dueMs, today, weekLimit)) return;

      pushUnique(notifications, {
        id: `work-deliverable-${deliverable.id}`,
        title: deliverable.title,
        subtitle: project.name,
        source: "work",
        kind: "deliverable",
        urgency: urgencyFrom(dueMs, nowMs, dueKey),
        dueIn: formatDueIn(dueMs, nowMs, dueKey),
        sortAt: dueMs,
        action: { type: "work", view: "deliverables", itemId: deliverable.id },
      });
    });

    input.workHub.projects
      .filter(project => project.status === "active")
      .forEach(project => {
        const dueDeliverables = input.workHub.deliverables
          .filter(item => item.projectId === project.id && item.status !== "delivered" && item.status !== "canceled")
          .map(item => ({ item, dueKey: dateOnly(item.dueDate), dueMs: atLocalNoon(dateOnly(item.dueDate)) }))
          .filter(entry => withinNotificationWindow(entry.dueKey, entry.dueMs, today, weekLimit))
          .sort((a, b) => a.dueMs - b.dueMs);

        if (!dueDeliverables.length) return;

        const earliest = dueDeliverables[0];
        pushUnique(notifications, {
          id: `work-project-${project.id}`,
          title: project.name,
          subtitle: `${dueDeliverables.length} deliverable${dueDeliverables.length === 1 ? "" : "s"} due`,
          source: "work",
          kind: "project",
          urgency: urgencyFrom(earliest.dueMs, nowMs, earliest.dueKey),
          dueIn: formatDueIn(earliest.dueMs, nowMs, earliest.dueKey),
          sortAt: earliest.dueMs,
          action: { type: "work", view: "projects", itemId: project.id },
        });
      });

    input.workHub.meetings.forEach(meeting => {
      const startMs = atDateTime(meeting.start);
      const alertMinutes = meeting.alerts?.length ? meeting.alerts : [120];
      const earliestWindow = Math.max(...alertMinutes) * 60_000;
      if (startMs < nowMs - 15 * 60_000 || startMs - earliestWindow > nowMs) return;
      const project = workProjectById(meeting.projectId);
      const formatLabel = meeting.format === "virtual" ? "Virtual" : meeting.format === "hybrid" ? "Hybrid" : meeting.format === "in_person" ? "In person" : null;
      const subtitle = [formatLabel, meeting.location, project?.name ?? "Meeting"].filter(Boolean).join(" · ");

      pushUnique(notifications, {
        id: `work-meeting-${meeting.id}`,
        title: meeting.title,
        subtitle,
        source: "work",
        kind: "meeting",
        urgency: startMs <= nowMs + 60 * 60_000 ? "today" : "soon",
        dueIn: formatDueIn(startMs, nowMs),
        sortAt: startMs,
        action: { type: "work", view: "calendar", itemId: meeting.id },
      });
    });
  }

  if (isLifeEnabled(settings)) {
    input.tasks
      .filter(task => !task.classId && !task.done && !task.canceled && task.due)
      .forEach(task => {
        const dueKey = dateOnly(task.due!);
        const dueMs = atLocalNoon(dueKey);
        if (!withinNotificationWindow(dueKey, dueMs, today, weekLimit)) return;

        const projectName = task.project?.trim() ?? "";
        const isInbox = !projectName || projectName === "Inbox";
        const linkedProject = !isInbox && knownProjectNames.has(projectName) ? projectName : "";
        // Spaces reassign tasks to Inbox on delete, so a non-empty unknown
        // project name is leftover demo/orphan data — don't notify for it.
        if (!isInbox && !linkedProject) return;

        pushUnique(notifications, {
          id: `life-task-${task.id}`,
          title: task.title,
          subtitle: linkedProject || "Inbox",
          source: "life",
          kind: "task",
          urgency: urgencyFrom(dueMs, nowMs, dueKey),
          dueIn: formatDueIn(dueMs, nowMs, dueKey),
          sortAt: dueMs,
          action: { type: "life-task", taskId: task.id },
        });
      });

    projects
      .filter(project => project.kind === "finishable")
      .forEach(project => {
        const dueTasks = input.tasks
          .filter(task => !task.classId && !task.done && !task.canceled && task.due && task.project === project.name)
          .map(task => ({ task, dueKey: dateOnly(task.due!), dueMs: atLocalNoon(dateOnly(task.due!)) }))
          .filter(entry => withinNotificationWindow(entry.dueKey, entry.dueMs, today, weekLimit))
          .sort((a, b) => a.dueMs - b.dueMs);

        if (!dueTasks.length) return;

        const earliest = dueTasks[0];
        pushUnique(notifications, {
          id: `life-project-${project.name}`,
          title: project.name,
          subtitle: `${dueTasks.length} task${dueTasks.length === 1 ? "" : "s"} due`,
          source: "life",
          kind: "project",
          urgency: urgencyFrom(earliest.dueMs, nowMs, earliest.dueKey),
          dueIn: formatDueIn(earliest.dueMs, nowMs, earliest.dueKey),
          sortAt: earliest.dueMs,
          action: { type: "life-project", projectName: project.name },
        });
      });
  }

  if (isSchoolEnabled(settings)) {
    input.tasks
      .filter(task => task.classId && !task.done && !task.canceled && task.due && classFor(task.classId))
      .forEach(task => {
        const dueKey = dateOnly(task.due!);
        const dueMs = atLocalNoon(dueKey);
        if (!withinNotificationWindow(dueKey, dueMs, today, weekLimit)) return;

        const course = classFor(task.classId);
        if (!course) return;
        const kind = schoolKind(task.academicType);
        const label = task.academicType ?? "Assignment";

        pushUnique(notifications, {
          id: `school-${kind}-${task.id}`,
          title: task.title,
          subtitle: `${course.code} · ${label}`,
          source: "school",
          kind,
          urgency: urgencyFrom(dueMs, nowMs, dueKey),
          dueIn: formatDueIn(dueMs, nowMs, dueKey),
          sortAt: dueMs,
          action: { type: "school-task", taskId: task.id },
        });
      });
  }

  if (settings.calendarAlerts !== false) {
    input.events.forEach(event => {
      if (!event.id || !event.title || !event.start) return;
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

export const notificationKindLabel: Record<NotificationKind, string> = {
  task: "Task",
  project: "Project",
  assignment: "Assignment",
  deliverable: "Deliverable",
  meeting: "Meeting",
  event: "Event",
};

export const notificationSourceOrder: NotificationSource[] = ["calendar", "work", "school", "life"];

export const notificationEnvironmentSources: NotificationSource[] = ["work", "life", "school"];

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

export type NotificationGroupSummary = {
  total: number;
  overdue: number;
  today: number;
  byKind: Partial<Record<NotificationKind, number>>;
};

const kindPlural: Record<NotificationKind, [string, string]> = {
  task: ["task", "tasks"],
  project: ["project", "projects"],
  assignment: ["assignment", "assignments"],
  deliverable: ["deliverable", "deliverables"],
  meeting: ["meeting", "meetings"],
  event: ["event", "events"],
};

export function summarizeNotificationGroup(items: LifeOSNotification[]): NotificationGroupSummary {
  const byKind: Partial<Record<NotificationKind, number>> = {};
  let overdue = 0;
  let today = 0;
  items.forEach(item => {
    byKind[item.kind] = (byKind[item.kind] ?? 0) + 1;
    if (item.urgency === "overdue") overdue += 1;
    if (item.urgency === "today") today += 1;
  });
  return { total: items.length, overdue, today, byKind };
}

export function formatGroupKindBreakdown(summary: NotificationGroupSummary) {
  const order: NotificationKind[] = ["task", "assignment", "deliverable", "project", "meeting", "event"];
  return order
    .filter(kind => summary.byKind[kind])
    .map(kind => {
      const count = summary.byKind[kind] ?? 0;
      const [one, many] = kindPlural[kind];
      return `${count} ${count === 1 ? one : many}`;
    })
    .join(" · ");
}

/** In-app banners / OS toasts: only immediate attention, not every due-today item. */
export function isBannerCandidate(notification: LifeOSNotification, now = Date.now()) {
  if (notification.kind === "meeting" || notification.kind === "event") {
    return notification.sortAt - now <= 60 * 60 * 1000;
  }
  return notification.urgency === "overdue";
}

/** True when a system/browser notification should fire (not the full notification center list). */
export function shouldPushSystemNotification(notification: LifeOSNotification, now = Date.now()) {
  return isBannerCandidate(notification, now);
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
