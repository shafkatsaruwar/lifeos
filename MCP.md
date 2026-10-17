# LifeOS MCP server

[Model Context Protocol](https://modelcontextprotocol.io) connector for this repo. An external assistant (Cursor, Grok Bot / JARVIS, Claude, etc.) can list tasks, projects, classes, work items, calendar events, and career applications from the **real LifeOS store** — not a second database. Writes are **off** until `LIFEOS_ALLOW_WRITES=1`, and even then they only change live Firebase.

## What this is (verified against the code)

LifeOS is a Next.js web app plus an Expo client. Persistence is:

1. **Firebase Realtime Database** at `users/{uid}/{key}` (`lib/constants.ts` `FIREBASE_PATHS`: `tasks`, `projects`, `calendar`, `classes`, `notes`, `school`, `work`, …). Rules require `auth.uid == $uid` (`database.rules.json`) unless you use a service account (admin REST, still scoped by this MCP to `LIFEOS_USER_ID` only).
2. **Browser `localStorage` / mobile AsyncStorage** as a device cache. A Node process cannot see those.
3. **Settings → Export** writes `lifeos-export-YYYY-MM-DD.json` (`app/page.tsx` `exportData`). That file is a **frozen** store — use it only when you pin `LIFEOS_DATA_PATH`.

There is no local SQLite. The MCP does **not** scrape Apple Calendar, Gmail, or Outlook (those stay on their own connectors). It only returns events already stored on the LifeOS `calendar` key (and Work OS meetings via `list_work`). Career applications live in one hub at `users/{uid}/career` (`lib/careerTypes.ts`). The Career nav stays hidden until `enableCareerOS` is turned on in Settings; this server does not flip that flag. Data written to `career` shows up once the section is enabled.

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

Every HTTP request needs `Authorization: Bearer <LIFEOS_MCP_TOKEN>` (or `X-LifeOS-Token`). `OPTIONS` is unauthenticated (CORS preflight). Production `https://YOUR_HOST/api/mcp` returns **503** until `LIFEOS_MCP_TOKEN` is set on Vercel.

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
| `LIFEOS_DATA_PATH` | stdio + HTTP | **Only** when you want a frozen Settings export instead of live Firebase. Write tools refuse this mode and never edit the file. |
| `LIFEOS_ALLOW_WRITES` | stdio + HTTP | Opt-in writes. **Default off.** Unset, empty, `0`, or anything other than `1` / `true` / `yes` / `on` (any case) keeps the connector read-only. The server was read-only before, so a restart must not start mutating data until you set this. |
| `LIFEOS_MCP_TOKEN` | **HTTP only** | Shared secret. If unset, `/api/mcp` returns 503 |

Stdio loads `.env.local` / `.env` from the working directory when present.

**Google-signed-in users:** copy `LIFEOS_FIREBASE_REFRESH_TOKEN` from Settings → Assistant access (shown as last 4 only). Pair it with the uid, DB URL, and API key. You do not need to re-export JSON, and you do not need a long-lived ID token.

## Tools

| Tool | Returns |
| --- | --- |
| `lifeos_status` | Store source, counts (including `careerApplications`), whether writes are enabled, limitations |
| `list_tasks` | Tasks (status, due, project, class). Hides Done/Canceled by default |
| `get_task` | One task by numeric `id` |
| `list_projects` | Projects / spaces |
| `list_classes` | School courses (`users/{uid}/classes`) |
| `list_school` | School hub (profile, topics, professors, goals) + class-linked tasks |
| `list_work` | Work OS projects, deliverables, tasks, meetings |
| `list_events` | In-app calendar. Drops stored iCal/Google/Outlook unless `includeExternal: true` |
| `list_career` | Job applications from `users/{uid}/career`. Filters: `status` / `stageId`, `company` (substring), `appliedAfter` / `appliedBefore` (`YYYY-MM-DD`), `priority`, `query`. Sort: `updated` (default), `applied`, `company`, `title`, `next_action`, `status`. Default limit 200, max 500. Read-only; works on an export file. |
| `search_lifeos` | Substring search across the collections above, including career applications (`career_application`) |

### Write tools

Listed in `tools/list` even when writes are off. Calling one while the flag is unset, or while the process is on an export file, returns an error and changes nothing. Deletes take one explicit `id` (`ids` and `all` are rejected). Each successful call returns the record that was written.

| Tool | Writes |
| --- | --- |
| `create_task` | Appends one task on `users/{uid}/tasks` (numeric id, `Inbox` unless `project` names an existing space, status `Not started`). `classId` forces project `Inbox` and `academicType` `Assignment` unless you pass another type. |
| `update_task` | One task by numeric id (title, notes, due, priority, project, status, and the other task fields). Status `Done` / `Canceled` sets `done` / `canceled`. It does not set `completedAt`. |
| `complete_task` | Sets done, clears canceled, status `Done`, `completedAt`. If `recurringDays` is set, appends the next occurrence the way the app does. |
| `uncomplete_task` | Status `Not started`, clears done, canceled, and `completedAt`. |
| `delete_task` | Removes one task by id. |
| `create_event` | Appends one in-app event on `users/{uid}/calendar` (`id` `lifeos-{timestamp}`, `source` `LifeOS`, local `YYYY-MM-DDTHH:MM` with no `Z`). |
| `update_event` | One event by id. Keeps `source` and fields you do not send. |
| `delete_event` | Removes one event by id. |
| `create_project` | Appends one space on `users/{uid}/projects` (`name`, `desc`, `progress`, `color`, `iconName`, `tasks`, `kind`). |
| `update_project` | One project by current `name`. Rename and recolor also update linked tasks and notes. |
| `create_note` | Prepends one note on `users/{uid}/notes` and sets `updatedAt`. |
| `update_note` | One note by id. Sets `updatedAt`. |
| `delete_note` | Removes one note by id. |
| `create_career_entry` | One application in the career hub. `role` → `jobTitle`, `status` → `stageId`, `link` → `jobUrl`, date applied → `appliedAt` (`YYYY-MM-DD`). Rejects a duplicate company+role or link. |
| `update_career_entry` | One application by `id`, or by company+role, or by link. A status change uses the app's stage move, so `outcome` and stage history stay in sync. |
| `bulk_import_career` | Upserts an array (max 500) in **one** write of `users/{uid}/career`. Matches link first (host lowercased, hash and trailing slash stripped), otherwise company+role case-insensitively. A second import of the same rows is a no-op. A bad row is reported and the rest still apply. |

Shapes match the web app's `set()` payload (`cleanUndefined`: drop `undefined`, keep `null`). Writes PUT only the collection that changed (`tasks`, `projects`, `calendar`, `notes`, `settings`, `career`). They never PUT `users/{uid}` itself and never read or write `gmail`, `outlook`, `icloud`, or a key named `encrypted`.

Firebase REST ETags (`if-match`) retry a conflicting PUT. The LifeOS tab does not send ETags, so an open app can still overwrite the hub or a list afterward. Close the tab or refresh after a bulk career import.

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
        "LIFEOS_FIREBASE_REFRESH_TOKEN": "firebase-refresh-token",
        "LIFEOS_ALLOW_WRITES": "1"
      }
    }
  }
}
```

Omit `LIFEOS_ALLOW_WRITES` until you want the assistant to create or change data. Omit `LIFEOS_DATA_PATH` so a leftover export cannot freeze the view — writes also refuse while that variable, or a discovered snapshot, is the store.

## Restart so the new tools appear

Tool schemas are loaded when the MCP process starts. `tools/list` includes the write tools and `list_career` on the next start even if writes stay off.

**stdio** (`node mcp/run.cjs` or `npm run mcp`): stop that process and start it again with the env above. In Cursor, save `mcp.json` and reload the window so Cursor respawns the server. Set `LIFEOS_ALLOW_WRITES=1` in that server's `env` block before you want writes to succeed.

**HTTP** (`POST /api/mcp` and `/api/mcp/http`): redeploy the Next.js host (Vercel) with the same Firebase env plus `LIFEOS_ALLOW_WRITES=1` and the existing `LIFEOS_MCP_TOKEN`. Clients should refresh their tool list after the deploy. `LIFEOS_MCP_TOKEN` is still required for HTTP. Leave `LIFEOS_DATA_PATH` unset on that host.

## Firebase credentials and rules

No new credential is required. The login that already reads `users/{uid}` can write it:

- `database.rules.json` already sets `users/$uid` `.read` and `.write` to `auth != null && auth.uid == $uid`.
- A user ID token, refresh token, or email/password sign-in satisfies that rule.
- A service account bypasses rules (the JWT scope already includes `https://www.googleapis.com/auth/firebase.database`) and this server still only writes `users/{LIFEOS_USER_ID}/{tasks,projects,calendar,notes,settings,career}`.

If the **live** Realtime Database rules in the Firebase console were changed so `$uid` is read-only, restore the owner read+write rule from `database.rules.json` and publish. A 401/403 from a write says that in the tool error. You do not need a second project, a new API key, or a rules change when the console still matches this file.

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

Unit tests: `npx jest __tests__/mcp.test.ts __tests__/mcp-writes.test.ts`.

## Limitations

- Live path needs **Firebase uid + DB URL + a durable auth method** (refresh token is the one that works for Google sign-in). The phone/browser cache is not a Node-readable DB path.
- Firebase ID tokens expire; refresh token, email/password, or a service account remint credentials. The MCP retries once on HTTP 401 and retries a write that loses an ETag race.
- Writes stay off until `LIFEOS_ALLOW_WRITES` is `1`, `true`, `yes`, or `on`. Export files and discovered snapshots are never edited.
- Career rows sort in the app by `stageId`, `appliedAt` (`YYYY-MM-DD`), and company name. Turn on Career in Settings (`enableCareerOS`) to see them; the MCP does not write that settings flag.
- An open LifeOS tab can overwrite a collection after the MCP writes it, because the web client replaces the whole list without an ETag.
- MasterOS teaching data lives in a separate `localStorage` key and is not exposed here.
- HTTP `/api/mcp` is Streamable HTTP (JSON or SSE). Long-lived SSE on Vercel closes after the current message — clients that require JSON responses (Cursor) keep working.
