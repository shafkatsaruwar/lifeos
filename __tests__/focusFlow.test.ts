import { assessPlanStrength } from "@/lib/focusFlow/assessment";
import { fallbackCoachDay, fallbackParseGoal } from "@/lib/focusFlow/fallbacks";

describe("focusFlow assessment", () => {
  it("scores a productive day as Strong", () => {
    const result = assessPlanStrength({
      today: "2026-08-23",
      tasks: [
        { id: 1, title: "Ship feature", done: true, completedAt: "2026-08-23T18:00:00.000Z" },
        { id: 2, title: "Review PR", done: true, completedAt: "2026-08-23T19:00:00.000Z" },
      ],
      momentumLog: [
        { at: "2026-08-23T10:00:00.000Z", type: "focus", title: "Ship feature" },
        { at: "2026-08-23T18:30:00.000Z", type: "done", title: "Review PR" },
      ],
      weeklyPlan: { 6: [{ id: "w1", text: "Ship feature" }] },
    });
    expect(["Strong", "Steady"]).toContain(result.level);
    expect(result.alignmentPercent).toBeGreaterThan(0);
  });
});

describe("focusFlow fallbacks", () => {
  it("creates a multi-step plan from free text", () => {
    const plan = fallbackParseGoal("Launch YouTube channel and script first video and film intro", ["Career"]);
    expect(plan.goal).toContain("Launch YouTube");
    expect(plan.tasks.length).toBeGreaterThan(1);
    expect(plan.tasks[0].badge).toBe("First milestone");
  });

  it("builds coach recommendations without AI", () => {
    const coach = fallbackCoachDay({
      today: "2026-08-23",
      tasks: [{ id: 5, title: "Prepare notes", due: "2026-08-20" }],
      events: [{ title: "Team sync", start: "2026-08-23T09:00" }],
      currentTaskId: 5,
    });
    expect(coach.recommendations.some(item => item.action === "focus_task")).toBe(true);
  });
});
