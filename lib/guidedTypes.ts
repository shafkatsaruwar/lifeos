/** Guided Tasks + Unfreeze Mode — step-based execution with confirmation. */

export type GuidanceMode = "independent" | "guided" | "unfreeze";

export type GuidedCategory =
  | "hygiene"
  | "cooking"
  | "studying"
  | "career"
  | "household"
  | "health"
  | "custom";

export type GuidedStepKind = "confirm" | "yes_no" | "choice" | "physical" | "mental";

export type GuidedRunStatus = "active" | "paused" | "waiting" | "completed" | "abandoned";

export type GuidedObservationType =
  | "guided.run.started"
  | "guided.step.confirmed"
  | "guided.run.paused"
  | "guided.run.resumed"
  | "guided.run.completed"
  | "guided.followup.offered";

export type GuidedBranch = {
  /** Match answer value (lowercase). Use "yes" / "no" for yes_no steps. */
  when: string;
  /** Jump to this step id. Omit to continue linear order. */
  nextStepId?: string | null;
  /** Insert these steps immediately after the current one (ephemeral for this run). */
  insertStepIds?: string[];
};

export type GuidedStep = {
  id: string;
  title: string;
  /** Shown to the user — Unfreeze prefers a single micro-action. */
  prompt: string;
  kind: GuidedStepKind;
  /** One tiny physical/mental action (required for Unfreeze clarity). */
  microAction?: string;
  /** Step ids that must be confirmed before this step is offered. */
  requires?: string[];
  /** Optional choice labels when kind === "choice". */
  choices?: string[];
  branches?: GuidedBranch[];
  /** If true, answering "no" / incomplete stays on this step (Unfreeze default). */
  stayUntilDone?: boolean;
};

export type GuidedSchedule = {
  kind: "daily" | "weekly" | "once";
  /** Local HH:mm for soft “due” hints while the app is open. */
  timeLocal?: string;
  /** 0=Sun … 6=Sat for weekly. */
  days?: number[];
};

export type GuidedRoutine = {
  id: string;
  name: string;
  description: string;
  category: GuidedCategory;
  defaultMode: GuidanceMode;
  steps: GuidedStep[];
  schedule?: GuidedSchedule;
  tags?: string[];
  builtIn?: boolean;
};

export type GuidedAnswer = {
  value: string;
  at: string;
};

export type GuidedRun = {
  id: string;
  routineId: string;
  mode: GuidanceMode;
  status: GuidedRunStatus;
  /** Current step awaiting confirmation — never auto-advanced. */
  currentStepId: string | null;
  completedStepIds: string[];
  answers: Record<string, GuidedAnswer>;
  /** Extra step ids inserted by branching for this run only. */
  insertedStepIds: string[];
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  lastPromptAt?: string;
  lastResponseAt?: string;
  followUpOfferedAt?: string;
  linkedTaskId?: number;
  pauseReason?: string;
};

export type GuidedObservation = {
  id: string;
  type: GuidedObservationType;
  entityId: string;
  timestamp: string;
  payload: Record<string, unknown>;
  provenance: "user_action" | "system";
  privacy: "private";
};

export type GuidedHubSettings = {
  defaultMode: GuidanceMode;
  /** Soft follow-up after this many hours of no response (client-side while app open). */
  followUpAfterHours: number;
  /** Prefer Unfreeze for built-in hygiene routines. */
  preferUnfreezeForHygiene: boolean;
};

export type GuidedHub = {
  version: 1;
  routines: GuidedRoutine[];
  runs: GuidedRun[];
  observations: GuidedObservation[];
  settings: GuidedHubSettings;
};

export const DEFAULT_GUIDED_SETTINGS: GuidedHubSettings = {
  defaultMode: "guided",
  followUpAfterHours: 2,
  preferUnfreezeForHygiene: true,
};
