export type EnergyLevel = "Low" | "Medium" | "High";
export type TaskStatus = "Not started" | "In progress" | "Waiting" | "Blocked" | "Done" | "Canceled";
export type Priority = "High" | "Medium" | "Low";
export type AcademicItemType = "Assignment" | "Project" | "Exam" | "Quiz" | "Lab" | "Reading" | "Discussion";

export type TaskProperty = { id: string; name: string; value: string };

export type Task = {
  id: number;
  title: string;
  project?: string;
  color?: string;
  due?: string;
  startTime?: string;
  priority?: Priority;
  focusMinutes?: number;
  energy?: EnergyLevel;
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
  focusUpdatedAt?: string;
  classId?: string;
  academicType?: AcademicItemType;
  gradeWeight?: number;
  pointsEarned?: number;
  pointsPossible?: number;
  submission?: string;
  done?: boolean;
  canceled?: boolean;
  calendarEventId?: string;
};

export type ProjectKind = "maintenance" | "finishable";
export type ProjectIcon =
  | "Zap" | "Aperture" | "Sparkles" | "FileText" | "UserRound" | "FolderKanban"
  | "BriefcaseBusiness" | "Camera" | "Code2" | "HeartPulse" | "Utensils" | "BookOpen" | "folder";

export type Project = {
  name: string;
  desc?: string;
  color?: string;
  iconName?: ProjectIcon | string;
  kind?: ProjectKind;
  progress?: number;
};

export type ClassRecord = {
  id: string;
  code: string;
  name: string;
  term?: string;
  instructor?: string;
  location?: string;
  credits?: number;
  color?: string;
  semesterEnd?: string;
  archived?: boolean;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  source?: "LifeOS" | "iCal" | "Google" | "Outlook";
  color?: string;
  notes?: string;
};

export type NoteTemplate = "blank" | "lined" | "dotted" | "cornell" | "meeting";

export type Note = {
  id: string;
  title: string;
  body: string;
  projectName?: string;
  classId?: string;
  template?: NoteTemplate;
  updatedAt: string;
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
};

// A captured "brain dump" item. The web app stores brain items simply as an
// array of raw strings at users/{userId}/brain — mobile mirrors that exactly
// so both clients read/write the same shape.
export type BrainItem = string;

export type AmbientActivity = {
  title: string;
  startedAt: string;
  note?: string;
  spaceName?: string;
  spaceColor?: string;
};

export type MomentumEntry = {
  id: string;
  at: string;
  type: "done" | "focus" | "capture";
  title: string;
};

export type ThemeMode = "system" | "light" | "dark";

export type HubRecord = {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  date?: string;
  url?: string;
  imageUrl?: string;
  classId?: string;
  completedDates?: string[];
  createdAt: string;
};

export type LifeHubState = {
  habits: HubRecord[];
  recipes: HubRecord[];
  food: HubRecord[];
  exercises: HubRecord[];
  trainings: HubRecord[];
  trips: HubRecord[];
  media: HubRecord[];
  tools: HubRecord[];
  contacts: HubRecord[];
  documents: HubRecord[];
  vault: HubRecord[];
  gallery: HubRecord[];
  vision: HubRecord[];
  archive: HubRecord[];
};

export type AcademicProfile = {
  major?: string;
  minor?: string;
  classOf?: string;
};

export type SchoolHubState = {
  profile: AcademicProfile;
  topics: HubRecord[];
  professors: HubRecord[];
  goals: HubRecord[];
};

export type SettingsState = {
  accent?: string;
  preferredName?: string;
  nowTaskId?: number | null;
  defaultFocusMinutes?: number;
  defaultEnergy?: EnergyLevel;
  weekStartsMonday?: boolean;
  reduceMotion?: boolean;
  themeMode?: ThemeMode;
  currentEnergy?: EnergyLevel;
  ambientActivity?: AmbientActivity | null;
  momentumLog?: MomentumEntry[];
  dailyReviewDate?: string;
  weeklyReviewDate?: string;
  spaceContext?: Record<string, { lastTaskId?: number; lastFilter?: string; updatedAt?: string }>;
};

export type Workspace = {
  tasks: Task[];
  projects: Project[];
  calendar: CalendarEvent[];
  classes: ClassRecord[];
  notes: Note[];
  settings: SettingsState;
  brain: BrainItem[];
  resources: Resource[];
  life: LifeHubState;
  school: SchoolHubState;
};
