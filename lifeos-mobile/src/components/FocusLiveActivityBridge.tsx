import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import { endFocusLiveActivity, syncFocusLiveActivity } from "../lib/focusLiveActivity";
import { taskRemaining } from "../lib/helpers";
import { cancelFocusNotifications } from "../lib/notifications";

/**
 * Restarts / refreshes the Focus Live Activity after app relaunch
 * when a focus session is still running or paused (even if FocusModal is closed).
 * Also catches up persisted remaining when returning from background.
 */
export function FocusLiveActivityBridge() {
  const { workspace, updateTasks } = useLifeOS();
  const lastKey = useRef<string>("");
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;

  useEffect(() => {
    const active = workspace.tasks.find(
      (t) => t.focusSessionStarted && !t.done && !t.canceled && (t.focusSessionRunning || (t.focusRemainingSeconds ?? 0) > 0),
    );
    if (!active) return;
    const remaining = taskRemaining(active);
    if (remaining <= 0) return;
    const running = Boolean(active.focusSessionRunning);
    const key = `${active.id}:${active.focusUpdatedAt}:${running}:${remaining}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    syncFocusLiveActivity(active, remaining, running);
  }, [workspace.tasks]);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state !== "active") return;
      const tasks = workspaceRef.current.tasks;
      const active = tasks.find(
        (t) => t.focusSessionStarted && !t.done && !t.canceled && t.focusSessionRunning,
      );
      if (!active) return;
      const remaining = taskRemaining(active);
      if (remaining <= 0) {
        void updateTasks(
          tasks.map((item) =>
            item.id === active.id
              ? {
                  ...item,
                  focusRemainingSeconds: 0,
                  focusSessionRunning: false,
                  focusUpdatedAt: new Date().toISOString(),
                }
              : item,
          ),
        );
        endFocusLiveActivity(active, 0);
        void cancelFocusNotifications(active.id);
        return;
      }
      // Re-baseline so in-app UI / widgets match the Live Activity wall-clock.
      void updateTasks(
        tasks.map((item) =>
          item.id === active.id
            ? {
                ...item,
                focusRemainingSeconds: remaining,
                focusSessionRunning: true,
                focusUpdatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      syncFocusLiveActivity(active, remaining, true);
      lastKey.current = `${active.id}:${new Date().toISOString()}:true:${remaining}`;
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [updateTasks]);

  return null;
}
