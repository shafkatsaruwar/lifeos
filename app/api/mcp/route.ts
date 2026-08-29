import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, readMcpToken, tokensMatch } from "@/lib/mcp/auth";
import {
  encodeSsePayload,
  isAllowedOrigin,
  isNotificationOrResponseOnly,
  mcpCorsHeaders,
  wantsSse,
} from "@/lib/mcp/http";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION, handleMcpPayload, listToolDescriptors } from "@/lib/mcp/protocol";
import { readStoreConfig } from "@/lib/mcp/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "2025-03-26";

function withCors(response: NextResponse, origin: string | null): NextResponse {
  const cors = mcpCorsHeaders(origin);
  for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
  response.headers.set("MCP-Protocol-Version", PROTOCOL_VERSION);
  return response;
}

function unauthorized(origin: string | null) {
  return withCors(
    NextResponse.json(
      { error: "Unauthorized. Send Authorization: Bearer $LIFEOS_MCP_TOKEN." },
      { status: 401, headers: { "www-authenticate": "Bearer" } },
    ),
    origin,
  );
}

function disabled(origin: string | null) {
  return withCors(
    NextResponse.json(
      { error: "MCP HTTP is disabled. Set LIFEOS_MCP_TOKEN in the server environment." },
      { status: 503 },
    ),
    origin,
  );
}

function forbiddenOrigin(origin: string | null) {
  return withCors(
    NextResponse.json({ error: "Forbidden origin." }, { status: 403 }),
    origin,
  );
}

function authorize(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!isAllowedOrigin(origin, host)) return forbiddenOrigin(origin);

  const expected = readMcpToken();
  if (!expected) return disabled(origin);
  const provided =
    extractBearerToken(request.headers.get("authorization")) ||
    (request.headers.get("x-lifeos-token") || "").trim();
  if (!tokensMatch(provided, expected)) return unauthorized(origin);
  return null;
}

function sessionIdFor(payload: unknown): string | undefined {
  const items = Array.isArray(payload) ? payload : [payload];
  const initializing = items.some(
    (item) => item && typeof item === "object" && (item as { method?: unknown }).method === "initialize",
  );
  return initializing ? randomUUID() : undefined;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!isAllowedOrigin(origin, host)) return forbiddenOrigin(origin);
  return withCors(new NextResponse(null, { status: 204 }), origin);
}

export async function GET(request: NextRequest) {
  const blocked = authorize(request);
  if (blocked) return blocked;
  const origin = request.headers.get("origin");

  // Streamable HTTP: GET opens a server-push SSE stream. This server is request/response
  // only, so SSE listen is not offered. A JSON status remains for humans / health checks.
  if (wantsSse(request.headers.get("accept"))) {
    return withCors(new NextResponse(null, { status: 405, headers: { allow: "POST, OPTIONS, DELETE" } }), origin);
  }

  return withCors(
    NextResponse.json({
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
      transport: "streamable-http",
      alsoSupports: ["json-rpc-post"],
      endpoint: "/api/mcp",
      tools: listToolDescriptors().map((tool) => tool.name),
    }),
    origin,
  );
}

export async function DELETE(request: NextRequest) {
  const blocked = authorize(request);
  if (blocked) return blocked;
  return withCors(
    new NextResponse(null, { status: 405, headers: { allow: "POST, GET, OPTIONS" } }),
    request.headers.get("origin"),
  );
}

export async function POST(request: NextRequest) {
  const blocked = authorize(request);
  if (blocked) return blocked;
  const origin = request.headers.get("origin");

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return withCors(
      NextResponse.json(
        { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
        { status: 400 },
      ),
      origin,
    );
  }

  const result = await handleMcpPayload(payload, readStoreConfig());
  const headers: Record<string, string> = {};
  const sid = sessionIdFor(payload);
  if (sid) headers["Mcp-Session-Id"] = sid;

  if (result == null || (isNotificationOrResponseOnly(payload) && Array.isArray(result) && result.length === 0)) {
    return withCors(new NextResponse(null, { status: 202, headers }), origin);
  }

  if (wantsSse(request.headers.get("accept"))) {
    return withCors(
      new NextResponse(encodeSsePayload(result), {
        status: 200,
        headers: {
          ...headers,
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
        },
      }),
      origin,
    );
  }

  return withCors(NextResponse.json(result, { headers }), origin);
}
