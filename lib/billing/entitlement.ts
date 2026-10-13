/** LifeOS access entitlement — promo unlock + paid plans. */

export const LIFEOS_PROMO_CODE = '"Shafkat Rocks!"';

/** One calendar year of access from redeem time. */
export const PROMO_ACCESS_MS = 365 * 24 * 60 * 60 * 1000;

export type EntitlementStatus = "none" | "promo" | "pro";

export type EntitlementSource = "promo" | "stripe" | "app_store";

export type Entitlement = {
  status: EntitlementStatus;
  /** ISO timestamp when access ends (required for promo / timed pro). */
  expiresAt?: string;
  unlockedAt?: string;
  source?: EntitlementSource;
  /** Stored only when unlocked via promo. */
  promoCode?: string;
};

export type SettingsWithEntitlement = {
  entitlement?: Entitlement | null;
};

export function normalizePromoInput(raw: string): string {
  return raw.trim();
}

export function isValidPromoCode(raw: string): boolean {
  return normalizePromoInput(raw) === LIFEOS_PROMO_CODE;
}

export function isEntitled(
  entitlement?: Entitlement | null,
  now: Date = new Date(),
): boolean {
  if (!entitlement || entitlement.status === "none") return false;
  if (!entitlement.expiresAt) {
    // Untimed pro (lifetime) — treat as entitled.
    return entitlement.status === "pro";
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

/** Human label for Settings / paywall status chip. */
export function entitlementStatusLabel(
  entitlement?: Entitlement | null,
  now: Date = new Date(),
): string {
  if (!isEntitled(entitlement, now)) return "Locked";
  if (entitlement?.status === "promo") {
    const until = entitlement.expiresAt
      ? new Date(entitlement.expiresAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "1 year";
    return `Founder access · until ${until}`;
  }
  if (entitlement?.expiresAt) {
    const until = new Date(entitlement.expiresAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `LifeOS Pro · until ${until}`;
  }
  return "LifeOS Pro";
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
