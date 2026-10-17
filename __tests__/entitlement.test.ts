import {
  LIFEOS_LIFETIME_PROMO_CODE,
  LIFEOS_PROMO_CODE,
  canAccessPaidHubs,
  entitlementStatusLabel,
  grantLifetimeAccess,
  isEntitled,
  isLifetimePromoCode,
  isHubVisibleInNav,
  isPaidHub,
  isValidPromoCode,
  redeemPromoCode,
  redeemSuccessMessage,
} from "../lib/billing/entitlement";
import { SUBSCRIPTION_OFFERS } from "../lib/legal/subscriptionTerms";

describe("entitlement / promo", () => {
  const now = new Date("2026-10-13T12:00:00.000Z");

  it("requires the exact year promo string including quotes", () => {
    expect(LIFEOS_PROMO_CODE).toBe('"Shafkat Rocks!"');
    expect(isValidPromoCode('"Shafkat Rocks!"')).toBe(true);
    expect(isValidPromoCode("Shafkat Rocks!")).toBe(false);
    expect(isValidPromoCode('"shafkat rocks!"')).toBe(false);
    expect(isValidPromoCode('  "Shafkat Rocks!"  ')).toBe(true);
  });

  it("redeems year promo for one year of paid-hub access", () => {
    const result = redeemPromoCode('"Shafkat Rocks!"', now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entitlement.status).toBe("promo");
    expect(canAccessPaidHubs(result.entitlement, now)).toBe(true);
    const expires = Date.parse(result.entitlement.expiresAt!);
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    expect(expires - now.getTime()).toBe(yearMs);
    expect(isEntitled(result.entitlement, new Date(expires + 1))).toBe(false);
    expect(redeemSuccessMessage(result.entitlement)).toMatch(/one year/i);
  });

  it("redeems lifetime code for permanent Pro access", () => {
    expect(LIFEOS_LIFETIME_PROMO_CODE).toBe("8904272998");
    expect(isLifetimePromoCode("8904272998")).toBe(true);
    expect(isLifetimePromoCode(" 8904272998 ")).toBe(true);
    expect(isValidPromoCode("8904272998")).toBe(true);
    expect(isValidPromoCode("8904272999")).toBe(false);

    const result = redeemPromoCode("8904272998", now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entitlement.status).toBe("pro");
    expect(result.entitlement.expiresAt).toBeUndefined();
    expect(result.entitlement.source).toBe("promo");
    expect(canAccessPaidHubs(result.entitlement, now)).toBe(true);
    expect(canAccessPaidHubs(result.entitlement, new Date("2099-01-01T00:00:00.000Z"))).toBe(true);
    expect(entitlementStatusLabel(result.entitlement, now)).toMatch(/Lifetime/i);
    expect(redeemSuccessMessage(result.entitlement)).toMatch(/for life/i);
  });

  it("rejects bad codes", () => {
    const result = redeemPromoCode("FREE", now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/isn’t valid/i);
  });

  it("treats Home/School as free and Work/Study Abroad/Treasury/Mastery as paid hubs", () => {
    expect(isPaidHub("Life")).toBe(false);
    expect(isPaidHub("School")).toBe(false);
    expect(isPaidHub("Work")).toBe(true);
    expect(isPaidHub("Study Abroad")).toBe(true);
    expect(isPaidHub("Treasury")).toBe(true);
    expect(isPaidHub("Mastery")).toBe(true);
  });

  it("supports lifetime Pro without expiry", () => {
    const life = grantLifetimeAccess("stripe", now);
    expect(canAccessPaidHubs(life, now)).toBe(true);
    expect(entitlementStatusLabel(life, now)).toMatch(/Lifetime/i);
  });

  it("prices Pro at 4.99 / 49.99 / 99.99", () => {
    expect(SUBSCRIPTION_OFFERS.map((o) => o.priceLabel)).toEqual([
      "$4.99/month",
      "$49.99/year",
      "$99.99 once",
    ]);
  });

  it("hides Pro hubs from nav when locked even if enable flags are still true", () => {
    const legacyOn = {
      enableLifeOS: true,
      enableSchoolOS: true,
      enableCareerOS: true,
      enableWorkOS: true,
      enableStudyAbroad: true,
      enableTreasuryOS: true,
      enableMasterOS: true,
    };
    expect(isHubVisibleInNav("Life", legacyOn, now)).toBe(true);
    expect(isHubVisibleInNav("Home", legacyOn, now)).toBe(true);
    expect(isHubVisibleInNav("School", legacyOn, now)).toBe(true);
    expect(isHubVisibleInNav("Career", legacyOn, now)).toBe(true);
    expect(isHubVisibleInNav("Work", legacyOn, now)).toBe(false);
    expect(isHubVisibleInNav("Study Abroad", legacyOn, now)).toBe(false);
    expect(isHubVisibleInNav("Treasury", legacyOn, now)).toBe(false);
    expect(isHubVisibleInNav("Mastery", legacyOn, now)).toBe(false);

    const entitled = { ...legacyOn, entitlement: grantLifetimeAccess("promo", now) };
    expect(isHubVisibleInNav("Work", entitled, now)).toBe(true);
    expect(isHubVisibleInNav("Work", { ...entitled, enableWorkOS: false }, now)).toBe(false);
    expect(isHubVisibleInNav("Career", { ...legacyOn, enableCareerOS: false }, now)).toBe(false);
  });
});
