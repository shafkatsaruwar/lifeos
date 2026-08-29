import AsyncStorage from "@react-native-async-storage/async-storage";

function key(userId: string) {
  return `lifeos-onboarding-complete:${userId}`;
}

/** Device-cache fallback when Firebase settings lose onboardingCompletedAt. */
export async function readOnboardingComplete(userId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key(userId));
  } catch {
    return null;
  }
}

export async function writeOnboardingComplete(userId: string, completedAt: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId), completedAt);
  } catch {
    // Cache is best-effort — Firebase settings remain the source of truth.
  }
}
