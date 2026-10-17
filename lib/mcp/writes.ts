import { companyName, stageLabel } from "../careerHelpers";
import type { CareerApplication } from "../careerTypes";
import {
  applyCareerEntry,
  bulkUpsertCareer,
  careerHubToWrite,
  loadCareerForWrite,
  parseCareerEntry,
} from "./careerModel";
import { WriteRejected, assertWritesAllowed, mutateCollections, stripSensitive } from "./firebaseWrite";
import type { McpToolDefinition, ToolResult } from "./tools";
import { errorResult, jsonResult } from "./tools";
import type { StoreConfig } from "./store";
import {
  createEventRecord,
  createNoteRecord,
  createProjectRecord,
  createTaskRecord,
  deleteById,
  patchSettingsForTask,
  requireList,
  requireTaskId,
  setTaskCompletion,
  taskDefaults,
  updateEventRecord,
  updateNoteRecord,
  updateProjectRecord,
  updateTaskRecord,
} from "./writeModel";

const stageHint =
  "Career stage id: saved, applied, assessment, recruiter_screening, hiring_manager, technical, final, offer, accepted, rejected, withdrawn. Display names and a few aliases (Phone Screen, Offer, Rejected) are accepted.";

export const WRITE_TOOLS: McpToolDefinition[] = [
  {
    name: "create_task",
    description:
      "Create one LifeOS task on live Firebase users/{uid}/tasks, using the same fields the app writes (numeric id, Inbox default, status Not started). Refuses in export-file mode. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        project: { type: "string", description: "Existing project name. Omit for Inbox." },
        classId: { type: "string", description: "Existing class id. Sets academicType to Assignment unless overridden." },
        due: { type: "string", description: "YYYY-MM-DD. Omit for no due date." },
        startTime: { type: "string", description: "HH:MM" },
        priority: { type: "string", description: "High, Medium, or Low" },
        energy: { type: "string", description: "Low, Medium, or High" },
        focusMinutes: { type: "number", description: "5–240. Defaults to settings.defaultFocusMinutes or 45." },
        notes: { type: "string" },
        nextAction: { type: "string" },
        academicType: { type: "string", description: "Assignment, Project, Exam, Quiz, Lab, Reading, or Discussion" },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "update_task",
    description:
      "Update one task by numeric id. Status Done/Canceled also sets done/canceled the way the app does. Does not set completedAt — use complete_task for that. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        title: { type: "string" },
        project: { type: "string" },
        classId: { type: "string" },
        color: { type: "string" },
        due: { type: "string" },
        startTime: { type: "string" },
        priority: { type: "string" },
        energy: { type: "string" },
        focusMinutes: { type: "number" },
        status: { type: "string", description: "Not started, In progress, Waiting, Blocked, Done, or Canceled" },
        notes: { type: "string" },
        handoffNote: { type: "string" },
        nextAction: { type: "string" },
        followUpDate: { type: "string" },
        recurringDays: { type: "number" },
        academicType: { type: "string" },
        gradeWeight: { type: "number" },
        pointsEarned: { type: "number" },
        pointsPossible: { type: "number" },
        submission: { type: "string" },
        calendarEventId: { type: "string" },
        checklist: { type: "array", items: { type: "string" } },
        checklistProgress: { type: "array", items: { type: "boolean" } },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "complete_task",
    description:
      "Mark one task Done, set completedAt, and clear canceled. Spawns the next occurrence when recurringDays is set, matching the app. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "uncomplete_task",
    description:
      "Mark one task Not started, clear done, canceled, and completedAt. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_task",
    description: "Delete one task by numeric id. Bulk delete is rejected. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create_event",
    description:
      "Create one in-app calendar event on users/{uid}/calendar. Id is lifeos-{timestamp}, source is LifeOS, start/end are YYYY-MM-DDTHH:MM, same as the calendar form. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        start: { type: "string", description: "YYYY-MM-DD or YYYY-MM-DDTHH:MM. Date-only defaults to 09:00." },
        end: { type: "string", description: "YYYY-MM-DD or YYYY-MM-DDTHH:MM. Defaults to one hour after start." },
        notes: { type: "string" },
        location: { type: "string" },
        url: { type: "string", description: "Zoom, Teams, Webex, or other link." },
        color: { type: "string" },
        weekdaysOnly: { type: "boolean" },
      },
      required: ["title", "start"],
      additionalProperties: false,
    },
  },
  {
    name: "update_event",
    description:
      "Update one calendar event by id. Preserves source and any fields you do not send. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        start: { type: "string" },
        end: { type: "string" },
        notes: { type: "string" },
        location: { type: "string" },
        url: { type: "string" },
        color: { type: "string" },
        weekdaysOnly: { type: "boolean" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_event",
    description: "Delete one calendar event by id. Bulk delete is rejected. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create_project",
    description:
      "Create one project / space on users/{uid}/projects. Stored shape matches the web app (name, desc, progress, color, iconName, tasks, kind) so Spaces can load it. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        kind: { type: "string", description: "finishable (default) or maintenance" },
        desc: { type: "string" },
        color: { type: "string" },
        iconName: { type: "string", description: "FolderKanban, Zap, BookOpen, and the other app icons." },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "update_project",
    description:
      "Update one project by its current name. Renaming or recoloring also updates linked tasks and notes, matching the app. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Current project name." },
        newName: { type: "string" },
        kind: { type: "string" },
        desc: { type: "string" },
        color: { type: "string" },
        iconName: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "create_note",
    description:
      "Create one note on users/{uid}/notes. Id is {timestamp}-{random}, updatedAt is an ISO timestamp, same as the web app. New notes are inserted at the front of the list. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        projectName: { type: "string" },
        classId: { type: "string" },
        template: { type: "string", description: "blank, lined, dotted, cornell, or meeting" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "update_note",
    description:
      "Update one note by id and refresh updatedAt. Handwriting ink already on the note is preserved. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        projectName: { type: "string" },
        classId: { type: "string" },
        template: { type: "string" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_note",
    description: "Delete one note by id. Bulk delete is rejected. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create_career_entry",
    description:
      "Create one job application inside users/{uid}/career using the app's Career hub (company, application, stage history, activity). role is stored as jobTitle, status as stageId, link as jobUrl, date applied as appliedAt (YYYY-MM-DD). " +
      stageHint +
      " Refuses a duplicate company+role or link. Requires LIFEOS_ALLOW_WRITES=1. Turn on Career in Settings if the nav is hidden.",
    inputSchema: {
      type: "object",
      properties: {
        company: { type: "string" },
        role: { type: "string", description: "Job title. Stored as jobTitle." },
        status: { type: "string", description: stageHint },
        appliedAt: { type: "string", description: "YYYY-MM-DD." },
        dateApplied: { type: "string", description: "YYYY-MM-DD, ISO date, or M/D/YYYY. Stored as appliedAt." },
        link: { type: "string", description: "Job URL. Stored as jobUrl." },
        location: { type: "string" },
        salary: { type: "string", description: "Number, 120k, or 100000-140000. Stored as salaryMin/salaryMax." },
        notes: { type: "string" },
        priority: { type: "string", description: "high, medium, or low" },
        source: { type: "string" },
        workArrangement: { type: "string", description: "remote, hybrid, or onsite" },
      },
      required: ["company", "role"],
      additionalProperties: false,
    },
  },
  {
    name: "update_career_entry",
    description:
      "Update one job application by id, or by company+role, or by link. Status changes go through the app's stage move, so outcome and stage history stay in sync. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        company: { type: "string" },
        role: { type: "string" },
        status: { type: "string" },
        appliedAt: { type: "string" },
        dateApplied: { type: "string" },
        link: { type: "string" },
        location: { type: "string" },
        salary: { type: "string" },
        notes: { type: "string" },
        priority: { type: "string" },
        nextAction: { type: "string" },
        nextActionDueAt: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "bulk_import_career",
    description:
      "Upsert many job applications into users/{uid}/career in one write. Matches an existing row by link (jobUrl) first, otherwise by company + role (case-insensitive). Unchanged rows are left alone, so importing the same tracker twice does not duplicate it or bump updatedAt. Up to 500 entries per call. Each entry accepts company, role, status, appliedAt / dateApplied, link, salary, location, notes, and the other Career application fields. Requires LIFEOS_ALLOW_WRITES=1.",
    inputSchema: {
      type: "object",
      properties: {
        entries: {
          type: "array",
          items: { type: "object" },
          description: "Tracker rows. company and role are required for new rows.",
        },
      },
      required: ["entries"],
      additionalProperties: false,
    },
  },
];

const WRITE_NAMES = new Set(WRITE_TOOLS.map((tool) => tool.name));

export function isWriteTool(name: string): boolean {
  return WRITE_NAMES.has(name);
}

function inputOf(args: Record<string, unknown> | undefined): Record<string, unknown> {
  if (args == null) return {};
  if (typeof args !== "object" || Array.isArray(args)) throw new WriteRejected("Tool arguments must be an object.");
  return args;
}

function presentApplication(company: string, app: CareerApplication) {
  return stripSensitive({
    ...app,
    company,
    stage: stageLabel(app.stageId),
  });
}

export async function executeWrite(
  name: string,
  args: Record<string, unknown> | undefined,
  config: StoreConfig,
): Promise<ToolResult> {
  try {
    assertWritesAllowed(config);
    const input = inputOf(args);
    switch (name) {
      case "create_task":
        return jsonResult(await createTask(config, input));
      case "update_task":
        return jsonResult(await updateTask(config, input));
      case "complete_task":
        return jsonResult(await completeTask(config, input, true));
      case "uncomplete_task":
        return jsonResult(await completeTask(config, input, false));
      case "delete_task":
        return jsonResult(await removeTask(config, input));
      case "create_event":
        return jsonResult(await createEvent(config, input));
      case "update_event":
        return jsonResult(await updateEvent(config, input));
      case "delete_event":
        return jsonResult(await removeEvent(config, input));
      case "create_project":
        return jsonResult(await createProject(config, input));
      case "update_project":
        return jsonResult(await updateProject(config, input));
      case "create_note":
        return jsonResult(await createNote(config, input));
      case "update_note":
        return jsonResult(await updateNote(config, input));
      case "delete_note":
        return jsonResult(await removeNote(config, input));
      case "create_career_entry":
      case "update_career_entry":
        return jsonResult(await writeCareer(config, input, name === "create_career_entry" ? "create" : "update"));
      case "bulk_import_career":
        return jsonResult(await importCareer(config, input));
      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : String(error));
  }
}

async function createTask(config: StoreConfig, input: Record<string, unknown>) {
  return mutateCollections(config, ["tasks", "projects", "classes", "settings"], (current) => {
    const tasks = requireList(current.tasks, "tasks");
    const record = createTaskRecord(input, tasks, {
      projects: requireList(current.projects, "projects"),
      classes: requireList(current.classes, "classes"),
      defaults: taskDefaults(current.settings),
      now: Date.now(),
    });
    tasks.push(record);
    return { writes: { tasks }, result: record };
  });
}

async function updateTask(config: StoreConfig, input: Record<string, unknown>) {
  return mutateCollections(config, ["tasks", "projects", "classes"], (current) => {
    const tasks = requireList(current.tasks, "tasks");
    const record = updateTaskRecord(
      input,
      tasks,
      requireList(current.projects, "projects"),
      requireList(current.classes, "classes"),
    );
    return { writes: { tasks }, result: record };
  });
}

async function completeTask(config: StoreConfig, input: Record<string, unknown>, complete: boolean) {
  const tool = complete ? "complete_task" : "uncomplete_task";
  if ("ids" in input || input.all === true) throw new WriteRejected(`${tool} requires one explicit id. Bulk delete is not supported.`);
  const id = requireTaskId(input.id, tool);
  const iso = new Date().toISOString();
  return mutateCollections<{ changed: boolean; task: Record<string, unknown>; spawned?: Record<string, unknown> }>(
    config,
    ["tasks", "settings"],
    (current) => {
    const tasks = requireList(current.tasks, "tasks");
    const outcome = setTaskCompletion(tasks, id, complete, iso);
    const settings = patchSettingsForTask(current.settings, id, {
      clearNow: true,
      momentum: complete && outcome.changed ? { iso, title: String(outcome.task.title ?? "") } : undefined,
    });
    if (!outcome.changed && !settings) return { writes: {}, result: { changed: false, task: outcome.task } };
    const writes: Record<string, unknown> = {};
    if (settings) writes.settings = settings;
    if (outcome.changed) writes.tasks = tasks;
    return {
      writes,
      result: { changed: outcome.changed, task: outcome.task, spawned: outcome.spawned },
    };
  });
}

async function removeTask(config: StoreConfig, input: Record<string, unknown>) {
  if ("ids" in input || input.all === true) {
    throw new WriteRejected("delete_task requires one explicit id. Bulk delete is not supported.");
  }
  const id = requireTaskId(input.id, "delete_task");
  return mutateCollections(config, ["tasks", "settings"], (current) => {
    const tasks = requireList(current.tasks, "tasks");
    const record = deleteById(tasks, id, "task");
    const writes: Record<string, unknown> = {};
    const settings = patchSettingsForTask(current.settings, id, { clearNow: true });
    if (settings) writes.settings = settings;
    writes.tasks = tasks;
    return { writes, result: { deleted: true, id, record } };
  });
}

async function createEvent(config: StoreConfig, input: Record<string, unknown>) {
  return mutateCollections(config, ["calendar"], (current) => {
    const events = requireList(current.calendar, "calendar");
    const record = createEventRecord(input, events);
    events.push(record);
    return { writes: { calendar: events }, result: record };
  });
}

async function updateEvent(config: StoreConfig, input: Record<string, unknown>) {
  return mutateCollections(config, ["calendar"], (current) => {
    const events = requireList(current.calendar, "calendar");
    const record = updateEventRecord(input, events);
    return { writes: { calendar: events }, result: record };
  });
}

async function removeEvent(config: StoreConfig, input: Record<string, unknown>) {
  if ("ids" in input || input.all === true) {
    throw new WriteRejected("delete_event requires one explicit id. Bulk delete is not supported.");
  }
  if (typeof input.id !== "string" || !input.id.trim()) throw new WriteRejected("delete_event requires a single event id string.");
  const id = input.id.trim();
  return mutateCollections(config, ["calendar"], (current) => {
    const events = requireList(current.calendar, "calendar");
    const record = deleteById(events, id, "event");
    return { writes: { calendar: events }, result: { deleted: true, id, record } };
  });
}

async function createProject(config: StoreConfig, input: Record<string, unknown>) {
  return mutateCollections(config, ["projects"], (current) => {
    const projects = requireList(current.projects, "projects");
    const record = createProjectRecord(input, projects);
    projects.push(record);
    return { writes: { projects }, result: record };
  });
}

async function updateProject(config: StoreConfig, input: Record<string, unknown>) {
  return mutateCollections(config, ["projects", "tasks", "notes"], (current) => {
    const projects = requireList(current.projects, "projects");
    const tasks = requireList(current.tasks, "tasks");
    const notes = requireList(current.notes, "notes");
    const outcome = updateProjectRecord(input, projects, tasks, notes);
    const writes: Record<string, unknown> = {};
    if (outcome.tasksChanged) writes.tasks = tasks;
    if (outcome.notesChanged) writes.notes = notes;
    writes.projects = projects;
    return { writes, result: outcome.project };
  });
}

async function createNote(config: StoreConfig, input: Record<string, unknown>) {
  return mutateCollections(config, ["notes"], (current) => {
    const notes = requireList(current.notes, "notes");
    const record = createNoteRecord(input, notes, new Date().toISOString());
    notes.unshift(record);
    return { writes: { notes }, result: record };
  });
}

async function updateNote(config: StoreConfig, input: Record<string, unknown>) {
  return mutateCollections(config, ["notes"], (current) => {
    const notes = requireList(current.notes, "notes");
    const record = updateNoteRecord(input, notes, new Date().toISOString());
    return { writes: { notes }, result: record };
  });
}

async function removeNote(config: StoreConfig, input: Record<string, unknown>) {
  if ("ids" in input || input.all === true) {
    throw new WriteRejected("delete_note requires one explicit id. Bulk delete is not supported.");
  }
  if (typeof input.id !== "string" || !input.id.trim()) throw new WriteRejected("delete_note requires a single note id string.");
  const id = input.id.trim();
  return mutateCollections(config, ["notes"], (current) => {
    const notes = requireList(current.notes, "notes");
    const record = deleteById(notes, id, "note");
    return { writes: { notes }, result: { deleted: true, id, record } };
  });
}

async function writeCareer(config: StoreConfig, input: Record<string, unknown>, mode: "create" | "update") {
  const fields = parseCareerEntry(input);
  return mutateCollections<{
    action: "created" | "updated" | "unchanged";
    matchedBy?: "id" | "link" | "company_role";
    application: unknown;
  }>(config, ["career"], (current) => {
    const loaded = loadCareerForWrite(current.career);
    const outcome = applyCareerEntry(loaded.hub, fields, mode);
    if ("error" in outcome) throw new WriteRejected(outcome.error);
    if (!outcome.changed) {
      return {
        writes: {},
        result: {
          action: outcome.action,
          application: presentApplication(companyName(outcome.hub, outcome.application.companyId), outcome.application),
        },
      };
    }
    return {
      writes: { career: careerHubToWrite(loaded.rawObject, outcome.hub) },
      result: {
        action: outcome.action,
        matchedBy: outcome.matchedBy,
        application: presentApplication(companyName(outcome.hub, outcome.application.companyId), outcome.application),
      },
    };
  });
}

async function importCareer(config: StoreConfig, input: Record<string, unknown>) {
  if ("entries" in input === false) throw new WriteRejected("bulk_import_career requires entries.");
  return mutateCollections(config, ["career"], (current) => {
    const loaded = loadCareerForWrite(current.career);
    const summary = bulkUpsertCareer(loaded.hub, input.entries as unknown[]);
    const result = {
      created: summary.created,
      updated: summary.updated,
      unchanged: summary.unchanged,
      failed: summary.failed,
      entries: summary.entries,
    };
    if (!summary.changed) return { writes: {}, result };
    return { writes: { career: careerHubToWrite(loaded.rawObject, summary.hub) }, result };
  });
}
