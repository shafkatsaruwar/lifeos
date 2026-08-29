/**
 * In-process + stdio smoke: list tools and fetch a sample task list.
 * Usage: LIFEOS_DATA_PATH=__tests__/fixtures/lifeos-export.json npm run mcp:smoke
 */
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { handleMcpRequest } from "../lib/mcp/protocol";
import { readStoreConfig } from "../lib/mcp/store";

const repoRoot = resolve(__dirname, "..");
const fixture = join(repoRoot, "__tests__/fixtures/lifeos-export.json");

async function inProcess() {
  const config = readStoreConfig({ ...process.env, LIFEOS_DATA_PATH: process.env.LIFEOS_DATA_PATH || fixture }, repoRoot);
  const listed = await handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }, config);
  const tools = (listed?.result as { tools: Array<{ name: string }> } | undefined)?.tools ?? [];
  if (!tools.some((tool) => tool.name === "list_tasks")) {
    throw new Error("tools/list did not include list_tasks");
  }
  const called = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "list_tasks", arguments: { includeDone: true } },
  }, config);
  const text = (called?.result as { content: Array<{ text: string }> }).content[0].text;
  const parsed = JSON.parse(text) as { total: number };
  if (typeof parsed.total !== "number") throw new Error("list_tasks did not return a total");
  process.stderr.write(`in-process: ${tools.length} tools, list_tasks total=${parsed.total}\n`);
  return tools.map((tool) => tool.name);
}

function stdioRoundTrip(): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [join(repoRoot, "mcp/run.cjs")], {
      cwd: repoRoot,
      env: { ...process.env, LIFEOS_DATA_PATH: process.env.LIFEOS_DATA_PATH || fixture },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })}\n`);
    child.stdin.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "lifeos_status", arguments: {} },
    })}\n`);
    child.stdin.end();

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`stdio smoke timed out.\nstderr=${stderr}\nstdout=${stdout}`));
    }, 15000);

    child.on("close", (code) => {
      clearTimeout(timer);
      const lines = stdout.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.length < 2) {
        reject(new Error(`stdio expected 2 JSON replies, got ${lines.length}. stderr=${stderr}`));
        return;
      }
      const listed = JSON.parse(lines[0]) as { result?: { tools?: unknown[] } };
      const status = JSON.parse(lines[1]) as { result?: { content?: Array<{ text: string }> } };
      if (!listed.result?.tools?.length) {
        reject(new Error(`stdio tools/list failed: ${lines[0]}`));
        return;
      }
      const body = JSON.parse(status.result?.content?.[0]?.text || "{}") as { source?: string };
      if (!body.source) {
        reject(new Error(`stdio lifeos_status failed: ${lines[1]}`));
        return;
      }
      process.stderr.write(`stdio: ${listed.result.tools.length} tools, source=${body.source}, exit=${code}\n`);
      resolvePromise();
    });
  });
}

async function main() {
  const names = await inProcess();
  process.stderr.write(`tools: ${names.join(", ")}\n`);
  await stdioRoundTrip();
  process.stderr.write("LifeOS MCP smoke OK\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
