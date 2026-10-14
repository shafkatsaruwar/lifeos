import {
  companyName,
  computeCareerAnalytics,
  createApplication,
  createInterview,
  createTask,
  dashboardMetrics,
  deleteApplication,
  exportApplicationsCsv,
  importApplications,
  moveApplicationStage,
  normalizeCareerHub,
  parseApplicationsCsv,
  publishCareerObservation,
  careerObservationsToKernel,
} from "../lib/careerHelpers";
import { emptyCareerHub } from "../lib/careerTypes";

describe("career / Job Seeker OS", () => {
  it("creates an application with only title and company", () => {
    const hub = emptyCareerHub();
    const next = createApplication(hub, { jobTitle: "Engineer", companyName: "Acme" });
    expect("error" in next).toBe(false);
    if ("error" in next) return;
    expect(next.applications).toHaveLength(1);
    expect(next.companies).toHaveLength(1);
    expect(next.companies[0].name).toBe("Acme");
    expect(next.applications[0].stageId).toBe("saved");
    expect(next.stageHistory).toHaveLength(1);
    expect(next.observations.some((o) => o.type === "career.application.created")).toBe(true);
  });

  it("reuses companies by name and moves stages with history", () => {
    let hub = emptyCareerHub();
    const first = createApplication(hub, { jobTitle: "A", companyName: "Acme" });
    if ("error" in first) throw new Error(first.error);
    hub = first;
    const second = createApplication(hub, { jobTitle: "B", companyName: "acme" });
    if ("error" in second) throw new Error(second.error);
    hub = second;
    expect(hub.companies).toHaveLength(1);

    const targetId = hub.applications.find((a) => a.jobTitle === "A")!.id;
    const moved = moveApplicationStage(hub, targetId, "technical");
    if ("error" in moved) throw new Error(moved.error);
    const app = moved.applications.find((a) => a.id === targetId)!;
    expect(app.stageId).toBe("technical");
    expect(moved.stageHistory[0].previousStageId).toBe("saved");
    expect(moved.stageHistory[0].newStageId).toBe("technical");
  });

  it("computes dashboard metrics and analytics from real data", () => {
    let hub = emptyCareerHub();
    const created = createApplication(hub, {
      jobTitle: "PM",
      companyName: "Globex",
      appliedAt: "2026-01-10",
      stageId: "applied",
      source: "Referral",
    });
    if ("error" in created) throw new Error(created.error);
    hub = created;
    const moved = moveApplicationStage(hub, hub.applications[0].id, "offer");
    if ("error" in moved) throw new Error(moved.error);
    hub = moved;

    const metrics = dashboardMetrics(hub);
    expect(metrics.total).toBe(1);
    expect(metrics.offers).toBe(1);

    const analytics = computeCareerAnalytics(hub);
    expect(analytics.submittedCount).toBe(1);
    expect(analytics.offerConversionRate).toBe(1);
    expect(analytics.bySource[0].source).toBe("Referral");
  });

  it("schedules interviews and follow-ups with observations", () => {
    let hub = emptyCareerHub();
    const created = createApplication(hub, { jobTitle: "Designer", companyName: "Initech" });
    if ("error" in created) throw new Error(created.error);
    hub = created;
    const appId = hub.applications[0].id;
    const interview = createInterview(hub, {
      applicationId: appId,
      title: "Portfolio review",
      startsAt: "2026-10-20T15:00:00.000Z",
    });
    if ("error" in interview) throw new Error(interview.error);
    hub = interview;
    expect(hub.interviews).toHaveLength(1);

    const task = createTask(hub, { title: "Send thank you", applicationId: appId, dueAt: "2026-10-21" });
    if ("error" in task) throw new Error(task.error);
    hub = task;
    expect(hub.tasks).toHaveLength(1);
    expect(hub.observations.some((o) => o.type === "career.interview.scheduled")).toBe(true);
    expect(hub.observations.some((o) => o.type === "career.followup.due")).toBe(true);

    const kernel = careerObservationsToKernel(hub);
    expect(kernel[0].module).toBe("Career");
  });

  it("exports and imports CSV without inventing rows", () => {
    let hub = emptyCareerHub();
    const created = createApplication(hub, { jobTitle: "Analyst", companyName: "Soylent" });
    if ("error" in created) throw new Error(created.error);
    hub = created;
    const csv = exportApplicationsCsv(hub);
    expect(csv).toContain("Analyst");
    expect(csv).toContain("Soylent");

    const parsed = parseApplicationsCsv(`job_title,company,stage\nOps Lead,Umbrella,applied\n`);
    expect(parsed.rows).toHaveLength(1);
    const imported = importApplications(emptyCareerHub(), parsed.rows);
    expect(imported.imported).toBe(1);
    expect(companyName(imported.hub, imported.hub.applications[0].companyId)).toBe("Umbrella");
  });

  it("deletes applications and normalizes empty payloads", () => {
    let hub = emptyCareerHub();
    const created = createApplication(hub, { jobTitle: "X", companyName: "Y" });
    if ("error" in created) throw new Error(created.error);
    hub = deleteApplication(created, created.applications[0].id);
    expect(hub.applications).toHaveLength(0);
    expect(normalizeCareerHub(null).version).toBe(1);
  });

  it("keeps observation publish idempotent", () => {
    let hub = emptyCareerHub();
    hub = publishCareerObservation(hub, {
      id: "same-id",
      type: "career.application.created",
      entityId: "app-1",
      timestamp: "2026-01-01T00:00:00.000Z",
      payload: { jobTitle: "A" },
    });
    hub = publishCareerObservation(hub, {
      id: "same-id",
      type: "career.application.created",
      entityId: "app-1",
      timestamp: "2026-01-01T00:00:00.000Z",
      payload: { jobTitle: "A" },
    });
    expect(hub.observations).toHaveLength(1);
  });
});
