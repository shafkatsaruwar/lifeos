import { randomBytes } from "crypto";

export const MCP_SESSION_HEADER = "mcp-session-id";
export const MCP_PROTOCOL_HEADER = "mcp-protocol-version";

export function newMcpSessionId(): string {
  return randomBytes(16).toString("hex");
}

export function mcpCorsHeaders(origin?: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Accept, Mcp-Session-Id, Last-Event-ID, X-LifeOS-Token, MCP-Protocol-Version",
    "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function acceptIncludes(accept: string | null | undefined, type: string): boolean {
  if (!accept) return false;
  return accept
    .split(",")
    .some((part) => part.trim().toLowerCase().startsWith(type.toLowerCase()));
}

/** Prefer JSON when both are offered (Vercel-friendly). SSE only when JSON is not accepted. */
export function preferSseResponse(accept: string | null | undefined): boolean {
  return acceptIncludes(accept, "text/event-stream") && !acceptIncludes(accept, "application/json");
}

export function encodeSseJson(payload: unknown): string {
  return `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
}

export function encodeSseComment(text: string): string {
  return `: ${text}\n\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Notifications (no id) and JSON-RPC responses (result/error, no method) must get 202. */
export function isNotificationOrResponseOnly(payload: unknown): boolean {
  const items = Array.isArray(payload) ? payload : [payload];
  if (items.length === 0) return false;
  return items.every((item) => {
    if (!isRecord(item)) return false;
    if (typeof item.method === "string") return item.id === undefined;
    return "result" in item || "error" in item;
  });
}
