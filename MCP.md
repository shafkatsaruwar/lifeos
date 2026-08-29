# LifeOS MCP server

Read-only [Model Context Protocol](https://modelcontextprotocol.io) connector for this repo. An external assistant (Cursor, Grok Bot / JARVIS, Claude, etc.) can list tasks, projects, classes, work items, and in-app calendar events from the **real LifeOS store** — not a second database.

## What this is (verified against the code)

LifeOS is a Next.js web app plus an Expo client. Persistence is:

1. **Firebase Realtime Database** at `users/{uid}/{key}` (`lib/constants.ts` `FIREBASE_PATHS`: `tasks`, `projects`, `calendar`, `classes`, `notes`, `school`, `work`, …). Rules require `auth.uid == $uid` (`database.rules.json`) unless you use a service account (admin REST, still scoped by this MCP to `LIFEOS_USER_ID` only).
2. **Browser `localStorage` / mobile AsyncStorage** as a device cache. A Node process cannot see those.
3. **Settings → Export** writes `lifeos-export-YYYY-MM-DD.json` (`app/page.tsx` `exportData`). That file is a **frozen** store — use it only when you pin `LIFEOS_DATA_PATH`.

There is no local SQLite. The MCP does **not** scrape Apple Calendar, Gmail, or Outlook (those stay on their own connectors). It only returns events already stored on the LifeOS `calendar` key (and Work OS meetings via `list_work`). Writes are not exposed.

## Store priority

1. **`LIFEOS_DATA_PATH` explicitly set** → read that file. Use this only for a frozen snapshot.
2. **Firebase env complete** (DB URL + `LIFEOS_USER_ID` + any auth method below) → **live Firebase**, even if `~/.lifeos/export.json` or `./lifeos-export.json` exists. A leftover export no longer shadows live data.
3. **Discovered export file** (only when Firebase env is incomplete) → `./lifeos-export.json`, `./data/lifeos.json`, `~/.lifeos/export.json`, `~/.lifeos/lifeos-export.json`.
4. Otherwise an empty workspace plus a setup warning.

Copy the live values from **Settings → Assistant access** in the signed-in web app.

## Start command

From the repo root, after `npm install`:

```bash
npm run mcp
# same as:
node mcp/run.cjs
```

The process speaks **newline-delimited JSON-RPC** on stdin/stdout (MCP stdio). Logs go to stderr.

Optional HTTP on the existing Next.js server (disabled until `LIFEOS_MCP_TOKEN` is set):

```bash
npm run dev   # http://localhost:3000
```

| URL | Transport |
| --- | --- |
| `POST /api/mcp` | JSON-RPC 2.0 (kept). Also Streamable HTTP: `Mcp-Session-Id`, `202` for notifications, CORS. |
| `GET /api/mcp` | Discovery JSON, or **SSE** when `Accept` includes `text/event-stream`. |
| `/api/mcp/http` | Same handlers — use this URL if a client wants a dedicated Streamable HTTP path. |

Every HTTP request needs `Authorization: Bearer <LIFEOS_MCP_TOKEN>` (or `X-LifeOS-Token`). `OPTIONS` is unauthenticated (CORS preflight). Production `https://lifeos-mu-three.vercel.app/api/mcp` returns **503** until `LIFEOS_MCP_TOKEN` is set on Vercel.

## Environment (live Firebase)

First auth method that is complete wins. **Do not commit tokens.**

| Variable | Used by | Purpose |
| --- | --- | --- |
| `LIFEOS_USER_ID` | Firebase | Firebase Auth uid (`users/{uid}`). Required for live reads. |
| `LIFEOS_FIREBASE_DB_URL` | Firebase | RTDB URL (falls back to `NEXT_PUBLIC_FIREBASE_DB_URL`) |
| `LIFEOS_FIREBASE_AUTH` | Firebase | Optional Firebase **ID token**. Expires in ~1 hour. |
| `LIFEOS_FIREBASE_API_KEY` | Firebase | Web API key (falls back to `NEXT_PUBLIC_FIREBASE_API_KEY`). Needed to mint tokens. |
| `LIFEOS_FIREBASE_EMAIL` / `LIFEOS_FIREBASE_PASSWORD` | Firebase | Optional password sign-in (mints an ID token) |
| `LIFEOS_FIREBASE_REFRESH_TOKEN` | Firebase | **Preferred for Google-signed-in users.** Identity Toolkit `https://securetoken.googleapis.com/v1/token` `grant_type=refresh_token`. The MCP remints the ID token on 401. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase | Optional JSON string. REST admin read of `users/{LIFEOS_USER_ID}` only (Google OAuth2 access token). Never logged. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Firebase | Optional path to the same service-account JSON file. |
| `LIFEOS_DATA_PATH` | stdio + HTTP | **Only** when you want a frozen Settings export instead of live Firebase |
| `LIFEOS_MCP_TOKEN` | **HTTP only** | Shared secret. If unset, `/api/mcp` returns 503 |

Stdio loads `.env.local` / `.env` from the working directory when present.

**Google-signed-in users:** copy `LIFEOS_FIREBASE_REFRESH_TOKEN` from Settings → Assistant access (shown as last 4 only). Pair it with the uid, DB URL, and API key. You do not need to re-export JSON, and you do not need a long-lived ID token.

## Tools

| Tool | Returns |
| --- | --- |
| `lifeos_status` | Store source, counts, warnings, limitations |
| `list_tasks` | Tasks (status, due, project, class). Hides Done/Canceled by default |
| `get_task` | One task by numeric `id` |
| `list_projects` | Projects / spaces |
| `list_classes` | School courses (`users/{uid}/classes`) |
| `list_school` | School hub (profile, topics, professors, goals) + class-linked tasks |
| `list_work` | Work OS projects, deliverables, tasks, meetings |
| `list_events` | In-app calendar. Drops stored iCal/Google/Outlook unless `includeExternal: true` |
| `search_lifeos` | Substring search across the collections above |

Writes are not exposed. Replacing a Firebase array from a second writer can wipe the list.

Encrypted `gmail` / `outlook` / `icloud` blobs on the user node are never copied into tool results.

## Add as a Cursor connector (stdio, live)

In Cursor MCP settings (or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/lifeos/mcp/run.cjs"],
      "env": {
        "LIFEOS_USER_ID": "your-firebase-uid",
        "LIFEOS_FIREBASE_DB_URL": "https://YOUR-PROJECT-default-rtdb.firebaseio.com",
        "LIFEOS_FIREBASE_API_KEY": "your-web-api-key",
        "LIFEOS_FIREBASE_REFRESH_TOKEN": "firebase-refresh-token"
      }
    }
  }
}
```

Reload the Cursor window after saving. Omit `LIFEOS_DATA_PATH` so a leftover export cannot freeze the view.

## Add as a remote MCP URL (Streamable HTTP)

Cursor / Grok Bot **Add MCP server → URL**:

- **URL:** `https://<your-lifeos-host>/api/mcp`  
  Alias: `https://<your-lifeos-host>/api/mcp/http`
- **Header:** `Authorization: Bearer <LIFEOS_MCP_TOKEN>`
- **Transport:** [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) (JSON-RPC POST; SSE GET when `Accept: text/event-stream`; `Mcp-Session-Id` on responses)

The host process still needs the Firebase env above (Vercel project env) so tool calls read live `users/{uid}`.

## Add as a Grok Bot / JARVIS connector

Prefer **stdio** (the bot runs the command as you on this machine):

- **Command:** `node`
- **Args:** `/ABSOLUTE/PATH/TO/lifeos/mcp/run.cjs`
- **Working directory:** the LifeOS repo root (so `npm install` has already put `tsx` in `node_modules`)
- **Env:** the live Firebase vars from Settings → Assistant access
- No `LIFEOS_MCP_TOKEN` is required for stdio. The process is already your user.

If the bot can only attach an **HTTP MCP** URL, use the Streamable HTTP URL above.

## Smoke test

```bash
npm run mcp:smoke
```

Uses `__tests__/fixtures/lifeos-export.json` unless `LIFEOS_DATA_PATH` is set. It lists tools in-process and over stdio, then calls `list_tasks` / `lifeos_status`.

Unit tests: `npx jest __tests__/mcp.test.ts`.

## Limitations

- Live path needs **Firebase uid + DB URL + a durable auth method** (refresh token is the one that works for Google sign-in). The phone/browser cache is not a Node-readable DB path.
- Firebase ID tokens expire; refresh token, email/password, or a service account remint credentials. The MCP retries once on HTTP 401.
- MasterOS teaching data lives in a separate `localStorage` key and is not exposed here.
- HTTP `/api/mcp` is Streamable HTTP (JSON or SSE). Long-lived SSE on Vercel closes after the current message — clients that require JSON responses (Cursor) keep working.
