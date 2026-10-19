/**
 * Kill-switch for iOS Career hub (OTA-safe).
 *
 * Soft-load + CareerErrorBoundary + sanitized hub normalize must stay in place.
 * Set false only if Career open/launch crashes again on TestFlight.
 *
 * Keep this file dependency-free: firebase → careerSafe imports it at boot.
 */
export const CAREER_IOS_ENABLED = true;
