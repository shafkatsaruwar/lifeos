import { activeRuns, findRoutine } from "./engine";
import { COPY } from "./copy";
import { formatPrayerClock, nextPrayer, salahLabel } from "./salah";
import type { ExecutiveHub } from "./types";

export type BriefingItem = {
  id: string;
  label: string;
  detail?: string;
  runId?: string;
  kind: "routine" | "salah" | "priority" | "resume";
};

export type DailyBriefing = {
  title: string;
  summary: string;
  items: BriefingItem[];
  recommended?: BriefingItem;
};

/**
 * Clarity over quantity — a short executive briefing from active runs + salah.
 * Does not invent tasks outside authorized executive hub + optional open task count.
 */
export function buildDailyBriefing(
  hub: ExecutiveHub,
  opts?: { openPriorityCount?: number; now?: Date },
): DailyBriefing {
  const now = opts?.now ?? new Date();
  const hour = now.getHours();
  const title = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const items: BriefingItem[] = [];
  const actives = activeRuns(hub);

  for (const run of actives.slice(0, 4)) {
    const routine = findRoutine(hub, run.routineId);
    if (!routine) continue;
    if (routine.sensitive && hub.prefs.salah.privacyLocked && routine.category === "salah") {
      items.push({
        id: run.id,
        label: "A time-sensitive routine is open",
        detail: run.state === "paused" ? "Paused — resume when ready" : "Pending confirmation",
        runId: run.id,
        kind: run.state === "paused" || run.state === "in_progress" ? "resume" : "routine",
      });
      continue;
    }
    items.push({
      id: run.id,
      label: routine.name,
      detail:
        run.state === "in_progress"
          ? "In progress"
          : run.state === "paused"
            ? "Paused"
            : run.nextFollowUpAt
              ? "Follow-up scheduled"
              : "Pending",
      runId: run.id,
      kind: run.state === "paused" || run.state === "in_progress" ? "resume" : "routine",
    });
  }

  if (hub.prefs.salah.enabled) {
    const next = nextPrayer(hub.prefs.salah, now);
    if (next) {
      const sensitive = hub.prefs.salah.privacyLocked;
      items.push({
        id: `salah-${next.id}`,
        label: sensitive ? "Upcoming commitment" : salahLabel(next.id),
        detail: sensitive
          ? formatPrayerClock(next.at)
          : `${formatPrayerClock(next.at)} · window until ${formatPrayerClock(next.endsAt)}`,
        kind: "salah",
      });
    }
  }

  const open = opts?.openPriorityCount ?? 0;
  if (open > 0) {
    items.push({
      id: "priorities",
      label: COPY.prioritiesLeft(open),
      kind: "priority",
    });
  }

  const limited = items.slice(0, 5);
  const recommended =
    limited.find((i) => i.kind === "resume") ||
    limited.find((i) => i.kind === "routine") ||
    limited.find((i) => i.kind === "salah") ||
    limited[0];

  const summaryParts: string[] = [];
  if (actives.length) summaryParts.push(`${actives.length} open commitment${actives.length === 1 ? "" : "s"}`);
  if (open) summaryParts.push(COPY.prioritiesLeft(open));
  if (!summaryParts.length) summaryParts.push("No urgent executive prompts right now.");

  return {
    title,
    summary: summaryParts.join(" · "),
    items: limited,
    recommended,
  };
}
