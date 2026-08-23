import type { PlannedNotification } from "../notifications/types";
import {
  ESCALATION_LEVELS,
  checkNotificationCopy,
  escalationCopy,
  escalationFireTimes,
  startNotificationCopy,
  startNotificationTime,
  type FocusEnforcerPrefs,
  type FocusEnforcerSession,
} from "./shared";
import {
  allEscalationNotifIds,
  feCheckNotifId,
  feEscalationNotifId,
  feStartNotifId,
  sessionNotifIds,
} from "./ids";

/** Build start + absolute-offset escalation notifications (before session starts). */
export function planStartAndEscalationNotifications(
  session: FocusEnforcerSession,
  prefs: Pick<FocusEnforcerPrefs, "escalateOffsetsMin">,
  preferredName?: string,
  now = new Date(),
): PlannedNotification[] {
  if (session.status !== "scheduled" && session.status !== "escalating") return [];

  const scheduledStart = new Date(session.scheduledStartAt);
  const items: PlannedNotification[] = [];

  const startAt = startNotificationTime(scheduledStart);
  if (startAt.getTime() > now.getTime() + 2_000) {
    const copy = startNotificationCopy(session.taskTitle, preferredName);
    items.push({
      id: feStartNotifId(session.id),
      title: copy.title,
      body: copy.body,
      fireAt: startAt,
      payload: {
        category: "focusEnforcer",
        targetId: session.id,
        path: "start",
      },
    });
  }

  // Absolute offsets from scheduledStartAt — NOT sequential gaps.
  const fireTimes = escalationFireTimes(scheduledStart, prefs.escalateOffsetsMin);
  fireTimes.forEach((fireAt, index) => {
    if (fireAt.getTime() <= now.getTime() + 2_000) return;
    const levelIndex = (index + 1) as 1 | 2 | 3;
    const level = ESCALATION_LEVELS[index];
    const copy = escalationCopy(level, session.taskTitle, preferredName);
    items.push({
      id: feEscalationNotifId(session.id, levelIndex),
      title: copy.title,
      body: copy.body,
      fireAt,
      payload: {
        category: "focusEnforcer",
        targetId: session.id,
        path: "esc",
      },
    });
  });

  return items;
}

/** Mid-session check notifications from Firebase check schedule. */
export function planCheckNotifications(
  session: FocusEnforcerSession,
  now = new Date(),
): PlannedNotification[] {
  if (session.status !== "active") return [];
  const items: PlannedNotification[] = [];
  for (const check of session.checks ?? []) {
    if (check.response) continue;
    const fireAt = new Date(check.scheduledAt);
    if (fireAt.getTime() <= now.getTime() + 2_000) continue;
    const copy = checkNotificationCopy(check.kind, session.taskTitle);
    items.push({
      id: feCheckNotifId(session.id, check.id),
      title: copy.title,
      body: copy.body,
      fireAt,
      payload: {
        category: "focusEnforcer",
        targetId: session.id,
        path: "check",
      },
    });
  }
  return items;
}

export function planSessionNotifications(
  session: FocusEnforcerSession,
  prefs: Pick<FocusEnforcerPrefs, "escalateOffsetsMin">,
  preferredName?: string,
  now = new Date(),
): PlannedNotification[] {
  return [
    ...planStartAndEscalationNotifications(session, prefs, preferredName, now),
    ...planCheckNotifications(session, now),
  ];
}

export function idsToCancelOnStart(sessionId: string) {
  return [feStartNotifId(sessionId), ...allEscalationNotifIds(sessionId)];
}

export function idsToCancelOnComplete(session: FocusEnforcerSession) {
  return sessionNotifIds(
    session.id,
    (session.checks ?? []).map((c) => c.id),
  );
}
