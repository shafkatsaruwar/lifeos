import { EXTERNAL_EVENT_SOURCES } from "./types";
import { deriveTaskStatus, summarizeTask } from "./workspace";
import type { LifeOSWorkspace } from "./types";

export type JsonSchema = {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
};

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

const LIMIT_DEFAULT = 50;
const LIMIT_MAX = 200;

function clampLimit(value: unknown, fallback = LIMIT_DEFAULT): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(LIMIT_MAX, Math.max(1, Math.floor(n)));
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function matchesQuery(query: string | undefined, ...fields: Array<string | undefined | null>): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  return fields.some((field) => field && field.toLowerCase().includes(needle));
}

function jsonResult(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "lifeos_status",
    description:
      "Show which LifeOS store is connected (export file or Firebase), record counts, and any setup warnings. Call this first when data looks empty.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_tasks",
    description:
      "List LifeOS tasks with status, due date, project, and optional class. By default hides Done and Canceled.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status (Not started, In progress, Waiting, Blocked, Done, Canceled)" },
        project: { type: "string", description: "Filter by project / space name (substring, case-insensitive)" },
        classId: { type: "string", description: "Filter by school class id" },
        includeDone: { type: "boolean", description: "Include completed tasks (default false)" },
        includeCanceled: { type: "boolean", description: "Include canceled tasks (default false)" },
        dueBefore: { type: "string", description: "Inclusive YYYY-MM-DD upper bound on due date" },
        dueAfter: { type: "string", description: "Inclusive YYYY-MM-DD lower bound on due date" },
        query: { type: "string", description: "Search title, notes, next action" },
        limit: { type: "number", description: "Max results (default 50, max 200)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_task",
    description: "Get one LifeOS task by numeric id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number", description: "Task id" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "list_projects",
    description: "List LifeOS projects / spaces (name, kind, description).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        kind: { type: "string", description: "maintenance or finishable" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_classes",
    description: "List school classes / courses from the LifeOS classes collection.",
    inputSchema: {
      type: "object",
      properties: {
        includeArchived: { type: "boolean", description: "Include archived classes (default false)" },
        query: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_school",
    description:
      "School hub: academic profile, topics, professors, goals, plus coursework tasks linked to a class.",
    inputSchema: {
      type: "object",
      properties: {
        includeAcademicTasks: { type: "boolean", description: "Include tasks that have a classId (default true)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_work",
    description: "Work OS hub: projects, deliverables, work tasks, and meetings stored in LifeOS (not Apple Calendar).",
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          description: "projects | deliverables | tasks | meetings | all (default all)",
        },
        query: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_events",
    description:
      "In-app LifeOS calendar events. Default excludes iCal/Google/Outlook copies already stored in LifeOS. Does not scrape Apple Calendar.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Inclusive start bound (ISO date or datetime)" },
        to: { type: "string", description: "Inclusive end bound (ISO date or datetime)" },
        includeExternal: {
          type: "boolean",
          description: "Also return stored iCal/Google/Outlook events (default false)",
        },
        query: { type: "string" },
        limit: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "search_lifeos",
    description: "Search tasks, projects, classes, notes, calendar events, and work items.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Case-insensitive substring" },
        limit: { type: "number" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
];

export function callTool(
  name: string,
  args: Record<string, unknown> | undefined,
  workspace: LifeOSWorkspace,
  extra?: { warning?: string },
): ToolResult {
  const input = args ?? {};
  switch (name) {
    case "lifeos_status":
      return jsonResult({
        source: workspace.source,
        sourcePath: workspace.sourcePath || null,
        userId: workspace.userId || null,
        exportedAt: workspace.exportedAt || null,
        warning: extra?.warning || null,
        counts: {
          tasks: workspace.tasks.length,
          openTasks: workspace.tasks.filter((task) => deriveTaskStatus(task) !== "Done" && deriveTaskStatus(task) !== "Canceled").length,
          projects: workspace.projects.length,
          classes: workspace.classes.length,
          events: workspace.calendar.length,
          notes: workspace.notes.length,
          workProjects: workspace.work.projects.length,
          workTasks: workspace.work.tasks.length,
          workMeetings: workspace.work.meetings.length,
        },
        settings: workspace.settings,
        limitations: [
          "Read-only. Does not write tasks or events.",
          "Does not read browser localStorage or iOS AsyncStorage directly.",
          "Does not scrape Apple Calendar, Gmail, or Outlook — those are separate connectors.",
          "Encrypted gmail/outlook/icloud connection blobs under the Firebase user node are never returned.",
        ],
      });
    case "list_tasks":
      return listTasks(workspace, input);
    case "get_task":
      return getTask(workspace, input);
    case "list_projects":
      return listProjects(workspace, input);
    case "list_classes":
      return listClasses(workspace, input);
    case "list_school":
      return listSchool(workspace, input);
    case "list_work":
      return listWork(workspace, input);
    case "list_events":
      return listEvents(workspace, input);
    case "search_lifeos":
      return searchLifeOS(workspace, input);
    default:
      return errorResult(`Unknown tool: ${name}`);
  }
}

function listTasks(workspace: LifeOSWorkspace, input: Record<string, unknown>): ToolResult {
  const status = asString(input.status);
  const project = asString(input.project)?.toLowerCase();
  const classId = asString(input.classId);
  const includeDone = asBoolean(input.includeDone);
  const includeCanceled = asBoolean(input.includeCanceled);
  const dueBefore = asString(input.dueBefore);
  const dueAfter = asString(input.dueAfter);
  const query = asString(input.query);
  const limit = clampLimit(input.limit);

  const items = workspace.tasks.filter((task) => {
    const derived = deriveTaskStatus(task);
    if (!includeDone && derived === "Done") return false;
    if (!includeCanceled && derived === "Canceled") return false;
    if (status && derived.toLowerCase() !== status.toLowerCase()) return false;
    if (project && !task.project.toLowerCase().includes(project)) return false;
    if (classId && task.classId !== classId) return false;
    if (dueBefore && (!task.due || task.due > dueBefore)) return false;
    if (dueAfter && (!task.due || task.due < dueAfter)) return false;
    return matchesQuery(query, task.title, task.notes, task.nextAction, task.handoffNote, task.project);
  });

  return jsonResult({
    total: items.length,
    shown: Math.min(items.length, limit),
    tasks: items.slice(0, limit).map(summarizeTask),
  });
}

function getTask(workspace: LifeOSWorkspace, input: Record<string, unknown>): ToolResult {
  const id = typeof input.id === "number" ? input.id : Number(input.id);
  if (!Number.isFinite(id)) return errorResult("get_task requires a numeric id.");
  const task = workspace.tasks.find((item) => item.id === id);
  if (!task) return errorResult(`No task with id ${id}.`);
  return jsonResult({ ...task, status: deriveTaskStatus(task) });
}

function listProjects(workspace: LifeOSWorkspace, input: Record<string, unknown>): ToolResult {
  const query = asString(input.query);
  const kind = asString(input.kind)?.toLowerCase();
  const projects = workspace.projects.filter((project) => {
    if (kind && (project.kind || "").toLowerCase() !== kind) return false;
    return matchesQuery(query, project.name, project.desc);
  });
  return jsonResult({
    total: projects.length,
    projects: projects.map((project) => ({
      name: project.name,
      kind: project.kind || null,
      desc: project.desc || null,
      color: project.color || null,
      progress: project.progress ?? null,
      openTasks: workspace.tasks.filter(
        (task) => task.project === project.name && deriveTaskStatus(task) !== "Done" && deriveTaskStatus(task) !== "Canceled",
      ).length,
    })),
  });
}

function listClasses(workspace: LifeOSWorkspace, input: Record<string, unknown>): ToolResult {
  const includeArchived = asBoolean(input.includeArchived);
  const query = asString(input.query);
  const classes = workspace.classes.filter((item) => {
    if (!includeArchived && item.archived) return false;
    return matchesQuery(query, item.name, item.code, item.instructor, item.term);
  });
  return jsonResult({
    total: classes.length,
    classes: classes.map((item) => ({
      ...item,
      openTasks: workspace.tasks.filter(
        (task) => task.classId === item.id && deriveTaskStatus(task) !== "Done" && deriveTaskStatus(task) !== "Canceled",
      ).length,
    })),
  });
}

function listSchool(workspace: LifeOSWorkspace, input: Record<string, unknown>): ToolResult {
  const includeAcademicTasks = asBoolean(input.includeAcademicTasks, true);
  const academicTasks = includeAcademicTasks
    ? workspace.tasks.filter((task) => task.classId).map(summarizeTask)
    : [];
  return jsonResult({
    profile: workspace.school.profile,
    classes: workspace.classes.filter((item) => !item.archived).map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      term: item.term || null,
      instructor: item.instructor || null,
    })),
    topics: workspace.school.topics,
    professors: workspace.school.professors,
    goals: workspace.school.goals,
    academicTasks,
  });
}

function listWork(workspace: LifeOSWorkspace, input: Record<string, unknown>): ToolResult {
  const kind = (asString(input.kind) || "all").toLowerCase();
  const query = asString(input.query);
  const allowed = new Set(["projects", "deliverables", "tasks", "meetings", "all"]);
  if (!allowed.has(kind)) return errorResult("kind must be projects, deliverables, tasks, meetings, or all.");

  const work = workspace.work;
  const payload: Record<string, unknown> = {};
  if (kind === "all" || kind === "projects") {
    payload.projects = work.projects.filter((item) => matchesQuery(query, item.name, item.description, item.status));
  }
  if (kind === "all" || kind === "deliverables") {
    payload.deliverables = work.deliverables.filter((item) => matchesQuery(query, item.title, item.description, item.status));
  }
  if (kind === "all" || kind === "tasks") {
    payload.tasks = work.tasks.filter((item) => matchesQuery(query, item.title, item.description, item.status));
  }
  if (kind === "all" || kind === "meetings") {
    payload.meetings = work.meetings.filter((item) => matchesQuery(query, item.title, item.location, item.type));
  }
  return jsonResult(payload);
}

function listEvents(workspace: LifeOSWorkspace, input: Record<string, unknown>): ToolResult {
  const from = asString(input.from);
  const to = asString(input.to);
  const includeExternal = asBoolean(input.includeExternal);
  const query = asString(input.query);
  const limit = clampLimit(input.limit);

  const items = workspace.calendar.filter((event) => {
    const source = event.source || "LifeOS";
    if (!includeExternal && EXTERNAL_EVENT_SOURCES.has(source)) return false;
    if (from && event.start < from) return false;
    if (to && event.start > to) return false;
    return matchesQuery(query, event.title, event.notes, event.location, event.source);
  });

  return jsonResult({
    total: items.length,
    shown: Math.min(items.length, limit),
    includeExternal,
    events: items.slice(0, limit),
  });
}

function searchLifeOS(workspace: LifeOSWorkspace, input: Record<string, unknown>): ToolResult {
  const query = asString(input.query);
  if (!query) return errorResult("search_lifeos requires query.");
  const limit = clampLimit(input.limit, 25);
  const hits: Array<{ type: string; id: string | number; title: string; extra?: string }> = [];

  for (const task of workspace.tasks) {
    if (matchesQuery(query, task.title, task.notes, task.nextAction, task.project)) {
      hits.push({ type: "task", id: task.id, title: task.title, extra: task.project });
    }
  }
  for (const project of workspace.projects) {
    if (matchesQuery(query, project.name, project.desc)) {
      hits.push({ type: "project", id: project.name, title: project.name, extra: project.kind });
    }
  }
  for (const item of workspace.classes) {
    if (matchesQuery(query, item.name, item.code, item.instructor)) {
      hits.push({ type: "class", id: item.id, title: `${item.code} ${item.name}`.trim() });
    }
  }
  for (const note of workspace.notes) {
    if (matchesQuery(query, note.title, note.body, note.projectName)) {
      hits.push({ type: "note", id: note.id, title: note.title });
    }
  }
  for (const event of workspace.calendar) {
    if (matchesQuery(query, event.title, event.notes, event.location)) {
      hits.push({ type: "event", id: event.id, title: event.title, extra: event.start });
    }
  }
  for (const item of workspace.work.projects) {
    if (matchesQuery(query, item.name, item.description)) {
      hits.push({ type: "work_project", id: item.id, title: item.name });
    }
  }
  for (const item of workspace.work.tasks) {
    if (matchesQuery(query, item.title, item.description)) {
      hits.push({ type: "work_task", id: item.id, title: item.title });
    }
  }
  for (const item of workspace.work.meetings) {
    if (matchesQuery(query, item.title, item.location)) {
      hits.push({ type: "work_meeting", id: item.id, title: item.title, extra: item.start });
    }
  }

  return jsonResult({ query, total: hits.length, shown: Math.min(hits.length, limit), hits: hits.slice(0, limit) });
}
