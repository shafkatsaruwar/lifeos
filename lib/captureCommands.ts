import { captureAddWorkTask, type WorkDeliverable, type WorkHubState, type WorkMeeting, type WorkProject } from "@/app/components/OSDashboards";
import type { StudyAbroadHub } from "@/app/components/StudyAbroadDashboard";
import { appendHistory, newId, nowIso } from "@/lib/studyAbroadHelpers";
import { toDateKey } from "@/lib/helpers";
import { clockIn, clockOut, getActiveEntry, type TimeTrackingState } from "@/lib/timeTracking";

export type CaptureCommand = {
  shortcut: string;
  label: string;
  desc: string;
};

export type CaptureCommandFlags = {
  enableWorkOS: boolean;
  enableStudyAbroad: boolean;
  enableMasterOS: boolean;
};

export function listCaptureCommands(flags: CaptureCommandFlags): CaptureCommand[] {
  return [
    { shortcut: "/t", label: "Add task", desc: "Create a new task" },
    { shortcut: "/tm", label: "Minor task", desc: "Low-energy errand — water, charge, quick chore" },
    { shortcut: "/proj", label: "Add project", desc: "Start a new project" },
    { shortcut: "/asg", label: "Add assignment", desc: "School mode only" },
    { shortcut: "/note", label: "Add note", desc: "Capture a quick note" },
    { shortcut: "/focus", label: "Start focus", desc: "Enter a focus session" },
    { shortcut: "/break", label: "Break", desc: "I need a break" },
    { shortcut: "/clock", label: "Clock in/out", desc: "Start or stop contractor timesheet" },
    { shortcut: "/timesheet", label: "Timesheet", desc: "Open full timesheet editor" },
    { shortcut: "/spaces", label: "Spaces", desc: "Open your spaces" },
    { shortcut: "/w", label: "I'm doing something", desc: "Start ambient activity" },
    { shortcut: "/a", label: "AI task", desc: "Create with AI assistance" },
    ...(flags.enableWorkOS
      ? [
          { shortcut: "/w proj", label: "Work project", desc: "Start a work project" },
          { shortcut: "/w deliver", label: "Deliverable", desc: "Add a work deliverable" },
          { shortcut: "/w task", label: "Work task", desc: "Add a work task" },
          { shortcut: "/w tasks", label: "Work task", desc: "Add a work task (alias)" },
          { shortcut: "/w meet", label: "Schedule meeting", desc: "Schedule a meeting" },
        ]
      : []),
    ...(flags.enableStudyAbroad
      ? [
          { shortcut: "/sa", label: "Study Abroad", desc: "Open Study Abroad" },
          { shortcut: "/sa country", label: "Country", desc: "Add a country path" },
          { shortcut: "/sa uni", label: "University", desc: "Add a university" },
          { shortcut: "/sa prog", label: "Program", desc: "Add a program" },
          { shortcut: "/sa app", label: "Application", desc: "Start an application" },
          { shortcut: "/sa fund", label: "Scholarship", desc: "Add funding / scholarship" },
          { shortcut: "/sa note", label: "Note", desc: "Add study-abroad knowledge" },
          { shortcut: "/sa task", label: "SA task", desc: "Add a study-abroad task" },
        ]
      : []),
    ...(flags.enableMasterOS
      ? [{ shortcut: "/mos", label: "Mastery", desc: "Open teaching workspace (web / iPad)" }]
      : []),
  ];
}

export function filterCaptureCommands(commands: CaptureCommand[], raw: string): CaptureCommand[] {
  const query = raw.trim().toLowerCase();
  if (!query.startsWith("/")) return [];
  return commands.filter(
    (c) =>
      c.shortcut.startsWith(query) ||
      c.shortcut.includes(query) ||
      c.label.toLowerCase().includes(query.slice(1)),
  );
}

export const INSTANT_COMMANDS = new Set([
  "/w",
  "/break",
  "/a",
  "/focus",
  "/spaces",
  "/sa",
  "/mos",
  "/clock",
  "/timesheet",
  "/guide",
  "/guided",
  "/executive",
  "/unfreeze",
]);

export type CaptureCommandContext = {
  flags: CaptureCommandFlags;
  flash: (message: string) => void;
  go: (view: string) => void;
  openFocus: (taskId?: number) => void;
  openBreak: () => void;
  openAmbient: () => void;
  openSmartCapture: () => void;
  openGuided: () => void;
  openTimesheet: () => void;
  addTask: (
    title: string,
    options?: {
      energy?: "Low" | "Medium" | "High";
      priority?: "High" | "Medium" | "Low";
      focusMinutes?: number;
      flashLabel?: string;
    },
  ) => number;
  addProject: (name: string) => void;
  addNote: (title: string) => void;
  addAssignment: (title: string) => void;
  nowTaskId: number | null;
  enqueue: (id: number) => void;
  choose: (id: number | null) => void;
  focusTargetId: number | null;
  timeTracking: TimeTrackingState;
  setTimeTracking: (next: TimeTrackingState) => void;
  setWorkHub: (updater: (current: WorkHubState) => WorkHubState) => void;
  studyAbroadHub: StudyAbroadHub;
  setStudyAbroadHub: (updater: (current: StudyAbroadHub) => StudyAbroadHub) => void;
  currentTaskTitle?: string;
};

/**
 * Run a capture / slash command. Returns:
 * - `ran` when the command executed (palette should close)
 * - `partial` when the user should keep typing (e.g. selected `/t` without a title)
 * - `false` when this input is not a slash command
 */
export function executeCaptureCommand(
  raw: string,
  ctx: CaptureCommandContext,
): "ran" | "partial" | false {
  const val = raw.trim();
  if (!val.startsWith("/")) return false;
  const lower = val.toLowerCase();

  if (lower === "/w") {
    ctx.openAmbient();
    return "ran";
  }
  if (lower === "/break") {
    ctx.openBreak();
    return "ran";
  }
  if (lower === "/clock") {
    const active = getActiveEntry(ctx.timeTracking);
    if (active) {
      ctx.setTimeTracking(clockOut(ctx.timeTracking));
      ctx.flash("Clocked out");
    } else {
      ctx.setTimeTracking(
        clockIn(ctx.timeTracking, {
          clientName: ctx.timeTracking.defaultClientName,
          title: ctx.currentTaskTitle || "Work session",
        }),
      );
      ctx.flash("Clocked in");
    }
    return "ran";
  }
  if (lower === "/timesheet") {
    ctx.openTimesheet();
    return "ran";
  }
  if (lower === "/a") {
    ctx.openSmartCapture();
    return "ran";
  }
  if (lower === "/focus") {
    if (ctx.focusTargetId != null) ctx.openFocus(ctx.focusTargetId);
    return "ran";
  }
  if (lower === "/spaces") {
    ctx.go("Spaces");
    return "ran";
  }
  if (lower === "/guide" || lower === "/guided" || lower === "/executive" || lower === "/unfreeze") {
    ctx.openGuided();
    return "ran";
  }
  if (ctx.flags.enableStudyAbroad && (lower === "/sa" || lower === "/study abroad")) {
    ctx.go("Study Abroad");
    return "ran";
  }
  if (ctx.flags.enableMasterOS && (lower === "/mos" || lower === "/masteros")) {
    ctx.go("Mastery");
    return "ran";
  }

  if (lower.startsWith("/t ")) {
    const taskTitle = val.slice(3).trim();
    if (taskTitle) {
      const id = ctx.addTask(taskTitle);
      if (id) {
        if (ctx.nowTaskId) ctx.enqueue(id);
        else ctx.choose(id);
      }
    }
    return "ran";
  }
  if (lower === "/t" || lower === "/tm" || lower === "/proj" || lower === "/asg" || lower === "/note") {
    return "partial";
  }
  if (lower.startsWith("/tm ")) {
    const taskTitle = val.slice(4).trim();
    if (taskTitle) {
      const id = ctx.addTask(taskTitle, {
        energy: "Low",
        priority: "Low",
        focusMinutes: 5,
        flashLabel: "Minor task added",
      });
      if (id) {
        if (ctx.nowTaskId) ctx.enqueue(id);
        else ctx.choose(id);
      }
    }
    return "ran";
  }
  if (lower.startsWith("/proj ")) {
    const projectName = val.slice(6).trim();
    if (projectName) ctx.addProject(projectName);
    return "ran";
  }
  if (lower.startsWith("/asg ")) {
    const assignmentTitle = val.slice(5).trim();
    if (assignmentTitle) ctx.addAssignment(assignmentTitle);
    return "ran";
  }
  if (lower.startsWith("/note ")) {
    const noteTitle = val.slice(6).trim();
    if (noteTitle) ctx.addNote(noteTitle);
    return "ran";
  }

  if (ctx.flags.enableWorkOS && lower.startsWith("/w proj ")) {
    const projName = val.slice(8).trim() || "New Project";
    const newProj: WorkProject = {
      id: `proj-${Date.now()}`,
      name: projName,
      color: "#625af6",
      status: "active",
      createdAt: new Date().toISOString(),
    };
    ctx.setWorkHub((current) => ({ ...current, projects: [...current.projects, newProj] }));
    return "ran";
  }
  if (ctx.flags.enableWorkOS && lower.startsWith("/w deliver ")) {
    const title = val.slice(11).trim() || "New deliverable";
    ctx.setWorkHub((current) => {
      const project = current.projects.find((item) => item.status === "active");
      if (!project) return current;
      const deliverable: WorkDeliverable = {
        id: `del-${Date.now()}`,
        projectId: project.id,
        title,
        type: "document",
        status: "planned",
        priority: "medium",
        dueDate: toDateKey(new Date()),
        createdAt: new Date().toISOString(),
      };
      return { ...current, deliverables: [...current.deliverables, deliverable] };
    });
    return "ran";
  }
  if (ctx.flags.enableWorkOS && (lower.startsWith("/w task ") || lower.startsWith("/w tasks "))) {
    const title = lower.startsWith("/w tasks ") ? val.slice(9).trim() : val.slice(8).trim();
    ctx.setWorkHub((current) => captureAddWorkTask(current, title || "New task"));
    ctx.flash(title ? `Work task added: ${title}` : "Work task added");
    return "ran";
  }
  if (
    !ctx.flags.enableWorkOS &&
    (lower.startsWith("/w task ") ||
      lower.startsWith("/w tasks ") ||
      lower.startsWith("/w proj ") ||
      lower.startsWith("/w deliver ") ||
      lower.startsWith("/w meet "))
  ) {
    ctx.flash("Enable WorkOS in Settings to use /w work commands");
    return "ran";
  }
  if (ctx.flags.enableWorkOS && lower.startsWith("/w meet ")) {
    const meetTitle = val.slice(8).trim() || "New Meeting";
    const newMeet: WorkMeeting = {
      id: `meet-${Date.now()}`,
      title: meetTitle,
      start: new Date().toISOString(),
      type: "other",
      createdAt: new Date().toISOString(),
    };
    ctx.setWorkHub((current) => ({ ...current, meetings: [...current.meetings, newMeet] }));
    return "ran";
  }

  if (ctx.flags.enableStudyAbroad && lower.startsWith("/sa country ")) {
    const name = val.slice(12).trim();
    if (name) {
      const stamp = nowIso();
      ctx.setStudyAbroadHub((current) =>
        appendHistory(
          {
            ...current,
            countries: [...current.countries, { id: newId("country"), name, createdAt: stamp, updatedAt: stamp }],
          },
          "Added country",
          name,
          "country",
        ),
      );
      ctx.flash(`Country added: ${name}`);
    }
    return "ran";
  }
  if (ctx.flags.enableStudyAbroad && lower.startsWith("/sa uni ")) {
    const name = val.slice(8).trim();
    if (name) {
      const country = ctx.studyAbroadHub.countries[0];
      if (!country) ctx.flash("Add a country first with /sa country");
      else {
        const stamp = nowIso();
        ctx.setStudyAbroadHub((current) =>
          appendHistory(
            {
              ...current,
              universities: [
                ...current.universities,
                { id: newId("uni"), name, countryId: country.id, createdAt: stamp, updatedAt: stamp },
              ],
            },
            "Added university",
            name,
            "university",
          ),
        );
        ctx.flash(`University added: ${name}`);
      }
    }
    return "ran";
  }
  if (ctx.flags.enableStudyAbroad && lower.startsWith("/sa prog ")) {
    const name = val.slice(9).trim();
    if (name) {
      const university = ctx.studyAbroadHub.universities[0];
      if (!university) ctx.flash("Add a university first with /sa uni");
      else {
        const stamp = nowIso();
        ctx.setStudyAbroadHub((current) =>
          appendHistory(
            {
              ...current,
              programs: [
                ...current.programs,
                {
                  id: newId("prog"),
                  name,
                  universityId: university.id,
                  status: "discovering",
                  shortlisted: false,
                  createdAt: stamp,
                  updatedAt: stamp,
                },
              ],
            },
            "Added program",
            name,
            "program",
          ),
        );
        ctx.flash(`Program added: ${name}`);
      }
    }
    return "ran";
  }
  if (ctx.flags.enableStudyAbroad && lower.startsWith("/sa app ")) {
    const name = val.slice(8).trim();
    const program = name
      ? ctx.studyAbroadHub.programs.find((item) => item.name.toLowerCase() === name.toLowerCase()) ||
        ctx.studyAbroadHub.programs[0]
      : ctx.studyAbroadHub.programs[0];
    if (!program) ctx.flash("Add a program first with /sa prog");
    else {
      const stamp = nowIso();
      ctx.setStudyAbroadHub((current) =>
        appendHistory(
          {
            ...current,
            applications: [
              ...current.applications,
              { id: newId("app"), programId: program.id, stage: "preparing", createdAt: stamp, updatedAt: stamp },
            ],
            programs: current.programs.map((item) =>
              item.id === program.id ? { ...item, status: "preparing", shortlisted: true, updatedAt: stamp } : item,
            ),
          },
          "Started application",
          program.name,
          "application",
        ),
      );
      ctx.flash(`Application started: ${program.name}`);
    }
    return "ran";
  }
  if (ctx.flags.enableStudyAbroad && (lower.startsWith("/sa fund ") || lower.startsWith("/sa scholarship "))) {
    const name = lower.startsWith("/sa scholarship ") ? val.slice(16).trim() : val.slice(9).trim();
    if (name) {
      const stamp = nowIso();
      ctx.setStudyAbroadHub((current) =>
        appendHistory(
          {
            ...current,
            funding: [
              ...current.funding,
              {
                id: newId("fund"),
                name,
                kind: "scholarship",
                countryId: current.countries[0]?.id,
                status: "researching",
                createdAt: stamp,
                updatedAt: stamp,
              },
            ],
          },
          "Added funding",
          name,
          "funding",
        ),
      );
      ctx.flash(`Scholarship added: ${name}`);
    }
    return "ran";
  }
  if (ctx.flags.enableStudyAbroad && lower.startsWith("/sa task ")) {
    const title = val.slice(9).trim();
    if (title) {
      const parentProgramId = ctx.studyAbroadHub.sessionMemory?.lastProgramId || ctx.studyAbroadHub.programs[0]?.id;
      const parentCountryId = ctx.studyAbroadHub.countries[0]?.id;
      if (!parentProgramId && !parentCountryId) ctx.flash("Add a country or program first");
      else {
        const stamp = nowIso();
        const parentType = parentProgramId ? ("program" as const) : ("country" as const);
        const parentId = parentProgramId || parentCountryId!;
        ctx.setStudyAbroadHub((current) =>
          appendHistory(
            {
              ...current,
              tasks: [
                ...current.tasks,
                { id: newId("task"), title, parentType, parentId, createdAt: stamp, updatedAt: stamp },
              ],
            },
            "Added study-abroad task",
            title,
            parentType,
            parentId,
          ),
        );
        ctx.flash(`Study Abroad task: ${title}`);
      }
    }
    return "ran";
  }

  return "partial";
}
