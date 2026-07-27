export type EnergyLevel = "Low" | "Medium" | "High";
export type TaskStatus = "Not started" | "In progress" | "Waiting" | "Blocked" | "Done" | "Canceled";
export type AcademicItemType = "Assignment" | "Project" | "Exam" | "Quiz" | "Lab" | "Reading" | "Discussion";
export type ProjectIcon = "Zap" | "Aperture" | "Sparkles" | "FileText" | "UserRound" | "FolderKanban" | "BriefcaseBusiness" | "Camera" | "Code2" | "HeartPulse" | "Utensils" | "BookOpen";
export type ProjectKind = "maintenance" | "finishable";
export type SpaceKind = "class" | "project" | "maintenance";

export type TaskProperty = { id: string; name: string; value: string };
export type Task = {
  id: number;
  title: string;
  project: string;
  color: string;
  due: string;
  startTime?: string;
  priority: "High" | "Medium" | "Low";
  focusMinutes: number;
  energy: EnergyLevel;
  status?: TaskStatus;
  notes?: string;
  handoffNote?: string;
  nextAction?: string;
  followUpDate?: string;
  recurringDays?: number;
  completedAt?: string;
  customProperties?: TaskProperty[];
  checklist?: string[];
  checklistProgress?: boolean[];
  focusRemainingSeconds?: number;
  focusSessionStarted?: boolean;
  focusSessionRunning?: boolean;
  focusHalfwayPrompted?: boolean;
  classId?: string;
  academicType?: AcademicItemType;
  gradeWeight?: number;
  pointsEarned?: number;
  pointsPossible?: number;
  submission?: string;
  calendarEventId?: string;
  done?: boolean;
  canceled?: boolean;
  parentTaskId?: number;
};

export type Project = {
  name: string;
  desc: string;
  progress: number;
  color: string;
  icon: any;
  iconName: ProjectIcon;
  tasks: number;
  kind: ProjectKind;
  parentProject?: string;
};

export type Resource = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  classId?: string;
  projectName?: string;
  storagePath?: string;
  storage?: "cloud" | "local";
  parentResourceId?: string;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  classId?: string;
  projectName?: string;
  template?: "blank" | "lined" | "dotted" | "cornell" | "meeting";
  updatedAt: string;
  parentNoteId?: string;
};

export type ClassRecord = {
  id: string;
  code: string;
  name: string;
  term: string;
  instructor: string;
  color: string;
  location?: string;
  credits?: number;
  semesterEnd?: string;
  archived?: boolean;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  source: "LifeOS" | "iCal" | "Google" | "Outlook";
  color: string;
  notes?: string;
};

export type FocusSessionUpdate = {
  remainingSeconds: number;
  hasStarted: boolean;
  isRunning: boolean;
  halfwayPrompted: boolean;
};

export type AmbientActivity = {
  title: string;
  startedAt: string;
  note?: string;
  spaceName?: string;
  spaceColor?: string;
};

export type AmbientDraft = {
  title: string;
  spaceName?: string;
  sourceLabel?: string;
} | null;

export type WeeklyPlanItem = {
  id: string;
  text: string;
};

export type WeeklyPlan = {
  [dayOfWeek: number]: WeeklyPlanItem[];
};
