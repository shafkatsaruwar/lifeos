# LifeOS 3.0 — Phase 0 Audit & Implementation Plan

**Status:** Audit only — no product implementation  
**Date:** 2026-10-18  
**Base:** `main` @ `a794703` (includes #130 Tasks×Calendar, #131 mobile parity)  
**Branch:** `cursor/lifeos-3-phase0-audit-b1ae`  
**Author role:** Senior product designer + frontend architect  

**Non-negotiables observed:** Preserve Atelier Light; no feature breakage; no unnecessary architecture rewrite; no Firebase schema/migration unless necessary; no mock production data; no duplicate task/calendar/focus/settings systems; do not break Copilot / MCP / executive; no auto-merge to `main`.

**Brief note:** A numbered “Parts 3–16” / “Phases 1–8” product brief was **not found in-repo**. Sections below map vision keywords from the Phase 0 assignment (Atelier Dark, Appearance Studio, widgets, rings, Kanban, immersive focus, customizable OS) onto a Part/Phase taxonomy inferred for planning. Confirm numbering against the user’s private brief before Phase 1+.

---

## Checklist snapshot (repo inspection)

| # | Area | Finding |
|---|------|---------|
| 1 | Framework / frontend | Next.js 15 App Router + React 19 web (`app/page.tsx` monolith ~7k LOC); Expo SDK 54 mobile (`lifeos-mobile/`); optional Tauri + Context Radar extension |
| 2 | Design tokens | CSS vars in `app/globals.css` (`:root` / `.dark`); mobile `lifeos-mobile/src/lib/theme.ts` (partially drifted vs current web light tokens) |
| 3 | Light / dark today | Boolean `dark` + `document.documentElement.classList.toggle("dark")`; Firebase path `users/{uid}/dark`. Mobile uses `settings.themeMode` (`system` \| `light` \| `dark`). **Not** dual “Atelier Light / Atelier Dark” personalities |
| 4 | Typography | Single `@font-face` **LifeOS** → `/fonts/SFProDisplay-Medium.ttf`; `--font-sans` and `--font-display` both `"LifeOS"`. Living `docs/design-system.md` still mentions Inter/serif (stale) |
| 5 | Settings | Bento hub (`components/ui/bento-grid-01.tsx`) → sections: appearance, hubs, connections, focus, privacy, notifications, account. Appearance: Light/Dark, accent swatches, compact, reduce motion, capture shortcuts |
| 6 | Firebase | RTDB slices under `users/{uid}/…` via `lib/dataSync.ts` + `FIREBASE_PATHS`; Zod in `lib/validation.ts`; last-write-wins; no CRDT |
| 7 | Auth / Navigation owner | Google (web + iOS shell-auth); Apple (iOS); localhost `TEST_USER`. Navigation / Executive gated by `lib/navigationOwner.ts` (`mohammedshafkatsaruwar@gmail.com`) |
| 8 | Tasks | `TaskSchema` + inline `Task` in `page.tsx`; focus session fields on task; `calendarEventId`; academic/school fields |
| 9 | Calendar | `CalendarEventSchema` + `linkedTaskId`; overlays via `lib/taskCalendar.ts` (sessions, deadlines, layers). #130/#131 merged. Integrations: iCal multi-feed, Gmail/Outlook/iCloud API edges, Synapse |
| 10 | Focus | Web `FocusMode` / floating dock / task timer fields; mobile Focus Enforcer (`lib/focusEnforcer`, native screens). Focus strip hubs: `lib/focusStrip.ts` |
| 11 | Executive / Navigation | `lib/executive/*` + `ExecutivePanel`; owner-only web view; iOS Executive on Now |
| 12 | Copilot | `LifeOSCopilot` in Now → `POST /api/ai` `action: "copilot"`; MCP separate (`mcp/`, `MCP.md`) |
| 13 | Dashboard / Now | Atelier Now: greeting, weather widget, quote, Today timeline, focus ring panel, hub tiles, Copilot |
| 14 | Mobile vs desktop | Web responsive breakpoints + drawer sidebar; native Expo tabs/stacks — **not** the same shell |
| 15 | Animation | `framer-motion` (view transitions, modals, focus); `reduceMotion` → `.reduce-motion` |
| 16 | Tests / CI | Jest unit tests (`__tests__/`); lint/tsc local; **only** CI workflow is EAS Update OTA on `main` for mobile — no web test CI gate |
| 17 | Design archives | `docs/design-archive/` — pre-lock + **current-2026-10-18** (tip commit on `cursor/design-archive-current-b1ae`, **not yet on `main`** at audit time) |
| 18 | Open PRs / conflict branches | **Zero open GitHub PRs** at audit time. #130/#131 merged. Unmerged remote tips that can collide with appearance work listed in §4 |

---

## 1. Existing functionality

### 1.1 Visual system (Atelier Light baseline)

- **Light is the product default** and the active Atelier look: cool paper canvas (`#F7F9FC`), white panels, blue accent default in CSS (`#2563EB`), SF Pro / LifeOS single font, white-tile brand mark.
- **Dark exists as a token flip**, not a designed “command center”: `.dark` remaps the same semantic vars to near-slate navy (`#0B1220` canvas). Focus studio already uses a hard-coded dark chrome (`#17171b` / purple ring) independent of theme.
- **Accent** is user-selectable and applied as `--accent` (also per-view via workspace colors). Persisted in `settings.accent` (+ `workspaceColors`).
- **Compact / reduce motion** toggle `html` classes; wired and used.

### 1.2 Settings & persistence

- Settings bento is the single Settings surface (post #123/#127).
- Sync: `settings` + separate boolean `dark` keys. Zod `SettingsSchema` already allows optional `themeMode` (used by **mobile**, not web UI).
- Environment packs, iCal subscriptions, calendar defaults/layers, entitlement, onboarding timestamps already live on `settings` with `.passthrough()` — room to extend **without** a new store if we stay additive.

### 1.3 Now / widgets (fixed layout)

- Weather (`NowWeatherWidget`), quote card, Today agenda (from merged calendar feed), focus progress ring, hub Focus strip, Copilot card.
- **Not** a widget layout engine: placement is CSS-grid / component composition in `NowView`.

### 1.4 Tasks & calendar (post #130/#131)

- Primary link: `task.calendarEventId`; reverse: `event.linkedTaskId` for multi-session.
- Helpers: `lib/taskCalendar.ts` — scheduled sessions, deadline overlays, layer visibility.
- Web Task workspace can schedule sessions; Calendar has layer toggles; mobile TaskDetail parity (#131).
- Prior audit: `docs/task-calendar-audit.md` (still useful; some “missing” items from that doc are now shipped).

### 1.5 Focus

- Per-task countdown, halfway prompts, floating dock, break modal, FocusMode studio.
- Mobile Focus Enforcer is a **separate** accountability system (schedule, verify, history) — do not conflate with FocusMode.

### 1.6 Executive Function / Navigation

- Closed-loop routines (salah, retainers, etc.) under `users/{uid}/guided`.
- Web Navigation page owner-gated; non-owners redirected to Now.
- Must remain untouched by theme work except token consumption.

### 1.7 Copilot & MCP

- In-app Copilot is Now-card AI over local context.
- MCP reads (optional writes) live Firebase — theme changes must not invent a parallel data plane.

### 1.8 Kanban (partial)

- Work OS and Career (and Study Abroad stages) have **hub-local** kanban boards.
- There is **no** global Tasks Kanban across LifeOS priorities.

### 1.9 Cross-surface

- Mobile theme tokens lag web’s current Atelier blues/grays (mobile light still documents older `#F6F7F9` / violet accent in comments).
- Web ignores `themeMode`; mobile ignores the web-only `dark` boolean path for preference (mobile derives dark from `themeMode` + system).

---

## 2. Missing functionality (mapped to Parts 3–16)

*Inferred Part map from the Phase 0 vision. Adjust labels if the private brief differs.*

| Part | Theme (inferred) | Gap vs repo today |
|------|------------------|-------------------|
| **3** | Dual personalities (Atelier Light / Atelier Dark) | No named personalities; dark is inverted tokens, not a richer navy/charcoal command aesthetic; FocusMode dark is unrelated |
| **4** | Appearance Studio | Settings Appearance is Light/Dark + accent + density — no studio, presets, wallpaper, chrome density packs, or personality picker |
| **5** | Token architecture for dual skins | Single `:root`/`.dark` pair; no `data-personality` / skin layers; `next-themes` dependency unused |
| **6** | Typography system for 3.0 | One Medium SF face for all weights/roles; design-system doc stale; no display/UI split for Dark personality |
| **7** | Now widget customization | Fixed widgets; no layout persistence, hide/show, reorder, or widget catalog |
| **8** | Progress rings / day score system | Atelier focus ring exists for current task only; no multi-ring day/week health visualization as a first-class OS feature |
| **9** | Global / Tasks Kanban | Only Work/Career(/SA) boards; Tasks view is table/list |
| **10** | Immersive Focus 3.0 | FocusMode exists but is not personality-aware, not Appearance-Studio driven, not unified with Focus Enforcer |
| **11** | Settings IA for customization | Bento exists; no Appearance Studio section; web/mobile preference models diverge (`dark` vs `themeMode`) |
| **12** | Mobile parity for personalities | Mobile Appearance exists; no Atelier Dark art direction; token drift vs web |
| **13** | Motion / presence for Dark | Framer used lightly; no intentional Dark command-center motion language beyond reduce-motion kill-switch |
| **14** | Persistence model for layout prefs | No `widgetLayout` / `appearance` blob; would need additive settings fields (prefer) or new RTDB key (avoid unless necessary) |
| **15** | Docs / design-system sync | Living design-system ≠ shipped Atelier (Inter/serif/dark-mark vs SF Pro/white mark); archive on side branch |
| **16** | Hardening / regression | No visual regression suite; no CI for web Jest; risk of Light regressions while building Dark |

**Explicitly out of Phase 0 (and must stay deferred until approval):** implementing Atelier Dark, Appearance Studio UI, widget engines, rings expansion, Tasks Kanban, immersive Focus redesign.

---

## 3. Reusable components

| Asset | Path | Reuse for 3.0 |
|-------|------|----------------|
| CSS token surface | `app/globals.css` `:root` / `.dark` | Extend with personality selectors; **do not** fork a second stylesheet tree |
| Settings bento | `components/ui/bento-grid-01.tsx` | Add “Appearance Studio” tile / deepen Appearance section |
| Now composition | `NowView` + `NowWeatherWidget` | Extract widgets later; keep data props from existing feed |
| Focus ring SVG | Atelier focus panel in `page.tsx` | Seed for rings language |
| FocusMode / dock | `FocusMode`, floating dock | Evolve in place; keep task session fields |
| Task↔calendar | `lib/taskCalendar.ts` | Already the single linking system — extend, don’t replace |
| Focus strip | `lib/focusStrip.ts` | Hub strip stays; personality-agnostic |
| Executive | `lib/executive/*`, `ExecutivePanel` | Token consumers only |
| Mobile theme | `lifeos-mobile/src/lib/theme.ts` + Settings Appearance | Align tokens; adopt shared personality enum |
| Design archives | `docs/design-archive/**` | Freeze Light baseline before Dark lands |
| Validation | `SettingsSchema` passthrough | Additive prefs without migration |
| Motion | `framer-motion` + `reduceMotion` | Dark presence motions with respect for reduce-motion |

**Avoid reusing / do not resurrect:** unused `next-themes` until a real provider plan exists; legacy unused components noted in `IMPLEMENTATION_STATUS.md`; pre-lock chips-era Now as default (archive only).

---

## 4. Potential conflicts

### 4.1 Open PRs

As of this audit (`gh pr list --state open`): **none**.

### 4.2 Recently merged (do not redo / do not regress)

| PR | Topic |
|----|--------|
| #131 | Mobile task–calendar sessions parity |
| #130 | Tasks × Calendar sessions + layers |
| #129 | Navigation owner email |
| #128 | Focus strip all hubs |
| #127 / #123 | Settings bento (light) |
| #126 / #125 | Home label, Navigation, SF Pro, mark |
| #121 | Atelier 2.0 Now weather / quote / timeline |
| #122 | Sidebar command bar |
| #115–#117 | Executive Function |

### 4.3 Unmerged remote branches that can collide

| Branch | Why it matters |
|--------|----------------|
| `cursor/design-archive-current-b1ae` | Frozen current Atelier snapshot **ahead of `main`** — merge/docs-coordinate before overwriting archive |
| `cursor/mobile-appearance-settings-b1ae` | Older Appearance work (PR #43 merged historically; tip may still diverge) |
| `cursor/restore-inter-font-b1ae` | Would fight SF Pro / LifeOS single-font decision |
| `cursor/atelier-2-b1ae` | Stale tip vs merged Atelier 2 — ignore for new work |
| `cursor/focus-enforcer-*` | Focus Enforcer v1/repeat — keep separate from FocusMode redesign |
| SchoolOS / notebooks / handwriting branches | Unrelated but touch shared UI chrome |

### 4.4 Duplicate-system risks (product)

| Risk | Mitigation |
|------|------------|
| Second theme store (`appearance` RTDB key vs `dark` + `settings`) | Prefer additive `settings.personality` / `settings.themeMode` and deprecate boolean `dark` gradually |
| Second task board / calendar | Extend `taskCalendar` + Tasks view modes only |
| Second focus timer | Evolve `FocusMode`; leave Focus Enforcer as distinct product |
| Widget data mocks | Widgets must bind existing tasks/events/settings only |

### 4.5 Theme gaps

- Web ↔ mobile preference model mismatch (`dark` bool vs `themeMode`).
- Mobile token hex drift vs current web Atelier light.
- `docs/design-system.md` outdated vs shipped UI.
- FocusMode hard-coded dark ignores Light personality.

---

## 5. Data migration risks

| Change | Risk | Recommendation |
|--------|------|----------------|
| Add `settings.personality`: `"atelier-light" \| "atelier-dark"` | Low if optional + default light | Additive; map existing `dark === true` → dark personality on read |
| Unify on `themeMode` | Medium — web currently doesn’t write it | Dual-read: `themeMode` wins if set; else derive from `dark`; write both for one release |
| Widget layout JSON on `settings` | Low–medium size/ churn | Keep small; validate with Zod; no new top-level Firebase path unless layout grows large |
| New `users/{uid}/appearance` key | Higher sync surface / MCP / mobile loaders | **Avoid** unless settings blob becomes unwieldy |
| Changing existing token meaning in Light | **High** visual regression | Lock Light tokens to archive; Dark gets additive overrides under `.dark` or `[data-personality=atelier-dark]` |
| Touching `tasks` / `calendar` schemas for UI skins | Unnecessary | **Do not** — skins are presentation |
| Breaking `guided` / executive / MCP paths | High product risk | Theme PRs must not edit executive engine or MCP write model |

No Firebase security-rules change required for additive settings fields under `users/{uid}/settings`.

---

## 6. Proposed implementation order (Phases 1–8)

Adjusted to repo reality (monolith web, sibling mobile, existing Atelier Light, merged calendar work).

| Phase | Scope | Rationale |
|-------|--------|-----------|
| **0** | **This audit + design archive coordination** | Stop here pending approval |
| **1** | Token + preference foundation (Light frozen, Dark *token scaffold only*, unify `themeMode`/`dark`, update design-system doc) | Smallest safe PR; no Studio UI; no Now redesign |
| **2** | Atelier Dark visual pass on shell chrome (sidebar, topbar, cards, Settings, Now) using scaffold — still no Studio | Prove Dark is not inverted Light |
| **3** | Appearance Studio MVP in Settings (personality picker, accent, density; preview) | Extends bento Appearance — no new settings system |
| **4** | Now widget model (show/hide + order persisted on settings); extract presentational widgets | Builds on existing widgets only |
| **5** | Rings / day signals (extend focus ring + optional day score) | Presentation over existing task/focus data |
| **6** | Tasks view mode: list/table + optional Kanban (statuses already on tasks) | Do **not** fork Work kanban data |
| **7** | Immersive Focus polish (personality-aware FocusMode; keep Enforcer separate) | High regression risk — after Dark stable |
| **8** | Mobile parity + docs/archive freeze + light visual QA checklist | Align `theme.ts`; OTA-friendly JS-only |

Phases 2–8 require explicit user approval after Phase 1 lands.

---

## 7. Recommended Phase 1 scope (smallest safe first PR)

**Goal:** Make Light/Dark preference coherent and Dark *token-ready* without shipping Atelier Dark art or Studio.

Include:

1. Document and freeze **Atelier Light** token values as source of truth (sync `docs/design-system.md` to shipped `globals.css`; reference `docs/design-archive/current-2026-10-18` once that archive is on `main`).
2. Introduce optional `settings.personality` (default `atelier-light`) **or** standardize on existing `themeMode` with documented mapping — dual-write web `dark` ↔ `themeMode` for mobile parity.
3. Refactor CSS so Dark overrides are grouped for a future command-center palette **without** changing Light hexes.
4. Unit tests for preference resolution (web + shared helper).
5. No Now layout changes, no widget engine, no Kanban, no FocusMode redesign, no Firebase new top-level keys.

**Out of Phase 1:** Appearance Studio UI, wallpaper, widget drag-and-drop, rings expansion, Tasks Kanban, immersive Focus, mobile visual Dark art direction beyond token alignment.

---

## 8. Explicit questions for user approval

1. **Personality model:** Keep boolean Light/Dark UX, or expose named **Atelier Light / Atelier Dark** in Settings from Phase 1?
2. **Preference source of truth:** Prefer unifying on `settings.themeMode` (mobile-native) and deprecate `users/{uid}/dark`, or keep `dark` and treat `themeMode` as mobile-only?
3. **Dark art direction:** Confirm navy/charcoal command center may diverge strongly from Light (not a invert), including FocusMode sharing that language later?
4. **Appearance Studio breadth:** MVP = personality + accent + density only, or also wallpaper / icon pack / widget visibility in Studio v1?
5. **Now widgets:** Is customization (reorder/hide) in scope for 3.0, or is fixed Atelier composition intentional?
6. **Tasks Kanban:** Global Tasks board vs “only inside Work/Career” — confirm desire for LifeOS-wide Kanban.
7. **Focus Enforcer vs FocusMode:** Should 3.0 immersive Focus stay web FocusMode-only, or must it visually/product-unify with iOS Enforcer?
8. **Design archive:** Merge `cursor/design-archive-current-b1ae` to `main` **before** Phase 1 visual work?
9. **Mobile in Phase 1:** Token/preference parity only, or delay all mobile until Phase 8?
10. **Typography:** Keep single SF Pro Medium for both personalities, or allow Dark a distinct display face (would need font licensing/files)?
11. **Owner gate:** Any plan to broaden Navigation beyond the single allowlisted Gmail, or keep as-is through 3.0?
12. **Brief Parts 3–16:** Please confirm or paste the official Part titles so this audit’s mapping can be locked.

---

## Appendix A — Architecture diagram (current)

```text
Web (Next.js app/page.tsx + app/api/**)
Mobile (Expo lifeos-mobile/)
Optional (Tauri, Context Radar)
        │
        ▼
Firebase Auth + RTDB users/{uid}/{tasks,calendar,settings,dark,guided,…}
        │
        ├── MCP (read; optional writes)
        ├── Copilot (/api/ai)
        └── Calendar OAuth/iCal edges → calendar slice
```

## Appendix B — Key file index

| Concern | Files |
|---------|-------|
| Shell UI | `app/page.tsx`, `app/globals.css`, `app/layout.tsx` |
| Settings bento | `components/ui/bento-grid-01.tsx` |
| Tokens / theme mobile | `lifeos-mobile/src/lib/theme.ts`, `SettingsScreen.tsx` |
| Sync | `lib/dataSync.ts`, `lib/constants.ts`, `lib/validation.ts` |
| Nav owner | `lib/navigationOwner.ts` |
| Task–calendar | `lib/taskCalendar.ts`, `docs/task-calendar-audit.md` |
| Focus strip | `lib/focusStrip.ts` |
| Executive | `lib/executive/*`, `app/components/ExecutivePanel.tsx` |
| Weather widget | `app/components/NowWeatherWidget.tsx` |
| Design archive | `docs/design-archive/**` |
| MCP | `MCP.md`, `lib/mcp/*`, `mcp/` |

## Appendix C — Success criteria for ending Phase 0

- [x] Repo checklist inspected  
- [x] Audit written to `docs/lifeos-3-phase0-audit.md`  
- [x] Artifact copy under `/opt/cursor/artifacts/`  
- [x] Docs-only branch + draft PR (no product code)  
- [ ] User answers §8 and approves Phase 1 scope  

**STOP.** Do not implement Phases 1–8 until approval.
