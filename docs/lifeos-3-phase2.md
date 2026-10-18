# LifeOS 3.0 — Phase 2 (Atelier Dark visual pass)

**Status:** Implemented on branch `cursor/lifeos-3-phase2-dark-b1ae`  
**Date:** 2026-10-18  
**Base:** `origin/cursor/lifeos-3-phase1-tokens-b1ae` (PR #134 — not merged)  
**Depends on:** Phase 1 preference foundation + design archive

## Goal

Ship a designed **Atelier Dark** command-center look (navy/charcoal), not inverted Light. Preserve Atelier Light hexes 100%.

## Palette (shipped)

| Token | Hex |
|-------|-----|
| `--canvas` | `#0B1020` |
| `--sidebar` | `#101729` |
| `--panel` | `#141C2E` |
| `--surface-2` | `#1A2438` |
| `--ink` | `#E8EEF8` |
| `--muted` | `#8B9BB4` |
| `--line` | `#1E2A3F` |
| `--accent` | `#5B8DEF` |
| `--accent-2` | `#8B7EC8` |

Sparse atmospheric glow via `--glow-accent` / `--glow-violet` on `body` only — sophisticated, not neon.

## Surfaces touched

- Shell: sidebar, topbar, search trigger, nav active/hover
- Cards / glass cards / hub tiles / Settings bento (token-aware)
- Now: focus panel, Copilot card orb
- Calendar today chip, modals, mobile OS nav
- Preference model unchanged (still Phase 1 `themeMode` + `personality` + dual-write `dark`)

## Light regression

`:root` / `[data-personality="atelier-light"]` hex block is **unchanged** vs Phase 1 / archive. Verified by `__tests__/atelierLightTokens.test.ts` and archive snapshot compare.

## Deferred

| Item | Phase |
|------|-------|
| Appearance Studio (System theme UX, wallpaper, glass) | 3 |
| Now widget customize | 4 |
| Rings / Kanban / immersive Focus / mobile Dark hex parity | 5–8 |

## Verify

```bash
npx tsc --noEmit
npx jest __tests__/appearancePrefs.test.ts __tests__/atelierLightTokens.test.ts --no-coverage
# Light freeze vs archive
diff -u <(sed -n '/^:root/,/^}/p' docs/design-archive/current-2026-10-18/snapshots/globals.css) \
        <(awk '/Atelier Light/,/^}/' app/globals.css | head -n 20)
```
