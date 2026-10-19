import { Platform } from "react-native";

const APP_GROUP = "group.com.shafkatsaruwar.lifeos";
const PENDING_KEY = "lifeosPendingKeptCommands";

export type PendingKeptCommand =
  | { kind: "SAVE"; name: string; location: string; createdAt?: string; id?: string }
  | { kind: "FIND"; query: string; createdAt?: string; id?: string };

export function parseKeptUrl(url: string | null | undefined): PendingKeptCommand | null {
  if (!url) return null;
  if (!url.startsWith("lifeos://") && !url.startsWith("exp+lifeos-mobile://")) return null;
  try {
    const parsed = new URL(url);
    const hostPath = [parsed.host, parsed.pathname.replace(/^\//, "")].filter(Boolean).join("/");
    if (hostPath === "kept-remember" || hostPath.startsWith("kept-remember")) {
      const name = (parsed.searchParams.get("name") || "").trim();
      const location = (parsed.searchParams.get("location") || "").trim();
      if (!name || !location) return null;
      return { kind: "SAVE", name, location };
    }
    if (hostPath === "kept-find" || hostPath.startsWith("kept-find")) {
      const query = (parsed.searchParams.get("query") || parsed.searchParams.get("name") || "").trim();
      if (!query) return null;
      return { kind: "FIND", query };
    }
  } catch {
    return null;
  }
  return null;
}

export function isKeptUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("kept-remember") || url.includes("kept-find");
}

function parsePending(raw: unknown): PendingKeptCommand[] {
  if (!raw) return [];
  let rows: unknown[] = [];
  if (Array.isArray(raw)) rows = raw;
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      rows = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  const out: PendingKeptCommand[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (r.kind === "SAVE" && typeof r.name === "string" && typeof r.location === "string") {
      const name = r.name.trim();
      const location = r.location.trim();
      if (name && location) out.push({ kind: "SAVE", name, location });
    }
    if (r.kind === "FIND" && typeof r.query === "string") {
      const query = r.query.trim();
      if (query) out.push({ kind: "FIND", query });
    }
  }
  return out;
}

/** Read + clear App Group queue written by RememberKeptIntent / FindKeptIntent. */
export async function drainPendingKeptCommands(): Promise<PendingKeptCommand[]> {
  if (Platform.OS !== "ios") return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const native = (globalThis as any)?.expo?.modules?.ExtensionStorage;
    if (!native?.get) return [];

    const raw = native.get(PENDING_KEY, APP_GROUP) as string | null | undefined;
    const entries = parsePending(raw);

    if (native.setString) {
      native.setString(PENDING_KEY, "[]", APP_GROUP);
    }
    return entries;
  } catch (error) {
    console.warn("[siri] drainPendingKeptCommands failed", error);
    return [];
  }
}
