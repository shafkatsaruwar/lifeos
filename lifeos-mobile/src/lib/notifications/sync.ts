import type { Workspace } from "../../types";
import { resolveNotificationPrefs } from "./prefs";
import { focusEndPlan, planWorkspaceNotifications } from "./planner";
import {
  cancelAllLifeOSNotifications,
  cancelNotificationIds,
  getScheduledIds,
  schedulePlanned,
} from "./schedule";

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let lastFingerprint = "";

function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") return Object.values(value as Record<string, T>);
  return [];
}

function fingerprint(workspace: Workspace) {
  const prefs = resolveNotificationPrefs(workspace.settings);
  const tasks = asList<Workspace["tasks"][number]>(workspace.tasks);
  const calendar = asList<Workspace["calendar"][number]>(workspace.calendar);
  const taskPart = tasks
    .map((t) => `${t.id}:${t.due ?? ""}:${t.done ? 1 : 0}:${t.canceled ? 1 : 0}:${t.priority ?? ""}:${t.status ?? ""}`)
    .join("|");
  const calPart = calendar.map((e) => `${e.id}:${e.start}`).join("|");
  return `${prefs.enabled}:${JSON.stringify(prefs)}::${taskPart}::${calPart}`;
}

/** Debounced full reschedule of task/event notifications from workspace. */
export function scheduleWorkspaceNotificationSync(workspace: Workspace) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void syncWorkspaceNotifications(workspace).catch((error) => {
      console.warn("[LifeOS] notification sync failed", error);
    });
  }, 600);
}

export async function syncWorkspaceNotifications(workspace: Workspace) {
  try {
    const fp = fingerprint(workspace);
    if (fp === lastFingerprint) return;
    lastFingerprint = fp;

    const prefs = resolveNotificationPrefs(workspace.settings);
    const existing = await getScheduledIds();
    const workspaceIds = existing.filter((id) => id.startsWith("task:") || id.startsWith("event:"));
    await cancelNotificationIds(workspaceIds);

    if (!prefs.enabled) return;

    const planned = planWorkspaceNotifications(workspace);
    await schedulePlanned(planned);
  } catch (error) {
    console.warn("[LifeOS] notification sync failed", error);
  }
}

export async function cancelFocusNotifications(taskId: number) {
  await cancelNotificationIds([`focus:${taskId}:end`, `focus:${taskId}:warn`]);
}

export async function scheduleFocusNotifications(taskId: number, remainingSeconds: number, enabled: boolean) {
  await cancelFocusNotifications(taskId);
  if (!enabled || remainingSeconds <= 5) return;
  await schedulePlanned(focusEndPlan(taskId, remainingSeconds));
}

export async function disableAllNotifications() {
  lastFingerprint = "";
  await cancelAllLifeOSNotifications();
}
