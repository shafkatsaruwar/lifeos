"use client";

import { useCallback, useMemo } from "react";
import { Bot, Copy } from "lucide-react";

type AssistantAccessPanelProps = {
  user?: { uid?: string; refreshToken?: string; email?: string } | null;
  userId?: string | null;
  flash: (message: string) => void;
};

function lastFour(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return trimmed;
  return trimmed.slice(-4);
}

function CopyRow({
  label,
  value,
  secret,
  emptyHint,
  onCopy,
}: {
  label: string;
  value?: string;
  secret?: boolean;
  emptyHint: string;
  onCopy: (value: string, label: string) => void;
}) {
  const display = useMemo(() => {
    if (!value) return emptyHint;
    if (secret) return `••••${lastFour(value)}`;
    return value;
  }, [emptyHint, secret, value]);

  return (
    <div className="assistant-access-row">
      <div>
        <span className="assistant-access-label">
          {label}
          {secret ? <em> secret</em> : null}
        </span>
        <code data-testid={secret ? "assistant-refresh-mask" : undefined}>{display}</code>
      </div>
      <button
        type="button"
        disabled={!value}
        onClick={() => value && onCopy(value, label)}
        aria-label={`Copy ${label}`}
      >
        <Copy size={13} /> Copy
      </button>
    </div>
  );
}

export function AssistantAccessPanel({ user, userId, flash }: AssistantAccessPanelProps) {
  const uid = user?.uid || userId || "";
  const dbUrl = (process.env.NEXT_PUBLIC_FIREBASE_DB_URL || "").trim();
  const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
  const refreshToken = typeof user?.refreshToken === "string" ? user.refreshToken.trim() : "";

  const copy = useCallback(
    async (value: string, label: string) => {
      try {
        await navigator.clipboard.writeText(value);
        flash(`${label} copied`);
      } catch {
        flash(`Could not copy ${label}`);
      }
    },
    [flash],
  );

  return (
    <section className="card settings-card assistant-access-card" data-testid="assistant-access">
      <div className="card-head">
        <div>
          <span className="section-icon violet">
            <Bot size={14} />
          </span>
          <h2>Assistant access</h2>
        </div>
        <span className="assistant-access-note">JARVIS / MCP · live Firebase</span>
      </div>
      <div className="settings-body">
        <p className="settings-note">
          These values point an assistant at <strong>this same LifeOS user</strong> in Firebase. No second
          database. No JSON export. The MCP stays live as tasks change.
        </p>
        <CopyRow label="LIFEOS_USER_ID" value={uid || undefined} emptyHint="Sign in to see your Firebase uid" onCopy={copy} />
        <CopyRow
          label="LIFEOS_FIREBASE_DB_URL"
          value={dbUrl || undefined}
          emptyHint="NEXT_PUBLIC_FIREBASE_DB_URL is not set in this build"
          onCopy={copy}
        />
        <CopyRow
          label="LIFEOS_FIREBASE_API_KEY"
          value={apiKey || undefined}
          emptyHint="NEXT_PUBLIC_FIREBASE_API_KEY is not set in this build"
          onCopy={copy}
        />
        <CopyRow
          label="LIFEOS_FIREBASE_REFRESH_TOKEN"
          value={refreshToken || undefined}
          secret
          emptyHint={
            uid && !refreshToken
              ? "No refresh token on this session (Dev Test Login has none — sign in with Google)"
              : "Sign in with Google to copy a refresh token"
          }
          onCopy={copy}
        />
        <div className="assistant-access-steps">
          <strong>Stdio MCP env (Cursor / Grok Bot)</strong>
          <pre className="assistant-access-env">{`LIFEOS_USER_ID=
LIFEOS_FIREBASE_DB_URL=
LIFEOS_FIREBASE_API_KEY=
LIFEOS_FIREBASE_REFRESH_TOKEN=`}</pre>
          <ol>
            <li>Paste the four copied values into that block (refresh token is a secret).</li>
            <li>
              Command: <code>node</code> · args: <code>/ABSOLUTE/PATH/TO/lifeos/mcp/run.cjs</code>
            </li>
            <li>
              Do <strong>not</strong> set <code>LIFEOS_DATA_PATH</code> unless you want a frozen export. A leftover{" "}
              <code>~/.lifeos/export.json</code> is ignored when Firebase env is complete.
            </li>
          </ol>
          <p className="settings-note">
            Treat the refresh token as a password. It lets the MCP mint a new Firebase ID token when the old one
            expires — that is what keeps Google-signed-in users live.
          </p>
          <p className="settings-note">
            Remote HTTP: <code>https://&lt;host&gt;/api/mcp</code> (alias <code>/api/mcp/http</code>) with{" "}
            <code>Authorization: Bearer $LIFEOS_MCP_TOKEN</code>. Streamable HTTP — JSON-RPC POST, optional SSE GET.
            Set <code>LIFEOS_MCP_TOKEN</code> on the host; it is a server secret, not shown here.
          </p>
        </div>
      </div>
    </section>
  );
}
