import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return [key, value];
}

export function loadEnvFile(filePath: string, env: NodeJS.ProcessEnv = process.env): void {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    if (env[key] == null || env[key] === "") env[key] = value;
  }
}

/** Load repo `.env.local` / `.env` when the stdio process was started without them. */
export function loadLifeOSEnvFiles(fromDir = process.cwd(), env: NodeJS.ProcessEnv = process.env): string[] {
  const loaded: string[] = [];
  const candidates = [
    join(fromDir, ".env.local"),
    join(fromDir, ".env"),
    join(resolve(fromDir, ".."), ".env.local"),
    join(resolve(fromDir, ".."), ".env"),
  ];
  const seen = new Set<string>();
  for (const file of candidates) {
    const resolved = resolve(file);
    if (seen.has(resolved) || !existsSync(resolved)) continue;
    seen.add(resolved);
    loadEnvFile(resolved, env);
    loaded.push(resolved);
  }
  return loaded;
}
