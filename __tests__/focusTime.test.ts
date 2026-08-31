import { formatFocusMinutesShort, formatFocusSessionLabel, formatFocusTime } from "@/lib/focusTime";

describe("formatFocusTime", () => {
  it("uses MM:SS under one hour", () => {
    expect(formatFocusTime(45 * 60)).toBe("45:00");
    expect(formatFocusTime(45 * 60 + 7)).toBe("45:07");
  });

  it("uses H:MM:SS at one hour and above", () => {
    expect(formatFocusTime(240 * 60)).toBe("4:00:00");
    expect(formatFocusTime(90 * 60 + 30)).toBe("1:30:30");
  });
});

describe("formatFocusSessionLabel", () => {
  it("labels long sessions in hours", () => {
    expect(formatFocusSessionLabel(240)).toBe("4 hours session");
    expect(formatFocusSessionLabel(90)).toBe("1 hour 30 minutes session");
  });

  it("labels short sessions in minutes", () => {
    expect(formatFocusSessionLabel(45)).toBe("45 minutes session");
  });
});

describe("formatFocusMinutesShort", () => {
  it("shows hours for long sessions", () => {
    expect(formatFocusMinutesShort(240)).toBe("4 hr");
    expect(formatFocusMinutesShort(90)).toBe("1 hr 30 min");
  });
});
