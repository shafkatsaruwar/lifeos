import { useEffect, useRef } from "react";
import { AppState, Linking, type AppStateStatus } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import { navigationRef } from "../navigation/navigationRef";
import {
  buildTaskFromTitle,
  drainPendingSiriTasks,
  isAddTaskUrl,
  parseAddTaskUrl,
} from "../lib/siri/addTask";

/** Handles Siri / Shortcuts `lifeos://add-task?title=…` and App Group pending queue. */
export function SiriTaskBridge() {
  const { workspace, updateTasks } = useLifeOS();
  const workspaceRef = useRef(workspace);
  const updateTasksRef = useRef(updateTasks);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    workspaceRef.current = workspace;
    updateTasksRef.current = updateTasks;
  }, [workspace, updateTasks]);

  useEffect(() => {
    const createFromTitle = (title: string) => {
      // Dedupe URL + App Group queue for the same Siri invocation.
      const dedupeKey = title.toLowerCase();
      if (seenRef.current.has(dedupeKey)) return;
      seenRef.current.add(dedupeKey);
      setTimeout(() => seenRef.current.delete(dedupeKey), 8_000);

      const id = Date.now();
      const task = buildTaskFromTitle(title, id);
      const current = workspaceRef.current.tasks;
      updateTasksRef.current([...current, task]);

      const tryNav = (attempt: number) => {
        if (navigationRef.isReady()) {
          navigationRef.navigate("TasksTab" as never, {
            screen: "TaskDetail",
            params: { taskId: id },
          } as never);
          return;
        }
        if (attempt >= 15) return;
        setTimeout(() => tryNav(attempt + 1), 100);
      };
      tryNav(0);
    };

    const applyUrl = (url: string | null) => {
      if (!url || !isAddTaskUrl(url)) return;
      const title = parseAddTaskUrl(url);
      if (title) createFromTitle(title);
    };

    const drain = async () => {
      const titles = await drainPendingSiriTasks();
      for (const title of titles) createFromTitle(title);
    };

    void Linking.getInitialURL().then(applyUrl);
    void drain();

    const linkSub = Linking.addEventListener("url", ({ url }) => applyUrl(url));
    const appSub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") void drain();
    });

    return () => {
      linkSub.remove();
      appSub.remove();
    };
  }, []);

  return null;
}
