import { captureAddWorkTask, emptyWorkHub } from "@/app/components/OSDashboards";

describe("captureAddWorkTask", () => {
  it("creates project, deliverable, and task when Work OS is empty", () => {
    const next = captureAddWorkTask(emptyWorkHub, "Get Work hours from Conlon", new Date("2026-08-31T12:00:00Z"));
    expect(next.projects).toHaveLength(1);
    expect(next.deliverables).toHaveLength(1);
    expect(next.tasks).toHaveLength(1);
    expect(next.tasks[0].title).toBe("Get Work hours from Conlon");
  });

  it("appends to an existing deliverable when one exists", () => {
    const seeded = captureAddWorkTask(emptyWorkHub, "First task", new Date("2026-08-31T12:00:00Z"));
    const next = captureAddWorkTask(seeded, "Second task", new Date("2026-08-31T12:01:00Z"));
    expect(next.projects).toHaveLength(1);
    expect(next.deliverables).toHaveLength(1);
    expect(next.tasks).toHaveLength(2);
  });
});
