import { loadWorkspace, readStoreConfig, sourceLabel } from "./store";
import { MCP_TOOLS, callTool } from "./tools";
import type { StoreConfig } from "./store";

export const MCP_SERVER_NAME = "lifeos";
export const MCP_SERVER_VERSION = "0.2.0";
export const MCP_PROTOCOL_VERSION = "2025-03-26";

export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function fail(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: data === undefined ? { code, message } : { code, message, data } };
}

function isNotification(message: JsonRpcRequest): boolean {
  return message.id === undefined;
}

export function listToolDescriptors() {
  return MCP_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
}

export async function handleMcpRequest(
  message: JsonRpcRequest,
  config: StoreConfig,
): Promise<JsonRpcResponse | null> {
  if (message.jsonrpc && message.jsonrpc !== "2.0") {
    return fail(message.id ?? null, INVALID_REQUEST, "jsonrpc must be \"2.0\"");
  }
  if (!message.method || typeof message.method !== "string") {
    if (isNotification(message)) return null;
    return fail(message.id ?? null, INVALID_REQUEST, "Missing method");
  }

  try {
    switch (message.method) {
      case "initialize": {
        const params = (message.params ?? {}) as { protocolVersion?: string };
        const protocolVersion = params.protocolVersion || MCP_PROTOCOL_VERSION;
        let storeHint = "unknown";
        try {
          storeHint = sourceLabel((await loadWorkspace(config)).workspace.source);
        } catch {
          storeHint = "unavailable until tools/call";
        }
        return ok(message.id ?? null, {
          protocolVersion: protocolVersion.startsWith("2024") || protocolVersion.startsWith("2025")
            ? protocolVersion
            : MCP_PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
          instructions:
            "LifeOS personal cockpit. Prefer lifeos_status, then list_tasks / list_projects / list_classes / list_work / list_events. " +
            `Store: ${storeHint}.`,
        });
      }
      case "notifications/initialized":
      case "initialized":
        return null;
      case "ping":
        if (isNotification(message)) return null;
        return ok(message.id ?? null, {});
      case "tools/list": {
        if (isNotification(message)) return null;
        return ok(message.id ?? null, { tools: listToolDescriptors() });
      }
      case "tools/call": {
        if (isNotification(message)) return null;
        const params = (message.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
        if (!params.name) return fail(message.id ?? null, INVALID_PARAMS, "tools/call requires params.name");
        const loaded = await loadWorkspace(config);
        const result = callTool(params.name, params.arguments, loaded.workspace, { warning: loaded.warning });
        return ok(message.id ?? null, result);
      }
      case "resources/list":
        if (isNotification(message)) return null;
        return ok(message.id ?? null, { resources: [] });
      case "prompts/list":
        if (isNotification(message)) return null;
        return ok(message.id ?? null, { prompts: [] });
      default:
        if (isNotification(message)) return null;
        return fail(message.id ?? null, METHOD_NOT_FOUND, `Method not found: ${message.method}`);
    }
  } catch (error) {
    if (isNotification(message)) return null;
    const text = error instanceof Error ? error.message : String(error);
    return fail(message.id ?? null, INTERNAL_ERROR, text);
  }
}

export async function handleMcpPayload(payload: unknown, config: StoreConfig): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (Array.isArray(payload)) {
    const results: JsonRpcResponse[] = [];
    for (const item of payload) {
      const response = await handleMcpRequest(item as JsonRpcRequest, config);
      if (response) results.push(response);
    }
    return results;
  }
  if (!payload || typeof payload !== "object") {
    return fail(null, PARSE_ERROR, "Invalid JSON-RPC payload");
  }
  return handleMcpRequest(payload as JsonRpcRequest, config);
}

export function parseMcpLine(line: string): JsonRpcRequest {
  return JSON.parse(line) as JsonRpcRequest;
}

export function defaultStoreConfig(): StoreConfig {
  return readStoreConfig();
}
