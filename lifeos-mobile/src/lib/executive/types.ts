/**
 * LifeOS Executive Function Engine — closed-loop execution support.
 * Intention → commitment → prompt → acknowledgment → start → follow-up → confirmed completion.
 */

export type GuidanceMode = "executive" | "guided" | "transition";

/** Persistent run / commitment state. Dismiss ≠ complete. Start ≠ complete. */
export type ExecutiveTaskState =
  | "scheduled"
  | "pending"
  | "acknowledged"
  | "starting"
  | "in_progress"
  | "paused"
  | "completed"
  | "skipped"
  | "expired";

export type RoutineCategory =
  | "hygiene"
  | "salah"
  | "career"
  | "household"
  | "studying"
  | "custom";

export type StepKind = "yes_no" | "confirm" | "choice" | "milestone";

export type FollowUpAction = "snooze" | "start" | "completed" | "still_working" | "pause" | "decline" | "reschedule" | "help_transition";

export type ExecutiveObservationType =
  | "executive.run.scheduled"
  | "executive.run.prompted"
  | "executive.run.acknowledged"
  | "executive.run.snoozed"
  | "executive.run.started"
  | "executive.step.confirmed"
  | "executive.run.paused"
  | "executive.run.resumed"
  | "executive.run.completed"
  | "executive.run.skipped"
  | "executive.followup.offered"
  | "executive.pattern.hint";

export type StepBranch = {
  when: string;
  nextStepId?: string | null;
};

export type RoutineStep = {
  id: string;
  title: string;
  /** Concise prompt — never microscopic physical coaching unless requested. */
  prompt: string;
  kind: StepKind;
  requires?: string[];
  choices?: string[];
  branches?: StepBranch[];
  optional?: boolean;
  /** If true, "no"/"not yet" without a branch stays on this step. */
  stayUntilDone?: boolean;
};

export type RoutineSchedule = {
  kind: "daily" | "weekly" | "once" | "salah";
  /** Local HH:mm for daily/weekly soft triggers. */
  timeLocal?: string;
  days?: number[];
  /** Salah prayer id when kind === "salah". */
  salahId?: SalahId;
  /** Minutes before window end for optional reminder. */
  beforeEndMinutes?: number;
};

export type SalahId = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export type SalahMethod =
  | "MWL"
  | "ISNA"
  | "Egypt"
  | "Makkah"
  | "Karachi"
  | "Tehran"
  | "Jafari";

export type AsrMethod = "Standard" | "Hanafi";

export type SalahSettings = {
  enabled: boolean;
  latitude: number | null;
  longitude: number | null;
  timezone?: string;
  method: SalahMethod;
  asr: AsrMethod;
  /** Which prayers to prompt. */
  prayers: SalahId[];
  /** Private — never share with AI without explicit consent. */
  privacyLocked: boolean;
};

export type ExecutiveRoutine = {
  id: string;
  name: string;
  description: string;
  category: RoutineCategory;
  defaultMode: GuidanceMode;
  steps: RoutineStep[];
  schedule?: RoutineSchedule;
  tags?: string[];
  builtIn?: boolean;
  /** Quiet intensity: executive prompts stay short. */
  sensitive?: boolean;
};

export type SnoozeRecord = {
  at: string;
  minutes: number;
  followUpAt: string;
};

export type ExecutiveRun = {
  id: string;
  routineId: string;
  mode: GuidanceMode;
  state: ExecutiveTaskState;
  currentStepId: string | null;
  completedStepIds: string[];
  answers: Record<string, { value: string; at: string }>;
  insertedStepIds: string[];
  /** Closed-loop timing */
  scheduledFor?: string;
  originalIntendedAt?: string;
  acknowledgedAt?: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  createdAt: string;
  lastPromptAt?: string;
  lastResponseAt?: string;
  nextFollowUpAt?: string;
  snoozeHistory: SnoozeRecord[];
  postponementCount: number;
  followUpOfferedAt?: string;
  pauseReason?: string;
  linkedTaskId?: number;
  /** Soft label for notifications — never celebratory. */
  contextLabel?: string;
};

export type ExecutiveObservation = {
  id: string;
  type: ExecutiveObservationType;
  entityId: string;
  timestamp: string;
  payload: Record<string, unknown>;
  provenance: "user_action" | "system";
  privacy: "private";
};

export type ExecutivePrefs = {
  defaultMode: GuidanceMode;
  /** Max snoozes before offering transition help. */
  snoozeLimit: number;
  defaultSnoozeMinutes: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  proactiveEnabled: boolean;
  followUpEnabled: boolean;
  guidanceIntensity: "low" | "medium" | "high";
  salah: SalahSettings;
};

export type ExecutiveHub = {
  version: 2;
  routines: ExecutiveRoutine[];
  runs: ExecutiveRun[];
  observations: ExecutiveObservation[];
  prefs: ExecutivePrefs;
};

export const DEFAULT_SALAH_SETTINGS: SalahSettings = {
  enabled: false,
  latitude: null,
  longitude: null,
  method: "ISNA",
  asr: "Standard",
  prayers: ["fajr", "dhuhr", "asr", "maghrib", "isha"],
  privacyLocked: true,
};

export const DEFAULT_EXECUTIVE_PREFS: ExecutivePrefs = {
  defaultMode: "executive",
  snoozeLimit: 3,
  defaultSnoozeMinutes: 5,
  quietHoursStart: "00:30",
  quietHoursEnd: "06:30",
  proactiveEnabled: true,
  followUpEnabled: true,
  guidanceIntensity: "medium",
  salah: { ...DEFAULT_SALAH_SETTINGS },
};
