import type { WorkHubState } from "./lib/workos";
export type { WorkHubState };

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

/** Named calendar list (iOS-style) — events point at these via `calendarId`. */
export type UserCalendar = {
  id: string;
  name: string;
  color: string;
  /** When false, events on this calendar are hidden from the Cal views. Default true. */
  visible?: boolean;
};

/** iOS Calendar-style repeat frequencies for LifeOS events. */
export type EventRepeatFrequency =
  | "never"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  source?: "LifeOS" | "iCal" | "Google" | "Outlook" | "Synapse" | "Work";
  /** Which user calendar this event belongs to */
  calendarId?: string;
  color?: string;
  notes?: string;
  /** Recurrence rule; omit or `never` for a one-off event */
  repeat?: EventRepeatFrequency;
  /** Inclusive end date (YYYY-MM-DD) for the series */
  repeatUntil?: string;
  /** Occurrence dates skipped from the series (YYYY-MM-DD) */
  repeatExceptions?: string[];
  /**
   * Present on expanded occurrence views only (not persisted).
   * Points at the master series id.
   */
  recurringEventId?: string;
};

export type NoteTemplate = "blank" | "lined" | "dotted" | "cornell" | "meeting";

/** Legacy freehand stroke (Skia v1). Kept so old notes don't break types. */
export type InkPoint = { x: number; y: number; t?: number };

export type InkStroke = {
  id: string;
  color: string;
  width: number;
  tool: "pen" | "highlighter" | "eraser";
  points: InkPoint[];
};

/**
 * Handwriting payload. v2 uses Apple PencilKit (`PKDrawing` base64) via the
 * system tool picker. Legacy v1 stored polyline `strokes` from a custom canvas.
 */
export type NoteInk = {
  version?: 1 | 2;
  format?: "pencilkit";
  /** Base64-encoded PKDrawing (PencilKit) */
  data?: string;
  /** Alias used by some PencilKit bridges */
  pencilKitData?: string;
  /** Legacy Skia strokes */
  strokes?: InkStroke[];
  height?: number;
  updatedAt?: number;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  projectName?: string;
  classId?: string;
  template?: NoteTemplate;
  /** Handwriting layer (mobile). Preserved by web if present. */
  ink?: NoteInk;
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

/** Voice / text day memory (Lifelog-style). Audio stays device-local when present. */
export type DayMemory = {
  id: string;
  dayKey: string;
  at: string;
  transcript: string;
  /** Short label; defaults to first line of transcript. */
  title?: string;
  /** Local file URI under documentDirectory — not synced across devices. */
  localAudioUri?: string;
  durationMs?: number;
};

export type ThemeMode = "system" | "light" | "dark";

/** Habit metric type — absent on HubRecord means classic check-off. */
export type HabitKind = "check" | "count" | "duration" | "scale";
export type HabitSchedule = "daily" | "weekly";

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
  /** Habits: check | count | duration | scale (default check). */
  kind?: HabitKind;
  /** Habits: goal amount (cups, minutes, max scale). */
  target?: number;
  /** Habits: unit label e.g. cups, min. */
  unit?: string;
  /** Habits: daily | weekly (default daily). */
  schedule?: HabitSchedule;
  /** Habits: per-day numeric progress keyed by YYYY-MM-DD. */
  progressByDate?: Record<string, number>;
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

/** Notebook editor page layout preference (persisted in settings). */
export type NotebookPageView = "seamless" | "single";

/** Local notification lead times (before the due/start moment). */
export type NotificationLead = "exact" | "5m" | "15m" | "30m" | "1h" | "1d";

export type NotificationPrefs = {
  /** Master switch after the user opts in. */
  enabled?: boolean;
  tasks?: boolean;
  dueDates?: boolean;
  deadlines?: boolean;
  calendar?: boolean;
  focus?: boolean;
  important?: boolean;
  /** Which offsets to schedule (capped per item to avoid spam). */
  leads?: NotificationLead[];
  /** ISO — set when we’ve asked for OS permission once. */
  permissionAskedAt?: string;
};

export type SettingsState = {
  accent?: string;
  preferredName?: string;
  nowTaskId?: number | null;
  defaultFocusMinutes?: number;
  defaultEnergy?: EnergyLevel;
  weekStartsMonday?: boolean;
  compactMode?: boolean;
  reduceMotion?: boolean;
  themeMode?: ThemeMode;
  /** Continuous vertical pages vs one page at a time. Default: seamless. */
  notebookPageView?: NotebookPageView;
  /** Favorite paper templates for the Noteshelf-style picker. */
  favoritePaperStyles?: PaperStyle[];
  /** Environment tabs — synced with web; undefined/true = shown. */
  enableLifeOS?: boolean;
  enableSchoolOS?: boolean;
  enableWorkOS?: boolean;
  /** MasterOS teaching workspace — web + iPad; not shown on iPhone. */
  enableMasterOS?: boolean;
  /** Local notification preferences (mobile). */
  notifications?: NotificationPrefs;
  /** ISO timestamp when first-run onboarding finished (or was skipped / migrated). */
  onboardingCompletedAt?: string;
  /** Bump to offer a short “what’s new” flow later without replaying v1. */
  onboardingVersion?: number;
  currentEnergy?: EnergyLevel;
  ambientActivity?: AmbientActivity | null;
  momentumLog?: MomentumEntry[];
  /** Voice/text memories keyed by capture — feeds Day signals. */
  dayMemories?: DayMemory[];
  dailyReviewDate?: string;
  weeklyReviewDate?: string;
  /** Week plan buckets by day-of-week (0=Sun) — used by Focus Flow. */
  weeklyPlan?: { [dayOfWeek: number]: { id: string; text: string }[] };
  spaceContext?: Record<string, { lastTaskId?: number; lastFilter?: string; updatedAt?: string }>;
};

/** Destinations after onboarding “first move”. */
export type OnboardingDestination =
  | { tab: "NowTab" }
  | { tab: "TasksTab" }
  | { tab: "LibraryTab"; screen: "Brain" }
  | { tab: "LibraryTab"; screen: "PageCanvas"; params: { notebookId: string; pageId: string } };

/** Digital paper style for notebook pages (PencilKit draws on top). */
export type PaperStyle =
  | "blank"
  | "ruled"
  | "narrowRuled"
  | "grid"
  | "graph"
  | "dotted"
  | "cornell"
  | "todo"
  | "music";

/** Per-page paper tint (Noteshelf-style). */
export type PaperColor = "white" | "cream" | "yellow" | "black";

/** Per-page orientation. */
export type PaperOrientation = "portrait" | "landscape";

/** Logical paper size preset for the editor stage. */
export type PaperSizePreset = "ipad" | "letter" | "a4";

/** Optional LifeOS context — notebooks can also stay personal/unfiled. */
export type NotebookContextLink = {
  type: "class" | "project" | "personal";
  classId?: string;
  projectName?: string;
  label?: string;
  /** Set when this notebook was migrated from a legacy typed `Note`. */
  legacyNoteId?: string;
};

export type NotebookFolder = {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
};

/** Note cover style — architecture for more covers without schema rewrites. */
export type NotebookCoverStyle =
  | "solid"
  | "minimal"
  | "linen"
  | "slate"
  | "academic"
  | "gradient"
  | "colorful"
  | "leather"
  | "band"
  | "sketch"
  | "midnight"
  | "mosaic"
  | "ribbon"
  | "kraft";

export type Notebook = {
  id: string;
  name: string;
  folderId?: string;
  color?: string;
  /** Visual cover for library cards / create flow. Default: solid. */
  cover?: NotebookCoverStyle;
  /** Optional subtitle under the title on covers. */
  coverSubtitle?: string;
  /** Pinned to Starred in the library. */
  starred?: boolean;
  /** Soft-delete — shown in Trash until purged. */
  trashedAt?: string;
  context?: NotebookContextLink;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
};

/** Typed text box on a page (overlay above PencilKit). */
export type PageTextElement = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
  /** Simple list marker — not a full word processor */
  list?: "none" | "bullet" | "number";
  opacity?: number;
};

/** Image on a page (overlay above PencilKit). */
export type PageImageElement = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  uri: string;
  /** local | cloud — cloud reserved for Storage upload later */
  storage?: "local" | "cloud";
  opacity?: number;
  /** Degrees clockwise — optional, defaults to 0 */
  rotation?: number;
};

/**
 * Future: indexed text from handwriting recognition (Vision / PKDrawing).
 * Do not invent OCR results — only populate when a real recognizer runs.
 */
export type PageRecognitionIndex = {
  status: "idle" | "pending" | "ready" | "unavailable";
  /** Plain text extracted from ink, if any */
  transcript?: string;
  updatedAt?: string;
  engine?: "apple-vision" | "none";
};

/**
 * One sheet in a notebook. Ink is PencilKit PKDrawing (editable), not a flat image.
 * Stored at users/{uid}/notebookPages/{pageId} so stroke saves don't rewrite the library.
 */
export type NotebookPage = {
  id: string;
  notebookId: string;
  index: number;
  title?: string;
  /**
   * Per-page paper template (lined, blank, graph…).
   * This is the page template id — never a notebook-wide setting.
   */
  paper: PaperStyle;
  /** Page tint — optional; defaults to white. */
  paperColor?: PaperColor;
  /** Page orientation — optional; defaults to portrait. */
  paperOrientation?: PaperOrientation;
  /** Logical size preset — optional; defaults to ipad. */
  paperSize?: PaperSizePreset;
  ink?: NoteInk;
  textElements?: PageTextElement[];
  imageElements?: PageImageElement[];
  /**
   * PDF page backing (Phase 6 architecture).
   * When set, the page is an annotation layer over an imported PDF page.
   * Do not fake PDF rendering until a real PDF pipeline exists.
   */
  pdfRef?: {
    storagePath: string;
    pageIndex: number;
    pageCount?: number;
    fileName?: string;
  };
  /** Handwriting recognition index — empty until a real engine is wired */
  recognition?: PageRecognitionIndex;
  updatedAt: string;
};

/** Canvas interaction mode for PageCanvasScreen */
export type PageCanvasMode = "ink" | "text" | "image" | "select";

/** Folders + notebook metadata (pages live separately). */
export type NotebookHub = {
  folders: NotebookFolder[];
  notebooks: Notebook[];
};

export type Workspace = {
  tasks: Task[];
  projects: Project[];
  calendar: CalendarEvent[];
  /** User-defined calendars (Personal / Work / School / custom) */
  calendars: UserCalendar[];
  classes: ClassRecord[];
  notes: Note[];
  settings: SettingsState;
  brain: BrainItem[];
  resources: Resource[];
  life: LifeHubState;
  school: SchoolHubState;
  /** WorkOS hub — same Firebase `work` key as web */
  work: WorkHubState;
  /** Notebook library metadata */
  notebookHub: NotebookHub;
  /**
   * Page documents keyed by page id. Synced as a map in RTDB
   * (users/{uid}/notebookPages/{pageId}) for per-page writes.
   */
  notebookPages: Record<string, NotebookPage>;
};
