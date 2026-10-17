# LifeOS Architecture

**Status:** Living document  
**Last updated:** 2026-09-24  
**Related:** [PRD](./PRD.md) · [Design system](./design-system.md) · [MCP](../MCP.md) · [Reticle](../RETICLE.md)

This document describes how LifeOS is built: monorepo layout, clients, cloud data, API edges, and sync rules.

---

## 1. System overview

LifeOS is a **multi-client personal OS** with a shared Firebase Realtime Database as the system of record. There is **no separate application database server**. Next.js API routes provide OAuth/calendar/AI/MCP edges; clients own UI state and write workspace slices to Firebase.

```text
┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│  Web (Next.js)  │  │  iOS (Expo)      │  │  Optional          │
│  app/page.tsx   │  │  lifeos-mobile/  │  │  Tauri · Extension │
│  + app/api/**   │  │  App.tsx         │  │  Context Radar     │
└────────┬────────┘  └────────┬─────────┘  └─────────┬──────────┘
         │                    │                        │
         │     Firebase Auth + RTDB (+ Storage)        │
         └────────────────────┼────────────────────────┘
                              │
                    users/{uid}/{slice}
                              │
              ┌───────────────┴───────────────┐
              │  MCP (stdio / HTTP)           │
              │  reads live Firebase          │
              └───────────────────────────────┘
```

**Deploy:** Web → Vercel. Mobile → EAS Build + EAS Update (OTA). Auth: your own Firebase project (via env).

---

## 2. Repository map

Monorepo rooted at `Cockpit/` (package name `lifeos`):

| Path | Role |
|------|------|
| `app/` | Next.js App Router: shell UI, MasterOS routes, API routes, shell-auth |
| `lib/` | Shared web domain logic: Firebase, sync, validation, grades, MCP, calendars |
| `components/` | Smaller shared React pieces (ErrorBoundary, etc.) |
| `hooks/` | Web hooks |
| `__tests__/` | Jest unit tests |
| `lifeos-mobile/` | **Separate** Expo npm project (own lockfile) |
| `src-tauri/` | Optional Tauri desktop wrapper |
| `lifeos-context-radar/` | Plain JS Chrome extension |
| `docs/` | PRD, design system, architecture |
| `.reticle/` | Reticle verification artifacts |
| `mcp/` | MCP stdio runner (`npm run mcp`) |

Root `npm install` / `npm run dev` only cover the **web** app. Mobile requires `cd lifeos-mobile && npm install`.

---

## 3. Clients

### 3.1 Web application

| Concern | Implementation |
|---------|----------------|
| Framework | Next.js (App Router), React |
| Entry UI | Mostly monolithic `app/page.tsx` (views, composers, settings) |
| Environments | Life, School, Work, Study Abroad, Treasury, Mastery (toggleable) |
| Styling | `app/globals.css` design tokens |
| Fonts | Inter via `next/font` + display serif stack |
| Config | `next.config.ts` + `withReticle()`; Firebase auth rewrites `/__/auth/*` |
| Dev login | `TEST_USER` when host is localhost |
| Verification | Reticle SDK (`ReticleDev`, bridge `:4400`) |

**View routing:** client-side `?view=` query → internal `View` union (Now, Tasks, Calendar, Library, Settings, environments…).

**State model (web):** React `useState` / effects in `page.tsx` hydrate from Firebase (`loadAllUserData` / `dataSync`) and push updates with `syncDataToFirebase`. Cross-tab helpers in `lib/crossTabSync.ts`.

### 3.2 Mobile application (`lifeos-mobile/`)

| Concern | Implementation |
|---------|----------------|
| Framework | Expo SDK 54, React Native |
| Entry | `App.tsx` → auth gate → `LifeOSContext` → `RootNavigator` |
| Navigation | Bottom tabs + native stacks (`src/navigation/`) |
| Theme | `src/lib/theme.ts` (parity with web tokens) |
| Native bridges | Siri, Share inbox, Notifications, Focus Enforcer, Widgets, Live Activity, Synapse import |
| Ink | PencilKit via native module / handwriting canvas (not Expo Go for full ink) |
| Updates | `src/lib/ota.ts` + GitHub Action `eas update` on `main` |

**State model (mobile):** `Workspace` object in context; each `updateX` / `upsertNotebookPage` writes optimistically then persists via `saveWorkspacePart` / page paths. Silent refresh on an interval / AppState, guarded so older fetches don’t clobber newer local writes.

### 3.3 Optional surfaces

- **Tauri:** wraps web; see `TAURI_SETUP.md`.  
- **Context Radar:** extension capture → LifeOS URL / inbox patterns.  
- **MasterOS:** nested teaching OS under `app/masteros/**` (also embedded in web shell + mobile stack).

---

## 4. Cloud & identity

### 4.1 Firebase

| Service | Use |
|---------|-----|
| **Auth** | Google (web + iOS); Apple (iOS). Persistence: browser local / RN AsyncStorage |
| **Realtime Database** | Workspace slices under `users/{uid}/…` |
| **Storage** | File resources when configured (`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`) |

Client Firebase config comes from env only (no baked-in project). Blank env = local-only web demo. Web prefers **current host** as `authDomain` so OAuth stays on your deploy domain via `/__/auth` rewrites.

**Security:** `database.rules.json` — user can only read/write `users/{uid}` when `auth.uid == uid`.

### 4.2 Auth flows

| Client | Flow |
|--------|------|
| Web | Popup/redirect Google; `/shell-auth` support for embedded contexts |
| Mobile | Google via HTTPS shell-auth bridge → ID token → `signInWithCredential`; Apple native |
| Dev | Localhost “Dev: Test Login” → `test-user-dev` without Firebase |

### 4.3 When Firebase is unset

`syncDataToFirebase` / loaders **no-op** if `NEXT_PUBLIC_FIREBASE_DB_URL` is missing. Web can run fully on local/in-memory state for demos.

---

## 5. Data architecture

### 5.1 Path layout

Canonical web paths (`lib/constants.ts` `FIREBASE_PATHS`):

```text
users/{uid}/
  tasks
  projects
  calendar
  brain
  classes
  notes
  resources
  life
  school          # also written by clients (hub state)
  work
  timeTracking
  studyAbroad
  settings
  dark
```

Mobile additionally uses (same uid tree):

```text
  notebookHub
  notebookPages/{pageId}
  calendars          # user calendar list, where used
  focusEnforcer/…
```

Treasury may use browser storage keys plus optional cloud budget nodes when signed in.

### 5.2 Validation & repair

- Zod schemas in `lib/validation.ts` (`TaskSchema`, projects, calendar, settings…).  
- **School fields** (`classId`, academic metadata, points) must survive load — stripping them historically wiped School OS.  
- `coerceFirebaseList` converts RTDB object-maps back to arrays.  
- `softRepairTask` clamps focus minutes / normalizes priority.  
- Task writes can mirror to a **local backup** (`taskBackup`) for recovery.

### 5.3 Ownership of domain logic

| Domain | Primary modules |
|--------|-----------------|
| Tasks / helpers | `lib/helpers.ts`, page composers, mobile `TasksScreen` |
| Grades / import | `lib/grades.ts`, `lib/gradebookImport.ts` (+ mobile copies where needed) |
| School / Work / Life hubs | `app/components/OSDashboards.tsx`, hub types on mobile |
| Study Abroad | `lib/studyAbroad*`, `StudyAbroadDashboard` |
| Treasury | `TreasuryOSDashboard` (client-heavy) |
| MasterOS | `lib/masteros`, `app/masteros/**` |
| Notifications | `lib/notifications.ts`, mobile planner/sync |
| Time tracking | `lib/timeTracking.ts` |
| Notebooks | `lifeos-mobile/src/lib/notebooks.ts` |
| Focus enforcer | `lib/focusEnforcer`, mobile `focusEnforcer/*` |

---

## 6. Sync model

### 6.1 Write path

```text
UI event → local state update → cleanUndefined → RTDB set(users/uid/key)
                                      ↘ optional local backup (tasks)
```

- Web: `syncDataToFirebase(key, data)` with retries (`firebaseErrors`).  
- Mobile: `saveWorkspacePart` / `saveNotebookPage`; `pendingWrites` + `lastWriteAt` protect against stale silent sync.  
- Notebook **pages** are written **per page id** (not only as one giant blob) for size/perf.

### 6.2 Read / subscribe path

- Initial load: parallel `get` per key → assemble workspace.  
- Web listeners: `onValue` map in `dataSync` where subscribed.  
- Mobile: `subscribeWorkspacePart` + periodic silent `loadWorkspace`.  
- Multi-tab web: `crossTabSync` broadcasts some updates.

### 6.3 Conflict philosophy

**Last write wins** per key (RTDB). Clients mitigate with:

- Optimistic UI  
- Ignoring fetch results older than last local write (mobile)  
- Schema passthrough / soft repair instead of dropping records  
- Preferring merge helpers for hubs (e.g. notebook patch, folder moves)

There is no CRDT layer.

### 6.4 Offline

- `lib/offlineQueue.ts` (web) for queued ops where wired.  
- Mobile ink cache (`inkCache`) for local PencilKit payloads.  
- True offline-first multi-device merge is **out of scope**.

---

## 7. API & edge services

All under `app/api/**` (Next.js Route Handlers on Vercel):

| Route area | Purpose |
|------------|---------|
| `/api/ai` | NL task parsing / AI assists |
| `/api/mcp`, `/api/mcp/http` | MCP JSON-RPC (+ SSE); gated by `LIFEOS_MCP_TOKEN` |
| `/api/gmail/**` | Gmail OAuth + calendar sync helpers |
| `/api/outlook/**` | Outlook OAuth + calendar sync |
| `/api/icloud/**` | iCloud calendar (app-specific password, server-encrypted) |
| `/api/ical` | Generic iCal |
| `app/shell-auth/**` | Auth bridge for Expo / embedded Google sign-in |

Server modules: `lib/gmailServer.ts`, `outlookServer.ts`, `icloudServer.ts`. Calendar **connectors do not replace** the LifeOS `calendar` key — they feed into it on sync.

MCP details: see root `MCP.md`. Prefer **live Firebase** over stale export files when env is complete. Current MCP surface is primarily **read** of workspace tools.

---

## 8. Navigation architecture

### 8.1 Web

Single-page shell: sidebar + main. View switches update React state and URL `view` param. Modals (create task, capture, command palette, space/class composers) overlay the shell.

### 8.2 Mobile

```text
TabNavigator
  NowTab      → Now stack (Settings, Focus Enforcer, MasterOS modal, …)
  TasksTab    → Tasks → TaskDetail
  CalendarTab → Calendar
  LifeTab     → Life dashboard → projects / hub collections / …
  SchoolTab   → School dashboard → class / grades / …
  WorkTab     → Work dashboard
  LibraryTab  → Notebooks · Notes · Brain · Resources
                 PageCanvas (fullScreenModal)
```

Tab bar is **in-layout** (not absolute overlay). Immersive writers use `fullScreenModal`.

---

## 9. Cross-cutting subsystems

| Subsystem | Role |
|-----------|------|
| **Command palette / capture** | Fast create & navigate (web) |
| **Notifications** | In-app center + mobile local notifications from planner |
| **OTA** | JS bundles to `production` channel after `main` push |
| **Reticle** | Dev-only web verification SDK + MCP tools |
| **File storage** | `lib/fileStorage.ts` + Storage for resources |
| **Syllabus / Synapse import** | Importers into tasks/school/work |
| **Accessibility / performance** | `lib/accessibility.ts`, `performance.ts` |

---

## 10. Build, test, ship

| Track | Commands / pipeline |
|-------|---------------------|
| Web dev | `npm run dev` → `:3000` |
| Web test | `npm test`, `npm run lint`, `npx tsc --noEmit` |
| Web prod | Vercel (env: Firebase, AI, calendar secrets, MCP token) |
| Mobile dev | `lifeos-mobile/` → `npx expo start` |
| Mobile prod binary | `eas build` profiles in `eas.json` |
| Mobile OTA | `.github/workflows/eas-update.yml` on `main` |
| MCP local | `npm run mcp` |

**Native vs OTA:** JS/UI → OTA. New native modules, plugins, or `app.json` changes → new binary.

---

## 11. Security & secrets

| Secret class | Examples | Handling |
|--------------|----------|----------|
| Public client | Firebase API key, project id | Shippable; rules enforce auth |
| Server | OAuth client secrets, `ICLOUD_CONNECTION_SECRET`, `LIFEOS_MCP_TOKEN` | Vercel / EAS env only |
| User tokens | MCP refresh / ID tokens | Treat as passwords; Settings Assistant UI |

Never commit `.env.local`. Extension and MCP must not broaden RTDB rules.

---

## 12. Architectural constraints & decisions

1. **Firebase RTDB is the database** — no Postgres/SQLite app server.  
2. **Web UI is concentrated in `page.tsx`** — extract carefully; many views share one state bag.  
3. **Mobile is a sibling app**, not a WebView of Next (except optional parked shells).  
4. **Environments are feature packs**, not separate tenants.  
5. **Validation must not destroy domain fields** on round-trip.  
6. **Ink pages are large** — per-page paths + local cache; avoid rewriting entire notebookPages tree on each stroke flush.  
7. **Assistants read the real store** via MCP/Firebase — not a parallel CMS.

---

## 13. Evolution guidelines

When changing architecture:

1. Update `FIREBASE_PATHS` / mobile writers together if adding a slice.  
2. Add Zod (or mobile normalizers) before writing new shapes at scale.  
3. Document OTA vs native impact for mobile PRs.  
4. Keep design tokens in sync (`globals.css` ↔ `theme.ts`).  
5. Extend [PRD](./PRD.md) requirements if user-visible behavior changes.

---

## 14. Quick reference — key files

| Concern | File(s) |
|---------|---------|
| Web shell | `app/page.tsx`, `app/layout.tsx`, `app/globals.css` |
| Web sync | `lib/dataSync.ts`, `lib/firebase.ts`, `lib/validation.ts` |
| Paths | `lib/constants.ts` |
| Mobile app | `lifeos-mobile/App.tsx` |
| Mobile Firebase | `lifeos-mobile/src/lib/firebase.ts` |
| Mobile context | `lifeos-mobile/src/lib/LifeOSContext.tsx` |
| Mobile nav | `lifeos-mobile/src/navigation/RootNavigator.tsx` |
| MCP | `lib/mcp/**`, `app/api/mcp/**`, `MCP.md` |
| Grades | `lib/grades.ts`, `lib/gradebookImport.ts` |
| DB rules | `database.rules.json` |

---

*End of architecture document.*
