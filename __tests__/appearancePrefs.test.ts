import {
  appearancePatchForDark,
  appearancePatchForThemeMode,
  backfillAppearanceSettings,
  darkFromPersonality,
  darkToThemeMode,
  DEFAULT_PERSONALITY,
  personalityForDark,
  resolveDarkAppearance,
  themeModeToDark,
} from "../lib/appearancePrefs";

describe("appearancePrefs", () => {
  describe("themeModeToDark / darkToThemeMode", () => {
    it("maps light and dark modes", () => {
      expect(themeModeToDark("light")).toBe(false);
      expect(themeModeToDark("dark")).toBe(true);
      expect(darkToThemeMode(false)).toBe("light");
      expect(darkToThemeMode(true)).toBe("dark");
    });

    it("honors system preference for system mode", () => {
      expect(themeModeToDark("system", false)).toBe(false);
      expect(themeModeToDark("system", true)).toBe(true);
    });
  });

  describe("personality bridge", () => {
    it("maps dark ↔ personality", () => {
      expect(personalityForDark(false)).toBe("atelier-light");
      expect(personalityForDark(true)).toBe("atelier-dark");
      expect(darkFromPersonality("atelier-light")).toBe(false);
      expect(darkFromPersonality("atelier-dark")).toBe(true);
      expect(darkFromPersonality(null)).toBeNull();
      expect(darkFromPersonality(undefined)).toBeNull();
    });
  });

  describe("resolveDarkAppearance", () => {
    it("defaults to Atelier Light when nothing is set", () => {
      expect(resolveDarkAppearance({})).toBe(false);
    });

    it("prefers themeMode over personality and legacy dark", () => {
      expect(
        resolveDarkAppearance({
          themeMode: "light",
          personality: "atelier-dark",
          dark: true,
        }),
      ).toBe(false);
      expect(
        resolveDarkAppearance({
          themeMode: "dark",
          personality: "atelier-light",
          dark: false,
        }),
      ).toBe(true);
    });

    it("resolves system themeMode from systemDark", () => {
      expect(resolveDarkAppearance({ themeMode: "system", systemDark: true })).toBe(true);
      expect(resolveDarkAppearance({ themeMode: "system", systemDark: false })).toBe(false);
    });

    it("falls back to personality when themeMode missing", () => {
      expect(resolveDarkAppearance({ personality: "atelier-dark" })).toBe(true);
      expect(resolveDarkAppearance({ personality: "atelier-light", dark: true })).toBe(false);
    });

    it("falls back to legacy dark boolean", () => {
      expect(resolveDarkAppearance({ dark: true })).toBe(true);
      expect(resolveDarkAppearance({ dark: false })).toBe(false);
    });
  });

  describe("appearancePatchForDark", () => {
    it("dual-writes themeMode + personality for web Light/Dark toggles", () => {
      expect(appearancePatchForDark(false)).toEqual({
        dark: false,
        themeMode: "light",
        personality: "atelier-light",
      });
      expect(appearancePatchForDark(true)).toEqual({
        dark: true,
        themeMode: "dark",
        personality: "atelier-dark",
      });
    });
  });

  describe("appearancePatchForThemeMode", () => {
    it("sets personality for explicit light/dark", () => {
      expect(appearancePatchForThemeMode("light")).toEqual({
        themeMode: "light",
        personality: "atelier-light",
        dark: false,
      });
      expect(appearancePatchForThemeMode("dark")).toEqual({
        themeMode: "dark",
        personality: "atelier-dark",
        dark: true,
      });
    });

    it("maps system mode personality from systemDark", () => {
      expect(appearancePatchForThemeMode("system", true)).toEqual({
        themeMode: "system",
        personality: "atelier-dark",
        dark: true,
      });
      expect(appearancePatchForThemeMode("system", false)).toEqual({
        themeMode: "system",
        personality: "atelier-light",
        dark: false,
      });
    });
  });

  describe("backfillAppearanceSettings", () => {
    it("fills missing themeMode and personality from dark", () => {
      const result = backfillAppearanceSettings({ accent: "#2563EB" }, true);
      expect(result.themeMode).toBe("dark");
      expect(result.personality).toBe("atelier-dark");
      expect(result.accent).toBe("#2563EB");
    });

    it("preserves existing themeMode and personality", () => {
      const result = backfillAppearanceSettings(
        { themeMode: "system", personality: "atelier-light" },
        true,
      );
      expect(result.themeMode).toBe("system");
      expect(result.personality).toBe(DEFAULT_PERSONALITY);
    });
  });
});
