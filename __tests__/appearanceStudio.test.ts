import {
  appearanceSettingsPatchFromStudio,
  appearanceStudioFromSettings,
  CURATED_ACCENTS,
  DEFAULT_APPEARANCE_STUDIO,
  isGlassLevel,
  isWallpaperId,
  wallpaperCssFor,
  WALLPAPER_PRESETS,
} from "../lib/appearanceStudio";

describe("appearanceStudio", () => {
  it("defaults Studio state when settings empty", () => {
    expect(appearanceStudioFromSettings({})).toEqual(DEFAULT_APPEARANCE_STUDIO);
  });

  it("reads committed wallpaper/glass/themeMode", () => {
    const state = appearanceStudioFromSettings({
      themeMode: "system",
      accent: "#2563EB",
      wallpaperId: "aurora",
      wallpaperSolid: "#111111",
      glassLevel: "balanced",
      compactMode: true,
      reduceMotion: true,
    });
    expect(state.themeMode).toBe("system");
    expect(state.accent).toBe("#2563EB");
    expect(state.wallpaperId).toBe("aurora");
    expect(state.glassLevel).toBe("balanced");
    expect(state.compactMode).toBe(true);
  });

  it("Apply patch dual-writes dark + personality for light/dark", () => {
    const light = appearanceSettingsPatchFromStudio({
      ...DEFAULT_APPEARANCE_STUDIO,
      themeMode: "light",
      wallpaperId: "mist",
      glassLevel: "subtle",
    });
    expect(light.dark).toBe(false);
    expect(light.personality).toBe("atelier-light");
    expect(light.themeMode).toBe("light");
    expect(light.wallpaperId).toBe("mist");
    expect(light.glassLevel).toBe("subtle");

    const dark = appearanceSettingsPatchFromStudio({
      ...DEFAULT_APPEARANCE_STUDIO,
      themeMode: "dark",
    });
    expect(dark.dark).toBe(true);
    expect(dark.personality).toBe("atelier-dark");
  });

  it("preserves themeMode system and resolves dark from systemDark", () => {
    const patch = appearanceSettingsPatchFromStudio(
      { ...DEFAULT_APPEARANCE_STUDIO, themeMode: "system" },
      true,
    );
    expect(patch.themeMode).toBe("system");
    expect(patch.dark).toBe(true);
    expect(patch.personality).toBe("atelier-dark");
  });

  it("validates enums and wallpaper CSS", () => {
    expect(isGlassLevel("high")).toBe(true);
    expect(isGlassLevel("neon")).toBe(false);
    expect(isWallpaperId("midnight")).toBe(true);
    expect(isWallpaperId("upload")).toBe(false);
    expect(wallpaperCssFor({ wallpaperId: "none", wallpaperSolid: "#000" })).toBeNull();
    expect(wallpaperCssFor({ wallpaperId: "solid", wallpaperSolid: "#abcabc" })).toBe("#abcabc");
    expect(wallpaperCssFor({ wallpaperId: "aurora", wallpaperSolid: "#000" })).toContain("gradient");
    expect(WALLPAPER_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(CURATED_ACCENTS.length).toBeGreaterThanOrEqual(8);
  });
});
