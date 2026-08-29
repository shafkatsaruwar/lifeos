/** Normalized LifeOS workspace as the MCP tools see it. */

export type TaskStatus =
  | "Not started"
  | "In progress"
  | "Waiting"
  | "Blocked"
  | "Done"
  | "Canceled";

export type LifeOSTask = {
  id: number;
  title: string;
  project: string;
  color?: string;
  due: string;
  startTime?: string;
  priority?: string;
  focusMinutes?: number;
  energy?: string;
  status?: TaskStatus;
  notes?: string;
  handoffNote?: string;
  nextAction?: string;
  followUpDate?: string;
  classId?: string;
  academicType?: string;
  gradeWeight?: number;
  pointsEarned?: number;
  pointsPossible?: number;
  done?: boolean;
  canceled?: boolean;
  completedAt?: string;
  calendarEventId?: string;
};

export type LifeOSProject = {
  name: string;
  desc?: string;
  color?: string;
  kind?: string;
  iconName?: string;
  progress?: number;
};

export type LifeOSClass = {
  id: string;
  code: string;
  name: string;
  term?: string;
  instructor?: string;
  location?: string;
  credits?: number;
  color?: string;
  semesterStart?: string;
  semesterEnd?: string;
  archived?: boolean;
};

export type LifeOSEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  source?: string;
  calendarId?: string;
  color?: string;
  notes?: string;
  location?: string;
};

export type LifeOSNote = {
  id: string;
  title: string;
  body: string;
  projectName?: string;
  classId?: string;
  updatedAt?: string;
};

export type WorkProject = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  status?: string;
  createdAt?: string;
  completedAt?: string;
};

export type WorkDeliverable = {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  createdAt?: string;
  completedAt?: string;
};

export type WorkTask = {
  id: string;
  deliverableId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  createdAt?: string;
  completedAt?: string;
};

export type WorkMeeting = {
  id: string;
  title: string;
  start: string;
  end?: string;
  type?: string;
  projectId?: string;
  location?: string;
  virtualUrl?: string;
};

export type WorkHub = {
  projects: WorkProject[];
  deliverables: WorkDeliverable[];
  tasks: WorkTask[];
  meetings: WorkMeeting[];
};

export type SchoolHub = {
  profile: { major?: string; minor?: string; classOf?: string };
  topics: Array<Record<string, unknown>>;
  professors: Array<Record<string, unknown>>;
  goals: Array<Record<string, unknown>>;
};

export type StoreSource = "file" | "firebase" | "empty";

export type LifeOSWorkspace = {
  source: StoreSource;
  sourcePath?: string;
  userId?: string;
  exportedAt?: string;
  tasks: LifeOSTask[];
  projects: LifeOSProject[];
  classes: LifeOSClass[];
  calendar: LifeOSEvent[];
  notes: LifeOSNote[];
  brain: string[];
  school: SchoolHub;
  work: WorkHub;
  settings: Record<string, unknown>;
};

export const IN_APP_EVENT_SOURCES = new Set(["LifeOS", "Work", "Synapse"]);
export const EXTERNAL_EVENT_SOURCES = new Set(["iCal", "Google", "Outlook"]);
