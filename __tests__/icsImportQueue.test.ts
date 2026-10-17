import {
  clearPendingIcsImport,
  getPendingIcsImport,
  selectedIcsImportEvents,
  stageIcsImport,
  toggleIcsImportSelection,
} from "../lifeos-mobile/src/lib/icsImportQueue";
import type { CalendarEvent } from "../lifeos-mobile/src/types";

function event(partial: Partial<CalendarEvent> & Pick<CalendarEvent, "id" | "title" | "start">): CalendarEvent {
  return { source: "iCal", ...partial };
}

describe("icsImportQueue", () => {
  afterEach(() => {
    clearPendingIcsImport();
  });

  it("stages parsed events without writing the calendar", () => {
    const staged = stageIcsImport(
      [
        event({ id: "ical-a", title: "Lecture", start: "2026-10-14T09:00" }),
        event({ id: "ical-b", title: "Lab", start: "2026-10-14T13:00" }),
      ],
      { sourceLabel: "uml.ics" },
    );
    expect(staged?.events).toHaveLength(2);
    expect(getPendingIcsImport()?.sourceLabel).toBe("uml.ics");
    expect(selectedIcsImportEvents()).toHaveLength(2);
  });

  it("leaves already-on-calendar events unchecked by default", () => {
    stageIcsImport(
      [
        event({ id: "ical-a", title: "Lecture", start: "2026-10-14T09:00" }),
        event({ id: "ical-b", title: "Lab", start: "2026-10-14T13:00" }),
      ],
      { existingIds: ["ical-a"] },
    );
    expect(selectedIcsImportEvents().map((item) => item.id)).toEqual(["ical-b"]);
  });

  it("toggles selection before approval", () => {
    stageIcsImport([event({ id: "ical-a", title: "Lecture", start: "2026-10-14T09:00" })]);
    toggleIcsImportSelection("ical-a");
    expect(selectedIcsImportEvents()).toHaveLength(0);
    toggleIcsImportSelection("ical-a");
    expect(selectedIcsImportEvents()).toHaveLength(1);
  });
});
