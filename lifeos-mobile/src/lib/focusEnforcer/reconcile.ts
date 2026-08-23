import { cancelNotificationIds, getScheduledIds, schedulePlanned } from "../notifications/schedule";
import type { FocusEnforcerPrefs, FocusEnforcerSession } from "./shared";
import { isFocusEnforcerNotifId, sessionNotifIds } from "./ids";
import { planSessionNotifications } from "./schedule";

/**
 * Reconcile local Expo notifications with Firebase session state.
 * Cancels existing fe: ids for the session, then schedules only future ones — no duplicates.
 * Firebase remains the source of truth after app restart / crash / kill.
 */
export async function reconcileSessionNotifications(
  session: FocusEnforcerSession,
  prefs: Pick<FocusEnforcerPrefs, "escalateOffsetsMin">,
  preferredName?: string,
) {
  const checkIds = (session.checks ?? []).map((c) => c.id);
  const knownIds = sessionNotifIds(session.id, checkIds);

  const scheduled = await getScheduledIds();
  const existingFe = scheduled.filter((id) => isFocusEnforcerNotifId(id) && id.includes(session.id));
  const toCancel = Array.from(new Set([...knownIds, ...existingFe]));
  if (toCancel.length) await cancelNotificationIds(toCancel);

  if (session.status === "completed" || session.status === "abandoned") return;

  const planned = planSessionNotifications(session, prefs, preferredName);
  if (planned.length) await schedulePlanned(planned);
}

export async function reconcileLiveSessions(
  sessions: FocusEnforcerSession[],
  prefs: FocusEnforcerPrefs,
  preferredName?: string,
) {
  for (const session of sessions) {
    await reconcileSessionNotifications(session, prefs, preferredName);
  }
}
