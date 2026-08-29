export function maskSecret(value: string | null | undefined): string {
  const token = (value || "").trim();
  if (!token) return "not available";
  if (token.length <= 4) return "••••";
  return `••••${token.slice(-4)}`;
}

export function sessionRefreshToken(user: { refreshToken?: unknown; stsTokenManager?: { refreshToken?: unknown } } | null | undefined): string {
  if (!user) return "";
  if (typeof user.refreshToken === "string" && user.refreshToken.trim()) return user.refreshToken;
  const nested = user.stsTokenManager?.refreshToken;
  if (typeof nested === "string" && nested.trim()) return nested;
  return "";
}

export function buildAssistantEnvBlock(input: {
  userId?: string;
  dbUrl?: string;
  apiKey?: string;
  refreshToken?: string;
}): string {
  const lines = [
    `LIFEOS_USER_ID=${input.userId || ""}`,
    `LIFEOS_FIREBASE_DB_URL=${input.dbUrl || ""}`,
    `LIFEOS_FIREBASE_API_KEY=${input.apiKey || ""}`,
    `LIFEOS_FIREBASE_REFRESH_TOKEN=${input.refreshToken || ""}`,
  ];
  return lines.join("\n");
}
