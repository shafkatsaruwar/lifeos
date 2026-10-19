/**
 * Kill-switch for iOS Career hub (OTA-safe).
 *
 * HARD FLAG: set true only after Career launch is proven safe on TestFlight.
 * While false, Career never loads — app must still open.
 *
 * Keep this file dependency-free: firebase → careerSafe imports it at boot.
 */
export const CAREER_IOS_ENABLED = false;
