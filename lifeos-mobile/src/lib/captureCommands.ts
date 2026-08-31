export type CaptureCommandDef = {
  shortcut: string;
  label: string;
  desc: string;
};

export type CaptureAction =
  | { type: "none" }
  | { type: "instant"; command: "clock" | "timesheet" | "focus" | "break" | "flow" | "ambient" }
  | { type: "addTask"; title: string; minor?: boolean }
  | { type: "addProject"; name: string }
  | { type: "addNote"; title: string }
  | { type: "addWorkTask"; title: string }
  | { type: "insertPrefix"; text: string };

const INSTANT = new Set(["/clock", "/timesheet", "/focus", "/break", "/flow", "/w"]);

export function buildCaptureCommands(options: {
  enableWorkOS?: boolean;
}): CaptureCommandDef[] {
  const commands: CaptureCommandDef[] = [
    { shortcut: "/t", label: "Add task", desc: "Create a new task" },
    { shortcut: "/tm", label: "Minor task", desc: "Low-energy errand" },
    { shortcut: "/proj", label: "Add project", desc: "Start a new project" },
    { shortcut: "/note", label: "Add note", desc: "Capture a quick note" },
    { shortcut: "/focus", label: "Start focus", desc: "Enter a focus session" },
    { shortcut: "/flow", label: "Focus flow", desc: "Talk → plan, coach, strength" },
    { shortcut: "/break", label: "Break", desc: "I need a break" },
    { shortcut: "/clock", label: "Clock in/out", desc: "Start or stop timesheet" },
    { shortcut: "/timesheet", label: "Timesheet", desc: "Open full timesheet" },
    { shortcut: "/w", label: "I'm doing something", desc: "Start ambient activity" },
  ];
  if (options.enableWorkOS !== false) {
    commands.push(
      { shortcut: "/w task", label: "Work task", desc: "Add a work task" },
      { shortcut: "/w tasks", label: "Work task", desc: "Add a work task (alias)" },
    );
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

export function resolveCaptureAction(raw: string, options: { enableWorkOS?: boolean }): CaptureAction {
  const val = raw.trim().toLowerCase();
  if (!val) return { type: "none" };
  if (val === "/clock") return { type: "instant", command: "clock" };
  if (val === "/timesheet") return { type: "instant", command: "timesheet" };
  if (val === "/focus") return { type: "instant", command: "focus" };
  if (val === "/break") return { type: "instant", command: "break" };
  if (val === "/flow") return { type: "instant", command: "flow" };
  if (val === "/w") return { type: "instant", command: "ambient" };
  if (val.startsWith("/t ")) {
    const title = raw.trim().slice(3).trim();
    return title ? { type: "addTask", title } : { type: "insertPrefix", text: "/t " };
  }
  if (val.startsWith("/tm ")) {
    const title = raw.trim().slice(4).trim();
    return title ? { type: "addTask", title, minor: true } : { type: "insertPrefix", text: "/tm " };
  }
  if (val.startsWith("/proj ")) {
    const name = raw.trim().slice(6).trim();
    return name ? { type: "addProject", name } : { type: "insertPrefix", text: "/proj " };
  }
  if (val.startsWith("/note ")) {
    const title = raw.trim().slice(6).trim();
    return title ? { type: "addNote", title } : { type: "insertPrefix", text: "/note " };
  }
  if (options.enableWorkOS !== false && (val.startsWith("/w task ") || val.startsWith("/w tasks "))) {
    const title = val.startsWith("/w tasks ") ? raw.trim().slice(9).trim() : raw.trim().slice(8).trim();
    return title ? { type: "addWorkTask", title } : { type: "insertPrefix", text: "/w task " };
  }
  return { type: "none" };
}

export function isInstantCaptureShortcut(shortcut: string): boolean {
  return INSTANT.has(shortcut.trim().toLowerCase());
}
