export type CaptureCommandDef = {
  shortcut: string;
  label: string;
  desc: string;
};

export type CaptureInstantCommand =
  | "clock"
  | "timesheet"
  | "focus"
  | "break"
  | "ambient"
  | "ai"
  | "spaces"
  | "studyAbroad"
  | "masteros";

export type CaptureAction =
  | { type: "none" }
  | { type: "instant"; command: CaptureInstantCommand }
  | { type: "addTask"; title: string; minor?: boolean }
  | { type: "addProject"; name: string }
  | { type: "addAssignment"; title: string }
  | { type: "addNote"; title: string }
  | { type: "addWorkProject"; name: string }
  | { type: "addWorkDeliverable"; title: string }
  | { type: "addWorkTask"; title: string }
  | { type: "addWorkMeeting"; title: string }
  | { type: "insertPrefix"; text: string }
  | { type: "workDisabled" }
  | { type: "studyAbroadWebOnly" };

const INSTANT = new Set([
  "/clock",
  "/timesheet",
  "/focus",
  "/break",
  "/w",
  "/a",
  "/spaces",
  "/sa",
  "/mos",
]);

export function buildCaptureCommands(options: {
  enableWorkOS?: boolean;
  enableStudyAbroad?: boolean;
  enableMasterOS?: boolean;
}): CaptureCommandDef[] {
  const commands: CaptureCommandDef[] = [
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
  ];
  if (options.enableWorkOS !== false) {
    commands.push(
      { shortcut: "/w proj", label: "Work project", desc: "Start a work project" },
      { shortcut: "/w deliver", label: "Deliverable", desc: "Add a work deliverable" },
      { shortcut: "/w task", label: "Work task", desc: "Add a work task" },
      { shortcut: "/w tasks", label: "Work task", desc: "Add a work task (alias)" },
      { shortcut: "/w meet", label: "Schedule meeting", desc: "Schedule a meeting" },
    );
  }
  if (options.enableStudyAbroad !== false) {
    commands.push(
      { shortcut: "/sa", label: "Study Abroad", desc: "Open Study Abroad (web)" },
      { shortcut: "/sa country", label: "Country", desc: "Add a country path (web)" },
      { shortcut: "/sa uni", label: "University", desc: "Add a university (web)" },
      { shortcut: "/sa prog", label: "Program", desc: "Add a program (web)" },
      { shortcut: "/sa app", label: "Application", desc: "Start an application (web)" },
      { shortcut: "/sa fund", label: "Scholarship", desc: "Add funding / scholarship (web)" },
      { shortcut: "/sa note", label: "Note", desc: "Add study-abroad knowledge (web)" },
      { shortcut: "/sa task", label: "SA task", desc: "Add a study-abroad task (web)" },
    );
  }
  if (options.enableMasterOS !== false) {
    commands.push({ shortcut: "/mos", label: "MasterOS", desc: "Open teaching workspace (iPad)" });
  }
  return commands;
}

export function filterCaptureCommands(commands: CaptureCommandDef[], query: string): CaptureCommandDef[] {
  const q = query.trim().toLowerCase();
  if (!q.startsWith("/")) return commands;
  return commands.filter(
    (cmd) =>
      cmd.shortcut.startsWith(q) ||
      cmd.shortcut.includes(q) ||
      cmd.label.toLowerCase().includes(q.slice(1)),
  );
}

function sliceArg(raw: string, prefixLen: number): string {
  return raw.trim().slice(prefixLen).trim();
}

export function resolveCaptureAction(
  raw: string,
  options: { enableWorkOS?: boolean; enableStudyAbroad?: boolean; enableMasterOS?: boolean },
): CaptureAction {
  const val = raw.trim().toLowerCase();
  if (!val) return { type: "none" };
  if (val === "/clock") return { type: "instant", command: "clock" };
  if (val === "/timesheet") return { type: "instant", command: "timesheet" };
  if (val === "/focus") return { type: "instant", command: "focus" };
  if (val === "/break") return { type: "instant", command: "break" };
  if (val === "/w") return { type: "instant", command: "ambient" };
  if (val === "/a") return { type: "instant", command: "ai" };
  if (val === "/spaces") return { type: "instant", command: "spaces" };
  if (options.enableStudyAbroad !== false && (val === "/sa" || val === "/study abroad")) {
    return { type: "studyAbroadWebOnly" };
  }
  if (options.enableMasterOS !== false && (val === "/mos" || val === "/masteros")) {
    return { type: "instant", command: "masteros" };
  }
  if (val.startsWith("/t ")) {
    const title = sliceArg(raw, 3);
    return title ? { type: "addTask", title } : { type: "insertPrefix", text: "/t " };
  }
  if (val.startsWith("/tm ")) {
    const title = sliceArg(raw, 4);
    return title ? { type: "addTask", title, minor: true } : { type: "insertPrefix", text: "/tm " };
  }
  if (val.startsWith("/proj ")) {
    const name = sliceArg(raw, 6);
    return name ? { type: "addProject", name } : { type: "insertPrefix", text: "/proj " };
  }
  if (val.startsWith("/asg ")) {
    const title = sliceArg(raw, 5);
    return title ? { type: "addAssignment", title } : { type: "insertPrefix", text: "/asg " };
  }
  if (val.startsWith("/note ")) {
    const title = sliceArg(raw, 6);
    return title ? { type: "addNote", title } : { type: "insertPrefix", text: "/note " };
  }
  if (val.startsWith("/w proj ")) {
    if (options.enableWorkOS === false) return { type: "workDisabled" };
    const name = sliceArg(raw, 8);
    return name ? { type: "addWorkProject", name } : { type: "insertPrefix", text: "/w proj " };
  }
  if (val.startsWith("/w deliver ")) {
    if (options.enableWorkOS === false) return { type: "workDisabled" };
    const title = sliceArg(raw, 11);
    return title ? { type: "addWorkDeliverable", title } : { type: "insertPrefix", text: "/w deliver " };
  }
  if (val.startsWith("/w task ")) {
    if (options.enableWorkOS === false) return { type: "workDisabled" };
    const title = sliceArg(raw, 8);
    return title ? { type: "addWorkTask", title } : { type: "insertPrefix", text: "/w task " };
  }
  if (val.startsWith("/w tasks ")) {
    if (options.enableWorkOS === false) return { type: "workDisabled" };
    const title = sliceArg(raw, 9);
    return title ? { type: "addWorkTask", title } : { type: "insertPrefix", text: "/w task " };
  }
  if (val.startsWith("/w meet ")) {
    if (options.enableWorkOS === false) return { type: "workDisabled" };
    const title = sliceArg(raw, 8);
    return title ? { type: "addWorkMeeting", title } : { type: "insertPrefix", text: "/w meet " };
  }
  if (
    options.enableWorkOS === false &&
    (val.startsWith("/w task ") ||
      val.startsWith("/w tasks ") ||
      val.startsWith("/w proj ") ||
      val.startsWith("/w deliver ") ||
      val.startsWith("/w meet "))
  ) {
    return { type: "workDisabled" };
  }
  if (options.enableStudyAbroad !== false && val.startsWith("/sa ")) {
    return { type: "studyAbroadWebOnly" };
  }
  return { type: "none" };
}

export function isInstantCaptureShortcut(shortcut: string): boolean {
  return INSTANT.has(shortcut.trim().toLowerCase());
}
