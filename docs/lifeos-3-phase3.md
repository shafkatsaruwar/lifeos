# LifeOS 3.0 — Phase 3 (Appearance Studio)

**Status:** Implemented on branch `cursor/lifeos-3-phase3-appearance-studio-b1ae`  
**Date:** 2026-10-18  
**Base:** `origin/cursor/lifeos-3-phase2-dark-b1ae` (stacks on Phase 2 → Phase 1 / #134)  
**Depends on:** Phase 1 prefs + Phase 2 Atelier Dark chrome

## Goal

Extend existing Settings → Appearance into an **Appearance Studio** (no second settings app). Draft locally; **Apply / Cancel / Restore defaults** — never write Firebase on every slider tick.

## Ships

| Control | Behavior |
|---------|----------|
| Theme | Light / Dark / **System** via `settings.themeMode` |
| Accent | Curated swatches + HTML color custom |
| Wallpaper | None / Solid / Midnight / Aurora / Ember / Mist |
| Glass | Off / Subtle / Balanced / High (+ `@supports` solid fallback) |
| Density | Compact + Reduce motion (moved into Studio draft) |
| Preview | Live mini chrome + live document wallpaper/glass preview |
| Persist | Apply commits additive settings fields; dual-writes `dark` |

### Additive settings fields

`wallpaperId`, `wallpaperSolid`, `glassLevel` on `settings` (Zod + `SettingsState`). No new RTDB top-level keys. No migration.

### Deferred

| Item | Notes |
|------|-------|
| Wallpaper **image upload** | Needs owner-scoped storage; documented in Studio UI |
| Mobile Appearance Studio parity | Phase 8 |
| Now widget customize | Phase 4 |

## Files

- `lib/appearanceStudio.ts` — draft model, wallpaper CSS, chrome apply
- `app/components/AppearanceStudio.tsx` — Studio UI
- `app/page.tsx` — Settings wiring + `themeMode: system` listener + commit path
- `app/globals.css` — Studio + glass/wallpaper chrome
- `__tests__/appearanceStudio.test.ts`

## Verify

```bash
npx tsc --noEmit
npx jest __tests__/appearancePrefs.test.ts __tests__/atelierLightTokens.test.ts __tests__/appearanceStudio.test.ts --no-coverage
```

Open Settings → Appearance → tweak wallpaper/glass without Apply (no Firebase churn) → Apply → Cancel → Restore defaults.
