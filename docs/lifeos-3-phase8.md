# LifeOS 3.0 — Phase 8 (Cross-platform + polish)

**Status:** Implemented on branch `cursor/lifeos-3-phase8-polish-b1ae`  
**Date:** 2026-10-18  
**Base:** Phase 7 tip (`cursor/lifeos-3-phase7-focus-b1ae`)  
**Stack tip:** Merge Phases 1→8 in order (user merges; agents do not auto-merge to `main`).

## Goal

Align mobile theme tokens with web Atelier personalities where Expo allows, harden a11y (focus / reduced motion / transparency), document honest iOS follow-ups, and close the LifeOS 3.0 phase checklist.

## Ships

- `lifeos-mobile/src/lib/theme.ts` — Atelier Light (`#F7F9FC` … `#2563EB`) + Atelier Dark (`#0B1020` … `#5B8DEF`) parity with web
- Web a11y polish in `app/globals.css` — global `:focus-visible`, `.reduce-motion` hard-stop, `.reduce-transparency` disables backdrop blur
- `docs/design-system.md` — Phase 8 mobile parity note
- Final checklist (this file)

## Deferred (explicit)

| Item | Why deferred |
|------|----------------|
| **Custom wallpaper upload** | No durable user file storage path ready for production uploads; Appearance Studio keeps curated presets + solid color only |
| **CSS `backdrop-filter` / glass on Expo** | Not a 1:1 port — native views need different materials; don’t fake blur parity |
| **Mobile Now widget customize** | Web Phase 4 customize; mobile Now layout still fixed composition |
| **Mobile Appearance Studio full UI** | Preference fields sync; Studio chrome remains web-first |
| **Immersive Focus on native** | Web FocusMode only; Focus Enforcer stays separate on iOS |
| **Tasks Kanban on mobile** | Web Tasks board; mobile Tasks list unchanged this stack |
| **CI web Jest gate** | Still local `npm test` / `tsc`; EAS OTA CI only on `main` for mobile |

## iOS follow-ups (cannot ship as web CSS)

1. Native blur / materials for “glass” levels (UIVisualEffectView / Expo Blur) — optional, user-gated by `glassLevel`
2. System appearance + `themeMode: system` already on mobile — verify Dark navy tokens in Expo Go / TestFlight screenshots
3. Focus Enforcer remains accountability product — do not merge UI into Immersive FocusMode
4. Dynamic Type / VoiceOver pass on Tasks + Focus Enforcer after token swap
5. Optional: wallpaper image pick via Photos → needs storage decision (Firebase Storage or local-only)

## Final checklist (Phases 0–8)

| Phase | Branch | PR / compare | Done |
|-------|--------|--------------|------|
| 0 Audit | `cursor/lifeos-3-phase0-audit-b1ae` | #133 | [x] |
| 1 Tokens | `cursor/lifeos-3-phase1-tokens-b1ae` | #134 | [x] |
| 2 Dark | `cursor/lifeos-3-phase2-dark-b1ae` | #135 | [x] |
| 3 Appearance Studio | `cursor/lifeos-3-phase3-appearance-studio-b1ae` | #136 | [x] |
| 4 Now widgets | `cursor/lifeos-3-phase4-now-widgets-b1ae` | #137 | [x] |
| 5 Rings | `cursor/lifeos-3-phase5-rings-b1ae` | compare → Phase 4 | [x] |
| 6 Kanban | `cursor/lifeos-3-phase6-kanban-b1ae` | compare → Phase 5 | [x] |
| 7 Immersive Focus | `cursor/lifeos-3-phase7-focus-b1ae` | compare → Phase 6 | [x] |
| 8 Polish | `cursor/lifeos-3-phase8-polish-b1ae` | compare → Phase 7 | [x] |

### Product non-negotiables (re-check)

- [x] Light remains default / frozen hexes
- [x] Additive settings only (no new top-level Firebase keys)
- [x] No mock production metrics on rings
- [x] No duplicate task / calendar / focus / settings stores
- [x] Copilot / MCP / executive / Navigation owner untouched in intent
- [x] Focus Enforcer not conflated with FocusMode
- [x] No auto-merge to `main`

### Verify

```bash
npx tsc --noEmit
npx jest __tests__/activityRings.test.ts __tests__/tasksView.test.ts __tests__/focusAppearance.test.ts __tests__/mobileThemeParity.test.ts __tests__/nowWidgetLayout.test.ts __tests__/appearanceStudio.test.ts __tests__/atelierLightTokens.test.ts --no-coverage
```

## Suggested user merge order

1. #134 Phase 1 → `main` (or keep stacking)  
2. #135 Phase 2  
3. #136 Phase 3  
4. #137 Phase 4  
5. Phase 5 PR (base Phase 4)  
6. Phase 6 PR (base Phase 5)  
7. Phase 7 PR (base Phase 6)  
8. Phase 8 PR (base Phase 7)  

If draft PRs were not creatable via API, open compare links from each branch onto its parent feature branch, then merge bottom-up.
