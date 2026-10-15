import type {
  GuidanceMode,
  GuidedAnswer,
  GuidedHub,
  GuidedRoutine,
  GuidedRun,
  GuidedStep,
} from "./guidedTypes";
import { newGuidedId, nowIso, publishGuidedObservation } from "./guidedHelpers";

export type GuidedEngineResult = GuidedHub | { error: string };

function isError(result: GuidedEngineResult): result is { error: string } {
  return typeof result === "object" && result !== null && "error" in result;
}

export function findRoutine(hub: GuidedHub, routineId: string): GuidedRoutine | undefined {
  return hub.routines.find((r) => r.id === routineId);
}

export function findRun(hub: GuidedHub, runId: string): GuidedRun | undefined {
  return hub.runs.find((r) => r.id === runId);
}

/** Ordered step list for a run: routine steps + any inserted branch steps (deduped). */
export function orderedStepsForRun(routine: GuidedRoutine, run: GuidedRun): GuidedStep[] {
  const byId = new Map(routine.steps.map((s) => [s.id, s]));
  const order: GuidedStep[] = [];
  const seen = new Set<string>();
  for (const step of routine.steps) {
    if (seen.has(step.id)) continue;
    seen.add(step.id);
    order.push(step);
  }
  for (const id of run.insertedStepIds) {
    const step = byId.get(id);
    if (!step || seen.has(id)) continue;
    seen.add(id);
    order.push(step);
  }
  return order;
}

export function prerequisitesMet(step: GuidedStep, completed: Set<string>): boolean {
  if (!step.requires?.length) return true;
  return step.requires.every((id) => completed.has(id));
}

export function resolveCurrentStep(
  routine: GuidedRoutine,
  run: GuidedRun,
): GuidedStep | null {
  if (!run.currentStepId) return null;
  return orderedStepsForRun(routine, run).find((s) => s.id === run.currentStepId) ?? null;
}

/** First incomplete step whose prerequisites are met (linear fallback). */
export function nextEligibleStep(
  routine: GuidedRoutine,
  run: GuidedRun,
  fromId?: string | null,
): GuidedStep | null {
  const completed = new Set(run.completedStepIds);
  const steps = orderedStepsForRun(routine, run);
  let started = !fromId;
  for (const step of steps) {
    if (!started) {
      if (step.id === fromId) started = true;
      continue;
    }
    if (completed.has(step.id)) continue;
    if (!prerequisitesMet(step, completed)) continue;
    return step;
  }
  // Also scan from beginning if fromId walk found nothing
  for (const step of steps) {
    if (completed.has(step.id)) continue;
    if (!prerequisitesMet(step, completed)) continue;
    return step;
  }
  return null;
}

export function startGuidedRun(
  hub: GuidedHub,
  routineId: string,
  mode?: GuidanceMode,
  linkedTaskId?: number,
): GuidedEngineResult {
  const routine = findRoutine(hub, routineId);
  if (!routine) return { error: "Routine not found." };
  if (!routine.steps.length) return { error: "Routine has no steps." };

  const existing = hub.runs.find(
    (r) => r.routineId === routineId && (r.status === "active" || r.status === "paused" || r.status === "waiting"),
  );
  if (existing) {
    return resumeGuidedRun(hub, existing.id);
  }

  const resolvedMode =
    mode ??
    (routine.category === "hygiene" && hub.settings.preferUnfreezeForHygiene
      ? "unfreeze"
      : routine.defaultMode || hub.settings.defaultMode);

  const first = nextEligibleStep(routine, {
    id: "tmp",
    routineId,
    mode: resolvedMode,
    status: "active",
    currentStepId: null,
    completedStepIds: [],
    answers: {},
    insertedStepIds: [],
    startedAt: nowIso(),
    updatedAt: nowIso(),
  });
  if (!first) return { error: "No eligible starting step." };

  const now = nowIso();
  const run: GuidedRun = {
    id: newGuidedId("run"),
    routineId,
    mode: resolvedMode,
    status: "active",
    currentStepId: first.id,
    completedStepIds: [],
    answers: {},
    insertedStepIds: [],
    startedAt: now,
    updatedAt: now,
    lastPromptAt: now,
    linkedTaskId,
  };

  let next: GuidedHub = {
    ...hub,
    runs: [run, ...hub.runs].slice(0, 100),
  };
  next = publishGuidedObservation(next, {
    id: `obs-guided-start-${run.id}`,
    type: "guided.run.started",
    entityId: run.id,
    timestamp: now,
    payload: { routineId, routineName: routine.name, mode: resolvedMode },
    provenance: "user_action",
    privacy: "private",
  });
  return next;
}

export function pauseGuidedRun(hub: GuidedHub, runId: string, reason?: string): GuidedEngineResult {
  const run = findRun(hub, runId);
  if (!run) return { error: "Run not found." };
  if (run.status === "completed" || run.status === "abandoned") {
    return { error: "This run is already finished." };
  }
  const now = nowIso();
  let next: GuidedHub = {
    ...hub,
    runs: hub.runs.map((r) =>
      r.id === runId
        ? { ...r, status: "paused" as const, pauseReason: reason || "paused", updatedAt: now }
        : r,
    ),
  };
  next = publishGuidedObservation(next, {
    id: `obs-guided-pause-${runId}-${now}`,
    type: "guided.run.paused",
    entityId: runId,
    timestamp: now,
    payload: { reason: reason || "paused", currentStepId: run.currentStepId },
    provenance: "user_action",
    privacy: "private",
  });
  return next;
}

export function resumeGuidedRun(hub: GuidedHub, runId: string): GuidedEngineResult {
  const run = findRun(hub, runId);
  if (!run) return { error: "Run not found." };
  if (run.status === "completed" || run.status === "abandoned") {
    return { error: "This run is already finished." };
  }
  const routine = findRoutine(hub, run.routineId);
  if (!routine) return { error: "Routine missing for this run." };

  const now = nowIso();
  let currentStepId = run.currentStepId;
  if (!currentStepId || run.completedStepIds.includes(currentStepId)) {
    currentStepId = nextEligibleStep(routine, run)?.id ?? null;
  }

  let next: GuidedHub = {
    ...hub,
    runs: hub.runs.map((r) =>
      r.id === runId
        ? {
            ...r,
            status: currentStepId ? ("active" as const) : ("completed" as const),
            currentStepId,
            updatedAt: now,
            lastPromptAt: now,
            pauseReason: undefined,
          }
        : r,
    ),
  };
  next = publishGuidedObservation(next, {
    id: `obs-guided-resume-${runId}-${now}`,
    type: "guided.run.resumed",
    entityId: runId,
    timestamp: now,
    payload: { currentStepId },
    provenance: "user_action",
    privacy: "private",
  });
  return next;
}

function normalizeAnswer(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Confirm the current step with an explicit user answer.
 * Never marks the whole run complete without finishing steps via confirmation.
 * Unfreeze + stayUntilDone: "no" / incomplete keeps the same step.
 */
export function confirmGuidedStep(
  hub: GuidedHub,
  runId: string,
  answerRaw: string,
): GuidedEngineResult {
  const run = findRun(hub, runId);
  if (!run) return { error: "Run not found." };
  if (run.status === "completed" || run.status === "abandoned") {
    return { error: "This run is already finished." };
  }
  if (run.status === "paused") return { error: "Resume before confirming a step." };

  const routine = findRoutine(hub, run.routineId);
  if (!routine) return { error: "Routine missing for this run." };

  const step = resolveCurrentStep(routine, run);
  if (!step) return { error: "No current step to confirm." };

  const answer = normalizeAnswer(answerRaw);
  if (!answer) return { error: "Confirm with an answer before continuing." };

  const now = nowIso();
  const completed = new Set(run.completedStepIds);
  const answers: Record<string, GuidedAnswer> = {
    ...run.answers,
    [step.id]: { value: answer, at: now },
  };

  // Branch resolution — explicit branches win over stay-until-done.
  const branch = step.branches?.find((b) => normalizeAnswer(b.when) === answer);
  const incomplete =
    answer === "no" || answer === "not yet" || answer === "incomplete";
  const stay =
    !branch &&
    (step.stayUntilDone || run.mode === "unfreeze") &&
    incomplete;

  let insertedStepIds = [...run.insertedStepIds];
  if (branch?.insertStepIds?.length) {
    for (const id of branch.insertStepIds) {
      if (!insertedStepIds.includes(id)) insertedStepIds.push(id);
    }
  }

  let nextCompleted = [...run.completedStepIds];
  let nextCurrent: string | null = run.currentStepId;
  let status: GuidedRun["status"] = "active";
  let completedAt: string | undefined;

  if (stay) {
    // Keep current step — progress preserved, nothing marked done.
    nextCurrent = step.id;
  } else if (branch && incomplete && branch.nextStepId) {
    // Prerequisite not met — guide through remediation without marking this step done.
    nextCurrent = branch.nextStepId;
  } else {
    if (!completed.has(step.id)) nextCompleted = [...nextCompleted, step.id];
    completed.add(step.id);

    // Completing a remediation step also satisfies its parent yes_no (by naming convention / requires).
    for (const parent of routine.steps) {
      if (parent.branches?.some((b) => b.nextStepId === step.id && normalizeAnswer(b.when) === "no")) {
        if (!completed.has(parent.id)) {
          nextCompleted = [...nextCompleted, parent.id];
          completed.add(parent.id);
        }
      }
    }

    if (branch && "nextStepId" in branch) {
      if (branch.nextStepId === null) {
        const more = nextEligibleStep(routine, { ...run, completedStepIds: nextCompleted, insertedStepIds });
        if (more) {
          nextCurrent = more.id;
        } else {
          nextCurrent = null;
          status = "completed";
          completedAt = now;
        }
      } else if (branch.nextStepId) {
        const target = orderedStepsForRun(routine, { ...run, insertedStepIds }).find(
          (s) => s.id === branch.nextStepId,
        );
        if (target && !completed.has(target.id)) {
          nextCurrent = target.id;
        } else {
          nextCurrent =
            nextEligibleStep(routine, {
              ...run,
              completedStepIds: nextCompleted,
              insertedStepIds,
            })?.id ?? null;
          if (!nextCurrent) {
            status = "completed";
            completedAt = now;
          }
        }
      }
    } else {
      nextCurrent =
        nextEligibleStep(
          routine,
          { ...run, completedStepIds: nextCompleted, insertedStepIds, currentStepId: step.id },
          step.id,
        )?.id ??
        nextEligibleStep(routine, {
          ...run,
          completedStepIds: nextCompleted,
          insertedStepIds,
        })?.id ??
        null;
      if (!nextCurrent) {
        status = "completed";
        completedAt = now;
      }
    }
  }

  // Independent mode still requires confirmation — we never auto-skip.
  // Guided shows more context in UI; engine is the same.

  let next: GuidedHub = {
    ...hub,
    runs: hub.runs.map((r) =>
      r.id === runId
        ? {
            ...r,
            status,
            currentStepId: nextCurrent,
            completedStepIds: nextCompleted,
            answers,
            insertedStepIds,
            updatedAt: now,
            lastResponseAt: now,
            lastPromptAt: nextCurrent ? now : r.lastPromptAt,
            completedAt: completedAt ?? r.completedAt,
            followUpOfferedAt: undefined,
          }
        : r,
    ),
  };

  next = publishGuidedObservation(next, {
    id: `obs-guided-step-${runId}-${step.id}-${now}`,
    type: "guided.step.confirmed",
    entityId: runId,
    timestamp: now,
    payload: {
      stepId: step.id,
      stepTitle: step.title,
      answer,
      stayed: stay,
      mode: run.mode,
      nextStepId: nextCurrent,
    },
    provenance: "user_action",
    privacy: "private",
  });

  if (status === "completed") {
    next = publishGuidedObservation(next, {
      id: `obs-guided-done-${runId}`,
      type: "guided.run.completed",
      entityId: runId,
      timestamp: now,
      payload: {
        routineId: routine.id,
        routineName: routine.name,
        mode: run.mode,
        stepsCompleted: nextCompleted.length,
      },
      provenance: "user_action",
      privacy: "private",
    });
  }

  return next;
}

/** Soft follow-up for idle active/waiting runs — does not mark anything complete. */
export function offerIdleFollowUps(hub: GuidedHub, now: Date = new Date()): GuidedHub {
  const hours = Math.max(0.25, hub.settings.followUpAfterHours || 2);
  const thresholdMs = hours * 60 * 60 * 1000;
  const nowMs = now.getTime();
  let changed = false;
  const runs = hub.runs.map((run) => {
    if (run.status !== "active" && run.status !== "waiting") return run;
    if (!run.currentStepId) return run;
    const anchor = Date.parse(run.lastResponseAt || run.lastPromptAt || run.updatedAt);
    if (Number.isNaN(anchor) || nowMs - anchor < thresholdMs) return run;
    if (run.followUpOfferedAt) {
      const offered = Date.parse(run.followUpOfferedAt);
      if (!Number.isNaN(offered) && nowMs - offered < thresholdMs) return run;
    }
    changed = true;
    return {
      ...run,
      status: "waiting" as const,
      followUpOfferedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  });

  if (!changed) return hub;

  let next: GuidedHub = { ...hub, runs };
  for (const run of runs) {
    if (run.status !== "waiting" || !run.followUpOfferedAt) continue;
    const justOffered = Date.parse(run.followUpOfferedAt) >= nowMs - 1000;
    if (!justOffered) continue;
    const routine = findRoutine(hub, run.routineId);
    next = publishGuidedObservation(next, {
      id: `obs-guided-followup-${run.id}-${run.followUpOfferedAt}`,
      type: "guided.followup.offered",
      entityId: run.id,
      timestamp: run.followUpOfferedAt,
      payload: {
        routineName: routine?.name ?? run.routineId,
        currentStepId: run.currentStepId,
        message: "Still here when you are — resume whenever you’re ready.",
      },
      provenance: "system",
      privacy: "private",
    });
  }
  return next;
}

export function abandonGuidedRun(hub: GuidedHub, runId: string): GuidedEngineResult {
  const run = findRun(hub, runId);
  if (!run) return { error: "Run not found." };
  if (run.status === "completed") return { error: "Already completed — leave it." };
  const now = nowIso();
  return {
    ...hub,
    runs: hub.runs.map((r) =>
      r.id === runId ? { ...r, status: "abandoned" as const, updatedAt: now } : r,
    ),
  };
}

export function activeGuidedRuns(hub: GuidedHub): GuidedRun[] {
  return hub.runs.filter((r) => r.status === "active" || r.status === "paused" || r.status === "waiting");
}

export { isError as isGuidedEngineError };
