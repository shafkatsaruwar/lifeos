/** Deployed LifeOS web origin used when EXPO_PUBLIC_LIFEOS_URL is unset. */
export const PRODUCTION_LIFEOS_URL = "https://lifeos-mu-three.vercel.app";

/**
 * Resolve the LifeOS web origin for API / shell-auth calls.
 * Prefer EXPO_PUBLIC_LIFEOS_URL; fall back to localhost in dev and production URL otherwise.
 */
export function resolveLifeosApiBase(
  envUrl: string | undefined = process.env.EXPO_PUBLIC_LIFEOS_URL,
  isDev: boolean = typeof __DEV__ !== "undefined" && Boolean(__DEV__),
): string {
  const raw = (envUrl || "").trim().replace(/\/$/, "");
  if (raw) return raw;
  if (isDev) return "http://localhost:3000";
  return PRODUCTION_LIFEOS_URL;
}

/** True when the string looks like an http(s) or webcal calendar feed URL. */
export function looksLikeIcalFeedUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const normalized = trimmed.replace(/^webcal:/i, "https:");
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
