import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { PlannedNotification } from "./types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady = false;

export async function ensureAndroidChannel() {
  if (Platform.OS !== "android" || channelReady) return;
  await Notifications.setNotificationChannelAsync("lifeos-default", {
    name: "LifeOS",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  channelReady = true;
}

export async function cancelNotificationIds(ids: string[]) {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}

export async function cancelAllLifeOSNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function schedulePlanned(items: PlannedNotification[]) {
  await ensureAndroidChannel();
  for (const item of items) {
    if (item.fireAt.getTime() <= Date.now() + 2_000) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: item.id,
        content: {
          title: item.title,
          body: item.body,
          data: item.payload as unknown as Record<string, unknown>,
          sound: true,
          ...(Platform.OS === "android" ? { channelId: "lifeos-default" } : null),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: item.fireAt,
        },
      });
    } catch {
      /* scheduling can fail if permission missing */
    }
  }
}

export async function getScheduledIds(): Promise<string[]> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.map((n) => n.identifier);
}

export { Notifications };
