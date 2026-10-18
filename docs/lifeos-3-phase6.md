# LifeOS 3.0 — Phase 6 (Tasks Kanban + view switching)

**Status:** Implemented on branch `cursor/lifeos-3-phase6-kanban-b1ae`  
**Date:** 2026-10-18  
**Base:** Phase 5 tip (`cursor/lifeos-3-phase5-rings-b1ae`)

## Goal

Tasks page List + Board switching. Board columns are the **existing** task statuses. Calendar tab reuses the shared Calendar view (no second calendar engine). Opens still go to the Task workspace.

## Ships

- `lib/tasksView.ts` — view mode normalize, status grouping, adjacent moves, status mutation patch
- Tasks view tabs: List | Board | Calendar
- Board: compact cards (title, priority, due, space, focus estimate); drag + ←/→ keyboard; status via `updateTaskDetails`
- Persisted `settings.tasksViewMode` (`list` | `board`; `calendar` is a handoff, not persisted as calendar)

## Non-goals

| Item | Notes |
|------|-------|
| Second task store | Same `tasks` array |
| Second calendar | Calendar tab → existing Calendar view |
| Invented statuses | Columns = Not started / In progress / Waiting / Blocked / Done / Canceled |

## Verify

```bash
npx tsc --noEmit
npx jest __tests__/tasksView.test.ts __tests__/activityRings.test.ts --no-coverage
```
