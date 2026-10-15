import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  loadExecutiveHub,
  restoreExecutiveNotifications,
  tickExecutiveSchedules,
  saveExecutiveHub,
} from "../lib/executive";

/**
 * Restores Executive Function local notifications after cold start / foreground,
 * and advances due follow-ups via tickExecutiveSchedules.
 */
export function ExecutiveBridge() {
  const { user } = useLifeOS();
  const running = useRef(false);

  const restore = useCallback(async () => {
    if (!user?.uid || running.current) return;
    running.current = true;
    try {
      const hub = await loadExecutiveHub(user.uid);
      const ticked = tickExecutiveSchedules(hub);
      if (ticked !== hub) await saveExecutiveHub(user.uid, ticked);
      await restoreExecutiveNotifications(ticked);
    } catch {
      /* best-effort */
    } finally {
      running.current = false;
    }
  }, [user?.uid]);

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void restore();
    });
    return () => sub.remove();
  }, [restore]);

  return null;
}
