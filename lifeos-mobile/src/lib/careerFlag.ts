/**
 * Kill-switch for iOS Career hub (OTA-safe).
 *
 * false = Career is fully removed from iOS (no tab, settings, onboarding,
 * linking, or Career module require). Firebase still stores a stub hub via
 * careerSafe so web Career sync does not break bootstrap.
 *
 * Keep this file dependency-free: firebase → careerSafe imports it at boot.
 */
export const CAREER_IOS_ENABLED = false;
