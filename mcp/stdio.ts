#!/usr/bin/env npx tsx
/**
 * LifeOS MCP server (stdio).
 * stdout is JSON-RPC only — log to stderr.
 */
import { createInterface } from "node:readline";
import { loadLifeOSEnvFiles } from "../lib/mcp/env";
import { defaultStoreConfig, handleMcpRequest, parseMcpLine } from "../lib/mcp/protocol";

loadLifeOSEnvFiles(process.cwd());

const config = defaultStoreConfig();

function write(message: unknown) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function onLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const request = parseMcpLine(trimmed);
    const response = await handleMcpRequest(request, config);
    if (response) write(response);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    write({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: `Parse error: ${text}` },
    });
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  void onLine(line);
});
rl.on("close", () => {
  process.exit(0);
});

process.stderr.write("LifeOS MCP server listening on stdio\n");
