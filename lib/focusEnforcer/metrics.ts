import type { FocusEnforcerMetrics, FocusEnforcerSession, FocusProofResult } from "./types";
import { isOnTimeStart } from "./timing";

const DAY_MS = 24 * 60 * 60_000;

export function sessionsInLastDays(
  sessions: FocusEnforcerSession[],
  days = 30,
  now = new Date(),
): FocusEnforcerSession[] {
  const cutoff = now.getTime() - days * DAY_MS;
  return sessions.filter((s) => {
    const t = new Date(s.scheduledStartAt).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
}

function collectProofs(session: FocusEnforcerSession): FocusProofResult[] {
  const proofs: FocusProofResult[] = [];
  if (session.startProof) proofs.push(session.startProof);
  if (session.completionProof) proofs.push(session.completionProof);
  for (const check of session.checks ?? []) {
    if (check.proof) proofs.push(check.proof);
  }
  return proofs;
}

export function computeFocusEnforcerMetrics(
  sessions: FocusEnforcerSession[],
  days = 30,
  now = new Date(),
): FocusEnforcerMetrics {
  const windowed = sessionsInLastDays(sessions, days, now);
  const planned = windowed.length;
  const startedSessions = windowed.filter((s) => Boolean(s.actualStartAt));
  const started = startedSessions.length;
  const completed = windowed.filter((s) => s.status === "completed").length;

  const onTimeCount = startedSessions.filter((s) => isOnTimeStart(s.startDelayMin)).length;
  // Primary: never-started sessions must pull this down (e.g. 5 of 10 = 50%, not 5 of 7).
  const onTimePlannedPercent = planned === 0 ? 0 : Math.round((onTimeCount / planned) * 100);
  const onTimeAmongStartedPercent = started === 0 ? 0 : Math.round((onTimeCount / started) * 100);

  const delays = startedSessions
    .map((s) => s.startDelayMin)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const averageStartDelayMin =
    delays.length === 0 ? 0 : Math.round(delays.reduce((a, b) => a + b, 0) / delays.length);

  let checksPassed = 0;
  let checksFailed = 0;
  let distractionRecoveries = 0;
  for (const session of windowed) {
    for (const check of session.checks ?? []) {
      if (check.response === "photo_fail") checksFailed += 1;
      if (
        check.response === "still_working" ||
        check.response === "photo_pass" ||
        check.response === "override"
      ) {
        checksPassed += 1;
      }
      if (check.recovered) distractionRecoveries += 1;
    }
  }

  const proofs = windowed.flatMap(collectProofs);
  const manualOverrideCount = proofs.filter((p) => p.manualOverride).length;
  const verified = proofs.filter((p) => p.match && !p.manualOverride).length;
  const verifiedFocusPercent = proofs.length === 0 ? 0 : Math.round((verified / proofs.length) * 100);

  return {
    planned,
    started,
    completed,
    onTimePlannedPercent,
    onTimeAmongStartedPercent,
    averageStartDelayMin,
    checksPassed,
    checksFailed,
    distractionRecoveries,
    verifiedFocusPercent,
    manualOverrideCount,
  };
}
