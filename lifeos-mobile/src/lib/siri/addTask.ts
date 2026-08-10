import { Platform } from "react-native";
import type { Task } from "../../types";

const APP_GROUP = "group.com.shafkatsaruwar.lifeos";
const PENDING_KEY = "lifeosPendingSiriTasks";

export function parseAddTaskUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith("lifeos://") && !url.startsWith("exp+lifeos-mobile://")) return null;
  try {
    const parsed = new URL(url);
    const hostPath = [parsed.host, parsed.pathname.replace(/^\//, "")].filter(Boolean).join("/");
    if (hostPath !== "add-task" && !hostPath.startsWith("add-task?")) return null;
    const title = parsed.searchParams.get("title");
    const trimmed = (title || "").trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    const match = url.match(/[?&]title=([^&]+)/);
    if (!match) return null;
    try {
      const trimmed = decodeURIComponent(match[1].replace(/\+/g, " ")).trim();
      return trimmed.length > 0 ? trimmed : null;
    } catch {
      return null;
    }
  }
}

export function isAddTaskUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("add-task");
}

/** Same defaults as TasksScreen.createTask. */
export function buildTaskFromTitle(title: string, id = Date.now()): Task {
  return {
    id,
    title: title.trim() || "New task",
    project: "Inbox",
    priority: "Medium",
    focusMinutes: 30,
    energy: "Medium",
    status: "Not started",
    checklist: [],
    checklistProgress: [],
  };
}

type PendingEntry = { title?: string; id?: string; createdAt?: string };

function parsePendingPayload(raw: unknown): PendingEntry[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as PendingEntry[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Read + clear App Group queue written by AddTaskIntent. */
export async function drainPendingSiriTasks(): Promise<string[]> {
  if (Platform.OS !== "ios") return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const native = (globalThis as any)?.expo?.modules?.ExtensionStorage;
    if (!native?.get) return [];

    const raw = native.get(PENDING_KEY, APP_GROUP) as string | null | undefined;
    const entries = parsePendingPayload(raw);
    const titles = entries
      .map((e) => (typeof e?.title === "string" ? e.title.trim() : ""))
      .filter(Boolean);

    if (native.setString) {
      native.setString(PENDING_KEY, "[]", APP_GROUP);
    } else if (native.remove) {
      native.remove(PENDING_KEY, APP_GROUP);
    }
    return titles;
  } catch (error) {
    console.warn("[siri] drainPendingSiriTasks failed", error);
    return [];
  }
}
