# LifeOS 3.0 — Phase 5 (Activity rings)

**Status:** Implemented on branch `cursor/lifeos-3-phase5-rings-b1ae`  
**Date:** 2026-10-18  
**Base:** Phase 4 tip (`cursor/lifeos-3-phase4-now-widgets-b1ae`)  
**Depends on:** Phases 1–4 stacked branches / #137

## Goal

Day/week progress rings on Now from **real** LifeOS data only: tasks completed vs configurable target, and focus minutes vs goal. No mock metrics, no punitive streaks, no calendar-attendance claims.

## Ships

- `lib/activityRings.ts` — normalize goals, count completions via `completedAt`, sum focus minutes via session fields + `focusUpdatedAt` / `completedAt` in range
- `app/components/ActivityRingsWidget.tsx` — dual rings, explanations, empty state, a11y labels, reduced-motion
- Now widget id `rings` (default visible) via Phase 4 layout helpers
- Settings → Focus: daily/weekly period + task/focus minute goals (`settings.activityRingsGoals`)
- Explicit footnote: calendar attendance is **not** scored

## Not shipped (by design)

| Item | Notes |
|------|-------|
| Commitments / calendar ring | Time passing ≠ attendance; no accurate confirmation field |
| Streak counters | Explicitly avoided |
| New data services / RTDB keys | Additive settings only |

## Verify

```bash
npx tsc --noEmit
npx jest __tests__/activityRings.test.ts __tests__/nowWidgetLayout.test.ts --no-coverage
```
