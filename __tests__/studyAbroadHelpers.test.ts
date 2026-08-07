import {
  emptyStudyAbroadHub,
  type StudyAbroadHub,
} from "@/lib/studyAbroadTypes";
import {
  applicationReadiness,
  daysUntil,
  normalizeStudyAbroadHub,
  requirementReadiness,
  whatMattersNow,
} from "@/lib/studyAbroadHelpers";

describe("studyAbroadHelpers", () => {
  it("returns explore guidance when the hub is empty", () => {
    const insight = whatMattersNow(emptyStudyAbroadHub);
    expect(insight.actionView).toBe("explore");
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
});
