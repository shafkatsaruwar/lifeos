/**
 * Streamable HTTP alias for clients that want a dedicated MCP URL.
 * Same handler as /api/mcp — JSON-RPC POST plus GET SSE / session headers.
 */
export { runtime, dynamic, GET, POST, DELETE, OPTIONS } from "../handler";
