# LifeOS — Agent Guidelines

**Status:** Living document  
**Audience:** Coding agents (Cursor, Claude Code, Cloud Agents, etc.) working in this repo  
**Last updated:** 2026-09-24  

Read this before changing product behavior. Deeper truth lives in the sibling docs — this file is the **operating manual**.

| Doc | Use when |
|-----|----------|
| [PRD](./PRD.md) | What the product is supposed to do |
| [Startup guide](./STARTUP.md) | How to use LifeOS (end users / teammates) |
| [Architecture](./architecture.md) | Where code and data live |
| [Design system](./design-system.md) | How UI should look |
| Root [AGENTS.md](../AGENTS.md) | Cursor Cloud / Reticle / web runbook |
| Mobile [lifeos-mobile/AGENTS.md](../lifeos-mobile/AGENTS.md) | Expo / EAS / OTA specifics |
| [RETICLE.md](../RETICLE.md) | Verification edge cases |
| [MCP.md](../MCP.md) | Assistant / MCP access |

Also follow any user rules in the session (commits, PRs, communication). Those override this doc when they conflict.

---

## 1. Product in one paragraph

LifeOS is a **personal life operating system**: tasks, projects, environments (Life / School / Work / …), notes, calendar, focus, and optional packs (Treasury, Study Abroad, MasterOS). **Web** (Next.js at repo root) and **iOS** (`lifeos-mobile/`) share **Firebase Auth + Realtime Database**. There is no separate app DB server.

North star: open once and know what matters *now* — without maintaining a parallel task app.

---

## 2. Scope before you code

1. **Confirm surface** — Web only, mobile only, or both? Don’t assume a web fix ships to iOS.  
2. **Confirm delivery** — For mobile: JS/UI → merge to `main` → EAS Update (OTA). Native / `app.json` plugins / new modules → new EAS binary.  
3. **Confirm data** — New fields need writers on every client that owns that slice, plus validation that does **not** strip school/domain fields on load.  
4. **Confirm intent against the PRD** — Don’t invent multi-tenant, social, or full banking features.  

If the request is ambiguous (web vs iOS, OTA vs store build), ask once — don’t ship the wrong surface.

---

## 3. Repository map (agent cheat sheet)

| Path | Agent note |
|------|------------|
| `app/page.tsx` | Main web shell — large shared state. Prefer surgical edits; extract only when asked or clearly necessary. |
| `app/globals.css` | Design tokens — keep in sync with mobile theme |
| `lib/` | Web domain logic, Firebase, sync, validation, MCP |
| `app/api/**` | Next API routes (AI, calendars, MCP HTTP, shell-auth) |
| `lifeos-mobile/` | **Separate** npm project — `npm install` / scripts run *inside* this folder |
| `docs/` | PRD, architecture, design system, **this file** |
| `.reticle/` | Verification flows — don’t delete assertions to go green |

Root `npm run dev` = web only. Mobile = `cd lifeos-mobile && npm start` (or EAS).

---

## 4. Hard rules

### 4.1 Do

- Match existing patterns, naming, and token usage in the file you touch.  
- Prefer design-system tokens (`globals.css` / `theme.ts`) over one-off hex.  
- Preserve Firebase shapes: school fields (`classId`, points, academic metadata), notebook hub + per-page paths, focus enforcer under `users/{uid}/…`.  
- Keep web and mobile theme hex in sync when changing brand/semantic colors.  
- For user-visible web UI work: verify with **Reticle** before calling done (see §7).  
- Say in one line when you **skip** Reticle (docs-only, no UI surface, etc.).  
- For mobile shipping: distinguish **OTA** vs **new native build** in the reply.  

### 4.2 Don’t

- Don’t broaden `database.rules.json` beyond `auth.uid == uid` for user trees.  
- Don’t commit `.env`, secrets, or tokens.  
- Don’t invent a second database or CRDT layer without an explicit architecture decision.  
- Don’t strip unknown/optional fields in validators “to be safe” — that historically wiped School OS.  
- Don’t tell the user to `git fetch` + Metro for TestFlight verification when EAS Update is the delivery path — say merge → wait for Action → force-quit → reopen.  
- Don’t start a second web dev server if `:3000` is already taken; don’t kill servers.  
- Don’t commit or push unless the user asks.  
- Don’t weaken Reticle assertions to make a check pass.  

### 4.3 Git & shipping (unless user rules say otherwise)

- Commit only on request; follow their commit/PR protocol.  
- Mobile Path A (local Mac build): end with exact `git fetch` / checkout / pull + build commands.  
- Mobile Path B (ship to phone): only when asked — OTA and/or `eas build` / `eas submit`.  
- EAS builds: from `lifeos-mobile/` on latest intended commit; don’t “Rebuild” a failed job that pins an old commit.

---

## 5. Data & sync (non-negotiables)

- **System of record:** `users/{uid}/{slice}` in Firebase RTDB.  
- **Conflict model:** last-write-wins per key. Optimistic UI; mobile guards stale silent fetches.  
- **No Firebase env:** web sync no-ops; app can run on local state for demos.  
- **Dev login (web):** “Dev: Test Login” only on `localhost` / `127.0.0.1` → use `http://localhost:3000`, not LAN IP.  
- **Notebooks (iOS):** `notebookHub` + `notebookPages/{pageId}`; PencilKit needs a **native** build, not Expo Go.  
- Adding a workspace slice: update path constants / writers on **every** client that touches it, then Zod or mobile normalizers.

Details: [architecture.md](./architecture.md) §§4–6.

---

## 6. UI & design

- Follow [design-system.md](./design-system.md).  
- Calm density, paper + ink surfaces, environment color as **signal** not full chrome paint.  
- Extend tokens; don’t invent parallel palettes.  
- Cards = interaction containers; don’t glassmorph everything.  
- Tab bar on mobile is an **in-layout** stop, not a translucent overlay over content.  

---

## 7. Verification (web)

User-visible web changes are not done until verified (or explicitly skipped with reason).

1. Prefer Reticle MCP / `/reticle` skill; drive real UI.  
2. Only `reticle_act_and_wait` and `reticle_assert` produce a verdict.  
3. `verified: "unknown"` is **not** a pass.  
4. If no session: start `npm run dev` in background if needed, ensure Reticle daemon/SDK, then connect — never kill existing listeners.  
5. After `next.config` / Reticle wiring changes: restart dev server + hard-reload.  

Quick smoke without Reticle: localhost → Dev Test Login → Now view → `/t <title>` Enter creates a task.

Mobile: Reticle does not cover Expo. Prefer simulator/device checks; say what you could not prove.

---

## 8. Common task recipes

### Add or change a task field

1. Update types + Zod (`lib/validation.ts`) with passthrough/soft repair.  
2. Wire web UI (`page.tsx` / helpers) and mobile (`TasksScreen` / types) if both own tasks.  
3. Confirm RTDB write doesn’t drop the field on round-trip.  

### School / grades

- Prefer existing `lib/grades.ts` / import pipelines.  
- Never “clean” tasks by dropping `classId`.  

### Notebook / ink (iOS)

- Edit via notebook hub APIs; flush pages by id.  
- Note OTA vs native if touching PencilKit / plugins.  

### Design token change

- Update `app/globals.css` **and** `lifeos-mobile/src/lib/theme.ts`.  
- Update design-system.md if the token set changes.  

### Docs-only

- Skip Reticle; one-line skip reason is enough.  
- Keep PRD / architecture / design-system / this file cross-linked when you add a new top-level doc.

---

## 9. Commands

**Web (repo root)**

```bash
npm install          # legacy-peer-deps via root .npmrc
npm run dev          # http://localhost:3000
npm test
npm run lint
npx tsc --noEmit
```

**Mobile (`lifeos-mobile/`)**

```bash
npm install
npm start            # Metro
npm run update:production   # EAS Update to production channel (when shipping OTA)
```

**Reticle (when verifying web)**

```bash
npx @reticlehq/server serve    # background if needed
npx @reticlehq/server open http://localhost:3000
npx @reticlehq/server status
```

---

## 10. Communication with the human

- Be direct and short; lead with the outcome.  
- Name the surface (web / iOS) and delivery path (OTA vs store build) when relevant.  
- List files touched for compliance / multi-file audits.  
- Don’t pad with “I didn’t do X” unless X was requested or blocked the task.  
- If Reticle couldn’t run or returned unknown, say so honestly.  

---

## 11. When to update this file

Update `docs/agent.md` when:

- A new hard rule or gotcha costs agents real time (auth host, OTA rules, validation pitfalls).  
- A new primary surface or delivery path appears.  
- Sibling docs move or rename.  

Do **not** duplicate full PRD/architecture content here — link out.

---

*End of agent guidelines.*
