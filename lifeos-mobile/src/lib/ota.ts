import * as Updates from "expo-updates";

/**
 * Prefetch a published EAS Update in the background.
 *
 * Do NOT call Updates.reloadAsync() here. Native `checkAutomatically: ON_LOAD`
 * already applies the latest downloaded update on the next cold start. Reloading
 * mid-launch races Expo ErrorRecovery and surfaces as SIGABRT
 * (StartupProcedure.throwException → ErrorRecovery.crash) when the new bundle
 * throws during boot — which is exactly the TestFlight crash we were seeing.
 */
export async function applyOtaUpdateIfAvailable(): Promise<boolean> {
  if (__DEV__ || !Updates.isEnabled) return false;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return false;
    await Updates.fetchUpdateAsync();
    return true;
  } catch (error) {
    console.warn("[LifeOS] OTA prefetch failed", error);
    return false;
  }
}
