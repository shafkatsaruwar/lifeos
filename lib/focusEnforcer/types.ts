/** Shared Focus Enforcer types — web-safe so Jest can import them. */

export type FocusEnforcerStatus =
  | "scheduled"
  | "escalating"
  | "active"
  | "completed"
  | "abandoned";

export type FocusEscalationLevel = "gentle" | "firm" | "severe";

export type FocusProofPhase = "start" | "check" | "complete";

export type FocusProofResult = {
  match: boolean;
  confidence: number;
  reason: string;
  manualOverride: boolean;
  at: string;
  /** Live camera only — never library upload as verified proof. */
  proofType: "live_camera";
  phase: FocusProofPhase;
};

export type FocusCheckKind = "ack" | "photo";

export type FocusCheckResponse =
  | "still_working"
  | "photo_pass"
  | "photo_fail"
  | "override"
  | "missed";

export type FocusCheck = {
  id: string;
  /** Absolute ISO time when the check notification should fire. */
  scheduledAt: string;
  promptedAt?: string;
  kind: FocusCheckKind;
  response?: FocusCheckResponse;
  proof?: FocusProofResult;
  recovered?: boolean;
  recoveredAt?: string;
};

export type FocusEnforcerPrefs = {
  enabled: boolean;
  /**
   * Absolute offsets in minutes from scheduledStartAt.
   * Example [5, 10, 15] → escalations at start+5 / start+10 / start+15
   * (NOT sequential gaps of +5 then +10 then +15).
   */
  escalateOffsetsMin: [number, number, number];
  /** Probability a mid-session check requires a live photo (0–1). */
  photoCheckChance: number;
};

export const DEFAULT_FOCUS_ENFORCER_PREFS: FocusEnforcerPrefs = {
  enabled: true,
  escalateOffsetsMin: [5, 10, 15],
  photoCheckChance: 0.5,
};

export type FocusEnforcerSession = {
  id: string;
  taskId: number;
  taskTitle: string;
  scheduledStartAt: string;
  expectedDurationMin: number;
  proofRequired: boolean;
  status: FocusEnforcerStatus;
  escalationLevel: FocusEscalationLevel | null;
  actualStartAt?: string;
  completedAt?: string;
  /** Minutes after scheduledStartAt when the session actually started. */
  startDelayMin?: number;
  startProof?: FocusProofResult;
  completionProof?: FocusProofResult;
  checks: FocusCheck[];
  createdAt: string;
  updatedAt: string;
};

export type FocusEnforcerMetrics = {
  planned: number;
  started: number;
  completed: number;
  /**
   * Primary UI metric: started within 2 minutes of scheduledStartAt / all planned.
   * Never-started sessions lower this rate.
   */
  onTimePlannedPercent: number;
  /** Secondary: on-time among sessions that actually started. */
  onTimeAmongStartedPercent: number;
  averageStartDelayMin: number;
  checksPassed: number;
  checksFailed: number;
  distractionRecoveries: number;
  verifiedFocusPercent: number;
  manualOverrideCount: number;
};
