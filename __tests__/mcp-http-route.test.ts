/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/mcp/route";

const TOKEN = "test-mcp-token";

function mcpRequest(init: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest("http://localhost:3000/api/mcp", init);
}

describe("MCP HTTP route", () => {
  const previousToken = process.env.LIFEOS_MCP_TOKEN;

  beforeAll(() => {
    process.env.LIFEOS_MCP_TOKEN = TOKEN;
  });

  afterAll(() => {
    if (previousToken == null) delete process.env.LIFEOS_MCP_TOKEN;
    else process.env.LIFEOS_MCP_TOKEN = previousToken;
  });

  it("speaks Streamable HTTP SSE on POST initialize and 202 on notifications", async () => {
    const initRes = await POST(
      mcpRequest({
        method: "POST",
        headers: {
          authorization: `Bearer ${TOKEN}`,
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: { protocolVersion: "2025-03-26" },
        }),
      }),
    );
    expect(initRes.status).toBe(200);
    expect(initRes.headers.get("content-type")).toMatch(/text\/event-stream/);
    expect(initRes.headers.get("mcp-session-id")).toBeTruthy();
    const sse = await initRes.text();
    expect(sse).toContain("event: message");
    expect(sse).toContain("\"name\":\"lifeos\"");

    const noteRes = await POST(
      mcpRequest({
        method: "POST",
        headers: {
          authorization: `Bearer ${TOKEN}`,
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
        },
        body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      }),
    );
    expect(noteRes.status).toBe(202);

    const listen = await GET(
      mcpRequest({
        headers: { authorization: `Bearer ${TOKEN}`, accept: "text/event-stream" },
      }),
    );
    expect(listen.status).toBe(405);
  });

  it("keeps JSON-RPC POST when the client does not accept SSE", async () => {
    const response = await POST(
      mcpRequest({
        method: "POST",
        headers: {
          authorization: `Bearer ${TOKEN}`,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 8, method: "ping" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    await expect(response.json()).resolves.toEqual({ jsonrpc: "2.0", id: 8, result: {} });
  });
});
