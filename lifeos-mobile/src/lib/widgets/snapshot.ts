import { Platform } from "react-native";
import type { Workspace } from "../../types";
import { taskIsOpen, taskRemaining, toDateKey } from "../helpers";
import { mergeCalendarWithWorkMeetings } from "../workos";

const APP_GROUP = "group.com.shafkatsaruwar.lifeos";
const SNAPSHOT_KEY = "lifeosWidgetSnapshot";

/** Accent tokens from the LifeOS widget mockups. */
export const WIDGET_ACCENTS = {
  now: "#3B82F6",
  attention: "#F59E0B",
  tasks: "#22C55E",
  deadline: "#EF4444",
  calendar: "#8B5CF6",
  today: "#22C55E",
} as const;

export type AttentionKind = "deadline" | "event" | "focus" | "task" | "stale";

export type AttentionItem = {
  id: string;
  kind: AttentionKind;
  title: string;
  subtitle?: string;
  /** Relative / short meta: "high", "45m", "tonight" */
  meta?: string;
  deepLink: string;
  /** Minutes until actionable moment; lower = hotter */
  urgency: number;
};

export type WidgetSnapshot = {
  updatedAt: string;
  /** NOW / FOCUS */
  focus: {
    active: boolean;
    title?: string;
    project?: string;
    remainingMinutes?: number;
    endsAtLabel?: string;
    nextTitle?: string;
    progress?: number; // 0…1
    deepLink: string;
  };
  /** ATTENTION — the notification brain */
  attention: {
    count: number;
    headline: string;
    items: AttentionItem[];
    deepLink: string;
  };
  /** TASKS */
  tasks: {
    dueToday: number;
    highPriority: number;
    items: { id: number; title: string; when: string; deepLink: string }[];
    deepLink: string;
  };
  /** DEADLINE (hottest academic/life due) */
  deadline: {
    title?: string;
    hoursLeft?: number;
    label?: string;
    deepLink: string;
  };
  /** CALENDAR next event */
  calendar: {
    title?: string;
    whenLabel?: string;
    prep?: string;
    deepLink: string;
  };
  /** LIFEOS TODAY large */
  today: {
    activeFocus: number;
    tasksDue: number;
    eventsSoon: number;
    deadlineHot: number;
    deepLink: string;
  };
};

function minutesUntil(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso.length <= 10 ? `${iso}T23:59:00` : iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 60_000);
}

function formatWhenLabel(iso?: string, today = toDateKey(new Date())): string {
  if (!iso) return "";
  const day = iso.slice(0, 10);
  const time = iso.includes("T") ? iso.slice(11, 16) : "";
  const hh = time ? Number(time.slice(0, 2)) : NaN;
  const mm = time ? time.slice(3, 5) : "";
  const ampm =
    Number.isFinite(hh) && time
      ? `${((hh + 11) % 12) + 1}${mm === "00" ? "" : `:${mm}`}${hh >= 12 ? "p" : "a"}`
      : "";
  if (day === today) return ampm || "today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (day === toDateKey(tomorrow)) return ampm ? `tmw ${ampm}` : "tomorrow";
  return ampm || day.slice(5);
}

function endsAtLabel(remainingSeconds: number): string {
  const end = new Date(Date.now() + remainingSeconds * 1000);
  return end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Build a glanceable snapshot for WidgetKit — Attention-first, never dump everything. */
export function buildWidgetSnapshot(workspace: Workspace): WidgetSnapshot {
  const today = toDateKey(new Date());
  const open = workspace.tasks.filter(taskIsOpen);
  const dueToday = open.filter((t) => (t.due || "").slice(0, 10) === today);
  const highPriority = open.filter((t) => (t.priority || "Medium") === "High");
  const overdue = open
    .filter((t) => t.due && t.due.slice(0, 10) < today)
    .sort((a, b) => String(a.due).localeCompare(String(b.due)));
  const dueTonight = dueToday
    .slice()
    .sort((a, b) => String(a.startTime || "23:59").localeCompare(String(b.startTime || "23:59")));

  const focusing = open.find((t) => t.focusSessionRunning || (t.focusSessionStarted && (t.focusRemainingSeconds ?? 0) > 0));
  const remainingSec = focusing ? taskRemaining(focusing) : 0;
  const focusMinutes = focusing?.focusMinutes ?? 30;
  const progress =
    focusing && focusMinutes > 0
      ? Math.min(1, Math.max(0, 1 - remainingSec / (focusMinutes * 60)))
      : 0;

  const nextAfterFocus =
    open
      .filter((t) => t.id !== focusing?.id)
      .sort((a, b) => String(a.due ?? "9999").localeCompare(String(b.due ?? "9999")))[0] || undefined;

  const calendarEvents =
    workspace.settings.enableWorkOS === false
      ? workspace.calendar
      : mergeCalendarWithWorkMeetings(workspace.calendar, workspace.work);

  const upcomingEvents = calendarEvents
    .filter((e) => {
      const start = e.start.length <= 10 ? `${e.start}T09:00` : e.start;
      return new Date(start).getTime() >= Date.now() - 5 * 60_000;
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  const nextEvent = upcomingEvents[0];
  const nextEventMins = minutesUntil(
    nextEvent?.start.length && nextEvent.start.length <= 10
      ? `${nextEvent.start}T09:00`
      : nextEvent?.start,
  );

  const attention: AttentionItem[] = [];

  if (focusing && focusing.focusSessionRunning) {
    attention.push({
      id: `focus-${focusing.id}`,
      kind: "focus",
      title: `Now: ${focusing.title}`,
      subtitle: `${Math.max(1, Math.ceil(remainingSec / 60))} minutes left in focus`,
      meta: "NOW",
      deepLink: "lifeos://focus",
      urgency: 0,
    });
  } else if (focusing && focusing.focusSessionStarted && !focusing.focusSessionRunning) {
    attention.push({
      id: `focus-paused-${focusing.id}`,
      kind: "focus",
      title: `Paused: ${focusing.title}`,
      subtitle: "Resume focus when ready",
      meta: "PAUSE",
      deepLink: "lifeos://focus",
      urgency: 5,
    });
  }

  for (const t of overdue.slice(0, 2)) {
    attention.push({
      id: `overdue-${t.id}`,
      kind: "deadline",
      title: t.title,
      subtitle: "Overdue",
      meta: "high",
      deepLink: `lifeos://task/${t.id}`,
      urgency: 1,
    });
  }

  for (const t of dueTonight.slice(0, 2)) {
    if (attention.some((a) => a.id === `overdue-${t.id}`)) continue;
    attention.push({
      id: `due-${t.id}`,
      kind: "deadline",
      title: "Deadline tonight",
      subtitle: t.title,
      meta: (t.priority || "Medium").toLowerCase(),
      deepLink: `lifeos://task/${t.id}`,
      urgency: 10 + (t.priority === "High" ? 0 : 5),
    });
  }

  if (nextEvent && nextEventMins != null && nextEventMins <= 180) {
    attention.push({
      id: `event-${nextEvent.id}`,
      kind: "event",
      title: nextEventMins <= 60 ? `Event in ${Math.max(1, nextEventMins)}m` : nextEvent.title,
      subtitle: nextEventMins <= 60 ? nextEvent.title : formatWhenLabel(nextEvent.start, today),
      meta: nextEventMins <= 60 ? `${Math.max(1, nextEventMins)}m` : "soon",
      deepLink: "lifeos://calendar",
      urgency: 15 + Math.max(0, nextEventMins),
    });
  }

  // Stale high-priority with no due date
  for (const t of highPriority.filter((x) => !x.due).slice(0, 1)) {
    attention.push({
      id: `stale-${t.id}`,
      kind: "stale",
      title: t.title,
      subtitle: "High priority · no due date",
      meta: "high",
      deepLink: `lifeos://task/${t.id}`,
      urgency: 40,
    });
  }

  attention.sort((a, b) => a.urgency - b.urgency);
  const topAttention = attention.slice(0, 4);
  const attentionCount = topAttention.length;
  const headline =
    attentionCount === 0
      ? "You're clear"
      : attentionCount === 1
        ? "1 thing needs you"
        : attentionCount <= 3
          ? `Only ${attentionCount} alerts matter`
          : `${attentionCount} things need you`;

  const hottestDeadline =
    overdue[0] ||
    dueTonight.find((t) => t.priority === "High") ||
    dueTonight[0] ||
    open
      .filter((t) => t.due)
      .sort((a, b) => String(a.due).localeCompare(String(b.due)))[0];

  const deadlineMins = hottestDeadline?.due
    ? minutesUntil(
        hottestDeadline.startTime
          ? `${hottestDeadline.due.slice(0, 10)}T${hottestDeadline.startTime}`
          : `${hottestDeadline.due.slice(0, 10)}T23:59`,
      )
    : null;

  const taskRows = (dueToday.length ? dueToday : open)
    .slice(0, 3)
    .map((t) => ({
      id: t.id,
      title: t.title,
      when: t.focusSessionRunning
        ? "now"
        : t.due?.slice(0, 10) === today
          ? formatWhenLabel(t.startTime ? `${t.due}T${t.startTime}` : t.due, today) || "today"
          : formatWhenLabel(t.due, today) || "soon",
      deepLink: `lifeos://task/${t.id}`,
    }));

  const eventsSoon = upcomingEvents.filter((e) => {
    const m = minutesUntil(e.start.length <= 10 ? `${e.start}T09:00` : e.start);
    return m != null && m <= 24 * 60;
  }).length;

  return {
    updatedAt: new Date().toISOString(),
    focus: {
      active: Boolean(focusing?.focusSessionRunning),
      title: focusing?.title,
      project: focusing?.project,
      remainingMinutes: focusing ? Math.max(0, Math.ceil(remainingSec / 60)) : undefined,
      endsAtLabel: focusing && remainingSec > 0 ? endsAtLabel(remainingSec) : undefined,
      nextTitle: nextAfterFocus?.title,
      progress,
      deepLink: focusing ? "lifeos://focus" : "lifeos://now",
    },
    attention: {
      count: attentionCount,
      headline,
      items: topAttention,
      deepLink: "lifeos://now",
    },
    tasks: {
      dueToday: dueToday.length,
      highPriority: highPriority.length,
      items: taskRows,
      deepLink: "lifeos://tasks",
    },
    deadline: {
      title: hottestDeadline?.title,
      hoursLeft:
        deadlineMins != null ? Math.max(0, Math.round(deadlineMins / 60)) : undefined,
      label:
        deadlineMins != null && deadlineMins < 24 * 60
          ? deadlineMins < 60
            ? `${Math.max(1, deadlineMins)}m`
            : `${Math.max(1, Math.round(deadlineMins / 60))}h`
          : hottestDeadline?.due
            ? formatWhenLabel(hottestDeadline.due, today)
            : undefined,
      deepLink: hottestDeadline ? `lifeos://task/${hottestDeadline.id}` : "lifeos://tasks",
    },
    calendar: {
      title: nextEvent?.title,
      whenLabel: nextEvent
        ? (() => {
            const start = nextEvent.start.length <= 10 ? `${nextEvent.start}T09:00` : nextEvent.start;
            const d = new Date(start);
            const day = toDateKey(d);
            const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
            if (day === today) return `Next at ${time.replace(/:00/, "").toLowerCase().replace(" ", "")}`;
            return formatWhenLabel(start, today);
          })()
        : undefined,
      prep: nextEvent?.notes?.split(" · ")[0],
      deepLink: "lifeos://calendar",
    },
    today: {
      activeFocus: focusing?.focusSessionRunning ? 1 : 0,
      tasksDue: dueToday.length + overdue.length,
      eventsSoon,
      deadlineHot: overdue.length + dueTonight.filter((t) => t.priority === "High").length,
      deepLink: "lifeos://now",
    },
  };
}

/**
 * Persist snapshot for WidgetKit via App Group (`ExtensionStorage`) + document fallback.
 */
export async function writeWidgetSnapshot(workspace: Workspace): Promise<void> {
  if (Platform.OS !== "ios") return;
  const snapshot = buildWidgetSnapshot(workspace);
  const payload = JSON.stringify(snapshot);

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ExtensionStorage } = require("@bacons/apple-targets") as typeof import("@bacons/apple-targets");
    const storage = new ExtensionStorage(APP_GROUP);
    storage.set(SNAPSHOT_KEY, payload);
    ExtensionStorage.reloadWidget();
  } catch (error) {
    console.warn("[widgets] ExtensionStorage write failed", error);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require("expo-file-system/legacy") as typeof import("expo-file-system/legacy");
    const base = FileSystem.documentDirectory;
    if (base) {
      await FileSystem.writeAsStringAsync(`${base}lifeos-widget-snapshot.json`, payload);
    }
  } catch {
    /* optional fallback */
  }
}

export function widgetDeepLink(
  kind: "now" | "attention" | "tasks" | "deadline" | "calendar" | "today",
): string {
  switch (kind) {
    case "now":
    case "attention":
    case "today":
      return "lifeos://now";
    case "tasks":
    case "deadline":
      return "lifeos://tasks";
    case "calendar":
      return "lifeos://calendar";
  }
}

export { APP_GROUP, SNAPSHOT_KEY };
