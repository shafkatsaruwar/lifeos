/** LifeOS hub entitlement — promo unlock + paid plans for paid hubs only. */

/** One-year founder promo — never display this string in UI. */
export const LIFEOS_PROMO_CODE = '"Shafkat Rocks!"';

/** Lifetime unlock — never display this string in UI. */
export const LIFEOS_LIFETIME_PROMO_CODE = "8904272998";

/** One calendar year of access from redeem time (timed promo only). */
export const PROMO_ACCESS_MS = 365 * 24 * 60 * 60 * 1000;

/** Hubs that require LifeOS Pro. Home (Life) and School stay free. */
export const PAID_HUB_NAMES = ["Work", "Study Abroad", "Treasury", "Mastery"] as const;

export type PaidHubName = (typeof PAID_HUB_NAMES)[number];

export const PAID_HUB_ENABLE_KEYS = [
  "enableWorkOS",
  "enableStudyAbroad",
  "enableTreasuryOS",
  "enableMasterOS",
] as const;

export type PaidHubEnableKey = (typeof PAID_HUB_ENABLE_KEYS)[number];

export type EntitlementStatus = "none" | "promo" | "pro";

export type EntitlementSource = "promo" | "stripe" | "app_store";

export type Entitlement = {
  status: EntitlementStatus;
  /** ISO timestamp when access ends (promo / timed pro). Omit for lifetime. */
  expiresAt?: string;
  unlockedAt?: string;
  source?: EntitlementSource;
  /** Stored only when unlocked via promo — never display this string in UI. */
  promoCode?: string;
};

export type SettingsWithEntitlement = {
  entitlement?: Entitlement | null;
};

export function isPaidHub(name: string): boolean {
  return (PAID_HUB_NAMES as readonly string[]).includes(name);
}

export function isPaidHubEnableKey(key: string): key is PaidHubEnableKey {
  return (PAID_HUB_ENABLE_KEYS as readonly string[]).includes(key);
}

export function normalizePromoInput(raw: string): string {
  return raw.trim();
}

export function isLifetimePromoCode(raw: string): boolean {
  return normalizePromoInput(raw) === LIFEOS_LIFETIME_PROMO_CODE;
}

export function isYearPromoCode(raw: string): boolean {
  return normalizePromoInput(raw) === LIFEOS_PROMO_CODE;
}

export function isValidPromoCode(raw: string): boolean {
  return isYearPromoCode(raw) || isLifetimePromoCode(raw);
}

export function isEntitled(
  entitlement?: Entitlement | null,
  now: Date = new Date(),
): boolean {
  if (!entitlement || entitlement.status === "none") return false;
  if (!entitlement.expiresAt) {
    // Untimed pro / lifetime promo — treat as entitled.
    return entitlement.status === "pro" || entitlement.status === "promo";
  }
  const ends = Date.parse(entitlement.expiresAt);
  if (Number.isNaN(ends)) return false;
  return ends > now.getTime();
}

export function redeemPromoCode(
  raw: string,
  now: Date = new Date(),
): { ok: true; entitlement: Entitlement } | { ok: false; error: string } {
  if (!normalizePromoInput(raw)) {
    return { ok: false, error: "Enter a promo code." };
  }
  if (!isValidPromoCode(raw)) {
    return { ok: false, error: "That promo code isn’t valid." };
  }
  const unlockedAt = now.toISOString();

  if (isLifetimePromoCode(raw)) {
    return {
      ok: true,
      entitlement: {
        status: "pro",
        source: "promo",
        unlockedAt,
        // No expiresAt — LifeOS Pro forever.
        promoCode: LIFEOS_LIFETIME_PROMO_CODE,
      },
    };
  }

  const expiresAt = new Date(now.getTime() + PROMO_ACCESS_MS).toISOString();
  return {
    ok: true,
    entitlement: {
      status: "promo",
      source: "promo",
      unlockedAt,
      expiresAt,
      promoCode: LIFEOS_PROMO_CODE,
    },
  };
}

/** Short success copy after redeem — never includes the code string. */
export function redeemSuccessMessage(entitlement: Entitlement): string {
  if (!entitlement.expiresAt && (entitlement.status === "pro" || entitlement.status === "promo")) {
    return "LifeOS Pro unlocked for life.";
  }
  return "Paid hubs unlocked for one year.";
}

/** Human label for Settings / paywall status chip. */
export function entitlementStatusLabel(
  entitlement?: Entitlement | null,
  now: Date = new Date(),
): string {
  if (!isEntitled(entitlement, now)) return "Locked";
  if (!entitlement?.expiresAt) {
    return "LifeOS Pro · Lifetime";
  }
  if (entitlement.status === "promo") {
    const until = new Date(entitlement.expiresAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `Founder access · until ${until}`;
  }
  const until = new Date(entitlement.expiresAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `LifeOS Pro · until ${until}`;
}

export function formatEntitlementExpiry(
  entitlement?: Entitlement | null,
): string | null {
  if (!entitlement?.expiresAt) return null;
  const ends = Date.parse(entitlement.expiresAt);
  if (Number.isNaN(ends)) return null;
  return new Date(ends).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** One-time lifetime Pro (no expiry). */
export function grantLifetimeAccess(
  source: EntitlementSource = "stripe",
  now: Date = new Date(),
): Entitlement {
  return {
    status: "pro",
    source,
    unlockedAt: now.toISOString(),
  };
}

export function canAccessPaidHubs(
  entitlement?: Entitlement | null,
  now: Date = new Date(),
): boolean {
  return isEntitled(entitlement, now);
}

/**
 * Whether a hub should appear in the sidebar / tab bar.
 * Matches Settings → Hubs toggle display: Pro hubs need entitlement AND enable !== false.
 * Free hubs (Life/School/Career) only need enable !== false.
 */
export function isHubVisibleInNav(
  name: string,
  options: {
    entitlement?: Entitlement | null;
    enableLifeOS?: boolean;
    enableSchoolOS?: boolean;
    enableWorkOS?: boolean;
    enableCareerOS?: boolean;
    enableStudyAbroad?: boolean;
    enableTreasuryOS?: boolean;
    enableMasterOS?: boolean;
  },
  now: Date = new Date(),
): boolean {
  const unlocked = canAccessPaidHubs(options.entitlement, now);
  if (name === "Life" || name === "Dashboard") return options.enableLifeOS !== false;
  if (name === "School") return options.enableSchoolOS !== false;
  if (name === "Career") return options.enableCareerOS !== false;
  if (name === "Work") return unlocked && options.enableWorkOS !== false;
  if (name === "Study Abroad") return unlocked && options.enableStudyAbroad !== false;
  if (name === "Treasury") return unlocked && options.enableTreasuryOS !== false;
  if (name === "Mastery") return unlocked && options.enableMasterOS !== false;
  return true;
}
