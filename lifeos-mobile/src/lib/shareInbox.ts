import { Platform } from "react-native";
import type { CalendarEvent } from "../types";
import { parseIcsEvents } from "./api";

export const SHARE_APP_GROUP = "group.com.shafkatsaruwar.lifeos";
export const SHARE_QUEUE_KEY = "lifeosPendingShares";

export type SharePayload = {
  id?: string;
  at?: string;
  kind?: "ics" | "text" | "url" | "file";
  text?: string;
  filename?: string;
};

function parseQueue(raw: unknown): SharePayload[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as SharePayload[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }
  return [];
}

export async function drainPendingShares(): Promise<SharePayload[]> {
  if (Platform.OS !== "ios") return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const native = (globalThis as any)?.expo?.modules?.ExtensionStorage;
    if (!native?.get) return [];
    const raw = native.get(SHARE_QUEUE_KEY, SHARE_APP_GROUP);
    const items = parseQueue(raw);
    if (native.setString) native.setString(SHARE_QUEUE_KEY, "[]", SHARE_APP_GROUP);
    else if (native.remove) native.remove(SHARE_QUEUE_KEY, SHARE_APP_GROUP);
    return items.filter((item) => item && (item.text || item.filename));
  } catch (error) {
    console.warn("[share] drainPendingShares failed", error);
    return [];
  }
}

export function looksLikeIcs(text: string, filename?: string) {
  const name = (filename ?? "").toLowerCase();
  if (name.endsWith(".ics")) return true;
  const head = text.slice(0, 80).toUpperCase();
  return head.includes("BEGIN:VCALENDAR") || head.includes("BEGIN:VEVENT");
}

export function eventsFromShare(item: SharePayload): CalendarEvent[] {
  if (!item.text) return [];
  if (item.kind === "ics" || looksLikeIcs(item.text, item.filename)) {
    return parseIcsEvents(item.text);
  }
  return [];
}

export function isShareUrl(url: string | null | undefined) {
  if (!url) return false;
  return url.includes("lifeos://share") || url.includes("://share");
}
