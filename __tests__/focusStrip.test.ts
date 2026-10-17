import { buildFocusStripKeys, enabledFocusStripHubs } from "@/lib/focusStrip";

describe("focus strip", () => {
  it("uses Library when no hubs are enabled", () => {
    expect(buildFocusStripKeys({})).toEqual(["home", "calendar", "tasks", "library"]);
  });

  it("includes every enabled hub between Home and Calendar/Tasks", () => {
    expect(
      buildFocusStripKeys({
        enableWorkOS: true,
        enableCareerOS: true,
        enableSchoolOS: true,
        enableStudyAbroad: true,
        enableTreasuryOS: true,
        enableMasterOS: true,
      }),
    ).toEqual([
      "home",
      "work",
      "career",
      "school",
      "study-abroad",
      "treasury",
      "mastery",
      "calendar",
      "tasks",
    ]);
  });

  it("follows sidebar Environments order", () => {
    expect(
      enabledFocusStripHubs({
        enableMasterOS: true,
        enableCareerOS: true,
        enableWorkOS: true,
        enableSchoolOS: true,
      }),
    ).toEqual(["work", "career", "school", "mastery"]);
  });

  it("omits disabled hubs only", () => {
    expect(
      buildFocusStripKeys({
        enableCareerOS: true,
        enableSchoolOS: false,
        enableWorkOS: true,
      }),
    ).toEqual(["home", "work", "career", "calendar", "tasks"]);
  });
});
