import {
  DEFAULT_FOCUS_APPEARANCE,
  FOCUS_IMMERSIVE_SETTINGS_NOTE,
  normalizeFocusAppearance,
} from "../lib/focusAppearance";

describe("focusAppearance", () => {
  it("defaults to standard", () => {
    expect(normalizeFocusAppearance(undefined)).toBe(DEFAULT_FOCUS_APPEARANCE);
    expect(normalizeFocusAppearance("immersive")).toBe("immersive");
    expect(normalizeFocusAppearance("nope")).toBe("standard");
  });

  it("documents that immersive is not OS silence or Focus Enforcer", () => {
    expect(FOCUS_IMMERSIVE_SETTINGS_NOTE).toMatch(/Do Not Disturb/i);
    expect(FOCUS_IMMERSIVE_SETTINGS_NOTE).toMatch(/Focus Enforcer/i);
  });
});
