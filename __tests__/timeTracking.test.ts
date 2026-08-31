import {
  addManualEntry,
  clockIn,
  clockOut,
  emptyTimeTracking,
  entriesForWeek,
  entryDurationMinutes,
  exportTimesheetCsv,
  getActiveEntry,
  normalizeTimeTracking,
  updateTimeEntry,
  weekStartKey,
} from "../lib/timeTracking";

describe("timeTracking", () => {
  const base = new Date("2026-08-31T09:00:00.000Z");

  it("clocks in and out with duration", () => {
    let state = emptyTimeTracking();
    state = clockIn(state, { clientName: "Acme", title: "Design" }, base);
    expect(getActiveEntry(state)?.title).toBe("Design");
    state = clockOut(state, new Date("2026-08-31T11:30:00.000Z"));
    expect(getActiveEntry(state)).toBeUndefined();
    const entry = state.entries[0];
    expect(entry.durationMinutes).toBe(150);
    expect(entry.clientName).toBe("Acme");
  });

  it("prevents double clock-in", () => {
    let state = clockIn(emptyTimeTracking(), { title: "First" }, base);
    state = clockIn(state, { title: "Second" }, new Date("2026-08-31T10:00:00.000Z"));
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].title).toBe("First");
  });

  it("adds manual entries and supports edits", () => {
    let state = addManualEntry(emptyTimeTracking(), {
      clockInAt: "2026-08-30T13:00:00.000Z",
      clockOutAt: "2026-08-30T14:00:00.000Z",
      title: "Retro",
      clientName: "ClientCo",
    });
    expect(state.entries[0].source).toBe("manual");
    state = updateTimeEntry(state, state.entries[0].id, { note: "Billable" });
    expect(state.entries[0].note).toBe("Billable");
    expect(state.entries[0].source).toBe("manual");
  });

  it("filters entries by week", () => {
    const state = addManualEntry(
      addManualEntry(emptyTimeTracking(), {
        clockInAt: "2026-08-25T09:00:00.000Z",
        clockOutAt: "2026-08-25T10:00:00.000Z",
        title: "Last week",
      }),
      {
        clockInAt: "2026-08-31T09:00:00.000Z",
        clockOutAt: "2026-08-31T10:00:00.000Z",
        title: "This week",
      },
    );
    const weekKey = weekStartKey(new Date("2026-08-31T12:00:00.000Z"), false);
    const weekEntries = entriesForWeek(state, weekKey);
    expect(weekEntries).toHaveLength(1);
    expect(weekEntries[0].title).toBe("This week");
  });

  it("exports contractor-ready CSV", () => {
    const state = addManualEntry(emptyTimeTracking(), {
      clockInAt: "2026-08-31T09:00:00.000Z",
      clockOutAt: "2026-08-31T10:30:00.000Z",
      title: "Implementation",
      clientName: "Acme",
      projectId: "proj-1",
    });
    const csv = exportTimesheetCsv(state.entries, (id) => (id === "proj-1" ? "Website" : ""));
    expect(csv).toContain('"Date","Client","Project","Title"');
    expect(csv).toContain("Acme");
    expect(csv).toContain("Website");
    expect(csv).toContain("1.50");
  });

  it("normalizes invalid payloads", () => {
    expect(normalizeTimeTracking(null)).toEqual(emptyTimeTracking());
    expect(normalizeTimeTracking({ entries: [{ id: "x", clockInAt: "2026-01-01T00:00:00.000Z", source: "manual", createdAt: "", updatedAt: "" }] }).entries).toHaveLength(1);
    expect(normalizeTimeTracking({ entries: [{ bad: true }] }).entries).toHaveLength(0);
  });

  it("computes live duration for open entries", () => {
    const entry = {
      id: "e1",
      clockInAt: "2026-08-31T09:00:00.000Z",
      source: "clock" as const,
      createdAt: "",
      updatedAt: "",
    };
    expect(entryDurationMinutes(entry, Date.parse("2026-08-31T10:00:00.000Z"))).toBe(60);
  });
});
