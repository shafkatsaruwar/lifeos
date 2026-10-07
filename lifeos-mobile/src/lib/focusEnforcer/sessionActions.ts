import { cancelNotificationIds } from "../notifications/schedule";
import {
  DEFAULT_FOCUS_ENFORCER_PREFS,
  ESCALATION_LEVELS,
  buildChecksForSession,
  nextFocusEnforcerStart,
  normalizeFocusEnforcerRepeat,
  startDelayMinutes,
  type FocusCheck,
  type FocusEnforcerPrefs,
  type FocusEnforcerRepeat,
  type FocusEnforcerSession,
  type FocusProofResult,
} from "./shared";
import { newFocusEnforcerSessionId, saveFocusEnforcerSession } from "./store";
import { idsToCancelOnComplete, idsToCancelOnStart } from "./schedule";
import { reconcileSessionNotifications } from "./reconcile";

export type CreateFocusEnforcerSessionInput = {
  taskId: number;
  taskTitle: string;
  scheduledStartAt: Date;
  expectedDurationMin: number;
  proofRequired: boolean;
  repeat?: FocusEnforcerRepeat;
  /** When continuing a series, pass the existing series id. */
  seriesId?: string;
};

export async function createFocusEnforcerSession(
  userId: string,
  input: CreateFocusEnforcerSessionInput,
  prefs: FocusEnforcerPrefs = DEFAULT_FOCUS_ENFORCER_PREFS,
  preferredName?: string,
): Promise<FocusEnforcerSession> {
  const now = new Date().toISOString();
  const id = newFocusEnforcerSessionId();
  const repeat = normalizeFocusEnforcerRepeat(input.repeat);
  const session: FocusEnforcerSession = {
    id,
    taskId: input.taskId,
    taskTitle: input.taskTitle,
    scheduledStartAt: input.scheduledStartAt.toISOString(),
    expectedDurationMin: Math.max(5, Math.min(240, input.expectedDurationMin)),
    proofRequired: input.proofRequired,
    status: "scheduled",
    escalationLevel: null,
    repeat,
    seriesId: input.seriesId || (repeat !== "never" ? id : undefined),
    checks: [],
    createdAt: now,
    updatedAt: now,
  };
  await saveFocusEnforcerSession(userId, session);
  await reconcileSessionNotifications(session, prefs, preferredName);
  return session;
}

/** After complete/abandon, spawn the next occurrence when repeat is set. */
export async function spawnNextFocusEnforcerSession(
  userId: string,
  ended: FocusEnforcerSession,
  prefs: FocusEnforcerPrefs = DEFAULT_FOCUS_ENFORCER_PREFS,
  preferredName?: string,
  now: Date = new Date(),
): Promise<FocusEnforcerSession | null> {
  const repeat = normalizeFocusEnforcerRepeat(ended.repeat);
  const nextStart = nextFocusEnforcerStart(ended.scheduledStartAt, repeat, now);
  if (!nextStart) return null;
  return createFocusEnforcerSession(
    userId,
    {
      taskId: ended.taskId,
      taskTitle: ended.taskTitle,
      scheduledStartAt: nextStart,
      expectedDurationMin: ended.expectedDurationMin,
      proofRequired: ended.proofRequired,
      repeat,
      seriesId: ended.seriesId || ended.id,
    },
    prefs,
    preferredName,
  );
}

export async function markSessionEscalating(
  userId: string,
  session: FocusEnforcerSession,
  levelIndex: 0 | 1 | 2,
  prefs: FocusEnforcerPrefs,
  preferredName?: string,
) {
  const next: FocusEnforcerSession = {
    ...session,
    status: "escalating",
    escalationLevel: ESCALATION_LEVELS[levelIndex],
    updatedAt: new Date().toISOString(),
  };
  await saveFocusEnforcerSession(userId, next);
  await reconcileSessionNotifications(next, prefs, preferredName);
  return next;
}

export async function startFocusEnforcerSession(
  userId: string,
  session: FocusEnforcerSession,
  prefs: FocusEnforcerPrefs,
  startProof?: FocusProofResult,
  preferredName?: string,
): Promise<FocusEnforcerSession> {
  const actualStartAt = new Date();
  const checks = buildChecksForSession(actualStartAt, session.expectedDurationMin, prefs);
  const next: FocusEnforcerSession = {
    ...session,
    status: "active",
    escalationLevel: null,
    actualStartAt: actualStartAt.toISOString(),
    startDelayMin: startDelayMinutes(session.scheduledStartAt, actualStartAt.toISOString()),
    startProof,
    checks,
    updatedAt: actualStartAt.toISOString(),
  };
  await cancelNotificationIds(idsToCancelOnStart(session.id));
  await saveFocusEnforcerSession(userId, next);
  await reconcileSessionNotifications(next, prefs, preferredName);
  return next;
}

export async function respondToCheck(
  userId: string,
  session: FocusEnforcerSession,
  checkId: string,
  patch: Partial<FocusCheck>,
  prefs: FocusEnforcerPrefs,
  preferredName?: string,
) {
  const checks = (session.checks ?? []).map((c) => (c.id === checkId ? { ...c, ...patch } : c));
  const next: FocusEnforcerSession = { ...session, checks, updatedAt: new Date().toISOString() };
  await saveFocusEnforcerSession(userId, next);
  await reconcileSessionNotifications(next, prefs, preferredName);
  return next;
}

export async function completeFocusEnforcerSession(
  userId: string,
  session: FocusEnforcerSession,
  completionProof?: FocusProofResult,
  prefs: FocusEnforcerPrefs = DEFAULT_FOCUS_ENFORCER_PREFS,
  preferredName?: string,
): Promise<{ session: FocusEnforcerSession; nextSession: FocusEnforcerSession | null }> {
  const next: FocusEnforcerSession = {
    ...session,
    status: "completed",
    completedAt: new Date().toISOString(),
    completionProof,
    updatedAt: new Date().toISOString(),
  };
  await cancelNotificationIds(idsToCancelOnComplete(session));
  await saveFocusEnforcerSession(userId, next);
  const nextSession = await spawnNextFocusEnforcerSession(userId, next, prefs, preferredName);
  return { session: next, nextSession };
}

export async function abandonFocusEnforcerSession(
  userId: string,
  session: FocusEnforcerSession,
  prefs: FocusEnforcerPrefs = DEFAULT_FOCUS_ENFORCER_PREFS,
  preferredName?: string,
): Promise<{ session: FocusEnforcerSession; nextSession: FocusEnforcerSession | null }> {
  const next: FocusEnforcerSession = {
    ...session,
    status: "abandoned",
    updatedAt: new Date().toISOString(),
  };
  await cancelNotificationIds(idsToCancelOnComplete(session));
  await saveFocusEnforcerSession(userId, next);
  const nextSession = await spawnNextFocusEnforcerSession(userId, next, prefs, preferredName);
  return { session: next, nextSession };
}

/** Rebuild notification schedule from Firebase after cold start / crash. */
export async function restoreFocusEnforcerNotifications(
  sessions: FocusEnforcerSession[],
  prefs: FocusEnforcerPrefs,
  preferredName?: string,
) {
  for (const session of sessions) {
    if (session.status === "completed" || session.status === "abandoned") continue;
    await reconcileSessionNotifications(session, prefs, preferredName);
  }
}
