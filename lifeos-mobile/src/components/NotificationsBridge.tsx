import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import {
  Notifications,
  navigateFromNotification,
  scheduleWorkspaceNotificationSync,
  type NotifPayload,
} from "../lib/notifications";
import { useLifeOS } from "../lib/LifeOSContext";

/**
 * Keeps local schedules in sync with workspace data and routes notification taps.
 */
export function NotificationsBridge() {
  const { workspace } = useLifeOS();
  const ready = useRef(false);

  useEffect(() => {
    scheduleWorkspaceNotificationSync(workspace);
  }, [workspace]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") scheduleWorkspaceNotificationSync(workspace);
    });
    return () => sub.remove();
  }, [workspace]);

  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotifPayload | undefined;
      navigateFromNotification(data);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response || ready.current) return;
      ready.current = true;
      const data = response.notification.request.content.data as NotifPayload | undefined;
      // Delay until navigation tree mounts.
      setTimeout(() => navigateFromNotification(data), 400);
    });

    return () => {
      responseSub.remove();
    };
  }, []);

  return null;
}
