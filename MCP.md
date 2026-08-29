# LifeOS MCP server

Read-only [Model Context Protocol](https://modelcontextprotocol.io) connector for this repo. An external assistant (Cursor, Grok Bot / JARVIS, Claude, etc.) can list tasks, projects, classes, work items, and in-app calendar events from the **real LifeOS store** — not a second database.

## What this is (verified against the code)

LifeOS is a Next.js web app plus an Expo client. Persistence is:

1. **Firebase Realtime Database** at `users/{uid}/{key}` (`lib/constants.ts` `FIREBASE_PATHS`: `tasks`, `projects`, `calendar`, `classes`, `notes`, `school`, `work`, …). Rules require `auth.uid == $uid` (`database.rules.json`).
2. **Browser `localStorage` / mobile AsyncStorage** as a device cache. A Node process cannot see those.
3. **Settings → Export** writes `lifeos-export-YYYY-MM-DD.json` (`app/page.tsx` `exportData`). That file is a first-class store for this MCP.

There is no local SQLite. The MCP does **not** scrape Apple Calendar, Gmail, or Outlook (those stay on their own connectors). It only returns events already stored on the LifeOS `calendar` key (and Work OS meetings via `list_work`).

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

HTTP is **off** unless `LIFEOS_MCP_TOKEN` is set. Every request needs `Authorization: Bearer <token>` (or `X-LifeOS-Token`).

## Environment

| Variable | Used by | Purpose |
| --- | --- | --- |
| `LIFEOS_DATA_PATH` | stdio + HTTP | Path to a Settings export JSON (preferred local source) |
| `LIFEOS_USER_ID` | Firebase | Firebase Auth uid |
| `LIFEOS_FIREBASE_DB_URL` | Firebase | RTDB URL (falls back to `NEXT_PUBLIC_FIREBASE_DB_URL`) |
| `LIFEOS_FIREBASE_AUTH` | Firebase | Firebase **ID token** (must match `LIFEOS_USER_ID`) |
| `LIFEOS_FIREBASE_API_KEY` | Firebase | Optional; used with email/password to mint an ID token |
| `LIFEOS_FIREBASE_EMAIL` / `LIFEOS_FIREBASE_PASSWORD` | Firebase | Optional password sign-in |
| `LIFEOS_MCP_TOKEN` | **HTTP only** | Shared secret. If unset, `/api/mcp` returns 503 |

Stdio loads `.env.local` / `.env` from the working directory when present. **Do not commit tokens.**

If `LIFEOS_DATA_PATH` is unset, the server also looks for `./lifeos-export.json`, `./data/lifeos.json`, `~/.lifeos/export.json`, and `~/.lifeos/lifeos-export.json`.

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

## Add as a Cursor connector

In Cursor MCP settings (or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/lifeos/mcp/run.cjs"],
      "env": {
        "LIFEOS_DATA_PATH": "/ABSOLUTE/PATH/TO/lifeos-export.json"
      }
    }
  }
}
```

Or, after a cloud export + Firebase token:

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/lifeos/mcp/run.cjs"],
      "env": {
        "LIFEOS_USER_ID": "your-firebase-uid",
        "LIFEOS_FIREBASE_DB_URL": "https://YOUR-PROJECT-default-rtdb.firebaseio.com",
        "LIFEOS_FIREBASE_AUTH": "firebase-id-token"
      }
    }
  }
}
```

Reload the Cursor window after saving.

## Add as a Grok Bot / JARVIS connector

Prefer **stdio** (the bot runs the command as you on this machine):

- **Command:** `node`
- **Args:** `/ABSOLUTE/PATH/TO/lifeos/mcp/run.cjs`
- **Working directory:** the LifeOS repo root (so `npm install` has already put `tsx` in `node_modules`)
- **Env:** `LIFEOS_DATA_PATH` and/or the Firebase vars above
- No `LIFEOS_MCP_TOKEN` is required for stdio. The process is already your user.

If the bot can only attach an **HTTP MCP** URL:

- URL: `https://<your-lifeos-host>/api/mcp` (or `http://localhost:3000/api/mcp` while `npm run dev` is running)
- Header: `Authorization: Bearer <LIFEOS_MCP_TOKEN>`
- Transport: JSON-RPC 2.0 POST (`initialize`, `tools/list`, `tools/call`). Notifications (`notifications/initialized`) return 204.

## Smoke test

```bash
npm run mcp:smoke
```

Uses `__tests__/fixtures/lifeos-export.json` unless `LIFEOS_DATA_PATH` is set. It lists tools in-process and over stdio, then calls `list_tasks` / `lifeos_status`.

Unit tests: `npx jest __tests__/mcp.test.ts`.

## Limitations

- Needs a **file export** or **Firebase ID token + uid**. The phone/browser cache is not a Node-readable DB path.
- Firebase tokens expire; email/password env vars can mint a fresh one.
- MasterOS teaching data lives in a separate `localStorage` key and is not exposed here.
- HTTP `/api/mcp` is a JSON-RPC POST, not a long-lived SSE Streamable-HTTP session.
