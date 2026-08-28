import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  loadFocusEnforcerPrefs,
  loadLiveFocusEnforcerSessions,
  restoreFocusEnforcerNotifications,
} from "../lib/focusEnforcer";

/**
 * Restores Focus Enforcer local notifications from Firebase after cold start
 * and whenever the app returns to foreground.
 */
export function FocusEnforcerBridge() {
  const { user, workspace } = useLifeOS();
  const preferredName = workspace.settings.preferredName;
  const running = useRef(false);

  const restore = useCallback(async () => {
    if (!user?.uid || running.current) return;
    running.current = true;
    try {
      const [sessions, prefs] = await Promise.all([
        loadLiveFocusEnforcerSessions(user.uid),
        loadFocusEnforcerPrefs(user.uid),
      ]);
      if (!prefs.enabled) return;
      await restoreFocusEnforcerNotifications(sessions, prefs, preferredName);
    } catch {
      /* Firebase / notification restore is best-effort */
    } finally {
      running.current = false;
    }
  }, [user?.uid, preferredName]);

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
