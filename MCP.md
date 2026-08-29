# LifeOS MCP server

Read-only [Model Context Protocol](https://modelcontextprotocol.io) connector for this repo. An external assistant (Cursor, Grok Bot / JARVIS, Claude, etc.) can list tasks, projects, classes, work items, and in-app calendar events from the **real LifeOS store** — not a second database.

## What this is (verified against the code)

LifeOS is a Next.js web app plus an Expo client. Persistence is:

1. **Firebase Realtime Database** at `users/{uid}/{key}` (`lib/constants.ts` `FIREBASE_PATHS`: `tasks`, `projects`, `calendar`, `classes`, `notes`, `school`, `work`, …). Rules require `auth.uid == $uid` (`database.rules.json`).
2. **Browser `localStorage` / mobile AsyncStorage** as a device cache. A Node process cannot see those.
3. **Settings → Export** writes `lifeos-export-YYYY-MM-DD.json` (`app/page.tsx` `exportData`). That file is optional; live Firebase is preferred.

There is no local SQLite. The MCP does **not** scrape Apple Calendar, Gmail, or Outlook (those stay on their own connectors). It only returns events already stored on the LifeOS `calendar` key (and Work OS meetings via `list_work`).

## Store priority

1. **`LIFEOS_DATA_PATH`** — if you set this, the server reads that export file and never talks to Firebase.
2. **Complete Firebase env** — live RTDB. This wins even if `~/.lifeos/export.json` (or another discovered snapshot) exists. A leftover export must not shadow live data.
3. **Discovered export** — `./lifeos-export.json`, `./data/lifeos.json`, `~/.lifeos/export.json`, `~/.lifeos/lifeos-export.json`. Used only when Firebase env is incomplete.
4. Otherwise the tools return an empty workspace plus a warning listing the missing vars.

Firebase env is complete when all of these are set: `LIFEOS_USER_ID`, a database URL (`LIFEOS_FIREBASE_DB_URL` or `NEXT_PUBLIC_FIREBASE_DB_URL`), and **one** auth method (below).

## Durable Firebase auth (first match wins)

All of these are optional. The first one that is fully configured is used.

1. **`LIFEOS_FIREBASE_AUTH`** — a Firebase **ID token**. These expire (about an hour).
2. **Email / password mint** — `LIFEOS_FIREBASE_EMAIL` + `LIFEOS_FIREBASE_PASSWORD` + API key. LifeOS sign-in is Google, so most users will not use this.
3. **Refresh token (Google sign-in path)** — `LIFEOS_FIREBASE_REFRESH_TOKEN` + API key. The server calls Identity Toolkit `https://securetoken.googleapis.com/v1/token` with `grant_type=refresh_token`, then reads RTDB with the minted ID token. On HTTP 401 it refreshes and retries once. Copy the session refresh token from **Settings → Assistant access**.
4. **Admin / service account (optional)** — `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON string) or `GOOGLE_APPLICATION_CREDENTIALS` (file path). The server mints a Google OAuth access token and reads **only** `users/{LIFEOS_USER_ID}`. Never log or commit the JSON.

API key falls back to `NEXT_PUBLIC_FIREBASE_API_KEY` when `LIFEOS_FIREBASE_API_KEY` is unset.

## Start command

From the repo root, after `npm install`:

```bash
npm run mcp
# same as:
node mcp/run.cjs
```

The process speaks **newline-delimited JSON-RPC** on stdin/stdout (MCP stdio). Logs go to stderr.

Optional HTTP endpoint on the existing Next.js server:

```bash
npm run dev   # http://localhost:3000
# POST http://localhost:3000/api/mcp
```

HTTP is **off** unless `LIFEOS_MCP_TOKEN` is set. Every request needs `Authorization: Bearer <token>` (or `X-LifeOS-Token`). Production (`https://lifeos-mu-three.vercel.app/api/mcp`) returns **503** until that token is set on the host.

## Environment

| Variable | Used by | Purpose |
| --- | --- | --- |
| `LIFEOS_USER_ID` | Firebase | Firebase Auth uid (Settings → Assistant access) |
| `LIFEOS_FIREBASE_DB_URL` | Firebase | RTDB URL (falls back to `NEXT_PUBLIC_FIREBASE_DB_URL`) |
| `LIFEOS_FIREBASE_API_KEY` | Firebase | Web API key (falls back to `NEXT_PUBLIC_FIREBASE_API_KEY`) |
| `LIFEOS_FIREBASE_REFRESH_TOKEN` | Firebase | Session refresh token for Google-signed-in users. Stays live without re-exporting JSON. |
| `LIFEOS_FIREBASE_AUTH` | Firebase | Optional short-lived ID token |
| `LIFEOS_FIREBASE_EMAIL` / `LIFEOS_FIREBASE_PASSWORD` | Firebase | Optional password sign-in |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase | Optional Admin REST read of `users/{LIFEOS_USER_ID}` only |
| `GOOGLE_APPLICATION_CREDENTIALS` | Firebase | Optional path to a service-account JSON file |
| `LIFEOS_DATA_PATH` | stdio + HTTP | Optional export JSON. **Only** used when this is set, or when Firebase env is incomplete. |
| `LIFEOS_MCP_TOKEN` | **HTTP only** | Shared secret. If unset, `/api/mcp` returns 503 |

Stdio loads `.env.local` / `.env` from the working directory when present. **Do not commit tokens.**

## Settings → Assistant access

Signed-in users get an **Assistant access** card in Settings:

- Firebase uid (copy)
- Database URL from `NEXT_PUBLIC_FIREBASE_DB_URL` (copy)
- Session `refreshToken` (secret: last 4 only + copy)
- The four stdio env var names listed above

Dev Test Login has no Firebase refresh token. Sign in with Google to keep MCP live.

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

## Add as a Cursor connector (stdio, recommended)

Copy values from Settings → Assistant access. In Cursor MCP settings (or `~/.cursor/mcp.json`):

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
        "LIFEOS_FIREBASE_REFRESH_TOKEN": "session-refresh-token"
      }
    }
  }
}
```

Reload the Cursor window after saving. Do **not** point `LIFEOS_DATA_PATH` at an old export if you want live updates.

Optional snapshot (explicit file only):

```json
{
  "env": {
    "LIFEOS_DATA_PATH": "/ABSOLUTE/PATH/TO/lifeos-export.json"
  }
}
```

## Add as a Grok Bot / JARVIS connector

Prefer **stdio** (the bot runs the command as you on this machine):

- **Command:** `node`
- **Args:** `/ABSOLUTE/PATH/TO/lifeos/mcp/run.cjs`
- **Working directory:** the LifeOS repo root (so `npm install` has already put `tsx` in `node_modules`)
- **Env:** `LIFEOS_USER_ID`, `LIFEOS_FIREBASE_DB_URL`, `LIFEOS_FIREBASE_API_KEY`, `LIFEOS_FIREBASE_REFRESH_TOKEN`
- No `LIFEOS_MCP_TOKEN` is required for stdio. The process is already your user.

## Remote MCP URL (Streamable HTTP)

Exact URL: **`https://<host>/api/mcp`**  
Local: **`http://localhost:3000/api/mcp`**

Same path as before. The route still accepts a JSON-RPC POST (`application/json`). It also speaks [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) so Cursor / Grok `url` connectors can attach:

- `POST` with `Accept: application/json, text/event-stream` — JSON-RPC body; response is `application/json` or `text/event-stream` (SSE `event: message`)
- Notifications (`notifications/initialized`) return **202**
- `GET` with `Accept: text/event-stream` returns **405** (no server-push listen stream)
- `GET` without SSE accept returns a JSON status document
- Header: `Authorization: Bearer <LIFEOS_MCP_TOKEN>`

Cursor / Grok example:

```json
{
  "mcpServers": {
    "lifeos": {
      "url": "https://lifeos-mu-three.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer <LIFEOS_MCP_TOKEN>"
      }
    }
  }
}
```

On the **host** (Vercel), set `LIFEOS_MCP_TOKEN` plus the same Firebase vars as stdio. Without `LIFEOS_MCP_TOKEN` the URL returns 503.

There is no separate `/api/mcp/http` path.

## Smoke test

```bash
npm run mcp:smoke
```

Uses `__tests__/fixtures/lifeos-export.json` unless `LIFEOS_DATA_PATH` is set. It lists tools in-process and over stdio, then calls `list_tasks` / `lifeos_status`.

Unit tests: `npx jest __tests__/mcp.test.ts`.

## Limitations

- Needs **Firebase env** (refresh token recommended for Google login) or an **explicit export path**. The phone/browser cache is not a Node-readable DB path.
- Firebase ID tokens expire; `LIFEOS_FIREBASE_REFRESH_TOKEN` remints them. Email/password can also mint. A leftover `~/.lifeos/export.json` no longer shadows Firebase.
- MasterOS teaching data lives in a separate `localStorage` key and is not exposed here.
- HTTP `/api/mcp` is Streamable HTTP + JSON-RPC POST. It does not keep a long-lived GET SSE listen stream.
