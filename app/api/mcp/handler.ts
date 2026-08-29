import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, readMcpToken, tokensMatch } from "@/lib/mcp/auth";
import {
  acceptIncludes,
  encodeSseComment,
  encodeSseJson,
  isNotificationOrResponseOnly,
  mcpCorsHeaders,
  MCP_SESSION_HEADER,
  newMcpSessionId,
  preferSseResponse,
} from "@/lib/mcp/httpTransport";
import { MCP_PROTOCOL_VERSION, MCP_SERVER_NAME, MCP_SERVER_VERSION, handleMcpPayload, listToolDescriptors } from "@/lib/mcp/protocol";
import { readStoreConfig } from "@/lib/mcp/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function header(request: NextRequest, name: string): string | null {
  return request.headers.get(name);
}

function withCors(request: NextRequest, init: { status?: number; headers?: Record<string, string>; body?: BodyInit | null }) {
  const headers = {
    ...mcpCorsHeaders(header(request, "origin")),
    ...(init.headers || {}),
  };
  return new NextResponse(init.body ?? null, { status: init.status ?? 200, headers });
}

function unauthorized(request: NextRequest) {
  return withCors(request, {
    status: 401,
    headers: { "www-authenticate": "Bearer", "content-type": "application/json" },
    body: JSON.stringify({ error: "Unauthorized. Send Authorization: Bearer $LIFEOS_MCP_TOKEN." }),
  });
}

function disabled(request: NextRequest) {
  return withCors(request, {
    status: 503,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ error: "MCP HTTP is disabled. Set LIFEOS_MCP_TOKEN in the server environment." }),
  });
}

function authorize(request: NextRequest): NextResponse | null {
  const expected = readMcpToken();
  if (!expected) return disabled(request);
  const provided =
    extractBearerToken(header(request, "authorization")) ||
    (header(request, "x-lifeos-token") || "").trim();
  if (!tokensMatch(provided, expected)) return unauthorized(request);
  return null;
}

function sessionHeaders(request: NextRequest): Record<string, string> {
  const existing = header(request, MCP_SESSION_HEADER);
  return {
    "Mcp-Session-Id": existing || newMcpSessionId(),
    "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
  };
}

function jsonBody(payload: unknown): string {
  return JSON.stringify(payload);
}

export async function OPTIONS(request: NextRequest) {
  return withCors(request, { status: 204 });
}

export async function DELETE(request: NextRequest) {
  const blocked = authorize(request);
  if (blocked) return blocked;
  return withCors(request, { status: 200, headers: sessionHeaders(request) });
}

export async function GET(request: NextRequest) {
  const blocked = authorize(request);
  if (blocked) return blocked;

  const accept = header(request, "accept");
  if (acceptIncludes(accept, "text/event-stream")) {
    const body = encodeSseComment("connected");
    return withCors(request, {
      status: 200,
      headers: {
        ...sessionHeaders(request),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
      body,
    });
  }

  return withCors(request, {
    status: 200,
    headers: { "content-type": "application/json", ...sessionHeaders(request) },
    body: jsonBody({
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
      transport: "streamable-http",
      endpoints: {
        jsonrpc: "/api/mcp",
        streamableHttp: "/api/mcp",
        streamableHttpAlias: "/api/mcp/http",
      },
      tools: listToolDescriptors().map((tool) => tool.name),
    }),
  });
}

export async function POST(request: NextRequest) {
  const blocked = authorize(request);
  if (blocked) return blocked;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return withCors(request, {
      status: 400,
      headers: { "content-type": "application/json" },
      body: jsonBody({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }),
    });
  }

  if (isNotificationOrResponseOnly(payload)) {
    return withCors(request, { status: 202, headers: sessionHeaders(request) });
  }

  const result = await handleMcpPayload(payload, readStoreConfig());
  const headers = sessionHeaders(request);

  if (result == null) {
    return withCors(request, { status: 202, headers });
  }

  if (preferSseResponse(header(request, "accept"))) {
    return withCors(request, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
      },
      body: encodeSseJson(result),
    });
  }

  return withCors(request, {
    status: 200,
    headers: { ...headers, "content-type": "application/json" },
    body: jsonBody(result),
  });
}
