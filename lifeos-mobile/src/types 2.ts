export type EnergyLevel = "Low" | "Medium" | "High";
export type TaskStatus = "Not started" | "In progress" | "Waiting" | "Blocked" | "Done" | "Canceled";

export type Task = {
  id: number;
  title: string;
  project?: string;
  color?: string;
  due?: string;
  startTime?: string;
  priority?: "High" | "Medium" | "Low";
  focusMinutes?: number;
  energy?: EnergyLevel;
  status?: TaskStatus;
  notes?: string;
  handoffNote?: string;
  nextAction?: string;
  checklist?: string[];
  checklistProgress?: boolean[];
  focusRemainingSeconds?: number;
  focusSessionRunning?: boolean;
  focusUpdatedAt?: string;
  done?: boolean;
  canceled?: boolean;
  calendarEventId?: string;
};

export type Project = {
  name: string;
  desc?: string;
  color?: string;
  iconName?: string;
  kind?: "maintenance" | "finishable";
  progress?: number;
};

export type ClassRecord = {
  id: string;
  code: string;
  name: string;
  term?: string;
  color?: string;
  archived?: boolean;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  source?: "LifeOS" | "iCal" | "Google";
  color?: string;
  notes?: string;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  projectName?: string;
  classId?: string;
  template?: "blank" | "lined" | "dotted" | "cornell" | "meeting";
  updatedAt: string;
};

export type SettingsState = {
  preferredName?: string;
  nowTaskId?: number | null;
  defaultFocusMinutes?: number;
  defaultEnergy?: EnergyLevel;
  reduceMotion?: boolean;
};

export type Workspace = {
  tasks: Task[];
  projects: Project[];
  calendar: CalendarEvent[];
  classes: ClassRecord[];
  notes: Note[];
  settings: SettingsState;
};
