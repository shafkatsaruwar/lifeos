import {
  computeFocusEnforcerMetrics,
  escalationFireTimes,
  focusEnforcerRepeatLabel,
  isOnTimeStart,
  nextFocusEnforcerStart,
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

describe("Focus Enforcer recurrence", () => {
  it("labels repeat options", () => {
    expect(focusEnforcerRepeatLabel("never")).toBe("Does not repeat");
    expect(focusEnforcerRepeatLabel("daily")).toBe("Every day");
    expect(focusEnforcerRepeatLabel("weekdays")).toBe("Weekdays (Mon–Fri)");
    expect(focusEnforcerRepeatLabel("weekly")).toBe("Every week");
  });

  it("never returns null", () => {
    expect(nextFocusEnforcerStart("2026-10-06T23:55:00", "never")).toBeNull();
  });

  it("daily advances one calendar day at the same clock time", () => {
    const start = new Date(2026, 9, 6, 23, 55, 0); // Oct 6 local
    const now = new Date(2026, 9, 6, 12, 0, 0);
    const next = nextFocusEnforcerStart(start, "daily", now);
    expect(next).not.toBeNull();
    expect(next!.getFullYear()).toBe(2026);
    expect(next!.getMonth()).toBe(9);
    expect(next!.getDate()).toBe(7);
    expect(next!.getHours()).toBe(23);
    expect(next!.getMinutes()).toBe(55);
  });

  it("weekly advances seven days", () => {
    const start = new Date(2026, 9, 6, 23, 55, 0); // Tuesday
    const now = new Date(2026, 9, 6, 12, 0, 0);
    const next = nextFocusEnforcerStart(start, "weekly", now);
    expect(next!.getDate()).toBe(13);
    expect(next!.getDay()).toBe(start.getDay());
  });

  it("weekdays skips Saturday and Sunday", () => {
    const friday = new Date(2026, 9, 9, 11, 0, 0); // Fri Oct 9
    const now = new Date(2026, 9, 9, 8, 0, 0);
    const next = nextFocusEnforcerStart(friday, "weekdays", now);
    expect(next!.getDay()).toBe(1); // Monday
    expect(next!.getDate()).toBe(12);
  });

  it("skips forward when the next slot is already past", () => {
    const start = new Date(2026, 9, 1, 8, 0, 0);
    const now = new Date(2026, 9, 5, 9, 0, 0); // past several daily slots
    const next = nextFocusEnforcerStart(start, "daily", now);
    expect(next!.getDate()).toBe(6);
    expect(next!.getHours()).toBe(8);
  });
});
