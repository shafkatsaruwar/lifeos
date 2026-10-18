import {
  PRODUCTION_LIFEOS_URL,
  looksLikeIcalFeedUrl,
  resolveLifeosApiBase,
} from "../lifeos-mobile/src/lib/lifeosUrl";

describe("resolveLifeosApiBase", () => {
  it("prefers EXPO_PUBLIC_LIFEOS_URL and strips trailing slash", () => {
    expect(resolveLifeosApiBase("https://custom.example.com/", false)).toBe("https://custom.example.com");
    expect(resolveLifeosApiBase("  https://custom.example.com  ", true)).toBe("https://custom.example.com");
  });

  it("uses localhost in development when env is unset", () => {
    expect(resolveLifeosApiBase("", true)).toBe("http://localhost:3000");
    expect(resolveLifeosApiBase(undefined, true)).toBe("http://localhost:3000");
  });

  it("falls back to the production LifeOS URL when env is unset outside dev", () => {
    expect(resolveLifeosApiBase("", false)).toBe(PRODUCTION_LIFEOS_URL);
    expect(resolveLifeosApiBase(undefined, false)).toBe(PRODUCTION_LIFEOS_URL);
    expect(PRODUCTION_LIFEOS_URL).toBe("https://lifeos-mu-three.vercel.app");
  });
});

describe("looksLikeIcalFeedUrl", () => {
  it("accepts http(s) and webcal calendar links", () => {
    expect(looksLikeIcalFeedUrl("https://calendar.google.com/calendar/ical/x/basic.ics")).toBe(true);
    expect(looksLikeIcalFeedUrl("webcal://p123.caldav.icloud.com/published/2/abc")).toBe(true);
    expect(looksLikeIcalFeedUrl("http://example.com/feed.ics")).toBe(true);
  });

  it("rejects display names and empty values", () => {
    expect(looksLikeIcalFeedUrl("")).toBe(false);
    expect(looksLikeIcalFeedUrl("Doctor's Appointment(iCloud)")).toBe(false);
    expect(looksLikeIcalFeedUrl("School timetable")).toBe(false);
  });
});
