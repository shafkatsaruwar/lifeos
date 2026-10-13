import {
  LIFEOS_PROMO_CODE,
  canAccessPaidHubs,
  entitlementStatusLabel,
  grantLifetimeAccess,
  isEntitled,
  isPaidHub,
  isValidPromoCode,
  redeemPromoCode,
} from "../lib/billing/entitlement";
import { SUBSCRIPTION_OFFERS } from "../lib/legal/subscriptionTerms";

describe("entitlement / promo", () => {
  const now = new Date("2026-10-13T12:00:00.000Z");

  it("requires the exact promo string including quotes", () => {
    expect(LIFEOS_PROMO_CODE).toBe('"Shafkat Rocks!"');
    expect(isValidPromoCode('"Shafkat Rocks!"')).toBe(true);
    expect(isValidPromoCode("Shafkat Rocks!")).toBe(false);
    expect(isValidPromoCode('"shafkat rocks!"')).toBe(false);
    expect(isValidPromoCode('  "Shafkat Rocks!"  ')).toBe(true);
  });

  it("redeems promo for one year of paid-hub access", () => {
    const result = redeemPromoCode('"Shafkat Rocks!"', now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entitlement.status).toBe("promo");
    expect(canAccessPaidHubs(result.entitlement, now)).toBe(true);
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
});
