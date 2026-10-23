/**
 * Kill-switch for Focus Live Activity native calls (TestFlight stability).
 *
 * true = start/stop/update via expo-live-activity (can throw sync NSExceptions
 * on iOS 27 when Activities aren't available — fatal after RN void-exception patch).
 * false = no-op; focus timer still works in-app + notifications.
 */
export const LIVE_ACTIVITY_IOS_ENABLED = false;
