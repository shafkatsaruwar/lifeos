import {
  acknowledgeRun,
  confirmStep,
  pauseRun,
  resumeRun,
  scheduleOrPromptRun,
  stillWorking,
  tickExecutiveSchedules,
} from "../lib/executive/engine";
import { buildDailyBriefing } from "../lib/executive/briefing";
import { emptyExecutiveHub, executiveObservationsToKernel, normalizeExecutiveHub } from "../lib/executive/hub";
import { computePrayerTimes, nextPrayer } from "../lib/executive/salah";

describe("executive function engine", () => {
  it("seeds retainer and salah routines", () => {
    const hub = emptyExecutiveHub();
    expect(hub.routines.some((r) => r.id === "builtin-nightly-retainer")).toBe(true);
    expect(hub.routines.some((r) => r.category === "salah")).toBe(true);
    expect(hub.prefs.defaultMode).toBe("executive");
  });

  it("closed loop: pending → start ≠ complete → step confirm → complete", () => {
    let hub = emptyExecutiveHub();
    hub = scheduleOrPromptRun(hub, "builtin-nightly-retainer") as typeof hub;
    const runId = hub.runs[0].id;
    expect(hub.runs[0].state).toBe("pending");
    expect(hub.runs[0].completedAt).toBeUndefined();

    hub = acknowledgeRun(hub, runId, "start") as typeof hub;
    expect(hub.runs[0].state).toBe("in_progress");
    expect(hub.runs[0].startedAt).toBeTruthy();
    expect(hub.runs[0].completedAt).toBeUndefined();
    expect(hub.runs[0].currentStepId).toBe("retainer-eaten");

    hub = confirmStep(hub, runId, "yes") as typeof hub;
    expect(hub.runs[0].currentStepId).toBe("retainer-brushed");
    expect(hub.runs[0].state).toBe("in_progress");
  });

  it("snooze creates a real follow-up timestamp and tick promotes it", () => {
    let hub = emptyExecutiveHub();
    hub = scheduleOrPromptRun(hub, "builtin-nightly-retainer") as typeof hub;
    const runId = hub.runs[0].id;
    hub = acknowledgeRun(hub, runId, "snooze", 5) as typeof hub;
    expect(hub.runs[0].nextFollowUpAt).toBeTruthy();
    expect(hub.runs[0].postponementCount).toBe(1);
    expect(hub.runs[0].state).toBe("pending");
    expect(hub.runs[0].completedAt).toBeUndefined();

    const due = new Date(Date.parse(hub.runs[0].nextFollowUpAt!) + 1000);
    hub = tickExecutiveSchedules(hub, due);
    expect(hub.runs[0].followUpOfferedAt).toBeTruthy();
    expect(hub.runs[0].nextFollowUpAt).toBeUndefined();
    expect(hub.observations.some((o) => o.type === "executive.followup.offered")).toBe(true);
  });

  it("dismiss never completes; already_completed requires explicit action", () => {
    let hub = emptyExecutiveHub();
    hub = scheduleOrPromptRun(hub, "builtin-job-app-push") as typeof hub;
    const runId = hub.runs[0].id;
    hub = acknowledgeRun(hub, runId, "decline") as typeof hub;
    expect(hub.runs[0].state).toBe("skipped");
    expect(hub.runs[0].completedAt).toBeUndefined();

    hub = emptyExecutiveHub();
    hub = scheduleOrPromptRun(hub, "builtin-job-app-push") as typeof hub;
    hub = acknowledgeRun(hub, hub.runs[0].id, "already_completed") as typeof hub;
    expect(hub.runs[0].state).toBe("completed");
    expect(hub.runs[0].completedAt).toBeTruthy();
  });

  it("retainer prerequisites: no eating → wait → continue", () => {
    let hub = emptyExecutiveHub();
    hub = scheduleOrPromptRun(hub, "builtin-nightly-retainer") as typeof hub;
    hub = acknowledgeRun(hub, hub.runs[0].id, "start") as typeof hub;
    const runId = hub.runs[0].id;
    hub = confirmStep(hub, runId, "no") as typeof hub;
    expect(hub.runs[0].currentStepId).toBe("retainer-wait-food");
    expect(hub.runs[0].completedStepIds).toEqual([]);
    hub = confirmStep(hub, runId, "done") as typeof hub;
    expect(hub.runs[0].completedStepIds).toEqual(
      expect.arrayContaining(["retainer-wait-food", "retainer-eaten"]),
    );
    expect(hub.runs[0].currentStepId).toBe("retainer-brushed");
  });

  it("pause/resume preserves step; stillWorking schedules follow-up without completing", () => {
    let hub = emptyExecutiveHub();
    hub = scheduleOrPromptRun(hub, "builtin-job-app-push") as typeof hub;
    hub = acknowledgeRun(hub, hub.runs[0].id, "start") as typeof hub;
    const runId = hub.runs[0].id;
    hub = confirmStep(hub, runId, "done") as typeof hub;
    hub = pauseRun(hub, runId) as typeof hub;
    expect(hub.runs[0].state).toBe("paused");
    hub = resumeRun(hub, runId) as typeof hub;
    expect(hub.runs[0].state).toBe("in_progress");
    hub = stillWorking(hub, runId, 5) as typeof hub;
    expect(hub.runs[0].nextFollowUpAt).toBeTruthy();
    expect(hub.runs[0].completedAt).toBeUndefined();
  });

  it("computes deterministic prayer times and next prayer", () => {
    const date = new Date("2026-06-15T12:00:00");
    const times = computePrayerTimes(date, 40.7128, -74.006, "ISNA", "Standard", -4);
    expect(times.fajr.getTime()).toBeLessThan(times.dhuhr.getTime());
    expect(times.dhuhr.getTime()).toBeLessThan(times.asr.getTime());
    expect(times.asr.getTime()).toBeLessThan(times.maghrib.getTime());
    expect(times.maghrib.getTime()).toBeLessThan(times.isha.getTime());

    const hub = emptyExecutiveHub();
    hub.prefs.salah = {
      ...hub.prefs.salah,
      enabled: true,
      latitude: 40.7128,
      longitude: -74.006,
      method: "ISNA",
      asr: "Standard",
    };
    const next = nextPrayer(hub.prefs.salah, new Date("2026-06-15T08:00:00-04:00"));
    expect(next?.id).toBeTruthy();
  });

  it("maps observations to Personal Context and respects salah privacy lock", () => {
    let hub = emptyExecutiveHub();
    hub.prefs.salah.privacyLocked = true;
    hub = scheduleOrPromptRun(hub, "builtin-salah-generic") as typeof hub;
    hub = acknowledgeRun(hub, hub.runs[0].id, "start") as typeof hub;
    hub = confirmStep(hub, hub.runs[0].id, "yes") as typeof hub;
    const kernel = executiveObservationsToKernel(hub);
    // Step confirmations on salah category should be filtered when privacyLocked
    expect(kernel.every((o) => o.metadata.category !== "salah")).toBe(true);
  });

  it("builds a concise daily briefing", () => {
    let hub = emptyExecutiveHub();
    hub = scheduleOrPromptRun(hub, "builtin-nightly-retainer") as typeof hub;
    const briefing = buildDailyBriefing(hub, { openPriorityCount: 2 });
    expect(briefing.summary).toMatch(/priorit/i);
    expect(briefing.items.length).toBeGreaterThan(0);
  });

  it("migrates legacy guided hubs", () => {
    const hub = normalizeExecutiveHub({
      version: 1,
      routines: [],
      runs: [
        {
          id: "r1",
          routineId: "builtin-nightly-retainer",
          mode: "unfreeze",
          status: "active",
          currentStepId: "retainer-eaten",
          completedStepIds: [],
          answers: {},
          insertedStepIds: [],
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      observations: [],
      settings: { defaultMode: "guided", followUpAfterHours: 2 },
    });
    expect(hub.version).toBe(2);
    expect(hub.runs[0].mode).toBe("transition");
    expect(hub.runs[0].state).toBe("in_progress");
  });
});
