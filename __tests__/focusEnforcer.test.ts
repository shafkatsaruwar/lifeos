import {
  computeFocusEnforcerMetrics,
  escalationFireTimes,
  isOnTimeStart,
  type FocusEnforcerSession,
} from "@/lib/focusEnforcer";

describe("Focus Enforcer timing", () => {
  it("escalationFireTimes uses absolute offsets [5,10,15] from start (not cumulative gaps)", () => {
    const start = new Date(2026, 7, 23, 15, 0, 0, 0); // 3:00 PM local
    const fires = escalationFireTimes(start, [5, 10, 15]);
    expect(fires).toHaveLength(3);
    expect(fires[0].getHours()).toBe(15);
    expect(fires[0].getMinutes()).toBe(5);
    expect(fires[1].getHours()).toBe(15);
    expect(fires[1].getMinutes()).toBe(10);
    expect(fires[2].getHours()).toBe(15);
    expect(fires[2].getMinutes()).toBe(15);
    // NOT 15:05, 15:15, 15:30 (cumulative)
    expect(fires[1].getMinutes()).not.toBe(15);
    expect(fires[2].getMinutes()).not.toBe(30);
  });

  it("isOnTimeStart uses a 2-minute threshold", () => {
    expect(isOnTimeStart(0)).toBe(true);
    expect(isOnTimeStart(2)).toBe(true);
    expect(isOnTimeStart(3)).toBe(false);
    expect(isOnTimeStart(undefined)).toBe(false);
  });
});

describe("Focus Enforcer metrics", () => {
  const baseIso = "2026-08-20T15:00:00.000Z";

  function session(
    overrides: Partial<FocusEnforcerSession> & Pick<FocusEnforcerSession, "id">,
  ): FocusEnforcerSession {
    return {
      taskId: 1,
      taskTitle: "Apply to 3 jobs",
      scheduledStartAt: baseIso,
      expectedDurationMin: 60,
      proofRequired: true,
      status: "completed",
      escalationLevel: null,
      checks: [],
      createdAt: baseIso,
      updatedAt: baseIso,
      ...overrides,
    };
  }

  it("onTimePlannedPercent: 10 planned, 5 on-time, 2 late, 3 never started => 50%", () => {
    const sessions: FocusEnforcerSession[] = [
      ...[1, 2, 3, 4, 5].map((id) =>
        session({
          id: `on_${id}`,
          actualStartAt: baseIso,
          startDelayMin: 1,
          status: "completed",
        }),
      ),
      ...[6, 7].map((id) =>
        session({
          id: `late_${id}`,
          actualStartAt: baseIso,
          startDelayMin: 10,
          status: "completed",
        }),
      ),
      ...[8, 9, 10].map((id) =>
        session({
          id: `never_${id}`,
          status: "abandoned",
          // no actualStartAt / startDelayMin
        }),
      ),
    ];

    const metrics = computeFocusEnforcerMetrics(sessions, 30, new Date("2026-08-23T12:00:00.000Z"));
    expect(metrics.planned).toBe(10);
    expect(metrics.started).toBe(7);
    expect(metrics.onTimePlannedPercent).toBe(50);
  });

  it("onTimeAmongStartedPercent for same set => ~71%", () => {
    const sessions: FocusEnforcerSession[] = [
      ...[1, 2, 3, 4, 5].map((id) =>
        session({
          id: `on_${id}`,
          actualStartAt: baseIso,
          startDelayMin: 1,
          status: "completed",
        }),
      ),
      ...[6, 7].map((id) =>
        session({
          id: `late_${id}`,
          actualStartAt: baseIso,
          startDelayMin: 10,
          status: "completed",
        }),
      ),
      ...[8, 9, 10].map((id) =>
        session({
          id: `never_${id}`,
          status: "abandoned",
        }),
      ),
    ];

    const metrics = computeFocusEnforcerMetrics(sessions, 30, new Date("2026-08-23T12:00:00.000Z"));
    // 5 of 7 started ≈ 71.428 → round 71
    expect(metrics.onTimeAmongStartedPercent).toBe(71);
  });
});
