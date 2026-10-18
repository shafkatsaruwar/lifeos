import {
  computeActivityRings,
  countTasksCompletedInRange,
  DEFAULT_ACTIVITY_RINGS_GOALS,
  normalizeActivityRingsGoals,
  sumFocusMinutesInRange,
  weekRangeContaining,
} from "../lib/activityRings";

describe("activityRings", () => {
  it("normalizes goals with safe clamps", () => {
    expect(normalizeActivityRingsGoals(null)).toEqual(DEFAULT_ACTIVITY_RINGS_GOALS);
    expect(normalizeActivityRingsGoals({ period: "weekly", tasksTarget: 0, focusMinutesTarget: 99999 })).toEqual({
      period: "weekly",
      tasksTarget: 1,
      focusMinutesTarget: 1200,
    });
  });

  it("counts completed tasks only via completedAt in range", () => {
    const tasks = [
      { done: true, completedAt: "2026-10-18T12:00:00.000Z" },
      { done: true }, // no timestamp — ignored
      { done: true, completedAt: "2026-10-17T12:00:00.000Z" },
      { canceled: true, done: true, completedAt: "2026-10-18T12:00:00.000Z" },
    ];
    expect(countTasksCompletedInRange(tasks, "2026-10-18", "2026-10-18")).toBe(1);
  });

  it("sums focus minutes only when session touched the range", () => {
    const tasks = [
      {
        focusMinutes: 45,
        focusRemainingSeconds: 15 * 60,
        focusSessionStarted: true,
        focusUpdatedAt: "2026-10-18T15:00:00.000Z",
      },
      {
        focusMinutes: 30,
        focusRemainingSeconds: 0,
        focusSessionStarted: true,
        focusUpdatedAt: "2026-10-10T15:00:00.000Z",
      },
      {
        focusMinutes: 25,
        focusRemainingSeconds: 25 * 60,
        focusSessionStarted: false,
      },
    ];
    expect(sumFocusMinutesInRange(tasks, "2026-10-18", "2026-10-18")).toBe(30);
  });

  it("builds daily snapshot with empty rings when no activity", () => {
    const snap = computeActivityRings({
      tasks: [],
      goals: { period: "daily", tasksTarget: 3, focusMinutesTarget: 90 },
      now: new Date(2026, 9, 18, 12, 0, 0),
    });
    expect(snap.period).toBe("daily");
    expect(snap.rangeStart).toBe("2026-10-18");
    expect(snap.rings).toHaveLength(2);
    expect(snap.rings.every((r) => r.empty && r.percent === 0)).toBe(true);
    expect(snap.rings[0].explanation).toMatch(/completion timestamps/i);
  });

  it("computes weekly range Monday-start", () => {
    const range = weekRangeContaining("2026-10-18", true); // Sunday
    expect(range.start).toBe("2026-10-12");
    expect(range.end).toBe("2026-10-18");
  });

  it("never invents a commitments ring", () => {
    const snap = computeActivityRings({ tasks: [], now: new Date(2026, 9, 18) });
    expect(snap.rings.map((r) => r.id)).toEqual(["tasks", "focus"]);
  });
});
