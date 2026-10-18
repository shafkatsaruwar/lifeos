# LifeOS 3.0 — Phase 4 (Now dashboard customization)

**Status:** Implemented on branch `cursor/lifeos-3-phase4-now-widgets-b1ae`  
**Date:** 2026-10-18  
**Base:** Phase 3 tip (`cursor/lifeos-3-phase3-appearance-studio-b1ae`)  
**Depends on:** Phase 1–3 stacked branches / #134

## Goal

Customize mode on **Now**: show/hide + reorder supported widgets; persist on `settings.nowWidgetLayout`; restore default. Current Atelier composition remains the default when layout is unset/default.

## Supported widgets

`weather` · `quote` · `today` · `focus` · `hubs` · `copilot`

## Ships

- `lib/nowWidgetLayout.ts` — normalize / toggle / reorder helpers
- Now “Customize Now” bar + panel (checkbox visibility, move up/down)
- Additive Zod + `SettingsState.nowWidgetLayout`
- Default layout identical to pre-Phase-4 Atelier composition

## Deferred

| Item | Notes |
|------|-------|
| Free-form drag across grid regions | Order persists; visual stack/geometry still follows Atelier regions with visibility |
| Per-widget size / density packs | Later |
| Mobile Now customize | Phase 8 |

## Verify

```bash
npx tsc --noEmit
npx jest __tests__/nowWidgetLayout.test.ts __tests__/appearanceStudio.test.ts __tests__/atelierLightTokens.test.ts --no-coverage
```
