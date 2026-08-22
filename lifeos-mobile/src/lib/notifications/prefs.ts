import type { NotificationLead, NotificationPrefs, SettingsState } from "../../types";
import { DEFAULT_LEADS } from "./types";

export function resolveNotificationPrefs(settings: SettingsState): Required<
  Pick<
    NotificationPrefs,
    "enabled" | "tasks" | "dueDates" | "deadlines" | "calendar" | "focus" | "important"
  >
> & { leads: NotificationLead[]; permissionAskedAt?: string } {
  const n = settings.notifications ?? {};
  return {
    enabled: n.enabled === true,
    tasks: n.tasks !== false,
    dueDates: n.dueDates !== false,
    deadlines: n.deadlines !== false,
    calendar: n.calendar !== false,
    focus: n.focus !== false,
    important: n.important !== false,
    leads: n.leads?.length ? n.leads : DEFAULT_LEADS,
    permissionAskedAt: n.permissionAskedAt,
  };
}

export function withNotificationPrefs(
  settings: SettingsState,
  patch: Partial<NotificationPrefs>,
): SettingsState {
  return {
    ...settings,
    notifications: {
      ...settings.notifications,
      ...patch,
    },
  };
}
