/** WorkOS hub — parity with web `OSDashboards.tsx`. */

import type { CalendarEvent, Priority, Project, Task, TaskStatus } from "../types";

export type WorkProject = {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  status: "active" | "completed" | "paused";
  createdAt: string;
  completedAt?: string;
};

export type WorkDeliverable = {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  type: "document" | "code" | "design" | "presentation" | "analysis" | "other";
  status: "planned" | "in_progress" | "review" | "approved" | "delivered" | "canceled";
  priority: "high" | "medium" | "low";
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  notes?: string;
};

export type WorkTask = {
  id: string;
  deliverableId: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "blocked" | "done";
  priority: "high" | "medium" | "low";
  dueDate?: string;
  tags?: string[];
  dependsOn?: string[];
  notes?: string;
  checklist?: string[];
  checklistProgress?: boolean[];
  createdAt: string;
  completedAt?: string;
  updatedAt?: string;
};

export type WorkMeetingFormat = "in_person" | "virtual" | "hybrid";
export type WorkMeetingAlertMinutes = 0 | 5 | 10 | 15 | 30 | 60 | 120 | 1440 | 2880 | 10080;

export type WorkMeeting = {
  id: string;
  title: string;
  description?: string;
  start: string;
  end?: string;
  allDay?: boolean;
  type: "standup" | "review" | "planning" | "retrospective" | "other";
  format?: WorkMeetingFormat;
  location?: string;
  virtualUrl?: string;
  url?: string;
  projectId?: string;
  attendees?: string[];
  notes?: string;
  alerts?: WorkMeetingAlertMinutes[];
  actionItems?: { text: string; done: boolean }[];
  recurring?: "daily" | "weekly" | "biweekly" | "monthly";
  createdAt: string;
};

export type WorkHubState = {
  projects: WorkProject[];
  deliverables: WorkDeliverable[];
  tasks: WorkTask[];
  meetings: WorkMeeting[];
};

/** Remove a Work OS project and cascade its deliverables, tasks, and meetings. */
export function removeWorkProject(hub: WorkHubState, projectId: string): WorkHubState {
  const deliverableIds = new Set(
    hub.deliverables.filter((item) => item.projectId === projectId).map((item) => item.id),
  );
  return {
    ...hub,
    projects: hub.projects.filter((item) => item.id !== projectId),
    deliverables: hub.deliverables.filter((item) => item.projectId !== projectId),
    tasks: hub.tasks.filter((item) => !deliverableIds.has(item.deliverableId)),
    meetings: hub.meetings.filter((item) => item.projectId !== projectId),
  };
}

export type WorkView =
  | "dashboard"
  | "tasks"
  | "projects"
  | "deliverables"
  | "kanban"
  | "calendar"
  | "timesheet"
  | "activity";

export const emptyWorkHub: WorkHubState = {
  projects: [],
  deliverables: [],
  tasks: [],
  meetings: [],
};

export const WORK_COLORS = ["#625af6", "#4b8bdc", "#47a47b", "#d99b38", "#e48b6b"];

/** Add a Work OS task from the Now capture bar — bootstraps project/deliverable when missing. */
export function captureAddWorkTask(hub: WorkHubState, title: string, now = new Date()): WorkHubState {
  const stamp = now.toISOString();
  const dueDate = toDateKey(now);
  const cleanTitle = title.trim() || "New task";
  let next = hub;
  let deliverable =
    next.deliverables.find((item) => item.status !== "delivered" && item.status !== "canceled") ??
    next.deliverables[0];

  if (!deliverable) {
    let project = next.projects.find((item) => item.status === "active") ?? next.projects[0];
    if (!project) {
      const projectId = `proj-${Date.now()}`;
      project = {
        id: projectId,
        name: "Work",
        description: "Captured from Now",
        color: WORK_COLORS[0],
        status: "active",
        createdAt: stamp,
      };
      next = { ...next, projects: [...next.projects, project] };
    }
    const deliverableId = `del-${Date.now()}`;
    deliverable = {
      id: deliverableId,
      projectId: project.id,
      title: "Inbox",
      type: "document",
      status: "in_progress",
      priority: "medium",
      dueDate,
      createdAt: stamp,
    };
    next = { ...next, deliverables: [...next.deliverables, deliverable] };
  }

  const task: WorkTask = {
    id: `task-${Date.now()}`,
    deliverableId: deliverable.id,
    title: cleanTitle,
    status: "open",
    priority: "medium",
    dueDate,
    createdAt: stamp,
    updatedAt: stamp,
  };
  return { ...next, tasks: [...next.tasks, task] };
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const WORK_MEETING_ALERT_OPTIONS: { value: WorkMeetingAlertMinutes | "none"; label: string }[] = [
  { value: "none", label: "None" },
  { value: 0, label: "At time of event" },
  { value: 5, label: "5 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

export function normalizeWorkHub(value: unknown): WorkHubState {
  const hub = (value && typeof value === "object" ? value : {}) as Partial<WorkHubState>;
  return {
    projects: Array.isArray(hub.projects) ? hub.projects : [],
    deliverables: Array.isArray(hub.deliverables) ? hub.deliverables : [],
    tasks: Array.isArray(hub.tasks) ? hub.tasks : [],
    meetings: Array.isArray(hub.meetings) ? hub.meetings : [],
  };
}

export function uidWork(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function projectForTask(hub: WorkHubState, task: WorkTask) {
  const deliverable = hub.deliverables.find((item) => item.id === task.deliverableId);
  return hub.projects.find((item) => item.id === deliverable?.projectId);
}

export function projectForDeliverable(hub: WorkHubState, deliverable: WorkDeliverable) {
  return hub.projects.find((item) => item.id === deliverable.projectId);
}

export function formatWorkMeetingWhere(
  meeting: Pick<WorkMeeting, "format" | "location" | "virtualUrl">,
) {
  const formatLabel =
    meeting.format === "virtual"
      ? "Virtual"
      : meeting.format === "hybrid"
        ? "Hybrid"
        : meeting.format === "in_person"
          ? "In person"
          : null;
  return [formatLabel, meeting.location, meeting.virtualUrl].filter(Boolean).join(" · ");
}

const PRIORITY_MAP = { high: "High", medium: "Medium", low: "Low" } as const;
const STATUS_MAP = {
  open: "Not started",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
} as const satisfies Record<WorkTask["status"], TaskStatus>;

/** Ensure a Life project exists for a Work project (by name), matching web `openWorkProjectSpace`. */
export function ensureLifeProjectForWork(
  projects: Project[],
  workProject: WorkProject,
): Project[] {
  if (projects.some((entry) => entry.name === workProject.name)) return projects;
  return [
    ...projects,
    {
      name: workProject.name,
      desc: workProject.description?.trim() || "A focused project with a finish line.",
      progress: 0,
      color: workProject.color || "#625af6",
      iconName: "BriefcaseBusiness",
      kind: "finishable",
    },
  ];
}

/**
 * Bridge a Work task into a Life task (linked via customProperties.workTaskId),
 * matching web `bridgeWorkTaskToLife`.
 */
export function bridgeWorkTaskToLife(
  hub: WorkHubState,
  tasks: Task[],
  projects: Project[],
  workTaskId: string,
  defaults?: { focusMinutes?: number; energy?: Task["energy"] },
): { lifeTaskId: number; tasks: Task[]; projects: Project[] } | null {
  const workTask = hub.tasks.find((item) => item.id === workTaskId);
  if (!workTask) return null;

  const deliverable = hub.deliverables.find((item) => item.id === workTask.deliverableId);
  const project = hub.projects.find((item) => item.id === deliverable?.projectId);
  const projectName = project?.name ?? "Work";

  const linked = tasks.find(
    (task) =>
      task.customProperties?.some(
        (property) => property.name === "workTaskId" && property.value === workTaskId,
      ) ||
      (task.title === workTask.title && task.project === projectName),
  );
  if (linked) {
    return {
      lifeTaskId: linked.id,
      tasks,
      projects: project ? ensureLifeProjectForWork(projects, project) : projects,
    };
  }

  let nextProjects = projects;
  if (project) nextProjects = ensureLifeProjectForWork(projects, project);

  const lifeTaskId = Date.now();
  const lifeTask: Task = {
    id: lifeTaskId,
    title: workTask.title,
    project: projectName,
    color: project?.color ?? "#625af6",
    due: workTask.dueDate,
    priority: PRIORITY_MAP[workTask.priority] as Priority,
    focusMinutes: defaults?.focusMinutes ?? 30,
    energy: defaults?.energy ?? "Medium",
    status: STATUS_MAP[workTask.status],
    notes: workTask.notes ?? workTask.description ?? "",
    checklist: workTask.checklist ?? [],
    checklistProgress:
      workTask.checklistProgress ?? (workTask.checklist ?? []).map(() => false),
    customProperties: [{ id: "workTaskId", name: "workTaskId", value: workTaskId }],
    done: workTask.status === "done",
  };

  return {
    lifeTaskId,
    tasks: [...tasks, lifeTask],
    projects: nextProjects,
  };
}

/** Derive calendar events from Work meetings (web `workMeetingsToCalendarEvents`). */
export function workMeetingsToCalendarEvents(
  meetings: WorkMeeting[],
  projects: WorkProject[],
): CalendarEvent[] {
  return meetings.map((meeting) => {
    const project = projects.find((item) => item.id === meeting.projectId);
    const where = formatWorkMeetingWhere(meeting);
    const notes = [
      where,
      project ? `Work · ${project.name}` : "Work",
      meeting.notes || meeting.description,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      id: `work-meet-${meeting.id}`,
      title: meeting.title,
      start: meeting.start.length <= 10 ? `${meeting.start}T09:00` : meeting.start,
      end: meeting.end,
      color: project?.color ?? "#625af6",
      source: "Work" as const,
      location: meeting.location,
      notes: notes || undefined,
      repeat: meeting.recurring || undefined,
    };
  });
}

export function mergeCalendarWithWorkMeetings(
  calendar: CalendarEvent[],
  hub: WorkHubState,
): CalendarEvent[] {
  const withoutWork = calendar.filter((event) => !String(event.id).startsWith("work-meet-"));
  return [...withoutWork, ...workMeetingsToCalendarEvents(hub.meetings, hub.projects)];
}
