import { coerceFirebaseList } from "../validation";
import type {
  LifeOSClass,
  LifeOSEvent,
  LifeOSNote,
  LifeOSProject,
  LifeOSTask,
  LifeOSWorkspace,
  SchoolHub,
  TaskStatus,
  WorkHub,
} from "./types";

const TASK_STATUSES = new Set<TaskStatus>([
  "Not started",
  "In progress",
  "Waiting",
  "Blocked",
  "Done",
  "Canceled",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asList(value: unknown): unknown[] {
  return coerceFirebaseList(value) ?? [];
}

export function deriveTaskStatus(task: {
  status?: string;
  done?: boolean;
  canceled?: boolean;
}): TaskStatus {
  if (task.canceled) return "Canceled";
  if (task.done) return "Done";
  if (task.status && TASK_STATUSES.has(task.status as TaskStatus)) {
    return task.status as TaskStatus;
  }
  return "Not started";
}

function normalizeTask(raw: unknown): LifeOSTask | null {
  const item = asRecord(raw);
  if (!item) return null;
  const id = asNumber(item.id);
  const title = asString(item.title).trim();
  if (id == null || !title) return null;
  const done = asBoolean(item.done);
  const canceled = asBoolean(item.canceled);
  const status = deriveTaskStatus({
    status: asOptionalString(item.status),
    done,
    canceled,
  });
  return {
    id,
    title,
    project: asString(item.project, "Inbox"),
    color: asOptionalString(item.color),
    due: asString(item.due),
    startTime: asOptionalString(item.startTime),
    priority: asOptionalString(item.priority),
    focusMinutes: asNumber(item.focusMinutes),
    energy: asOptionalString(item.energy),
    status,
    notes: asOptionalString(item.notes),
    handoffNote: asOptionalString(item.handoffNote),
    nextAction: asOptionalString(item.nextAction),
    followUpDate: asOptionalString(item.followUpDate),
    classId: asOptionalString(item.classId),
    academicType: asOptionalString(item.academicType),
    gradeWeight: asNumber(item.gradeWeight),
    pointsEarned: asNumber(item.pointsEarned),
    pointsPossible: asNumber(item.pointsPossible),
    done,
    canceled,
    completedAt: asOptionalString(item.completedAt),
    calendarEventId: asOptionalString(item.calendarEventId),
  };
}

function normalizeProject(raw: unknown): LifeOSProject | null {
  const item = asRecord(raw);
  if (!item) return null;
  const name = asString(item.name).trim();
  if (!name) return null;
  return {
    name,
    desc: asOptionalString(item.desc),
    color: asOptionalString(item.color),
    kind: asOptionalString(item.kind),
    iconName: asOptionalString(item.iconName) || asOptionalString(item.icon),
    progress: asNumber(item.progress),
  };
}

function normalizeClass(raw: unknown): LifeOSClass | null {
  const item = asRecord(raw);
  if (!item) return null;
  const id = asString(item.id).trim();
  const name = asString(item.name).trim();
  if (!id || !name) return null;
  return {
    id,
    code: asString(item.code) || name,
    name,
    term: asOptionalString(item.term),
    instructor: asOptionalString(item.instructor),
    location: asOptionalString(item.location),
    credits: asNumber(item.credits),
    color: asOptionalString(item.color),
    semesterStart: asOptionalString(item.semesterStart),
    semesterEnd: asOptionalString(item.semesterEnd),
    archived: asBoolean(item.archived),
  };
}

function normalizeEvent(raw: unknown): LifeOSEvent | null {
  const item = asRecord(raw);
  if (!item) return null;
  const id = asString(item.id).trim();
  const title = asString(item.title).trim();
  const start = asString(item.start).trim();
  if (!id || !title || !start) return null;
  return {
    id,
    title,
    start,
    end: asOptionalString(item.end),
    source: asOptionalString(item.source),
    calendarId: asOptionalString(item.calendarId),
    color: asOptionalString(item.color),
    notes: asOptionalString(item.notes),
    location: asOptionalString(item.location),
  };
}

function normalizeNote(raw: unknown): LifeOSNote | null {
  const item = asRecord(raw);
  if (!item) return null;
  const id = asString(item.id).trim();
  const title = asString(item.title).trim();
  if (!id || !title) return null;
  return {
    id,
    title,
    body: asString(item.body),
    projectName: asOptionalString(item.projectName),
    classId: asOptionalString(item.classId),
    updatedAt: asOptionalString(item.updatedAt),
  };
}

function normalizeWorkHub(raw: unknown): WorkHub {
  const item = asRecord(raw) ?? {};
  const projects = asList(item.projects).flatMap((value) => {
    const record = asRecord(value);
    if (!record) return [];
    const id = asString(record.id).trim();
    const name = asString(record.name).trim();
    if (!id || !name) return [];
    return [{
      id,
      name,
      description: asOptionalString(record.description),
      color: asOptionalString(record.color),
      status: asOptionalString(record.status),
      createdAt: asOptionalString(record.createdAt),
      completedAt: asOptionalString(record.completedAt),
    }];
  });
  const deliverables = asList(item.deliverables).flatMap((value) => {
    const record = asRecord(value);
    if (!record) return [];
    const id = asString(record.id).trim();
    const projectId = asString(record.projectId).trim();
    const title = asString(record.title).trim();
    if (!id || !projectId || !title) return [];
    return [{
      id,
      projectId,
      title,
      description: asOptionalString(record.description),
      type: asOptionalString(record.type),
      status: asOptionalString(record.status),
      priority: asOptionalString(record.priority),
      dueDate: asOptionalString(record.dueDate),
      createdAt: asOptionalString(record.createdAt),
      completedAt: asOptionalString(record.completedAt),
    }];
  });
  const tasks = asList(item.tasks).flatMap((value) => {
    const record = asRecord(value);
    if (!record) return [];
    const id = asString(record.id).trim();
    const deliverableId = asString(record.deliverableId).trim();
    const title = asString(record.title).trim();
    if (!id || !deliverableId || !title) return [];
    return [{
      id,
      deliverableId,
      title,
      description: asOptionalString(record.description),
      status: asOptionalString(record.status),
      priority: asOptionalString(record.priority),
      dueDate: asOptionalString(record.dueDate),
      createdAt: asOptionalString(record.createdAt),
      completedAt: asOptionalString(record.completedAt),
    }];
  });
  const meetings = asList(item.meetings).flatMap((value) => {
    const record = asRecord(value);
    if (!record) return [];
    const id = asString(record.id).trim();
    const title = asString(record.title).trim();
    const start = asString(record.start).trim();
    if (!id || !title || !start) return [];
    return [{
      id,
      title,
      start,
      end: asOptionalString(record.end),
      type: asOptionalString(record.type),
      projectId: asOptionalString(record.projectId),
      location: asOptionalString(record.location),
      virtualUrl: asOptionalString(record.virtualUrl) || asOptionalString(record.url),
    }];
  });
  return { projects, deliverables, tasks, meetings };
}

function hubRecords(value: unknown): Array<Record<string, unknown>> {
  return asList(value).flatMap((item) => {
    const record = asRecord(item);
    return record ? [record] : [];
  });
}

function normalizeSchoolHub(raw: unknown): SchoolHub {
  const item = asRecord(raw) ?? {};
  const profile = asRecord(item.profile) ?? {};
  return {
    profile: {
      major: asOptionalString(profile.major),
      minor: asOptionalString(profile.minor),
      classOf: asOptionalString(profile.classOf),
    },
    topics: hubRecords(item.topics),
    professors: hubRecords(item.professors),
    goals: hubRecords(item.goals),
  };
}

function pickCalendar(raw: Record<string, unknown>): unknown {
  return raw.calendar ?? raw.events ?? raw.calendarEvents;
}

function pickBrain(raw: Record<string, unknown>): unknown {
  return raw.brain ?? raw.brainItems;
}

/**
 * Accept both a Settings → Export JSON and a Firebase `users/{uid}` node.
 * Never copy gmail/outlook/icloud (or any `encrypted`) fields into the workspace.
 */
export function normalizeWorkspace(
  raw: unknown,
  meta: Pick<LifeOSWorkspace, "source" | "sourcePath" | "userId">,
): LifeOSWorkspace {
  const root = asRecord(raw) ?? {};
  const settings = asRecord(root.settings) ?? {};
  return {
    source: meta.source,
    sourcePath: meta.sourcePath,
    userId: meta.userId,
    exportedAt: asOptionalString(root.exportedAt),
    tasks: asList(root.tasks).map(normalizeTask).filter((item): item is LifeOSTask => item != null),
    projects: asList(root.projects).map(normalizeProject).filter((item): item is LifeOSProject => item != null),
    classes: asList(root.classes).map(normalizeClass).filter((item): item is LifeOSClass => item != null),
    calendar: asList(pickCalendar(root)).map(normalizeEvent).filter((item): item is LifeOSEvent => item != null),
    notes: asList(root.notes).map(normalizeNote).filter((item): item is LifeOSNote => item != null),
    brain: asList(pickBrain(root)).filter((item): item is string => typeof item === "string"),
    school: normalizeSchoolHub(root.school),
    work: normalizeWorkHub(root.work),
    settings: {
      preferredName: settings.preferredName,
      enableLifeOS: settings.enableLifeOS,
      enableSchoolOS: settings.enableSchoolOS,
      enableWorkOS: settings.enableWorkOS,
      nowTaskId: settings.nowTaskId,
    },
  };
}

export function emptyWorkspace(meta: Pick<LifeOSWorkspace, "source" | "sourcePath" | "userId">): LifeOSWorkspace {
  return normalizeWorkspace({}, meta);
}

export function summarizeTask(task: LifeOSTask) {
  return {
    id: task.id,
    title: task.title,
    status: deriveTaskStatus(task),
    due: task.due || null,
    startTime: task.startTime || null,
    project: task.project,
    classId: task.classId || null,
    academicType: task.academicType || null,
    priority: task.priority || null,
    energy: task.energy || null,
    nextAction: task.nextAction || null,
  };
}
