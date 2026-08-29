"use client";

import { useMemo, useState } from "react";
import { Bot, Copy } from "lucide-react";
import { buildAssistantEnvBlock, maskSecret, sessionRefreshToken } from "@/lib/mcp/assistantAccess";

type AssistantUser = {
  uid?: string;
  refreshToken?: string;
  stsTokenManager?: { refreshToken?: string };
  providerData?: Array<{ providerId?: string }>;
} | null;

export function AssistantAccessPanel({
  user,
  userId,
  flash,
}: {
  user?: AssistantUser;
  userId?: string | null;
  flash: (message: string) => void;
}) {
  const uid = (user?.uid || userId || "").trim();
  const dbUrl = (process.env.NEXT_PUBLIC_FIREBASE_DB_URL || "").trim();
  const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
  const refreshToken = sessionRefreshToken(user);
  const googleSignedIn = Boolean(
    user?.providerData?.some((item) => item.providerId === "google.com") || refreshToken,
  );
  const [copied, setCopied] = useState<string | null>(null);

  const envBlock = useMemo(
    () => buildAssistantEnvBlock({ userId: uid, dbUrl, apiKey, refreshToken }),
    [uid, dbUrl, apiKey, refreshToken],
  );

  const copy = async (label: string, value: string) => {
    if (!value) {
      flash(`${label} is not available`);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      flash(`Copied ${label}`);
      window.setTimeout(() => setCopied((current) => (current === label ? null : current)), 1600);
    } catch {
      flash(`Could not copy ${label}`);
    }
  };

  return (
    <section className="card settings-card assistant-access-card" data-testid="assistant-access">
      <div className="card-head">
        <div>
          <span className="section-icon violet">
            <Bot size={14} />
          </span>
          <h2>Assistant access</h2>
        </div>
      </div>
      <div className="settings-body">
        <p className="settings-note">
          Keep Cursor / JARVIS / Grok Bot on the same Firebase workspace — no JSON export and no second database.
          Paste these into the stdio MCP env. Tokens stay on this device; they are never sent to LifeOS servers by this panel.
        </p>

        <div className="assistant-access-rows">
          <div className="assistant-secret-row">
            <div>
              <strong>Firebase uid</strong>
              <code data-testid="assistant-uid">{uid || "not signed in"}</code>
            </div>
            <button type="button" onClick={() => void copy("Firebase uid", uid)} disabled={!uid}>
              <Copy size={12} /> {copied === "Firebase uid" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="assistant-secret-row">
            <div>
              <strong>Database URL</strong>
              <code data-testid="assistant-db-url">{dbUrl || "NEXT_PUBLIC_FIREBASE_DB_URL is not set"}</code>
            </div>
            <button type="button" onClick={() => void copy("Database URL", dbUrl)} disabled={!dbUrl}>
              <Copy size={12} /> {copied === "Database URL" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="assistant-secret-row">
            <div>
              <strong>Session refresh token</strong>
              <code data-testid="assistant-refresh-mask">{maskSecret(refreshToken)}</code>
            </div>
            <button type="button" onClick={() => void copy("refresh token", refreshToken)} disabled={!refreshToken}>
              <Copy size={12} /> {copied === "refresh token" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {!googleSignedIn && (
          <p className="settings-note" data-testid="assistant-google-hint">
            Sign in with Google to copy a live refresh token. Dev Test Login has no Firebase session, so MCP cannot stay live that way.
          </p>
        )}

        <p className="settings-note">Stdio MCP env (first match wins: ID token, email/password, then this refresh token):</p>
        <pre className="assistant-env" data-testid="assistant-env-names">
          <code>
            LIFEOS_USER_ID{"\n"}
            LIFEOS_FIREBASE_DB_URL{"\n"}
            LIFEOS_FIREBASE_API_KEY{"\n"}
            LIFEOS_FIREBASE_REFRESH_TOKEN
          </code>
        </pre>
        <div className="settings-actions">
          <button type="button" onClick={() => void copy("MCP env vars", envBlock)} disabled={!uid || !refreshToken}>
            <Copy size={15} /> Copy env vars
          </button>
        </div>
        <p className="settings-note">
          Remote HTTP MCP (optional): <code>https://&lt;host&gt;/api/mcp</code> with{" "}
          <code>Authorization: Bearer $LIFEOS_MCP_TOKEN</code>. Set the same Firebase vars plus{" "}
          <code>LIFEOS_MCP_TOKEN</code> on the host. See MCP.md.
        </p>
      </div>
    </section>
  );
}
