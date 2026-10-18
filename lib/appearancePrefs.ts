/**
 * LifeOS 3.0 Phase 1 — appearance preference resolution.
 *
 * Source of truth for preference *mode*: `settings.themeMode` (`system` | `light` | `dark`).
 * Web still dual-writes the legacy top-level Firebase `dark` boolean for one release.
 * Optional `settings.personality` (`atelier-light` | `atelier-dark`) prepares Studio naming;
 * Settings UX may still say Light / Dark.
 */

export type ThemeMode = "system" | "light" | "dark";
export type Personality = "atelier-light" | "atelier-dark";

export const DEFAULT_THEME_MODE: ThemeMode = "light";
export const DEFAULT_PERSONALITY: Personality = "atelier-light";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function isPersonality(value: unknown): value is Personality {
  return value === "atelier-light" || value === "atelier-dark";
}

export function themeModeToDark(mode: ThemeMode, systemDark = false): boolean {
  if (mode === "system") return systemDark;
  return mode === "dark";
}

export function darkToThemeMode(dark: boolean): Exclude<ThemeMode, "system"> {
  return dark ? "dark" : "light";
}

export function personalityForDark(dark: boolean): Personality {
  return dark ? "atelier-dark" : "atelier-light";
}

export function darkFromPersonality(personality?: Personality | null): boolean | null {
  if (personality === "atelier-dark") return true;
  if (personality === "atelier-light") return false;
  return null;
}

export type AppearancePrefsInput = {
  themeMode?: ThemeMode | null;
  personality?: Personality | null;
  /** Legacy web Firebase `users/{uid}/dark` boolean. */
  dark?: boolean | null;
  systemDark?: boolean;
};

/**
 * Resolve the effective dark boolean from dual-stored prefs.
 *
 * Priority:
 * 1. Explicit `themeMode` (`light` / `dark` / `system`)
 * 2. `personality` (`atelier-light` / `atelier-dark`)
 * 3. Legacy `dark` boolean
 * 4. Default Atelier Light (`false`)
 */
export function resolveDarkAppearance(input: AppearancePrefsInput): boolean {
  const systemDark = input.systemDark ?? false;
  if (isThemeMode(input.themeMode)) {
    return themeModeToDark(input.themeMode, systemDark);
  }
  const fromPersonality = darkFromPersonality(
    isPersonality(input.personality) ? input.personality : null,
  );
  if (fromPersonality !== null) return fromPersonality;
  if (typeof input.dark === "boolean") return input.dark;
  return false;
}

/** Patch used when the user picks Light/Dark on web (no System in that UX yet). */
export function appearancePatchForDark(dark: boolean): {
  dark: boolean;
  themeMode: Exclude<ThemeMode, "system">;
  personality: Personality;
} {
  return {
    dark,
    themeMode: darkToThemeMode(dark),
    personality: personalityForDark(dark),
  };
}

/**
 * Patch used when mobile (or future Studio) sets `themeMode`.
 * Includes `dark` so web dual-write stays in sync when a shared writer is used.
 */
export function appearancePatchForThemeMode(
  themeMode: ThemeMode,
  systemDark = false,
): {
  themeMode: ThemeMode;
  personality: Personality;
  dark: boolean;
} {
  const dark = themeModeToDark(themeMode, systemDark);
  return {
    themeMode,
    personality: personalityForDark(
      themeMode === "system" ? systemDark : dark,
    ),
    dark,
  };
}

/** Ensure settings carry themeMode + personality consistent with a resolved dark flag. */
export function backfillAppearanceSettings<T extends Record<string, unknown>>(
  settings: T,
  dark: boolean,
): T & { themeMode: ThemeMode; personality: Personality } {
  const patch = appearancePatchForDark(dark);
  const themeMode = isThemeMode(settings.themeMode) ? (settings.themeMode as ThemeMode) : patch.themeMode;
  const personality = isPersonality(settings.personality)
    ? (settings.personality as Personality)
    : patch.personality;
  return { ...settings, themeMode, personality };
}
