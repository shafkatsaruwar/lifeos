/**
 * Local notifications for Executive Function — prefix `ex:` survives workspace sync.
 * Follow-ups use stored nextFollowUpAt; daily/salah use schedule + prefs.
 */
import type { PlannedNotification } from "../notifications/types";
import { cancelNotificationIds, getScheduledIds, schedulePlanned } from "../notifications/schedule";
import { COPY } from "./copy";
import { activeRuns, findRoutine } from "./engine";
import { nextPrayer, salahLabel } from "./salah";
import type { ExecutiveHub } from "./types";

export const EX_NOTIF_PREFIX = "ex:";

function todayAtLocal(hhmm: string, from = new Date()): Date {
  const [h, m] = hhmm.split(":").map((n) => Number(n));
  const d = new Date(from);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function nextDailyTrigger(hhmm: string, from = new Date()): Date {
  const at = todayAtLocal(hhmm, from);
  if (at.getTime() <= from.getTime() + 5_000) {
    at.setDate(at.getDate() + 1);
  }
  return at;
}

export function planExecutiveNotifications(hub: ExecutiveHub): PlannedNotification[] {
  if (!hub.prefs.proactiveEnabled && !hub.prefs.followUpEnabled) return [];
  const items: PlannedNotification[] = [];
  const now = Date.now();

  // Active-run follow-ups
  if (hub.prefs.followUpEnabled) {
    for (const run of activeRuns(hub)) {
      if (!run.nextFollowUpAt) continue;
      const fireAt = new Date(run.nextFollowUpAt);
      if (fireAt.getTime() <= now + 2_000) continue;
      const routine = findRoutine(hub, run.routineId);
      const name =
        routine?.sensitive && hub.prefs.salah.privacyLocked && routine.category === "salah"
          ? "your commitment"
          : routine?.name || "your routine";
      items.push({
        id: `${EX_NOTIF_PREFIX}followup:${run.id}`,
        title: "LifeOS",
        body: COPY.plannedStart(name),
        fireAt,
        payload: { category: "executive", targetId: run.id },
      });
    }
  }

  if (!hub.prefs.proactiveEnabled) return items;

  // Nightly retainers daily soft prompt
  const retainer = hub.routines.find((r) => r.id === "builtin-nightly-retainer");
  const timeLocal = retainer?.schedule?.timeLocal || "23:55";
  const alreadyActive = activeRuns(hub).some((r) => r.routineId === "builtin-nightly-retainer");
  if (!alreadyActive) {
    items.push({
      id: `${EX_NOTIF_PREFIX}daily:retainer`,
      title: "Nightly retainers",
      body: COPY.eveningRetainers,
      fireAt: nextDailyTrigger(timeLocal),
      payload: { category: "executive", targetId: "builtin-nightly-retainer", path: "routine" },
    });
  }

  // Next salah prompt
  if (hub.prefs.salah.enabled && hub.prefs.salah.latitude != null && hub.prefs.salah.longitude != null) {
    const next = nextPrayer(hub.prefs.salah);
    if (next && next.at.getTime() > now + 2_000) {
      const privateMode = hub.prefs.salah.privacyLocked;
      items.push({
        id: `${EX_NOTIF_PREFIX}salah:${next.id}`,
        title: privateMode ? "LifeOS" : salahLabel(next.id),
        body: privateMode ? "A time-sensitive commitment is available." : COPY.salahReady(next.id),
        fireAt: next.at,
        payload: { category: "executive", targetId: "builtin-salah-generic", path: "routine" },
      });
    }
  }

  return items;
}

export async function restoreExecutiveNotifications(hub: ExecutiveHub) {
  const planned = planExecutiveNotifications(hub);
  const scheduled = await getScheduledIds();
  const stale = scheduled.filter((id) => id.startsWith(EX_NOTIF_PREFIX) && !planned.some((p) => p.id === id));
  if (stale.length) await cancelNotificationIds(stale);
  await schedulePlanned(planned);
}
