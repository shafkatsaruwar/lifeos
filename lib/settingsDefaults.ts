/**
 * Environment-pack defaults for new vs returning users.
 *
 * UI treats `undefined` as ON (`enableX !== false`) for legacy accounts.
 * New accounts get Life + School only; extra packs start OFF until enabled in Settings.
 */

export const ENVIRONMENT_ENABLE_KEYS = [
  "enableLifeOS",
  "enableSchoolOS",
  "enableWorkOS",
  "enableStudyAbroad",
  "enableTreasuryOS",
  "enableMasterOS",
] as const;

export type EnvironmentEnableKey = (typeof ENVIRONMENT_ENABLE_KEYS)[number];

export type EnvironmentFlags = Record<EnvironmentEnableKey, boolean>;

/** Defaults for brand-new users (no prior onboarding / no saved env flags). */
export const NEW_USER_ENVIRONMENT_FLAGS: EnvironmentFlags = {
  enableLifeOS: true,
  enableSchoolOS: true,
  enableWorkOS: false,
  enableStudyAbroad: false,
  enableTreasuryOS: false,
  enableMasterOS: false,
};

/** Legacy: missing flags behaved as enabled. Keep that for returning accounts. */
export const LEGACY_ENVIRONMENT_FLAGS: EnvironmentFlags = {
  enableLifeOS: true,
  enableSchoolOS: true,
  enableWorkOS: true,
  enableStudyAbroad: true,
  enableTreasuryOS: true,
  enableMasterOS: true,
};

export type SettingsLike = Partial<EnvironmentFlags> & {
  onboardingCompletedAt?: string | null;
  [key: string]: unknown;
};

/** Returning = finished onboarding before, or already has an explicit env boolean saved. */
export function isReturningUserSettings(stored: SettingsLike | null | undefined): boolean {
  if (!stored) return false;
  if (stored.onboardingCompletedAt) return true;
  return ENVIRONMENT_ENABLE_KEYS.some((key) => typeof stored[key] === "boolean");
}

/**
 * Merge stored settings over base defaults without letting `undefined` wipe env flags.
 * New users → Life + School only. Returning users → missing flags stay ON.
 */
export function mergeSettingsWithEnvironmentDefaults<T extends SettingsLike>(
  base: T,
  stored: SettingsLike | null | undefined,
): T {
  const returning = isReturningUserSettings(stored);
  const envDefaults = returning ? LEGACY_ENVIRONMENT_FLAGS : NEW_USER_ENVIRONMENT_FLAGS;
  const merged: SettingsLike = { ...base, ...envDefaults };

  if (stored) {
    for (const [key, value] of Object.entries(stored)) {
      if (value !== undefined) merged[key] = value;
    }
  }

  for (const key of ENVIRONMENT_ENABLE_KEYS) {
    if (typeof merged[key] !== "boolean") {
      merged[key] = envDefaults[key];
    }
  }

  return merged as T;
}
