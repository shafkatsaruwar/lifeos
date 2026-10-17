# Phase 1 — Tasks × Calendar audit (LifeOS)

Branch: `cursor/task-calendar-integration-b1ae` · Base: `main` @ `e6edcff`

## 1. How tasks are stored

- **Model**: Zod `TaskSchema` in `lib/validation.ts`; mirrored as inline `Task` in `app/page.tsx` and `lifeos-mobile/src/types.ts`.
- **Key fields**: `id` (number), `title`, `project`, `color`, `due` (ISO date string), `startTime?` (HH:MM), `priority`, `focusMinutes`, `energy`, `status?`, `followUpDate?`, `recurringDays?`, `calendarEventId?`, academic/focus fields, `done`/`canceled`.
- **Persistence**: Firebase RTDB path `users/{uid}/tasks` via `lib/dataSync.ts` (`syncDataToFirebase` / `loadDataFromFirebase`). Local/in-memory when Firebase env unset. Local backup via `lib/taskBackup.ts`.
- **Semantics (verified, do not reinterpret)**:
  - `due` = due date (deadline), not necessarily a calendar block.
  - `startTime` = optional clock time on the due day; when set (and no `calendarEventId`), web/mobile synthesize a timed calendar block.
  - `focusMinutes` = focus estimate for timer / block duration, not a calendar event itself.
  - `followUpDate` = Waiting resurface date; sets status Waiting when set.
  - `recurringDays` = on complete, spawn next open occurrence N days out (web + MCP). Not a calendar RRULE.

## 2. How calendar events are stored

- **Model**: `CalendarEventSchema` in `lib/validation.ts` — `id`, `title`, `start`, `end?`, `source` (`LifeOS` | `iCal` | `Google` | `Outlook` | `Work` | `Synapse`), `color`, `notes?`, `location?`, `url?`, `weekdaysOnly?`.
- **Persistence**: Firebase `users/{uid}/calendar` (same sync pipeline as tasks).
- **Mobile-only extras** (types in `lifeos-mobile/src/types.ts`, not in web Zod schema): `calendarId`, `repeat`, `repeatUntil`, `repeatExceptions`, occurrence `recurringEventId`.
- **Synthetic overlays** (not persisted as events):
  - `task-{id}` from open tasks with due + startTime and no `calendarEventId` (`tasksToCalendarEvents` in `app/page.tsx` and `lifeos-mobile/src/lib/calendarTasks.ts`).
  - `work-meet-*` from WorkOS meetings.
  - Study-abroad timeline helpers.
- **Merged feed**: `calendarFeed` in `app/page.tsx` = real events + task synthetics + work + study-abroad.

## 3. How Route to Task works

- **UI**: `CalendarEventModal` — when editing an unlinked event, **Route to Task** opens a picker of open tasks; when linked, **Open task**.
- **Handler**: `routeCalendarEventToTask(event, taskId)` in `app/page.tsx`:
  - Sets `task.calendarEventId = event.id`.
  - Copies event date → `due` and event start clock → `startTime` when parseable.
  - Clears `calendarEventId` from any *other* task that pointed at the same event (1:1 on the task side).
  - Does **not** mutate the event record; does **not** create a new event.
- **Open Task**: `openLinkedCalendarTask` finds `tasks.find(t => t.calendarEventId === event.id)` and opens `TaskWorkspace`.

## 4. Do event↔task relationships persist after refresh?

**Yes**, via `task.calendarEventId` on the task document. That field is part of `TaskSchema` / `normalizeTask` and syncs with tasks. The event itself does not currently store a reverse `taskId`. If the event is deleted, the orphaned `calendarEventId` can remain on the task until overwritten (delete path does not clear it today).

## 5. Relationship mechanism

| Direction | Mechanism |
|-----------|-----------|
| Event → Task | Lookup: `tasks.filter(t => t.calendarEventId === event.id)` |
| Task → Event | `task.calendarEventId` → `calendarEvents.find(e => e.id === …)` |
| Synthetic schedule | Event id `task-{taskId}`; opening calendar item navigates to task |
| Cardinality | **One primary event per task** (`calendarEventId` singular). Multiple tasks cannot share one event after route (previous links cleared). Multiple sessions per task are **not** supported yet. |

**Reuse this mechanism** — do not invent a parallel link table. Multi-session support should extend it (e.g. optional `linkedTaskId` on LifeOS events + keep `calendarEventId` as primary/back-compat) rather than a new store.

## 6. Do tasks already support calendar scheduling?

**Partially.**

| Action | Today |
|--------|--------|
| Due date only | Task list / upcoming list; **not** a calendar day block (except mobile month dots for due tasks without `calendarEventId`) |
| Due + startTime | Synthetic timed block on calendar (`task-{id}`); Edit Task / Ready to place can set time |
| Linked real event | Via Route to Task → `calendarEventId`; Open Task works |
| Schedule Time from task page creating a **new** linked work session | **Missing** |
| Deadline-as-all-day indicator (no event record) | **Missing** on web feed |
| Layer visibility toggles | **Missing** |
| Scheduled Sessions UI on task page | **Missing** |
| Unlink without delete | **Missing** (only re-route overwrites) |
| Delete event → clear task link | **Missing** (orphan id) |
| Delete task → choice for linked events | **Missing** (events kept, orphan reverse links N/A) |

## 7. Recurring tasks and recurring calendar events

- **Tasks**: `recurringDays` (7 / 14 / 30 UI). On complete, clones a new open task with due = today + N. No series id; no calendar series.
- **Web calendar**: No RRULE / `repeat` on `CalendarEventSchema`. Multi-day + `weekdaysOnly` work blocks only.
- **Mobile calendar**: Full `repeat` / `repeatUntil` / `repeatExceptions` expansion in `CalendarScreen`.
- **Limitation for this work**: Linking recurring *series* without a second recurrence engine is out of scope. Document: Route to Task / sessions link the master (or single) LifeOS event id; mobile series linking is best-effort; do not build a second RRULE engine.

## 8. How Now dashboard retrieves calendar info

- `NowView` receives `events={calendarFeed}` (merged).
- Filters with `eventOccursOnDate(event, today)`, sorts by `start`, shows up to 8 rows in Atelier “Today” panel.
- No distinction between real events vs synthetic task blocks vs deadlines — all render as `event.source` + title.
- Untimed due-today tasks are **not** in that timeline (they appear elsewhere as task recommendations / resurfacing when overdue).

## 9. External calendar subscriptions / integrations

- **iCal / webcal**: `settings.icalSubscriptions[]`; import/sync via `/api/ical`, `CalendarImportModal` / `IcalFeedsPanel`, replace-by-prefix `ical-{subscriptionId}-`.
- **Sources**: iCal, Google, Outlook labels on events; Settings integrations; Synapse day-plan merge.
- **Read-only posture**: Imported events are local editable copies; comments note full Apple CalDAV needs a later backend.
- **Constraint**: LifeOS task associations must not break feed replace/sync. Prefer linking LifeOS-owned events; if linking an imported event, keep association on the **task** (`calendarEventId`) so a re-sync that preserves event ids keeps the link.

## 10. Existing components that already support requested behavior

| Need | Existing surface |
|------|------------------|
| Route to Task / Open Task | `CalendarEventModal` + `routeCalendarEventToTask` / `openLinkedCalendarTask` |
| Synthetic scheduled tasks | `tasksToCalendarEvents` (web + mobile) |
| Ready to place / plan time | Calendar sidebar + `EditTaskModal` (`due` + `startTime`) |
| Calendar layout helpers | `lib/calendarEvents.ts` |
| Task workspace | `TaskWorkspace` (properties include due/start/focus/repeat) |
| Settings calendar prefs | `defaultCalendarView`, week start, iCal feeds |
| Mobile parity | `CalendarScreen` + `calendarTasks.ts` |
| Persistence of link | `calendarEventId` on Task |

## Gap summary (implementation targets)

1. **Bidirectional UX**: Unlink; clear orphans on event delete; Scheduled Sessions section; optional reverse `linkedTaskId` for multi-session without replacing `calendarEventId`.
2. **Calendar layers**: A events / B deadline indicators / C scheduled sessions + visibility toggles.
3. **Schedule Time**: Create linked LifeOS work-session event from task (confirm; duration from focus estimate).
4. **Now**: Subtle kind indicators; untimed deadlines in an appropriate non-duplicative place.
5. **Completion / delete safety**: Reflect status on deadline UI; keep historical sessions; prompt for future sessions.

## Recommended reuse path (no duplicate relationship system)

- Keep **`task.calendarEventId`** as the canonical Route-to-Task / Open-Task primary link.
- Add optional **`linkedTaskId`** on LifeOS calendar events for additional scheduled sessions (and set it when routing / scheduling).
- Query sessions for a task: events where `id === task.calendarEventId || linkedTaskId === task.id`.
- Deadline layer: synthetic `deadline-{taskId}` markers derived from open tasks with due dates (not written to `calendar` store).
- Visibility prefs: `calendarLayerVisibility` on settings (schema passthrough / explicit fields).
