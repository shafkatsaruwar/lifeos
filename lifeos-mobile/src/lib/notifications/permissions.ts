import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
import type { SettingsState } from "../../types";
import { withNotificationPrefs } from "./prefs";

export type PermissionState = "undetermined" | "granted" | "denied";

export async function getNotificationPermission(): Promise<PermissionState> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return "granted";
  if (current.canAskAgain === false || current.status === Notifications.PermissionStatus.DENIED) return "denied";
  return "undetermined";
}

/**
 * Ask only when the user opts in (settings toggle / first reminder need).
 * Never call from cold start of the home screen.
 */
export async function requestNotificationPermission(): Promise<PermissionState> {
  const current = await getNotificationPermission();
  if (current === "granted") return "granted";
  if (current === "denied") return "denied";
  const next = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return next.granted ? "granted" : "denied";
}

export async function openSystemNotificationSettings() {
  if (Platform.OS === "ios") {
    await Linking.openURL("app-settings:");
    return;
  }
  await Linking.openSettings();
}

export function markPermissionAsked(settings: SettingsState): SettingsState {
  return withNotificationPrefs(settings, { permissionAskedAt: new Date().toISOString() });
}
