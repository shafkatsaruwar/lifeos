# LifeOS — Product Requirements Document

**Product:** LifeOS  
**Status:** Living document (whole product)  
**Owner:** Product  
**Last updated:** 2026-09-24  
**Primary surfaces:** Web (Next.js), iOS / iPadOS (Expo)  
**Optional surfaces:** Tauri desktop wrapper, Context Radar Chrome extension, MCP assistant access  

---

## 1. Product vision

LifeOS is a **personal life operating system**: one workspace for planning, school, work, money awareness, notes, calendar, and deep focus — instead of a pile of disconnected apps.

It is not a generic to-do list. It is an **environment-based OS** where Life, School, Work, Study Abroad, Treasury, and Mastery can each have their own hub, color, and workflows, while sharing one task graph, one calendar, and one synced cloud identity.

**North star:** Open LifeOS once and know what matters *now*, what’s due for school/work, where your notes live, and how to enter focus without rearranging five other tools.

---

## 2. Problem statement

People who combine school, work, and personal life typically:

| Pain | Today’s fragmented stack |
|------|---------------------------|
| Deadlines live in LMS + calendar + chat | Re-entry and missed due dates |
| Tasks, notes, and grades don’t talk | Weak “what if I get an 80?” loops |
| Capture is slow or trapped on one device | Ideas die in Notes / WhatsApp / email |
| Desktop planning ≠ tablet handwriting | Context resets when switching devices |
| Focus is interrupted by app chrome | No protected focus / ambient modes |

LifeOS consolidates capture → organize → execute → review in one synced system.

---

## 3. Goals & non-goals

### 3.1 Product goals

| ID | Goal | Success looks like |
|----|------|--------------------|
| G1 | **Single system of record** for personal work | User stops maintaining a parallel task app |
| G2 | **Environment clarity** | Switching Life / School / Work changes context without losing global Tasks/Calendar |
| G3 | **Fast capture** | Thought → Brain, task, or note in seconds (command, AI, Siri, share) |
| G4 | **School trust** | Classes, coursework, and grades survive reload and stay linked |
| G5 | **Native note depth on iPad** | Handwritten notebooks usable for lectures (PencilKit + covers + pages) |
| G6 | **Cross-device continuity** | Web and iOS share Firebase workspace |
| G7 | **Focus that sticks** | Now → Focus / ambient / enforcer without losing checklist & notes |
| G8 | **Optional depth packs** | Treasury, Study Abroad, MasterOS available when enabled — not forced |

### 3.2 Non-goals

- Multi-user / team tenancy, roles, and shared boards  
- Replacing Canvas / Brightspace for submission grading workflows  
- Full offline CRDT collaboration  
- Consumer social features  
- Building a complete banking product (Treasury is budgeting awareness, not a bank)  
- Perfect LMS auto-sync without user confirmation  

---

## 4. Personas

### P1 — Student-builder (primary)

Takes courses, may work part-time, uses iPad for notes and laptop for planning. Needs classes, grades, due lists, handwritten lecture notes, and focus blocks.

### P2 — Solo operator

Runs personal projects and client/work deliverables. Needs projects, Work hub, calendar, timesheet-ish tracking, and capture.

### P3 — Planner with money pressure (Treasury user)

Wants monthly category budgets (employed vs between-contracts modes) without a heavy finance suite.

### P4 — Aspiring abroad applicant (Study Abroad user)

Tracks countries, universities, programs, applications, documents, and funding deadlines.

### P5 — Tutor / coach (MasterOS user)

Manages students, courses, lessons, teach mode, and progress reports (teaching OS nested inside LifeOS).

---

## 5. Platforms & delivery

| Surface | Role | Delivery |
|---------|------|----------|
| **Web** | Primary planning OS, Settings, integrations, School grades, Treasury, Study Abroad, MasterOS shell | Next.js on Vercel |
| **iOS / iPadOS** | Daily tabs, handwritten notebooks, notifications, Siri, share inbox, widgets | Expo SDK 54 + EAS Build; **OTA** (`eas update`) for JS/UI |
| **Tauri** | Optional desktop shell around web | Local Rust toolchain |
| **Context Radar** | Browser extension for light context capture | Plain JS extension |
| **MCP / Assistant** | External agents read/write live Firebase workspace | `/api/mcp` HTTP + stdio token flow |

**Release rule:** iOS JS/UI → merge `main` → EAS Update OTA. Native modules / `app.json` plugins → new binary + TestFlight.

---

## 6. Core concepts & data model

### 6.1 Identity

- Firebase Auth (Google; Apple on iOS)  
- Workspace rooted at `users/{uid}/…`  
- Local / in-memory mode when Firebase env is unset (demo & offline-friendly)

### 6.2 Shared entities

| Entity | Purpose |
|--------|---------|
| **Task** | Atomic unit of work: title, project/space, due, priority, energy, focus minutes, checklist, notes, status; optional school fields (`classId`, `academicType`, points, grade category) |
| **Project / Space** | Named container (maintenance vs finishable) with icon/color |
| **Class** | School course record (code, name, term, instructor, credits, color, grade scheme) |
| **Calendar event** | Local or synced event (LifeOS / Google / Outlook / iCal / Work / …) |
| **Note** (typed) | Rich/HTML-ish note with templates (blank, lined, dotted, Cornell, meeting) |
| **Notebook + pages** | Handwritten notebook hub; pages hold PencilKit ink, text/image overlays, paper style |
| **Resource** | File attachment linked to class or project |
| **Brain item** | Unsorted capture string (“inbox for the mind”) |
| **Settings** | Theme, defaults, enabled environments, digests, Now queue, ambient, onboarding |
| **Life / School / Work / Study Abroad hubs** | Environment-specific structured state |
| **Time tracking** | Work time entries / timesheet state |
| **Treasury** | Budget categories + monthly allocations (local + optional cloud) |

### 6.3 Task attributes (product contract)

Must support: High/Medium/Low priority; Low/Medium/High energy; focus duration; due date (+ optional start time); done/canceled; checklist; handoff / next action / follow-up; recurring day hints; link to class + academic type + grade points.

---

## 7. Information architecture

### 7.1 Web navigation

**Environments (toggleable):** Life · School · Work · Study Abroad · Treasury · Mastery  

**Always-on navigation:** Now · Tasks · Calendar · Library · Settings  

**Library contains:** Notes · Brain · Knowledge (as applicable) · Resources · (mobile) Handwritten notebooks  

**URL routing:** `?view=` maps to environments and primary views.

### 7.2 iOS tab bar

Now · Tasks · Cal · Home (Life) · School · Work · Library  

Tab bar is an **in-layout stop** (content does not scroll underneath). Immersive flows (e.g. Page Canvas) use full-screen modal presentation.

### 7.3 Environment enablement

Settings flags: `enableLifeOS`, `enableSchoolOS`, `enableWorkOS`, `enableStudyAbroad`, `enableTreasuryOS`, `enableMasterOS`. Disabled environments hide from nav; app falls back to Now.

---

## 8. Functional requirements by domain

Priority: **Must** / **Should** / **Could**

### 8.1 Auth, sync, settings

| ID | Requirement | Pri |
|----|-------------|-----|
| A1 | Sign in with Google (web + iOS); Sign in with Apple (iOS) | Must |
| A2 | Persist session across launches | Must |
| A3 | Sync tasks, projects, calendar, notes, classes, hubs, settings via Firebase when configured | Must |
| A4 | Soft-repair / coerce malformed cloud lists so one bad record doesn’t wipe the workspace | Must |
| A5 | Appearance: light/dark/system, accent, per-environment colors, compact mode, reduce motion | Must |
| A6 | Defaults: focus minutes, energy, week start, default calendar view | Must |
| A7 | Export / data controls where exposed in Settings | Should |
| A8 | Onboarding first-run + “show intro again” | Should |
| A9 | Dev Test Login on localhost for engineering | Must (eng) |

### 8.2 Now (command center)

| ID | Requirement | Pri |
|----|-------------|-----|
| N1 | Show preferred / chosen Now task and energy | Must |
| N2 | Start Focus on the Now task | Must |
| N3 | Quick capture and smart (AI) capture entry points | Must |
| N4 | Daily reset and weekly review prompts/tools | Should |
| N5 | Ambient activity start/wrap (lightweight “what I’m doing”) | Should |
| N6 | Momentum log of recent done/focus/capture events | Should |
| N7 | Command palette / command input for jump + create (`/t`, etc.) | Must (web) |
| N8 | Notification center access from Now / Life | Should |

### 8.3 Focus

| ID | Requirement | Pri |
|----|-------------|-----|
| F1 | Timed focus session with remaining time persisted on the task | Must |
| F2 | Checklist + notes editable during focus | Must |
| F3 | Switch among eligible tasks without leaving focus | Should |
| F4 | Sound effects optional | Could |
| F5 | Focus Enforcer (mobile): planned sessions, proof checks, history metrics | Could |

### 8.4 Tasks

| ID | Requirement | Pri |
|----|-------------|-----|
| T1 | CRUD-ish lifecycle: create, edit, complete, reopen, cancel, delete | Must |
| T2 | List filters: Open / Done (recent window on mobile) | Must |
| T3 | Sort by due, priority, space (mobile); rich table on web | Must |
| T4 | Detail editor: metadata, checklist, notes, scheduling | Must |
| T5 | Multi-select batch delete (web + iOS) with confirm | Must |
| T6 | Preserve school linkage fields through save/load/sync | Must |
| T7 | AI natural-language task creation modal | Should |
| T8 | Swipe-to-delete on mobile lists | Should |

### 8.5 Spaces / projects / Life hub

| ID | Requirement | Pri |
|----|-------------|-----|
| L1 | Create/edit projects (maintenance vs finishable) with icon/color/description | Must |
| L2 | Open project detail: linked tasks, notes, resources | Must |
| L3 | Life dashboard: upcoming, projects glance, habits/hub collections as modeled | Must |
| L4 | Hub collections (trainings, vision boards, etc. where implemented) | Should |
| L5 | Life day view / day memory | Should |

### 8.6 School OS

| ID | Requirement | Pri |
|----|-------------|-----|
| S1 | Class CRUD with academic metadata and color | Must |
| S2 | Coursework as tasks typed Assignment/Project/Exam/Quiz/Lab/Reading/Discussion | Must |
| S3 | School Home: coming up, assignments, exams, readings, focus shortcuts | Must |
| S4 | Grades & what-if: categories, weights, default points, persist possible/earned | Must |
| S5 | Gradebook import from Canvas, Blackboard, Moodle, Brightspace (web + iOS) | Must |
| S6 | School planner / academic profile surfaces | Should |
| S7 | Class resources upload/replace/download | Should |
| S8 | Lecture notes linked to class (typed and/or notebook) | Should |

### 8.7 Work OS

| ID | Requirement | Pri |
|----|-------------|-----|
| W1 | Work hub: projects, deliverables, work tasks, meetings | Must |
| W2 | Status filters (open, blocked, priority) | Must |
| W3 | Meetings distinct from personal calendar where modeled | Should |
| W4 | Timesheet / time tracking panel and Now strip | Should |
| W5 | Notifications for deliverables / meetings | Should |

### 8.8 Calendar

| ID | Requirement | Pri |
|----|-------------|-----|
| C1 | Create/edit/delete LifeOS events (incl. location, notes, weekday-only ranges) | Must |
| C2 | Views: upcoming, month, day | Must |
| C3 | Day grid fine enough for short blocks (~5-minute slots on web) | Should |
| C4 | Show task due markers alongside events | Should |
| C5 | Google Calendar connect + sync (read-oriented) | Should |
| C6 | Outlook Calendar connect + sync | Should |
| C7 | iCloud Calendar via app-specific password | Should |
| C8 | Generic iCal import/feed where exposed | Could |
| C9 | Gmail connect surfaces for calendar adjacency / mail preview as implemented | Could |

### 8.9 Library — typed notes, brain, resources

| ID | Requirement | Pri |
|----|-------------|-----|
| B1 | Brain inbox: capture, list, archive/delete thoughts | Must |
| B2 | Typed notes with templates (blank/lined/dotted/Cornell/meeting) | Must |
| B3 | Link notes to class or project | Should |
| B4 | Print / export note where implemented | Could |
| B5 | Resources library with upload and class/project association | Must |
| B6 | Convert note → task helper where implemented | Should |

### 8.10 Library — handwritten notebooks (iOS-first)

| ID | Requirement | Pri |
|----|-------------|-----|
| H1 | Notebook library with folders, starred, unfiled, trash | Must |
| H2 | Create notebook: name, cover style, accent, starting page template | Must |
| H3 | Page canvas: PencilKit ink, text, images, eraser/lasso, undo/redo | Must |
| H4 | Seamless vs single page modes; page browser; add page | Must |
| H5 | Paper templates and portrait/landscape page orientation | Must |
| H6 | Noteshelf-like menu: share, move, trash, star, rename, duplicate, change cover, organize, get info | Must |
| H7 | Document pinch zoom contained in page frame | Should |
| H8 | Tool chrome aligned (pen menu + view controls) without covering content unnecessarily | Should |
| H9 | PDF page underlay architecture reserved (no fake PDF pipeline) | Could |
| H10 | Handwriting recognition only when engine reports ready | Could |

### 8.11 Study Abroad OS

| ID | Requirement | Pri |
|----|-------------|-----|
| SA1 | Track countries, universities, programs | Must |
| SA2 | Applications with stages/readiness | Must |
| SA3 | Documents reusable across applications | Must |
| SA4 | Funding items with deadlines | Must |
| SA5 | Linked tasks + knowledge notes + history | Should |

### 8.12 Treasury OS

| ID | Requirement | Pri |
|----|-------------|-----|
| TR1 | Custom budget categories with targets | Must |
| TR2 | Employed vs between-contracts budget modes | Must |
| TR3 | Monthly allocation entry and totals | Must |
| TR4 | Spotlight category tracker (e.g. parents support) | Should |
| TR5 | Browser persistence + optional LifeOS cloud sync | Must |
| TR6 | Demo month / reset month | Should |

### 8.13 MasterOS (Mastery)

| ID | Requirement | Pri |
|----|-------------|-----|
| M1 | Students, courses, lessons entities | Must |
| M2 | Teach mode for a lesson | Must |
| M3 | Student progress / report views | Should |
| M4 | Skills / assignments / gradebook sub-areas as routed under `/masteros` | Should |
| M5 | Mobile MasterOS hub / whiteboard / report screens | Should |
| M6 | Whiteboard / teach aids where implemented | Could |

### 8.14 Capture, search, AI, assistants

| ID | Requirement | Pri |
|----|-------------|-----|
| X1 | Global search / command palette across entities | Must (web) |
| X2 | AI route for NL task parsing (`/api/ai`) | Should |
| X3 | MCP tools for live workspace read/write (tasks, school, work, …) | Should |
| X4 | Assistant access panel: mint tokens, show MCP connection guidance | Should |
| X5 | iOS Siri “Add Task” intent | Should |
| X6 | iOS share sheet → inbox bridge (calendar/brain/settings hooks) | Should |
| X7 | Home screen widgets (native target) | Could |
| X8 | Context Radar extension capture | Could |

### 8.15 Notifications

| ID | Requirement | Pri |
|----|-------------|-----|
| Q1 | In-app notification center aggregating tasks, assignments, deliverables, meetings, events | Must |
| Q2 | Preference toggles: digests, focus reminders, calendar alerts, leads | Should |
| Q3 | Mobile local notifications planned from workspace | Should |
| Q4 | Respect disabled environments when composing notices | Must |

---

## 9. Cross-cutting UX requirements

| ID | Requirement |
|----|-------------|
| U1 | Environment colors and accents remain consistent across web/mobile |
| U2 | Destructive actions confirm (Alert / in-app confirm) |
| U3 | Empty states teach the next action |
| U4 | Lists must remain usable behind safe areas; tab bar is a layout edge on mobile |
| U5 | Web keyboard: command palette, focus shortcuts where documented |
| U6 | iPad layouts: multi-column notebooks/tasks; Split View friendly |
| U7 | Do not claim OCR/PDF features until real pipelines exist |

---

## 10. Key end-to-end journeys

1. **Morning planning:** Open Now → review queue → start Focus or jump to Tasks/Calendar.  
2. **School week:** School Home → Coming up → open coursework → update grade / import gradebook → focus block.  
3. **Lecture capture:** Library → New notebook → write on ruled page → rename/cover later via ⋯ menu.  
4. **Work delivery:** Work hub → deliverable due → complete linked tasks → log time.  
5. **Money mode switch:** Treasury → between-contracts mode → category targets shrink → track spotlight.  
6. **Abroad pipeline:** Study Abroad → add program → start application → attach document → funding deadline task.  
7. **Teach loop:** MasterOS → lesson → teach → update student progress/report.  
8. **Inbox zero for mind:** Capture to Brain → later promote to task/note.  
9. **Deduplicate tasks:** Tasks → Select → batch delete confirmed duplicates.  
10. **Assistant:** Connect MCP → agent lists school tasks / creates work items against live Firebase.

---

## 11. Non-functional requirements

| ID | Requirement |
|----|-------------|
| NF1 | Web: modern Chromium/Safari; Mobile: current iOS/iPadOS for TestFlight builds |
| NF2 | Perceived performance: navigations and list scrolls remain interactive during sync |
| NF3 | Reliability: cloud load must not drop school fields or entire task arrays on partial corruption |
| NF4 | Security: treat MCP refresh tokens as secrets; calendar OAuth follows least privilege |
| NF5 | Privacy: no silent outbound email; integrations are explicit connects |
| NF6 | Accessibility: labels on icon-only controls; confirm destructive paths |
| NF7 | Observability (eng): Reticle verification for user-visible web changes when available |
| NF8 | Configurability: all cloud/AI/calendar features env-gated; app demos without secrets |

---

## 12. Metrics

| Metric | Intent |
|--------|--------|
| DAU on Now or Tasks | Habit formation |
| Tasks created vs completed (7-day) | Execution health |
| % school tasks with `classId` | School graph integrity |
| Grade edits surviving cold start | Trust |
| Notebooks opened / week | Note depth |
| Focus sessions started / week | Deep work |
| OTA adopt rate (mobile) | Delivery health |
| Sync conflict / data-loss reports | Quality bar (target: ~0) |

---

## 13. Dependencies & integrations

| Dependency | Use |
|------------|-----|
| Firebase Auth + RTDB (+ Storage for files) | Identity & sync |
| Vercel | Web hosting + API routes |
| EAS Build / Update | iOS binaries & OTA |
| Google / Microsoft / Apple calendar APIs | Calendar sync |
| LLM provider via `/api/ai` | NL task creation |
| PencilKit (native) | Handwriting |
| Expo Notifications | Mobile alerts |

---

## 14. Risks

| Risk | Mitigation |
|------|------------|
| Scope sprawl across six environments | Keep packs optional; Now/Tasks/Calendar/Library are the spine |
| LMS format drift | Multi-parser import; user confirms mapping |
| PencilKit / widgets need native builds | Clear OTA vs binary messaging |
| Sync wiping data | Schema passthrough, list coercion, school field preservation tests |
| MCP token leakage | UI warnings; short-lived guidance; server-side secrets |
| Feature parity gaps web ↔ iOS | Document per-surface ownership; OTA for mobile JS parity |

---

## 15. Open product questions

1. Is handwritten editing ever first-class on web, or permanently iOS-led?  
2. How automatic should LMS assignment pull become vs paste/import?  
3. Should Treasury graduate into shared Firebase-first finance, or stay lightweight?  
4. Is MasterOS a separate product brand long-term?  
5. What is the free vs paid boundary if monetization starts?

---

## 16. Documentation & code map

| Area | Where to look |
|------|----------------|
| Web shell | `app/page.tsx`, `app/globals.css` |
| School grades / planner | `app/components/SchoolGrades.tsx`, `SchoolPlanner.tsx`, `lib/grades.ts`, `lib/gradebookImport.ts` |
| Work / Life dashboards | `app/components/OSDashboards.tsx`, Life/Work screens on mobile |
| Treasury | `app/components/TreasuryOSDashboard.tsx` |
| Study Abroad | `app/components/StudyAbroadDashboard.tsx` |
| MasterOS | `app/masteros/**`, `app/components/MasterOSDashboard.tsx`, `lifeos-mobile/.../masteros` |
| AI / MCP | `app/api/ai`, `app/api/mcp/**`, `lib/mcp/**`, `AssistantAccessPanel.tsx` |
| Calendar APIs | `app/api/gmail/**`, `outlook/**`, `icloud/**`, `ical/**` |
| Sync | `lib/dataSync.ts`, `lib/validation.ts`, `lib/firebase.ts` |
| Mobile app | `lifeos-mobile/` (screens, notebooks, tab bar, OTA) |
| Extension | `lifeos-context-radar/` |

---

## 17. Document control

This PRD describes **the whole LifeOS product**, not a single sprint. When adding a feature:

1. Place it under the correct domain section (§8).  
2. Mark Must/Should/Could.  
3. Add or update a journey in §10 if user-visible.  
4. Note platform ownership (web / iOS / both).  

*End of PRD.*
