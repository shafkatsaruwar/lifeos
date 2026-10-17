import {
  DEFAULT_FOCUS_MINUTES,
  MAX_FOCUS_MINUTES,
  MIN_FOCUS_MINUTES,
  PROJECT_ICONS,
} from "../constants";
import { toDateKey } from "../helpers";
import { coalesceEventMeetingUrl, eventPlaceLabel } from "../meetingLinks";
import { coerceFirebaseList } from "../validation";
import { WriteRejected } from "./firebaseWrite";

const PRIORITIES = ["High", "Medium", "Low"] as const;
const ENERGIES = ["Low", "Medium", "High"] as const;
const STATUSES = ["Not started", "In progress", "Waiting", "Blocked", "Done", "Canceled"] as const;
const ACADEMIC = ["Assignment", "Project", "Exam", "Quiz", "Lab", "Reading", "Discussion"] as const;
const NOTE_TEMPLATES = ["blank", "lined", "dotted", "cornell", "meeting"] as const;
const PROJECT_ICON_SET = new Set<string>(PROJECT_ICONS);

type Energy = (typeof ENERGIES)[number];

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function requireList(value: unknown, key: string): unknown[] {
  if (value == null) return [];
  const list = coerceFirebaseList(value);
  if (!list) throw new WriteRejected(`Refusing to write ${key}: the existing Firebase value is not a list.`);
  return list.slice();
}

function rejectUnknown(input: Record<string, unknown>, allowed: string[], tool: string): void {
  const extra = Object.keys(input).filter((key) => !allowed.includes(key));
  if (extra.length) throw new WriteRejected(`${tool} does not accept: ${extra.join(", ")}.`);
}

function rejectBulk(input: Record<string, unknown>, tool: string): void {
  if ("ids" in input || input.all === true || Array.isArray(input.id)) {
    throw new WriteRejected(`${tool} requires one explicit id. Bulk delete is not supported.`);
  }
}

export function requireTaskId(value: unknown, tool: string): number {
  if (typeof value === "string" && value.trim() && !/^\d+$/.test(value.trim())) {
    throw new WriteRejected(`${tool} requires a single numeric id.`);
  }
  const id = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(id)) throw new WriteRejected(`${tool} requires a single numeric id.`);
  return id;
}

function requireTextId(value: unknown, tool: string, label: string): string {
  rejectBulk({ id: value } as Record<string, unknown>, tool);
  if (typeof value !== "string" || !value.trim()) throw new WriteRejected(`${tool} requires a single ${label} id string.`);
  return value.trim();
}

function newNumericId(existing: Iterable<number>, now = Date.now()): number {
  const taken = new Set(existing);
  let id = now;
  while (taken.has(id)) id += 1;
  return id;
}

function taskIds(list: unknown[]): number[] {
  return list.flatMap((item) => {
    const record = asRecord(item);
    const id = record ? requireTaskIdLoose(record.id) : undefined;
    return id == null ? [] : [id];
  });
}

function requireTaskIdLoose(value: unknown): number | undefined {
  const id = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isInteger(id) ? id : undefined;
}

function sameTask(record: Record<string, unknown>, id: number): boolean {
  return requireTaskIdLoose(record.id) === id;
}

function trimmed(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new WriteRejected(`${field} must be a non-empty string.`);
  return value.trim();
}

function optionalTrim(value: unknown, field: string): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") throw new WriteRejected(`${field} must be a string.`);
  return value.trim() || undefined;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new WriteRejected(`${field} must be one of: ${allowed.join(", ")}.`);
  }
  return value as T;
}

function dateKey(value: unknown, field: string, allowEmpty: boolean): string {
  if (value == null || value === "") {
    if (allowEmpty) return "";
    throw new WriteRejected(`${field} must be YYYY-MM-DD.`);
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new WriteRejected(`${field} must be YYYY-MM-DD.`);
  }
  return value.trim();
}

function clockTime(value: unknown, field: string): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") throw new WriteRejected(`${field} must be HH:MM.`);
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new WriteRejected(`${field} must be HH:MM.`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new WriteRejected(`${field} must be HH:MM.`);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function focusMinutes(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new WriteRejected(`focusMinutes must be between ${MIN_FOCUS_MINUTES} and ${MAX_FOCUS_MINUTES}.`);
  const rounded = Math.round(n);
  if (rounded < MIN_FOCUS_MINUTES || rounded > MAX_FOCUS_MINUTES) {
    throw new WriteRejected(`focusMinutes must be between ${MIN_FOCUS_MINUTES} and ${MAX_FOCUS_MINUTES}.`);
  }
  return rounded;
}

function colorValue(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim())) {
    throw new WriteRejected(`${field} must be a hex color like #625af6.`);
  }
  return value.trim();
}

function finiteNumber(value: unknown, field: string, min?: number): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || (min != null && n < min)) throw new WriteRejected(`${field} is invalid.`);
  return n;
}

type TaskContext = {
  projects: unknown[];
  classes: unknown[];
  defaults: { focusMinutes: number; energy: Energy };
  now: number;
};

export function taskDefaults(settings: unknown): { focusMinutes: number; energy: Energy } {
  const record = asRecord(settings);
  let minutes = DEFAULT_FOCUS_MINUTES;
  if (typeof record?.defaultFocusMinutes === "number" && Number.isFinite(record.defaultFocusMinutes)) {
    minutes = Math.min(MAX_FOCUS_MINUTES, Math.max(MIN_FOCUS_MINUTES, Math.round(record.defaultFocusMinutes)));
  }
  const energy = record?.defaultEnergy;
  return {
    focusMinutes: minutes,
    energy: energy === "Low" || energy === "High" || energy === "Medium" ? energy : "Medium",
  };
}

function findNamed(list: unknown[], field: string, expected: string): Record<string, unknown> | undefined {
  return list.map(asRecord).find((item) => item && String(item[field] ?? "") === expected) ?? undefined;
}

export function createTaskRecord(input: Record<string, unknown>, tasks: unknown[], ctx: TaskContext): Record<string, unknown> {
  rejectUnknown(
    input,
    ["title", "project", "classId", "due", "startTime", "priority", "energy", "focusMinutes", "notes", "nextAction", "academicType"],
    "create_task",
  );
  const title = trimmed(input.title, "title");
  const classId = optionalTrim(input.classId, "classId");
  const projectArg = optionalTrim(input.project, "project");
  let project = "Inbox";
  let color = "#625af6";
  if (classId) {
    const linked = findNamed(ctx.classes, "id", classId);
    if (!linked) throw new WriteRejected(`No class with id "${classId}".`);
    if (typeof linked.color === "string" && linked.color) color = linked.color;
  } else if (projectArg && projectArg !== "Inbox") {
    const linked = findNamed(ctx.projects, "name", projectArg);
    if (!linked) throw new WriteRejected(`No project named "${projectArg}". Create it first, or omit project to use Inbox.`);
    project = String(linked.name);
    if (typeof linked.color === "string" && linked.color) color = linked.color;
  }
  const academic = input.academicType == null || input.academicType === ""
    ? undefined
    : oneOf(input.academicType, ACADEMIC, "academicType");
  const record: Record<string, unknown> = {
    id: newNumericId(taskIds(tasks), ctx.now),
    title,
    project,
    color,
    due: input.due == null ? "" : dateKey(input.due, "due", true),
    priority: input.priority == null ? "Medium" : oneOf(input.priority, PRIORITIES, "priority"),
    focusMinutes: input.focusMinutes == null ? ctx.defaults.focusMinutes : focusMinutes(input.focusMinutes),
    energy: input.energy == null ? ctx.defaults.energy : oneOf(input.energy, ENERGIES, "energy"),
    status: "Not started",
    notes: typeof input.notes === "string" ? input.notes : "",
    handoffNote: "",
    nextAction: typeof input.nextAction === "string" ? input.nextAction : "",
    customProperties: [],
    submission: "",
    checklist: [],
    checklistProgress: [],
    focusSessionStarted: false,
    focusSessionRunning: false,
    focusHalfwayPrompted: false,
  };
  const start = clockTime(input.startTime, "startTime");
  if (start) record.startTime = start;
  if (classId) {
    record.classId = classId;
    record.academicType = academic ?? "Assignment";
    record.project = "Inbox";
  }
  return record;
}

const TASK_UPDATE_KEYS = [
  "id",
  "title",
  "project",
  "classId",
  "color",
  "due",
  "startTime",
  "priority",
  "energy",
  "focusMinutes",
  "status",
  "notes",
  "handoffNote",
  "nextAction",
  "followUpDate",
  "recurringDays",
  "academicType",
  "gradeWeight",
  "pointsEarned",
  "pointsPossible",
  "submission",
  "calendarEventId",
  "checklist",
  "checklistProgress",
] as const;

export function updateTaskRecord(
  input: Record<string, unknown>,
  tasks: unknown[],
  projects: unknown[],
  classes: unknown[],
): Record<string, unknown> {
  rejectUnknown(input, [...TASK_UPDATE_KEYS], "update_task");
  const id = requireTaskId(input.id, "update_task");
  const changes = Object.keys(input).filter((key) => key !== "id");
  if (!changes.length) throw new WriteRejected("update_task requires at least one field besides id.");
  const index = tasks.findIndex((item) => {
    const record = asRecord(item);
    return record ? sameTask(record, id) : false;
  });
  if (index < 0) throw new WriteRejected(`No task with id ${id}.`);
  const current = { ...(tasks[index] as Record<string, unknown>) };
  if ("title" in input) current.title = trimmed(input.title, "title");
  if ("project" in input) {
    const name = trimmed(input.project, "project");
    if (name !== "Inbox") {
      const linked = findNamed(projects, "name", name);
      if (!linked) throw new WriteRejected(`No project named "${name}".`);
      current.project = String(linked.name);
      if (!("color" in input) && typeof linked.color === "string") current.color = linked.color;
    } else {
      current.project = "Inbox";
    }
  }
  if ("classId" in input) {
    const classId = optionalTrim(input.classId, "classId");
    if (!classId) delete current.classId;
    else {
      const linked = findNamed(classes, "id", classId);
      if (!linked) throw new WriteRejected(`No class with id "${classId}".`);
      current.classId = classId;
      if (!("color" in input) && typeof linked.color === "string") current.color = linked.color;
    }
  }
  if ("color" in input) current.color = colorValue(input.color, "color");
  if ("due" in input) current.due = dateKey(input.due, "due", true);
  if ("startTime" in input) {
    const start = clockTime(input.startTime, "startTime");
    if (start) current.startTime = start;
    else delete current.startTime;
  }
  if ("priority" in input) current.priority = oneOf(input.priority, PRIORITIES, "priority");
  if ("energy" in input) current.energy = oneOf(input.energy, ENERGIES, "energy");
  if ("focusMinutes" in input) current.focusMinutes = focusMinutes(input.focusMinutes);
  if ("status" in input) {
    const status = oneOf(input.status, STATUSES, "status");
    current.status = status;
    current.done = status === "Done";
    current.canceled = status === "Canceled";
  }
  if ("notes" in input) {
    if (typeof input.notes !== "string") throw new WriteRejected("notes must be a string.");
    current.notes = input.notes;
  }
  if ("handoffNote" in input) current.handoffNote = optionalTrim(input.handoffNote, "handoffNote") ?? "";
  if ("nextAction" in input) current.nextAction = optionalTrim(input.nextAction, "nextAction") ?? "";
  if ("followUpDate" in input) {
    const follow = input.followUpDate == null || input.followUpDate === "" ? "" : dateKey(input.followUpDate, "followUpDate", false);
    if (follow) current.followUpDate = follow;
    else delete current.followUpDate;
  }
  if ("recurringDays" in input) {
    if (input.recurringDays == null || input.recurringDays === 0 || input.recurringDays === "") delete current.recurringDays;
    else {
      const days = finiteNumber(input.recurringDays, "recurringDays", 1);
      if (!days || days > 365) throw new WriteRejected("recurringDays must be from 1 to 365.");
      current.recurringDays = Math.round(days);
    }
  }
  if ("academicType" in input) {
    if (input.academicType == null || input.academicType === "") delete current.academicType;
    else current.academicType = oneOf(input.academicType, ACADEMIC, "academicType");
  }
  if ("gradeWeight" in input) assignOptionalNumber(current, "gradeWeight", input.gradeWeight);
  if ("pointsEarned" in input) assignOptionalNumber(current, "pointsEarned", input.pointsEarned, 0);
  if ("pointsPossible" in input) assignOptionalNumber(current, "pointsPossible", input.pointsPossible, 0);
  if ("submission" in input) {
    if (typeof input.submission !== "string") throw new WriteRejected("submission must be a string.");
    current.submission = input.submission;
  }
  if ("calendarEventId" in input) {
    const eventId = optionalTrim(input.calendarEventId, "calendarEventId");
    if (eventId) current.calendarEventId = eventId;
    else delete current.calendarEventId;
  }
  if ("checklist" in input) {
    if (!Array.isArray(input.checklist) || input.checklist.some((item) => typeof item !== "string")) {
      throw new WriteRejected("checklist must be an array of strings.");
    }
    current.checklist = input.checklist;
  }
  if ("checklistProgress" in input) {
    if (!Array.isArray(input.checklistProgress) || input.checklistProgress.some((item) => typeof item !== "boolean")) {
      throw new WriteRejected("checklistProgress must be an array of booleans.");
    }
    current.checklistProgress = input.checklistProgress;
  }
  tasks[index] = current;
  return current;
}

function assignOptionalNumber(record: Record<string, unknown>, key: string, value: unknown, min?: number): void {
  const n = finiteNumber(value, key, min);
  if (n == null) delete record[key];
  else record[key] = n;
}

export function setTaskCompletion(
  tasks: unknown[],
  id: number,
  complete: boolean,
  iso: string,
): { task: Record<string, unknown>; spawned?: Record<string, unknown>; changed: boolean } {
  const index = tasks.findIndex((item) => {
    const record = asRecord(item);
    return record ? sameTask(record, id) : false;
  });
  if (index < 0) throw new WriteRejected(`No task with id ${id}.`);
  const current = { ...(tasks[index] as Record<string, unknown>) };
  const done = current.done === true || current.status === "Done";
  if (complete && done && current.canceled !== true) {
    return { task: current, changed: false };
  }
  if (!complete && !done && current.canceled !== true && current.status !== "Canceled") {
    return { task: current, changed: false };
  }
  if (complete) {
    current.done = true;
    current.canceled = false;
    current.status = "Done";
    current.completedAt = iso;
  } else {
    current.done = false;
    current.canceled = false;
    current.status = "Not started";
    delete current.completedAt;
  }
  tasks[index] = current;
  let spawned: Record<string, unknown> | undefined;
  const recurring = typeof current.recurringDays === "number" ? current.recurringDays : 0;
  if (complete && recurring > 0) {
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + Math.min(365, Math.round(recurring)));
    const checklist = Array.isArray(current.checklist) ? current.checklist : [];
    spawned = {
      ...current,
      id: newNumericId(taskIds(tasks), Date.now()),
      due: toDateKey(nextDue),
      done: false,
      canceled: false,
      status: "Not started",
      focusSessionStarted: false,
      focusHalfwayPrompted: false,
      checklistProgress: checklist.map(() => false),
    };
    delete spawned.completedAt;
    delete spawned.focusRemainingSeconds;
    tasks.push(spawned);
  }
  return { task: current, spawned, changed: true };
}

export function deleteById(list: unknown[], id: number | string, label: string): Record<string, unknown> {
  const index = list.findIndex((item) => {
    const record = asRecord(item);
    if (!record) return false;
    if (typeof id === "number") return sameTask(record, id);
    return String(record.id ?? "") === id;
  });
  if (index < 0) throw new WriteRejected(`No ${label} with id ${id}.`);
  const [removed] = list.splice(index, 1);
  return removed as Record<string, unknown>;
}

function eventStamp(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new WriteRejected(`${field} must be YYYY-MM-DD or YYYY-MM-DDTHH:MM.`);
  const trimmedValue = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) return `${trimmedValue}T09:00`;
  const match = trimmedValue.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match || !clockTime(match[2], field)) {
    throw new WriteRejected(`${field} must be YYYY-MM-DD or YYYY-MM-DDTHH:MM. LifeOS stores local datetimes without a timezone.`);
  }
  return `${match[1]}T${clockTime(match[2], field)}`;
}

function plusOneHour(start: string): string {
  const [hours, minutes] = start.slice(11, 16).split(":").map(Number);
  const total = Math.min(hours * 60 + minutes + 60, 23 * 60 + 59);
  return `${start.slice(0, 10)}T${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function createEventRecord(input: Record<string, unknown>, events: unknown[], now = Date.now()): Record<string, unknown> {
  rejectUnknown(input, ["title", "start", "end", "notes", "location", "url", "color", "weekdaysOnly"], "create_event");
  const title = trimmed(input.title, "title");
  const start = eventStamp(input.start, "start");
  const end = input.end == null || input.end === "" ? plusOneHour(start) : eventStamp(input.end, "end");
  if (end < start) throw new WriteRejected("The event needs to end after it starts.");
  const ids = new Set(events.map((item) => String(asRecord(item)?.id ?? "")));
  let id = `lifeos-${now}`;
  while (ids.has(id)) id = `lifeos-${now}-${ids.size}`;
  const notes = optionalTrim(input.notes, "notes");
  const locationInput = optionalTrim(input.location, "location");
  const urlInput = optionalTrim(input.url, "url");
  const record: Record<string, unknown> = {
    id,
    title,
    start,
    end,
    source: "LifeOS",
    color: input.color == null ? "#665df6" : colorValue(input.color, "color"),
  };
  if (notes) record.notes = notes;
  const location = eventPlaceLabel(locationInput) || undefined;
  if (location) record.location = location;
  const url = coalesceEventMeetingUrl({ url: urlInput, location: locationInput, notes });
  if (url) record.url = url;
  if (input.weekdaysOnly === true) record.weekdaysOnly = true;
  else if (input.weekdaysOnly != null && input.weekdaysOnly !== false) {
    throw new WriteRejected("weekdaysOnly must be a boolean.");
  }
  return record;
}

export function updateEventRecord(input: Record<string, unknown>, events: unknown[]): Record<string, unknown> {
  rejectUnknown(input, ["id", "title", "start", "end", "notes", "location", "url", "color", "weekdaysOnly"], "update_event");
  rejectBulk(input, "update_event");
  const id = requireTextId(input.id, "update_event", "event");
  if (Object.keys(input).filter((key) => key !== "id").length === 0) {
    throw new WriteRejected("update_event requires at least one field besides id.");
  }
  const index = events.findIndex((item) => String(asRecord(item)?.id ?? "") === id);
  if (index < 0) throw new WriteRejected(`No event with id ${id}.`);
  const current = { ...(events[index] as Record<string, unknown>) };
  if ("title" in input) current.title = trimmed(input.title, "title");
  if ("start" in input) current.start = eventStamp(input.start, "start");
  if ("end" in input) current.end = eventStamp(input.end, "end");
  if (typeof current.start === "string" && typeof current.end === "string" && current.end < current.start) {
    throw new WriteRejected("The event needs to end after it starts.");
  }
  if ("notes" in input) {
    const notes = optionalTrim(input.notes, "notes");
    if (notes) current.notes = notes;
    else delete current.notes;
  }
  if ("location" in input || "url" in input || "notes" in input) {
    const locationInput = "location" in input ? optionalTrim(input.location, "location") : (typeof current.location === "string" ? current.location : undefined);
    const urlInput = "url" in input ? optionalTrim(input.url, "url") : (typeof current.url === "string" ? current.url : undefined);
    const notes = typeof current.notes === "string" ? current.notes : undefined;
    const location = eventPlaceLabel(locationInput) || undefined;
    if (location) current.location = location;
    else delete current.location;
    const url = coalesceEventMeetingUrl({ url: urlInput, location: locationInput, notes });
    if (url) current.url = url;
    else if ("url" in input) delete current.url;
  }
  if ("color" in input) current.color = colorValue(input.color, "color");
  if ("weekdaysOnly" in input) {
    if (input.weekdaysOnly === true) current.weekdaysOnly = true;
    else if (input.weekdaysOnly === false) delete current.weekdaysOnly;
    else throw new WriteRejected("weekdaysOnly must be a boolean.");
  }
  events[index] = current;
  return current;
}

const FINISHABLE_DESC = "A focused project with a finish line.";
const MAINTENANCE_DESC = "An ongoing system to keep healthy.";

export function createProjectRecord(input: Record<string, unknown>, projects: unknown[]): Record<string, unknown> {
  rejectUnknown(input, ["name", "kind", "desc", "description", "color", "iconName", "icon"], "create_project");
  const name = trimmed(input.name, "name");
  if (projects.some((item) => asRecord(item)?.name === name)) {
    throw new WriteRejected(`A project named "${name}" already exists.`);
  }
  const kind = normalizeKind(input.kind ?? "finishable");
  const iconName = normalizeIcon(input.iconName ?? input.icon ?? "FolderKanban");
  const desc = optionalTrim(input.desc ?? input.description, "desc") ?? (kind === "maintenance" ? MAINTENANCE_DESC : FINISHABLE_DESC);
  return {
    name,
    desc,
    progress: kind === "maintenance" ? 100 : 0,
    color: input.color == null ? "#625af6" : colorValue(input.color, "color"),
    iconName,
    tasks: 0,
    kind,
  };
}

export function updateProjectRecord(
  input: Record<string, unknown>,
  projects: unknown[],
  tasks: unknown[],
  notes: unknown[],
): { project: Record<string, unknown>; tasksChanged: boolean; notesChanged: boolean } {
  rejectUnknown(input, ["name", "newName", "kind", "desc", "description", "color", "iconName", "icon"], "update_project");
  const name = trimmed(input.name, "name");
  const index = projects.findIndex((item) => asRecord(item)?.name === name);
  if (index < 0) throw new WriteRejected(`No project named "${name}".`);
  const changes = Object.keys(input).filter((key) => key !== "name");
  if (!changes.length) throw new WriteRejected("update_project requires a field to change (newName, desc, color, iconName, or kind).");
  const current = { ...(projects[index] as Record<string, unknown>) };
  const nextName = "newName" in input ? trimmed(input.newName, "newName") : name;
  if (nextName !== name && projects.some((item) => asRecord(item)?.name === nextName)) {
    throw new WriteRejected(`A project named "${nextName}" already exists.`);
  }
  if ("kind" in input) {
    const kind = normalizeKind(input.kind);
    if (kind === "maintenance" && current.desc === FINISHABLE_DESC && !("desc" in input) && !("description" in input)) {
      current.desc = MAINTENANCE_DESC;
    }
    if (kind === "maintenance" && (current.progress === 0 || current.progress == null)) current.progress = 100;
    current.kind = kind;
  }
  if ("desc" in input || "description" in input) {
    current.desc = optionalTrim(input.desc ?? input.description, "desc") ?? "";
  }
  if ("color" in input) current.color = colorValue(input.color, "color");
  if ("iconName" in input || "icon" in input) current.iconName = normalizeIcon(input.iconName ?? input.icon);
  current.name = nextName;
  if (typeof current.icon === "object") delete current.icon;
  projects[index] = current;
  const color = typeof current.color === "string" ? current.color : "#625af6";
  let tasksChanged = false;
  let notesChanged = false;
  if (nextName !== name || "color" in input) {
    for (let i = 0; i < tasks.length; i++) {
      const task = asRecord(tasks[i]);
      if (!task || task.project !== name) continue;
      tasks[i] = { ...task, project: nextName, color };
      tasksChanged = true;
    }
    for (let i = 0; i < notes.length; i++) {
      const note = asRecord(notes[i]);
      if (!note || note.projectName !== name) continue;
      notes[i] = { ...note, projectName: nextName };
      notesChanged = true;
    }
  }
  return { project: current, tasksChanged, notesChanged };
}

function normalizeKind(value: unknown): "maintenance" | "finishable" {
  if (value == null || value === "finishable" || value === "project") return "finishable";
  if (value === "maintenance") return "maintenance";
  throw new WriteRejected("kind must be finishable or maintenance.");
}

function normalizeIcon(value: unknown): string {
  if (typeof value !== "string" || !PROJECT_ICON_SET.has(value)) {
    throw new WriteRejected(`iconName must be one of: ${PROJECT_ICONS.join(", ")}.`);
  }
  return value;
}

export function createNoteRecord(input: Record<string, unknown>, notes: unknown[], iso: string, now = Date.now()): Record<string, unknown> {
  rejectUnknown(input, ["title", "body", "projectName", "classId", "template"], "create_note");
  const ids = new Set(notes.map((item) => String(asRecord(item)?.id ?? "")));
  let id = `${now}-${Math.random().toString(36).slice(2)}`;
  while (ids.has(id)) id = `${now}-${Math.random().toString(36).slice(2)}`;
  const record: Record<string, unknown> = {
    id,
    title: optionalTrim(input.title, "title") || "Untitled note",
    body: typeof input.body === "string" ? input.body : "",
    updatedAt: iso,
  };
  const projectName = optionalTrim(input.projectName, "projectName");
  const classId = optionalTrim(input.classId, "classId");
  if (projectName) record.projectName = projectName;
  if (classId) record.classId = classId;
  if (input.template != null && input.template !== "") {
    record.template = oneOf(input.template, NOTE_TEMPLATES, "template");
  }
  return record;
}

export function updateNoteRecord(input: Record<string, unknown>, notes: unknown[], iso: string): Record<string, unknown> {
  rejectUnknown(input, ["id", "title", "body", "projectName", "classId", "template"], "update_note");
  rejectBulk(input, "update_note");
  const id = requireTextId(input.id, "update_note", "note");
  if (Object.keys(input).filter((key) => key !== "id").length === 0) {
    throw new WriteRejected("update_note requires at least one field besides id.");
  }
  const index = notes.findIndex((item) => String(asRecord(item)?.id ?? "") === id);
  if (index < 0) throw new WriteRejected(`No note with id ${id}.`);
  const current = { ...(notes[index] as Record<string, unknown>) };
  if ("title" in input) current.title = optionalTrim(input.title, "title") || "Untitled note";
  if ("body" in input) {
    if (typeof input.body !== "string") throw new WriteRejected("body must be a string.");
    current.body = input.body;
  }
  if ("projectName" in input) {
    const projectName = optionalTrim(input.projectName, "projectName");
    if (projectName) current.projectName = projectName;
    else delete current.projectName;
  }
  if ("classId" in input) {
    const classId = optionalTrim(input.classId, "classId");
    if (classId) current.classId = classId;
    else delete current.classId;
  }
  if ("template" in input) {
    if (input.template == null || input.template === "") delete current.template;
    else current.template = oneOf(input.template, NOTE_TEMPLATES, "template");
  }
  current.updatedAt = iso;
  notes[index] = current;
  return current;
}

export function patchSettingsForTask(
  settings: unknown,
  taskId: number,
  change: { clearNow: boolean; momentum?: { iso: string; title: string } },
): Record<string, unknown> | undefined {
  const record = asRecord(settings);
  if (!record) return undefined;
  let changed = false;
  const next = { ...record };
  if (change.clearNow && next.nowTaskId === taskId) {
    next.nowTaskId = null;
    changed = true;
  }
  if (change.momentum && Array.isArray(next.momentumLog)) {
    next.momentumLog = [
      { id: String(Date.now()), at: change.momentum.iso, type: "done", title: change.momentum.title },
      ...next.momentumLog,
    ].slice(0, 40);
    changed = true;
  } else if (change.momentum && next.momentumLog == null) {
    next.momentumLog = [{ id: String(Date.now()), at: change.momentum.iso, type: "done", title: change.momentum.title }];
    changed = true;
  }
  return changed ? next : undefined;
}
