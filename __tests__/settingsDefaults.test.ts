import {
  ENVIRONMENT_ENABLE_KEYS,
  LEGACY_ENVIRONMENT_FLAGS,
  NEW_USER_ENVIRONMENT_FLAGS,
  isReturningUserSettings,
  mergeSettingsWithEnvironmentDefaults,
} from "../lib/settingsDefaults";

describe("settings environment defaults", () => {
  it("treats empty settings as a new user (Life + School only)", () => {
    expect(isReturningUserSettings(null)).toBe(false);
    expect(isReturningUserSettings({})).toBe(false);
    const merged = mergeSettingsWithEnvironmentDefaults(
      { accent: "#625af6" },
      null,
    );
    expect(merged.enableLifeOS).toBe(true);
    expect(merged.enableSchoolOS).toBe(true);
    expect(merged.enableWorkOS).toBe(false);
    expect(merged.enableStudyAbroad).toBe(false);
    expect(merged.enableTreasuryOS).toBe(false);
    expect(merged.enableMasterOS).toBe(false);
  });

  it("keeps legacy packs on for returning users with missing flags", () => {
    expect(isReturningUserSettings({ onboardingCompletedAt: "2026-01-01T00:00:00.000Z" })).toBe(true);
    const merged = mergeSettingsWithEnvironmentDefaults(
      { accent: "#625af6", ...NEW_USER_ENVIRONMENT_FLAGS },
      { onboardingCompletedAt: "2026-01-01T00:00:00.000Z", preferredName: "Sam" },
    );
    for (const key of ENVIRONMENT_ENABLE_KEYS) {
      expect(merged[key]).toBe(LEGACY_ENVIRONMENT_FLAGS[key]);
    }
    expect(merged.preferredName).toBe("Sam");
  });

  it("respects explicit false on a returning user", () => {
    const merged = mergeSettingsWithEnvironmentDefaults(
      { ...LEGACY_ENVIRONMENT_FLAGS },
      { onboardingCompletedAt: "2026-01-01T00:00:00.000Z", enableWorkOS: false },
    );
    expect(merged.enableWorkOS).toBe(false);
    expect(merged.enableLifeOS).toBe(true);
  });

  it("does not let undefined stored flags wipe defaults", () => {
    const merged = mergeSettingsWithEnvironmentDefaults(
      { ...NEW_USER_ENVIRONMENT_FLAGS },
      { enableWorkOS: undefined, onboardingCompletedAt: "2026-01-01T00:00:00.000Z" },
    );
    expect(merged.enableWorkOS).toBe(true);
  });
});
