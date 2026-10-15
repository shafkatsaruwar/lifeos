import { newExecId, nowIso, publishExecutiveObservation } from "./hub";
import type {
  ExecutiveHub,
  ExecutiveRoutine,
  ExecutiveRun,
  ExecutiveTaskState,
  GuidanceMode,
  RoutineStep,
} from "./types";

export type EngineResult = ExecutiveHub | { error: string };

export function isEngineError(result: EngineResult): result is { error: string } {
  return typeof result === "object" && result !== null && "error" in result;
}

export function findRoutine(hub: ExecutiveHub, id: string) {
  return hub.routines.find((r) => r.id === id);
}

export function findRun(hub: ExecutiveHub, id: string) {
  return hub.runs.find((r) => r.id === id);
}

export function activeRuns(hub: ExecutiveHub): ExecutiveRun[] {
  return hub.runs.filter((r) =>
    ["scheduled", "pending", "acknowledged", "starting", "in_progress", "paused"].includes(r.state),
  );
}

function orderedSteps(routine: ExecutiveRoutine, run: ExecutiveRun): RoutineStep[] {
  const byId = new Map(routine.steps.map((s) => [s.id, s]));
  const out: RoutineStep[] = [];
  const seen = new Set<string>();
  for (const step of routine.steps) {
    if (seen.has(step.id)) continue;
    seen.add(step.id);
    out.push(step);
  }
  for (const id of run.insertedStepIds) {
    const step = byId.get(id);
    if (!step || seen.has(id)) continue;
    seen.add(id);
    out.push(step);
  }
  return out;
}

export function prerequisitesMet(step: RoutineStep, completed: Set<string>) {
  if (!step.requires?.length) return true;
  return step.requires.every((id) => completed.has(id));
}

export function resolveCurrentStep(routine: ExecutiveRoutine, run: ExecutiveRun) {
  if (!run.currentStepId) return null;
  return orderedSteps(routine, run).find((s) => s.id === run.currentStepId) ?? null;
}

export function nextEligibleStep(
  routine: ExecutiveRoutine,
  run: ExecutiveRun,
  fromId?: string | null,
): RoutineStep | null {
  const completed = new Set(run.completedStepIds);
  const steps = orderedSteps(routine, run);
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
  for (const step of steps) {
    if (completed.has(step.id)) continue;
    if (!prerequisitesMet(step, completed)) continue;
    return step;
  }
  return null;
}

function patchRun(hub: ExecutiveHub, runId: string, patch: Partial<ExecutiveRun>): ExecutiveHub {
  return {
    ...hub,
    runs: hub.runs.map((r) => (r.id === runId ? { ...r, ...patch, updatedAt: nowIso() } : r)),
  };
}

function normalizeAnswer(raw: string) {
  return raw.trim().toLowerCase();
}

/** Create a pending/scheduled commitment — does not start steps until acknowledged. */
export function scheduleOrPromptRun(
  hub: ExecutiveHub,
  routineId: string,
  opts?: { mode?: GuidanceMode; scheduledFor?: string; contextLabel?: string },
): EngineResult {
  if (!hub.prefs.proactiveEnabled && !opts?.mode) {
    // Still allow explicit starts; proactive gate is for auto-prompting elsewhere.
  }
  const routine = findRoutine(hub, routineId);
  if (!routine) return { error: "Routine not found." };

  const existing = activeRuns(hub).find((r) => r.routineId === routineId);
  if (existing) return hub;

  const now = nowIso();
  const mode =
    opts?.mode ??
    routine.defaultMode ??
    hub.prefs.defaultMode;

  const run: ExecutiveRun = {
    id: newExecId("run"),
    routineId,
    mode,
    state: opts?.scheduledFor && Date.parse(opts.scheduledFor) > Date.now() ? "scheduled" : "pending",
    currentStepId: null,
    completedStepIds: [],
    answers: {},
    insertedStepIds: [],
    scheduledFor: opts?.scheduledFor,
    originalIntendedAt: opts?.scheduledFor || now,
    createdAt: now,
    updatedAt: now,
    lastPromptAt: now,
    snoozeHistory: [],
    postponementCount: 0,
    contextLabel: opts?.contextLabel,
  };

  let next: ExecutiveHub = { ...hub, runs: [run, ...hub.runs].slice(0, 120) };
  next = publishExecutiveObservation(next, {
    id: `obs-ex-prompt-${run.id}`,
    type: "executive.run.prompted",
    entityId: run.id,
    timestamp: now,
    payload: { routineId, routineName: routine.name, mode, state: run.state },
  });
  return next;
}

/**
 * Acknowledge a pending prompt.
 * - start → beginning execution (starting → in_progress)
 * - snooze → real follow-up timestamp
 * - completed → only if user claims already done (whole routine)
 * - decline → skipped
 */
export function acknowledgeRun(
  hub: ExecutiveHub,
  runId: string,
  action: "start" | "snooze" | "already_completed" | "decline" | "reschedule",
  snoozeMinutes?: number,
): EngineResult {
  const run = findRun(hub, runId);
  if (!run) return { error: "Run not found." };
  if (["completed", "skipped", "expired"].includes(run.state)) {
    return { error: "This commitment is already closed." };
  }

  const routine = findRoutine(hub, run.routineId);
  if (!routine) return { error: "Routine missing." };
  const now = nowIso();

  if (action === "decline") {
    let next = patchRun(hub, runId, {
      state: "skipped",
      lastResponseAt: now,
      acknowledgedAt: now,
      nextFollowUpAt: undefined,
    });
    next = publishExecutiveObservation(next, {
      id: `obs-ex-skip-${runId}-${now}`,
      type: "executive.run.skipped",
      entityId: runId,
      payload: { routineName: routine.name },
      timestamp: now,
    });
    return next;
  }

  if (action === "already_completed") {
    let next = patchRun(hub, runId, {
      state: "completed",
      acknowledgedAt: now,
      startedAt: now,
      completedAt: now,
      lastResponseAt: now,
      currentStepId: null,
      completedStepIds: routine.steps.map((s) => s.id),
      nextFollowUpAt: undefined,
    });
    next = publishExecutiveObservation(next, {
      id: `obs-ex-done-${runId}`,
      type: "executive.run.completed",
      entityId: runId,
      timestamp: now,
      payload: { routineName: routine.name, via: "already_completed" },
    });
    return next;
  }

  if (action === "snooze" || action === "reschedule") {
    const minutes = Math.max(1, snoozeMinutes ?? hub.prefs.defaultSnoozeMinutes);
    const followUpAt = new Date(Date.now() + minutes * 60_000).toISOString();
    const postponementCount = run.postponementCount + 1;
    const hitLimit = postponementCount >= hub.prefs.snoozeLimit;

    let next = patchRun(hub, runId, {
      state: "pending",
      acknowledgedAt: now,
      lastResponseAt: now,
      nextFollowUpAt: followUpAt,
      postponementCount,
      snoozeHistory: [
        ...run.snoozeHistory,
        { at: now, minutes, followUpAt },
      ],
      // Keep originalIntendedAt — do not overwrite intention history
    });
    next = publishExecutiveObservation(next, {
      id: `obs-ex-snooze-${runId}-${now}`,
      type: "executive.run.snoozed",
      entityId: runId,
      timestamp: now,
      payload: {
        minutes,
        followUpAt,
        postponementCount,
        offerTransitionHelp: hitLimit,
        routineName: routine.name,
      },
    });
    return next;
  }

  // start
  const first = nextEligibleStep(routine, { ...run, completedStepIds: [] });
  if (!first) return { error: "No eligible steps." };

  let next = patchRun(hub, runId, {
    state: "in_progress",
    acknowledgedAt: now,
    startedAt: now,
    lastResponseAt: now,
    lastPromptAt: now,
    currentStepId: first.id,
    nextFollowUpAt: undefined,
  });
  next = publishExecutiveObservation(next, {
    id: `obs-ex-ack-${runId}-${now}`,
    type: "executive.run.acknowledged",
    entityId: runId,
    timestamp: now,
    payload: { action: "start" },
  });
  next = publishExecutiveObservation(next, {
    id: `obs-ex-start-${runId}`,
    type: "executive.run.started",
    entityId: runId,
    timestamp: now,
    payload: { routineName: routine.name, mode: run.mode },
  });
  return next;
}

/** Promote scheduled → pending when due; fire snooze follow-ups into pending+prompt. */
export function tickExecutiveSchedules(hub: ExecutiveHub, now: Date = new Date()): ExecutiveHub {
  if (!hub.prefs.followUpEnabled && !hub.prefs.proactiveEnabled) return hub;
  const nowMs = now.getTime();
  let next = hub;
  let changed = false;

  for (const run of hub.runs) {
    if (run.state === "scheduled" && run.scheduledFor) {
      const due = Date.parse(run.scheduledFor);
      if (!Number.isNaN(due) && due <= nowMs) {
        next = patchRun(next, run.id, { state: "pending", lastPromptAt: now.toISOString() });
        changed = true;
      }
    }
    if (
      (run.state === "pending" || run.state === "acknowledged" || run.state === "in_progress" || run.state === "paused") &&
      run.nextFollowUpAt
    ) {
      const due = Date.parse(run.nextFollowUpAt);
      if (!Number.isNaN(due) && due <= nowMs) {
        const routine = findRoutine(hub, run.routineId);
        next = patchRun(next, run.id, {
          state: run.state === "in_progress" || run.state === "paused" ? run.state : "pending",
          lastPromptAt: now.toISOString(),
          followUpOfferedAt: now.toISOString(),
          nextFollowUpAt: undefined,
        });
        next = publishExecutiveObservation(next, {
          id: `obs-ex-followup-${run.id}-${now.toISOString()}`,
          type: "executive.followup.offered",
          entityId: run.id,
          timestamp: now.toISOString(),
          payload: {
            routineName: routine?.name ?? run.routineId,
            message:
              run.state === "in_progress" || run.state === "paused"
                ? `${routine?.name ?? "Routine"} is still open. Have you finished?`
                : `You planned to start ${routine?.name ?? "this"} now.`,
            postponementCount: run.postponementCount,
            offerTransitionHelp: run.postponementCount >= hub.prefs.snoozeLimit,
          },
          provenance: "system",
        });
        changed = true;
      }
    }
  }
  return changed ? next : hub;
}

export function pauseRun(hub: ExecutiveHub, runId: string, reason?: string): EngineResult {
  const run = findRun(hub, runId);
  if (!run) return { error: "Run not found." };
  if (!["in_progress", "starting", "acknowledged"].includes(run.state)) {
    return { error: "Nothing in progress to pause." };
  }
  const now = nowIso();
  let next = patchRun(hub, runId, { state: "paused", pauseReason: reason || "paused", lastResponseAt: now });
  next = publishExecutiveObservation(next, {
    id: `obs-ex-pause-${runId}-${now}`,
    type: "executive.run.paused",
    entityId: runId,
    timestamp: now,
    payload: { currentStepId: run.currentStepId, reason: reason || "paused" },
  });
  return next;
}

export function resumeRun(hub: ExecutiveHub, runId: string): EngineResult {
  const run = findRun(hub, runId);
  if (!run) return { error: "Run not found." };
  if (!["paused", "pending", "acknowledged"].includes(run.state)) {
    if (run.state === "in_progress") return hub;
    return { error: "Cannot resume this run." };
  }
  const routine = findRoutine(hub, run.routineId);
  if (!routine) return { error: "Routine missing." };
  const now = nowIso();

  // If never started steps, treat as start
  if (!run.startedAt || !run.currentStepId) {
    return acknowledgeRun(hub, runId, "start");
  }

  let currentStepId: string | null = run.currentStepId;
  if (!currentStepId || run.completedStepIds.includes(currentStepId)) {
    currentStepId = nextEligibleStep(routine, run)?.id ?? null;
  }

  let next = patchRun(hub, runId, {
    state: currentStepId ? "in_progress" : "completed",
    currentStepId,
    lastPromptAt: now,
    lastResponseAt: now,
    pauseReason: undefined,
    completedAt: currentStepId ? undefined : now,
  });
  next = publishExecutiveObservation(next, {
    id: `obs-ex-resume-${runId}-${now}`,
    type: "executive.run.resumed",
    entityId: runId,
    timestamp: now,
    payload: { currentStepId },
  });
  return next;
}

/**
 * Confirm current step. Never completes the routine without finishing the path.
 * Start confirmation ≠ step completion ≠ routine completion.
 */
export function confirmStep(hub: ExecutiveHub, runId: string, answerRaw: string): EngineResult {
  const run = findRun(hub, runId);
  if (!run) return { error: "Run not found." };
  if (run.state === "paused") return { error: "Resume before confirming a step." };
  if (run.state !== "in_progress" && run.state !== "starting") {
    return { error: "Start the routine before confirming steps." };
  }

  const routine = findRoutine(hub, run.routineId);
  if (!routine) return { error: "Routine missing." };
  const step = resolveCurrentStep(routine, run);
  if (!step) return { error: "No current step." };

  const answer = normalizeAnswer(answerRaw);
  if (!answer) return { error: "Confirm with an answer before continuing." };

  const now = nowIso();
  const completed = new Set(run.completedStepIds);
  const answers = { ...run.answers, [step.id]: { value: answer, at: now } };
  const branch = step.branches?.find((b) => normalizeAnswer(b.when) === answer);
  const incomplete = answer === "no" || answer === "not yet" || answer === "incomplete";
  const stay = !branch && (step.stayUntilDone || run.mode === "transition") && incomplete;

  let nextCompleted = [...run.completedStepIds];
  let nextCurrent: string | null = run.currentStepId;
  let state: ExecutiveTaskState = "in_progress";
  let completedAt: string | undefined;

  if (stay) {
    nextCurrent = step.id;
  } else if (branch && incomplete && branch.nextStepId) {
    nextCurrent = branch.nextStepId;
  } else {
    if (!completed.has(step.id)) nextCompleted = [...nextCompleted, step.id];
    completed.add(step.id);

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
        const more = nextEligibleStep(routine, { ...run, completedStepIds: nextCompleted });
        if (more) nextCurrent = more.id;
        else {
          nextCurrent = null;
          state = "completed";
          completedAt = now;
        }
      } else if (branch.nextStepId) {
        const target = orderedSteps(routine, run).find((s) => s.id === branch.nextStepId);
        if (target && !completed.has(target.id)) nextCurrent = target.id;
        else {
          nextCurrent = nextEligibleStep(routine, { ...run, completedStepIds: nextCompleted })?.id ?? null;
          if (!nextCurrent) {
            state = "completed";
            completedAt = now;
          }
        }
      }
    } else {
      nextCurrent =
        nextEligibleStep(routine, { ...run, completedStepIds: nextCompleted, currentStepId: step.id }, step.id)
          ?.id ??
        nextEligibleStep(routine, { ...run, completedStepIds: nextCompleted })?.id ??
        null;
      if (!nextCurrent) {
        state = "completed";
        completedAt = now;
      }
    }
  }

  let next = patchRun(hub, runId, {
    state,
    currentStepId: nextCurrent,
    completedStepIds: nextCompleted,
    answers,
    lastResponseAt: now,
    lastPromptAt: nextCurrent ? now : run.lastPromptAt,
    completedAt: completedAt ?? run.completedAt,
    nextFollowUpAt: undefined,
  });

  next = publishExecutiveObservation(next, {
    id: `obs-ex-step-${runId}-${step.id}-${now}`,
    type: "executive.step.confirmed",
    entityId: runId,
    timestamp: now,
    payload: {
      stepId: step.id,
      stepTitle: step.title,
      answer,
      stayed: stay,
      nextStepId: nextCurrent,
      category: routine.category,
    },
  });

  if (state === "completed") {
    next = publishExecutiveObservation(next, {
      id: `obs-ex-done-${runId}`,
      type: "executive.run.completed",
      entityId: runId,
      timestamp: now,
      payload: {
        routineId: routine.id,
        routineName: routine.name,
        mode: run.mode,
        stepsCompleted: nextCompleted.length,
        category: routine.category,
      },
    });
  }

  return next;
}

/** Mid-run “still working” — schedules a real follow-up without completing. */
export function stillWorking(hub: ExecutiveHub, runId: string, minutes?: number): EngineResult {
  const run = findRun(hub, runId);
  if (!run) return { error: "Run not found." };
  if (run.state !== "in_progress" && run.state !== "paused") {
    return { error: "No active work to follow up on." };
  }
  const mins = Math.max(1, minutes ?? hub.prefs.defaultSnoozeMinutes);
  const followUpAt = new Date(Date.now() + mins * 60_000).toISOString();
  const now = nowIso();
  return patchRun(hub, runId, {
    state: "in_progress",
    nextFollowUpAt: followUpAt,
    lastResponseAt: now,
    snoozeHistory: [...run.snoozeHistory, { at: now, minutes: mins, followUpAt }],
  });
}

export function statusChecklist(routine: ExecutiveRoutine, run: ExecutiveRun) {
  return routine.steps
    .filter((s) => !s.id.includes("pending") && !s.id.includes("wait"))
    .map((s) => ({
      id: s.id,
      title: s.title,
      done: run.completedStepIds.includes(s.id),
      current: run.currentStepId === s.id,
    }));
}
