import { createHash, timingSafeEqual } from "crypto";

export const MCP_TOKEN_ENV = "LIFEOS_MCP_TOKEN";

export function readMcpToken(env: NodeJS.ProcessEnv = process.env): string {
  return (env[MCP_TOKEN_ENV] || "").trim();
}

export function extractBearerToken(header: string | null | undefined): string {
  if (!header) return "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return (match ? match[1] : header).trim();
}

/** Compare tokens without leaking length via early return on the raw values. */
export function tokensMatch(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}
