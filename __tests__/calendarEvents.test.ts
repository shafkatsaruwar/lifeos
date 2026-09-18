import { buildMonthEventSegments, eventOccursOnDate, getEventDateRange, getEventDayBlockMinutes, isWeekendDateKey, usesDailyTimeWindow } from "../lib/calendarEvents";

describe("calendarEvents", () => {
  const workBlock = {
    start: "2026-08-31T08:30:00",
    end: "2026-10-31T17:00:00",
    weekdaysOnly: true,
  };

  it("skips weekends for weekday-only ranges", () => {
    expect(isWeekendDateKey("2026-08-29")).toBe(true); // Sat
    expect(isWeekendDateKey("2026-08-31")).toBe(false); // Mon
    expect(eventOccursOnDate(workBlock, "2026-08-31")).toBe(true);
    expect(eventOccursOnDate(workBlock, "2026-09-05")).toBe(false); // Sat
    expect(eventOccursOnDate(workBlock, "2026-10-31")).toBe(false); // Saturday
    expect(eventOccursOnDate(workBlock, "2026-10-30")).toBe(true); // Friday
  });

  it("still respects the end date", () => {
    expect(getEventDateRange(workBlock).endKey).toBe("2026-10-31");
    expect(eventOccursOnDate(workBlock, "2026-11-02")).toBe(false);
  });

  it("builds separate month segments per weekday run", () => {
    const gridStart = new Date("2026-08-30T12:00:00"); // Sunday grid start for Sep 2026 month view
    const days = Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return day;
    });
    const segments = buildMonthEventSegments(
      [{ ...workBlock, id: "work", title: "Work: UML", source: "LifeOS" as const, color: "#47a47b" }],
      days,
    );
    expect(segments.some((segment) => segment.startColumn <= 5 && segment.endColumn >= 5)).toBe(true);
    expect(segments.every((segment) => segment.endColumn - segment.startColumn <= 4)).toBe(true);
  });

  it("places weekday work blocks on their daily clock times, not all day", () => {
    expect(usesDailyTimeWindow(workBlock)).toBe(true);
    expect(getEventDayBlockMinutes(workBlock, "2026-09-18")).toEqual({
      startMinutes: 8 * 60 + 30,
      endMinutes: 17 * 60,
    });
  });

  it("keeps overnight events continuous across midnight", () => {
    const overnight = { start: "2026-09-18T22:00:00", end: "2026-09-19T02:00:00" };
    expect(usesDailyTimeWindow(overnight)).toBe(false);
    expect(getEventDayBlockMinutes(overnight, "2026-09-18")).toEqual({
      startMinutes: 22 * 60,
      endMinutes: 1440,
    });
    expect(getEventDayBlockMinutes(overnight, "2026-09-19")).toEqual({
      startMinutes: 0,
      endMinutes: 2 * 60,
    });
  });
});
