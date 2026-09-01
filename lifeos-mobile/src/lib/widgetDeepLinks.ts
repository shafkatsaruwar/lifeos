import { parseTaskRouteId } from "./helpers";

export function parseWidgetDeepLinkPath(url: string): string {
  try {
    const parsed = new URL(url);
    const path = [parsed.host, parsed.pathname.replace(/^\//, "")].filter(Boolean).join("/");
    if (path) return path.replace(/\/+$/, "");
  } catch {
    // fall through
  }
  return url.replace(/^[^:]+:\/\//, "").replace(/^\//, "").replace(/\/+$/, "");
}

export function parseTaskIdFromWidgetPath(path: string): number | null {
  const match = path.match(/^(?:now\/)?task\/(\d+)$/);
  if (!match) return null;
  return parseTaskRouteId(match[1]);
}
