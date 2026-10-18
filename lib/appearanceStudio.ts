/**
 * LifeOS 3.0 Phase 3 — Appearance Studio draft model + chrome application.
 *
 * Committed prefs live on `settings` (additive). The Studio UI keeps a local
 * draft and only writes on Apply / Restore defaults — never on every tick.
 */

import {
  appearancePatchForThemeMode,
  DEFAULT_PERSONALITY,
  DEFAULT_THEME_MODE,
  isThemeMode,
  type Personality,
  type ThemeMode,
} from "./appearancePrefs";

export type GlassLevel = "off" | "subtle" | "balanced" | "high";
export type WallpaperId = "none" | "solid" | "midnight" | "aurora" | "ember" | "mist";

export type AppearanceStudioState = {
  themeMode: ThemeMode;
  accent: string;
  wallpaperId: WallpaperId;
  /** Used when wallpaperId === "solid". */
  wallpaperSolid: string;
  glassLevel: GlassLevel;
  compactMode: boolean;
  reduceMotion: boolean;
};

export const DEFAULT_ACCENT = "#625af6";
export const DEFAULT_WALLPAPER_SOLID = "#0B1020";

export const DEFAULT_APPEARANCE_STUDIO: AppearanceStudioState = {
  themeMode: DEFAULT_THEME_MODE,
  accent: DEFAULT_ACCENT,
  wallpaperId: "none",
  wallpaperSolid: DEFAULT_WALLPAPER_SOLID,
  glassLevel: "off",
  compactMode: false,
  reduceMotion: false,
};

export const CURATED_ACCENTS = [
  "#625af6",
  "#2563EB",
  "#5B8DEF",
  "#0D9488",
  "#47a47b",
  "#d99b38",
  "#e48b6b",
  "#cf625a",
  "#db2777",
  "#8b5cf6",
  "#06b6d4",
  "#64748b",
] as const;

export const WALLPAPER_PRESETS: {
  id: Exclude<WallpaperId, "none" | "solid">;
  label: string;
  /** CSS background value applied to body under the wallpaper layer */
  css: string;
}[] = [
  {
    id: "midnight",
    label: "Midnight",
    css: "radial-gradient(1200px 700px at 18% -8%, rgba(91,141,239,.22), transparent 55%), radial-gradient(900px 520px at 92% 12%, rgba(139,126,200,.16), transparent 50%), #0B1020",
  },
  {
    id: "aurora",
    label: "Aurora",
    css: "radial-gradient(1000px 600px at 10% 0%, rgba(61,184,168,.18), transparent 50%), radial-gradient(900px 500px at 90% 20%, rgba(91,141,239,.16), transparent 52%), linear-gradient(165deg, #0B1220, #101729 60%, #0B1020)",
  },
  {
    id: "ember",
    label: "Ember",
    css: "radial-gradient(900px 520px at 20% -5%, rgba(224,122,138,.16), transparent 55%), radial-gradient(800px 480px at 85% 15%, rgba(217,155,56,.12), transparent 50%), #100E16",
  },
  {
    id: "mist",
    label: "Mist",
    css: "radial-gradient(1100px 640px at 50% -20%, rgba(148,163,184,.18), transparent 55%), linear-gradient(180deg, #F7F9FC, #EEF3FA 45%, #E8EEF6)",
  },
];

export function isGlassLevel(value: unknown): value is GlassLevel {
  return value === "off" || value === "subtle" || value === "balanced" || value === "high";
}

export function isWallpaperId(value: unknown): value is WallpaperId {
  return (
    value === "none" ||
    value === "solid" ||
    value === "midnight" ||
    value === "aurora" ||
    value === "ember" ||
    value === "mist"
  );
}

export type AppearanceSettingsSlice = {
  themeMode?: ThemeMode | null;
  personality?: Personality | null;
  accent?: string | null;
  wallpaperId?: WallpaperId | null;
  wallpaperSolid?: string | null;
  glassLevel?: GlassLevel | null;
  compactMode?: boolean | null;
  reduceMotion?: boolean | null;
};

/** Build Studio state from committed settings (with defaults). */
export function appearanceStudioFromSettings(
  settings: AppearanceSettingsSlice,
): AppearanceStudioState {
  return {
    themeMode: isThemeMode(settings.themeMode) ? settings.themeMode : DEFAULT_THEME_MODE,
    accent: typeof settings.accent === "string" && settings.accent.trim() ? settings.accent : DEFAULT_ACCENT,
    wallpaperId: isWallpaperId(settings.wallpaperId) ? settings.wallpaperId : "none",
    wallpaperSolid:
      typeof settings.wallpaperSolid === "string" && settings.wallpaperSolid.trim()
        ? settings.wallpaperSolid
        : DEFAULT_WALLPAPER_SOLID,
    glassLevel: isGlassLevel(settings.glassLevel) ? settings.glassLevel : "off",
    compactMode: Boolean(settings.compactMode),
    reduceMotion: Boolean(settings.reduceMotion),
  };
}

export type AppearanceStudioCommitPatch = {
  themeMode: ThemeMode;
  personality: Personality;
  dark: boolean;
  accent: string;
  wallpaperId: WallpaperId;
  wallpaperSolid: string;
  glassLevel: GlassLevel;
  compactMode: boolean;
  reduceMotion: boolean;
};

/** Patch written on Apply — includes dual-write fields for theme. */
export function appearanceSettingsPatchFromStudio(
  draft: AppearanceStudioState,
  systemDark = false,
): AppearanceStudioCommitPatch {
  const themePatch = appearancePatchForThemeMode(draft.themeMode, systemDark);
  return {
    themeMode: draft.themeMode,
    personality: themePatch.personality,
    dark: themePatch.dark,
    accent: draft.accent,
    wallpaperId: draft.wallpaperId,
    wallpaperSolid: draft.wallpaperSolid,
    glassLevel: draft.glassLevel,
    compactMode: draft.compactMode,
    reduceMotion: draft.reduceMotion,
  };
}

export function wallpaperCssFor(draft: Pick<AppearanceStudioState, "wallpaperId" | "wallpaperSolid">): string | null {
  if (draft.wallpaperId === "none") return null;
  if (draft.wallpaperId === "solid") {
    return draft.wallpaperSolid || DEFAULT_WALLPAPER_SOLID;
  }
  const preset = WALLPAPER_PRESETS.find((p) => p.id === draft.wallpaperId);
  return preset?.css ?? null;
}

/**
 * Apply wallpaper + glass chrome to the document without touching Firebase.
 * Safe to call on every draft tick for live preview.
 */
export function applyAppearanceChrome(
  draft: Pick<AppearanceStudioState, "wallpaperId" | "wallpaperSolid" | "glassLevel" | "accent">,
  root: HTMLElement = document.documentElement,
): void {
  root.dataset.glass = draft.glassLevel;
  root.dataset.wallpaper = draft.wallpaperId;
  const wallpaper = wallpaperCssFor(draft);
  if (wallpaper) {
    root.style.setProperty("--wallpaper", wallpaper);
  } else {
    root.style.removeProperty("--wallpaper");
  }
  if (draft.accent) {
    root.style.setProperty("--accent", draft.accent);
  }
}

export function clearAppearanceChromePreview(root: HTMLElement = document.documentElement): void {
  // Leave committed attrs; callers should re-apply from settings after cancel.
  root.style.removeProperty("--wallpaper");
}

export { DEFAULT_THEME_MODE, DEFAULT_PERSONALITY };
