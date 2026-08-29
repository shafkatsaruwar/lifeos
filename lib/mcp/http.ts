const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function acceptIncludes(accept: string | null | undefined, type: string): boolean {
  if (!accept) return false;
  const needle = type.toLowerCase();
  return accept
    .toLowerCase()
    .split(",")
    .some((part) => part.trim().startsWith(needle));
}

export function wantsSse(accept: string | null | undefined): boolean {
  return acceptIncludes(accept, "text/event-stream");
}

export function encodeSseMessage(message: unknown, event = "message"): string {
  return `event: ${event}\ndata: ${JSON.stringify(message)}\n\n`;
}

export function encodeSsePayload(payload: unknown): string {
  if (payload == null) return "";
  if (Array.isArray(payload)) return payload.map((item) => encodeSseMessage(item)).join("");
  return encodeSseMessage(payload);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** True when every item is a JSON-RPC notification or a client response (no request id+method). */
export function isNotificationOrResponseOnly(payload: unknown): boolean {
  const items = Array.isArray(payload) ? payload : [payload];
  if (items.length === 0) return false;
  return items.every((item) => {
    const rec = asRecord(item);
    if (!rec) return false;
    const hasMethod = typeof rec.method === "string";
    if (hasMethod && rec.id === undefined) return true;
    if (!hasMethod && (rec.result !== undefined || rec.error !== undefined)) return true;
    return false;
  });
}

function hostnameOf(origin: string): string | null {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

function requestHostname(host: string | null | undefined): string {
  return (host || "").split(":")[0].toLowerCase();
}

/**
 * DNS-rebinding guard for local hosts. Hosted MCP (Vercel) allows any Origin —
 * clients are Cursor / Grok, not a browser, and the route is bearer-token gated.
 */
export function isAllowedOrigin(origin: string | null | undefined, host: string | null | undefined): boolean {
  if (!origin || origin === "null") return true;
  const hostname = hostnameOf(origin);
  if (!hostname) return false;
  const requestHost = requestHostname(host);
  if (hostname === requestHost) return true;
  if (LOCAL_HOSTS.has(requestHost) && !LOCAL_HOSTS.has(hostname)) return false;
  return true;
}

export function mcpCorsHeaders(origin: string | null | undefined): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && origin !== "null" ? origin : "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Accept, Mcp-Session-Id, Last-Event-ID, MCP-Protocol-Version, X-LifeOS-Token",
    "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
