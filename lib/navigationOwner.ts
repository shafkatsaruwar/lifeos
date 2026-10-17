/** Owner-only gate for the Navigation (Executive Function) page. */

export const NAVIGATION_OWNER_EMAILS = [
  "mohammedsaruwar@icloud.com",
] as const;

export function isNavigationOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (NAVIGATION_OWNER_EMAILS as readonly string[]).some(
    (allowed) => allowed.toLowerCase() === normalized,
  );
}
