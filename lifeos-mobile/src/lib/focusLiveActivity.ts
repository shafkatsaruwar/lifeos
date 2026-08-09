import { Platform } from "react-native";
import type { Task } from "../types";

type LiveActivityModule = typeof import("expo-live-activity");

let LiveActivity: LiveActivityModule | null = null;
try {
  if (Platform.OS === "ios") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    LiveActivity = require("expo-live-activity") as LiveActivityModule;
  }
} catch {
  LiveActivity = null;
}

/** One Focus Live Activity at a time. */
let activeActivityId: string | undefined;
let activeTaskId: number | undefined;

const CONFIG = {
  backgroundColor: "#111827",
  titleColor: "#F8FAFC",
  subtitleColor: "#94A3B8",
  progressViewTint: "#3B82F6",
  progressViewLabelColor: "#F8FAFC",
  deepLinkUrl: "/focus",
  timerType: "digital" as const,
  padding: { horizontal: 18, top: 16, bottom: 16 },
};

function isAvailable() {
  return Platform.OS === "ios" && LiveActivity != null;
}

function shortTitle(raw: string) {
  const title = raw.trim() || "Focus";
  return title.length > 42 ? `${title.slice(0, 40).trim()}…` : title;
}

function stateFor(task: Task, remainingSeconds: number, running: boolean) {
  const title = shortTitle(task.title || "Focus");
  const space = (task.project || "Personal").trim();
  const subtitle = running ? space : `Paused · ${space}`;

  if (running && remainingSeconds > 0) {
    return {
      title,
      subtitle,
      progressBar: {
        date: Date.now() + remainingSeconds * 1000,
      },
    };
  }

  const total = Math.max(1, (task.focusMinutes ?? 25) * 60);
  const progress = Math.min(1, Math.max(0, 1 - remainingSeconds / total));
  return {
    title,
    subtitle,
    progressBar: {
      progress,
    },
  };
}

/** Start or refresh the Focus Live Activity (Lock Screen + Dynamic Island). */
export function syncFocusLiveActivity(task: Task, remainingSeconds: number, running: boolean) {
  if (!isAvailable() || !LiveActivity) return;

  const state = stateFor(task, remainingSeconds, running);

  try {
    if (!running) {
      if (activeActivityId) {
        LiveActivity.updateActivity(activeActivityId, state);
      }
      return;
    }

    if (activeActivityId && activeTaskId === task.id) {
      LiveActivity.updateActivity(activeActivityId, state);
      return;
    }

    if (activeActivityId) {
      try {
        LiveActivity.stopActivity(activeActivityId, state);
      } catch {
        /* ignore */
      }
      activeActivityId = undefined;
    }

    const id = LiveActivity.startActivity(state, CONFIG);
    if (id) {
      activeActivityId = id;
      activeTaskId = task.id;
    }
  } catch (error) {
    console.warn("[focusLiveActivity] sync failed", error);
  }
}

/** End the Live Activity when focus finishes or is dismissed permanently. */
export function endFocusLiveActivity(task?: Task, remainingSeconds = 0) {
  if (!isAvailable() || !LiveActivity || !activeActivityId) return;
  try {
    const state = task
      ? {
          title: task.title?.trim() || "Focus",
          subtitle: "Done",
          progressBar: { progress: 1 },
        }
      : {
          title: "Focus",
          subtitle: "Done",
          progressBar: { progress: 1 },
        };
    LiveActivity.stopActivity(activeActivityId, state);
  } catch (error) {
    console.warn("[focusLiveActivity] stop failed", error);
  } finally {
    activeActivityId = undefined;
    activeTaskId = undefined;
  }
}

export function focusLiveActivitySupported() {
  return isAvailable();
}
