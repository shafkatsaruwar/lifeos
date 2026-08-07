import {
  emptyStudyAbroadHub,
  type StudyAbroadHub,
} from "@/lib/studyAbroadTypes";
import {
  applicationReadiness,
  appendHistory,
  buildStudyAbroadCopilotContext,
  createDocumentVariant,
  daysUntil,
  linkFundingToProgram,
  normalizeStudyAbroadHub,
  requirementReadiness,
  upcomingStudyAbroadItems,
  whatMattersNow,
} from "@/lib/studyAbroadHelpers";

describe("studyAbroadHelpers", () => {
  it("returns add-country guidance when the hub is empty", () => {
    const insight = whatMattersNow(emptyStudyAbroadHub);
    expect(insight.actionView).toBe("create-country");
  });

  it("computes requirement readiness from real requirement rows", () => {
    const result = requirementReadiness([
      { id: "1", title: "CV", status: "ready", createdAt: "", updatedAt: "" },
      { id: "2", title: "SOP", status: "draft", createdAt: "", updatedAt: "" },
      { id: "3", title: "Portfolio", status: "missing", createdAt: "", updatedAt: "" },
      { id: "4", title: "Fee", status: "waived", createdAt: "", updatedAt: "" },
    ]);
    expect(result.percent).toBe(50);
    expect(result.missing).toHaveLength(2);
  });

  it("normalizes legacy scholarship collections into funding", () => {
    const hub = normalizeStudyAbroadHub({
      universities: [],
      programs: [],
      scholarships: [{ id: "s1", name: "DAAD", status: "eligible", coverageType: "partial_tuition" }],
    }) as StudyAbroadHub;
    expect(hub.funding).toHaveLength(1);
    expect(hub.funding[0].name).toBe("DAAD");
    expect(hub.funding[0].status).toBe("eligible");
  });

  it("application readiness falls back safely for unknown ids", () => {
    expect(applicationReadiness(emptyStudyAbroadHub, "missing").percent).toBe(0);
  });

  it("daysUntil handles date-only strings", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const key = tomorrow.toISOString().slice(0, 10);
    expect(daysUntil(key)).toBeGreaterThanOrEqual(1);
  });

  it("appendHistory prepends and caps activity", () => {
    const hub = appendHistory(emptyStudyAbroadHub, "Linked funding", "DAAD", "program", "p1");
    expect(hub.history[0].title).toBe("Linked funding");
    expect(hub.history[0].contextId).toBe("p1");
  });

  it("buildStudyAbroadCopilotContext summarizes what matters", () => {
    const ctx = buildStudyAbroadCopilotContext(emptyStudyAbroadHub);
    expect(ctx.whatMattersNow.actionView).toBe("create-country");
    expect(ctx.counts.programs).toBe(0);
  });

  it("createDocumentVariant clones SOP/CV bases", () => {
    const stamp = new Date().toISOString();
    const baseHub: StudyAbroadHub = {
      ...emptyStudyAbroadHub,
      documents: [{
        id: "doc-1",
        name: "Master SOP",
        category: "SOP",
        status: "ready",
        createdAt: stamp,
        updatedAt: stamp,
      }],
    };
    const next = createDocumentVariant(baseHub, "doc-1", "TU Munich");
    expect(next.documents).toHaveLength(2);
    expect(next.documents[1].variantOf).toBe("doc-1");
    expect(next.documents[1].variantLabel).toBe("TU Munich");
    expect(next.documents[1].status).toBe("draft");
  });

  it("linkFundingToProgram is idempotent", () => {
    const stamp = new Date().toISOString();
    const hub: StudyAbroadHub = {
      ...emptyStudyAbroadHub,
      programs: [{ id: "p1", universityId: "u1", name: "MSc", status: "shortlisted", createdAt: stamp, updatedAt: stamp }],
      funding: [{ id: "f1", name: "DAAD", kind: "scholarship", status: "eligible", createdAt: stamp, updatedAt: stamp }],
    };
    const once = linkFundingToProgram(hub, "p1", "f1");
    const twice = linkFundingToProgram(once, "p1", "f1");
    expect(once.programFunding).toHaveLength(1);
    expect(twice.programFunding).toHaveLength(1);
  });

  it("upcomingStudyAbroadItems merges program deadlines and timeline", () => {
    const stamp = new Date().toISOString();
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const key = soon.toISOString().slice(0, 10);
    const hub: StudyAbroadHub = {
      ...emptyStudyAbroadHub,
      programs: [{
        id: "p1",
        universityId: "u1",
        name: "MSc UX",
        status: "shortlisted",
        deadline: key,
        createdAt: stamp,
        updatedAt: stamp,
      }],
      timelineEvents: [{
        id: "tl1",
        title: "Visa appointment",
        date: key,
        kind: "visa_appointment",
        createdAt: stamp,
      }],
    };
    const items = upcomingStudyAbroadItems(hub, 5);
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.every((item) => item.days >= 0)).toBe(true);
  });
});
