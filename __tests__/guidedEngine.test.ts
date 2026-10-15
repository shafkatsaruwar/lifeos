import {
  confirmGuidedStep,
  offerIdleFollowUps,
  pauseGuidedRun,
  resumeGuidedRun,
  startGuidedRun,
} from "../lib/guidedEngine";
import { emptyGuidedHub, guidedObservationsToKernel, normalizeGuidedHub } from "../lib/guidedHelpers";

describe("guided engine", () => {
  it("seeds built-in routines including nightly retainers", () => {
    const hub = emptyGuidedHub();
    expect(hub.routines.some((r) => r.id === "builtin-nightly-retainer")).toBe(true);
    expect(hub.settings.defaultMode).toBe("guided");
  });

  it("never completes a run without step confirmation", () => {
    let hub = emptyGuidedHub();
    const started = startGuidedRun(hub, "builtin-nightly-retainer", "unfreeze");
    expect("error" in started).toBe(false);
    if ("error" in started) return;
    hub = started;
    const run = hub.runs[0];
    expect(run.status).toBe("active");
    expect(run.completedAt).toBeUndefined();
    expect(run.completedStepIds).toEqual([]);
  });

  it("guides through retainer prerequisites on no → remediation → continue", () => {
    let hub = emptyGuidedHub();
    hub = startGuidedRun(hub, "builtin-nightly-retainer", "unfreeze") as typeof hub;
    const runId = hub.runs[0].id;

    // Not finished eating → remediation step
    hub = confirmGuidedStep(hub, runId, "no") as typeof hub;
    expect(hub.runs[0].currentStepId).toBe("retainer-finish-eating");
    expect(hub.runs[0].completedStepIds).toEqual([]);

    // Finish eating → marks parent + remediation, advances to brushed
    hub = confirmGuidedStep(hub, runId, "done") as typeof hub;
    expect(hub.runs[0].completedStepIds).toEqual(
      expect.arrayContaining(["retainer-finish-eating", "retainer-eaten"]),
    );
    expect(hub.runs[0].currentStepId).toBe("retainer-brushed");
  });

  it("pause preserves progress and resume restores current step", () => {
    let hub = emptyGuidedHub();
    hub = startGuidedRun(hub, "builtin-kitchen-reset", "unfreeze") as typeof hub;
    const runId = hub.runs[0].id;
    hub = confirmGuidedStep(hub, runId, "done") as typeof hub;
    expect(hub.runs[0].currentStepId).toBe("kit-counters");

    hub = pauseGuidedRun(hub, runId, "interrupted") as typeof hub;
    expect(hub.runs[0].status).toBe("paused");
    expect(hub.runs[0].completedStepIds).toContain("kit-dishes");

    hub = resumeGuidedRun(hub, runId) as typeof hub;
    expect(hub.runs[0].status).toBe("active");
    expect(hub.runs[0].currentStepId).toBe("kit-counters");
  });

  it("unfreeze stays on step when answering not yet without a branch", () => {
    let hub = emptyGuidedHub();
    hub = startGuidedRun(hub, "builtin-kitchen-reset", "unfreeze") as typeof hub;
    const runId = hub.runs[0].id;
    hub = confirmGuidedStep(hub, runId, "not yet") as typeof hub;
    expect(hub.runs[0].currentStepId).toBe("kit-dishes");
    expect(hub.runs[0].completedStepIds).toEqual([]);
  });

  it("offers idle follow-up without marking complete", () => {
    let hub = emptyGuidedHub();
    hub = startGuidedRun(hub, "builtin-morning-desk", "guided") as typeof hub;
    const run = hub.runs[0];
    hub = {
      ...hub,
      settings: { ...hub.settings, followUpAfterHours: 1 },
      runs: [
        {
          ...run,
          lastResponseAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          lastPromptAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        },
      ],
    };
    hub = offerIdleFollowUps(hub, new Date());
    expect(hub.runs[0].status).toBe("waiting");
    expect(hub.runs[0].followUpOfferedAt).toBeTruthy();
    expect(hub.runs[0].completedAt).toBeUndefined();
    expect(hub.observations.some((o) => o.type === "guided.followup.offered")).toBe(true);
  });

  it("maps observations into Personal Context kernel shape", () => {
    let hub = emptyGuidedHub();
    hub = startGuidedRun(hub, "builtin-job-app-push", "independent") as typeof hub;
    const kernel = guidedObservationsToKernel(hub);
    expect(kernel[0].module).toBe("Guided");
    expect(kernel[0].fact).toMatch(/Started guided routine/i);
  });

  it("normalizeGuidedHub keeps built-ins even if cloud omits them", () => {
    const hub = normalizeGuidedHub({ version: 1, routines: [], runs: [], observations: [] });
    expect(hub.routines.length).toBeGreaterThanOrEqual(4);
  });
});
