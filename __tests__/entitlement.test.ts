import {
  LIFEOS_PROMO_CODE,
  entitlementStatusLabel,
  isEntitled,
  isValidPromoCode,
  redeemPromoCode,
} from "../lib/billing/entitlement";

describe("entitlement / promo", () => {
  const now = new Date("2026-10-13T12:00:00.000Z");

  it("requires the exact promo string including quotes", () => {
    expect(LIFEOS_PROMO_CODE).toBe('"Shafkat Rocks!"');
    expect(isValidPromoCode('"Shafkat Rocks!"')).toBe(true);
    expect(isValidPromoCode('Shafkat Rocks!')).toBe(false);
    expect(isValidPromoCode('"shafkat rocks!"')).toBe(false);
    expect(isValidPromoCode('  "Shafkat Rocks!"  ')).toBe(true);
  });

  it("redeems promo for one year of access", () => {
    const result = redeemPromoCode('"Shafkat Rocks!"', now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entitlement.status).toBe("promo");
    expect(isEntitled(result.entitlement, now)).toBe(true);
    const expires = Date.parse(result.entitlement.expiresAt!);
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    expect(expires - now.getTime()).toBe(yearMs);
    expect(isEntitled(result.entitlement, new Date(expires + 1))).toBe(false);
  });

  it("rejects bad codes", () => {
    const result = redeemPromoCode("FREE", now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/isn’t valid/i);
  });

  it("labels founder access while entitled", () => {
    const result = redeemPromoCode('"Shafkat Rocks!"', now);
    if (!result.ok) throw new Error("expected redeem");
    expect(entitlementStatusLabel(result.entitlement, now)).toMatch(/Founder access/i);
    expect(entitlementStatusLabel(null, now)).toBe("Locked");
  });
});
