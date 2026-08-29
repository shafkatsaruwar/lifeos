/**
 * Shared cold-start onboarding gate (web + mobile).
 *
 * A signed-in user who already finished onboarding — or who already has a
 * real workspace in Firebase — must land on the normal home, not the intro.
 * The intro is only for a genuinely new / empty account.
 */

export type OnboardingGateSettings = {
  onboardingCompletedAt?: string;
  onboardingVersion?: number;
  /** Set when the v1 intro is opened — blocks name-only auto-complete mid-flow. */
  onboardingStartedAt?: string;
  preferredName?: string;
};

export type OnboardingGateWorkspace = {
  tasks?: readonly unknown[];
  projects?: readonly unknown[];
  calendar?: readonly unknown[];
  classes?: readonly unknown[];
  notes?: readonly unknown[];
  brain?: readonly unknown[];
  notebookHub?: { notebooks?: readonly unknown[] };
  notebookPages?: Record<string, unknown> | null;
};

export type OnboardingGateInput = {
  /** Signed-in user is already restored (Firebase Auth persistence). */
  signedIn: boolean;
  /** Settings → “Show intro again” — local only, not a logout. */
  replay?: boolean;
  settings: OnboardingGateSettings;
  workspace: OnboardingGateWorkspace;
  /**
   * Device-cache fallback (web localStorage / mobile AsyncStorage).
   * Used when Firebase settings were stripped by an older web write.
   */
  deviceCompletedAt?: string | null;
};

/** Collections that exist on a returning account — not a blank first-run. */
export function workspaceLooksLikeReturningUser(workspace: OnboardingGateWorkspace): boolean {
  const calendar = workspace.calendar?.length ?? 0;
  const projects = workspace.projects?.length ?? 0;
  const classes = workspace.classes?.length ?? 0;
  const notes = workspace.notes?.length ?? 0;
  const brain = workspace.brain?.length ?? 0;
  const notebooks = workspace.notebookHub?.notebooks?.length ?? 0;
  const pages = workspace.notebookPages ? Object.keys(workspace.notebookPages).length : 0;
  const tasks = workspace.tasks?.length ?? 0;

  // Calendar / projects / classes / notes come from prior use (often web).
  if (calendar || projects || classes || notes || brain || notebooks || pages) return true;
  // A single task can be onboarding’s “first move”; several tasks are not.
  if (tasks > 1) return true;
  return false;
}

/**
 * Cold-start decision: show the first-run intro only for a new empty account.
 *
 * - Persisted `onboardingCompletedAt` (Firebase or device cache) always skips.
 * - An established workspace (tasks, calendar, projects, …) skips even if the
 *   flag was wiped — we never force a returning user through the intro.
 * - `onboardingVersion` / `onboardingStartedAt` without a completed timestamp
 *   only block the name-only auto-complete while the user is still inside the flow.
 */
export function shouldShowOnboarding(input: OnboardingGateInput): boolean {
  if (!input.signedIn) return false;
  if (input.replay) return true;
  if (input.settings.onboardingCompletedAt) return false;
  if (input.deviceCompletedAt) return false;
  if (workspaceLooksLikeReturningUser(input.workspace)) return false;
  // Legacy web account that set a name before mobile onboarding existed.
  // Mid-flow writes onboardingStartedAt (not version) so a name save cannot skip.
  const flowStarted =
    input.settings.onboardingVersion != null || Boolean(input.settings.onboardingStartedAt);
  if (input.settings.preferredName?.trim() && !flowStarted) {
    return false;
  }
  return true;
}

/** True when we should write `onboardingCompletedAt` to heal a missing flag. */
export function shouldPersistOnboardingComplete(input: Omit<OnboardingGateInput, "signedIn" | "replay">): boolean {
  if (input.settings.onboardingCompletedAt) return false;
  return !shouldShowOnboarding({ ...input, signedIn: true, replay: false });
}
