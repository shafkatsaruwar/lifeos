import { recolorIcalSubscriptionEvents } from "../lifeos-mobile/src/lib/api";
import type { CalendarEvent } from "../lifeos-mobile/src/types";

function event(id: string, color: string): CalendarEvent {
  return {
    id,
    title: id,
    start: "2026-10-18T09:00:00.000Z",
    source: "iCal",
    color,
  };
}

describe("recolorIcalSubscriptionEvents", () => {
  it("updates only events for the subscription id prefix", () => {
    const calendar = [
      event("ical-fabc-uid1", "#111111"),
      event("ical-fdef-uid2", "#222222"),
      event("manual-1", "#333333"),
    ];
    const next = recolorIcalSubscriptionEvents(calendar, "fabc", "#47a47b");
    expect(next[0].color).toBe("#47a47b");
    expect(next[1].color).toBe("#222222");
    expect(next[2].color).toBe("#333333");
  });

  it("is a no-op when no events match", () => {
    const calendar = [event("manual-1", "#333333")];
    const next = recolorIcalSubscriptionEvents(calendar, "missing", "#47a47b");
    expect(next).toEqual(calendar);
  });
});
