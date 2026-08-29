import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, readMcpToken, tokensMatch } from "@/lib/mcp/auth";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION, handleMcpPayload, listToolDescriptors } from "@/lib/mcp/protocol";
import { readStoreConfig } from "@/lib/mcp/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json(
    { error: "Unauthorized. Send Authorization: Bearer $LIFEOS_MCP_TOKEN." },
    { status: 401, headers: { "www-authenticate": "Bearer" } },
  );
}

function disabled() {
  return NextResponse.json(
    { error: "MCP HTTP is disabled. Set LIFEOS_MCP_TOKEN in the server environment." },
    { status: 503 },
  );
}

function authorize(request: NextRequest): NextResponse | null {
  const expected = readMcpToken();
  if (!expected) return disabled();
  const provided =
    extractBearerToken(request.headers.get("authorization")) ||
    (request.headers.get("x-lifeos-token") || "").trim();
  if (!tokensMatch(provided, expected)) return unauthorized();
  return null;
}

export async function GET(request: NextRequest) {
  const blocked = authorize(request);
  if (blocked) return blocked;
  return NextResponse.json({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    transport: "http-jsonrpc",
    tools: listToolDescriptors().map((tool) => tool.name),
  });
}

export async function POST(request: NextRequest) {
  const blocked = authorize(request);
  if (blocked) return blocked;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 },
    );
  }

  const result = await handleMcpPayload(payload, readStoreConfig());
  if (result == null) return new NextResponse(null, { status: 204 });
  return NextResponse.json(result);
}
