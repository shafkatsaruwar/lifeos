import { useEffect, useRef } from "react";
import { useLifeOS } from "../lib/LifeOSContext";
import { syncFocusLiveActivity } from "../lib/focusLiveActivity";
import { taskRemaining } from "../lib/helpers";

/**
 * Restarts / refreshes the Focus Live Activity after app relaunch
 * when a focus session is still running (even if FocusModal is closed).
 */
export function FocusLiveActivityBridge() {
  const { workspace } = useLifeOS();
  const lastKey = useRef<string>("");

  useEffect(() => {
    const active = workspace.tasks.find((t) => t.focusSessionRunning && !t.done && !t.canceled);
    if (!active) return;
    const remaining = taskRemaining(active);
    if (remaining <= 0) return;
    const key = `${active.id}:${active.focusUpdatedAt}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    syncFocusLiveActivity(active, remaining, true);
  }, [workspace.tasks]);

  return null;
}
