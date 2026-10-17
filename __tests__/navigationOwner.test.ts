import { isNavigationOwner, NAVIGATION_OWNER_EMAILS } from "../lib/navigationOwner";

describe("isNavigationOwner", () => {
  it("allows the LifeOS owner email (case-insensitive, trimmed)", () => {
    expect(NAVIGATION_OWNER_EMAILS).toContain("mohammedsaruwar@icloud.com");
    expect(isNavigationOwner("mohammedsaruwar@icloud.com")).toBe(true);
    expect(isNavigationOwner("MohammedSaruwar@iCloud.com")).toBe(true);
    expect(isNavigationOwner("  mohammedsaruwar@icloud.com  ")).toBe(true);
  });

  it("rejects other emails and empty values", () => {
    expect(isNavigationOwner("test@localhost")).toBe(false);
    expect(isNavigationOwner("someone@example.com")).toBe(false);
    expect(isNavigationOwner("")).toBe(false);
    expect(isNavigationOwner(null)).toBe(false);
    expect(isNavigationOwner(undefined)).toBe(false);
  });
});
