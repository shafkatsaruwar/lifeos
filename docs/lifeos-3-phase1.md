# LifeOS 3.0 — Phase 1 (tokens + preference foundation)

**Status:** Implemented on branch `cursor/lifeos-3-phase1-tokens-b1ae`  
**Date:** 2026-10-18  
**Base:** `main` + design archive from #132 (`cursor/design-archive-current-b1ae`)  
**Prior audit:** `docs/lifeos-3-phase0-audit.md` (user approved Phase 1 with §8 defaults)

## Preference model (chosen)

| Concern | Decision |
|---------|----------|
| SoT | `settings.themeMode` = `system` \| `light` \| `dark` |
| Legacy web | Dual-write top-level Firebase `dark` boolean (one release) |
| Personality | Optional `settings.personality` = `atelier-light` \| `atelier-dark` (Studio-ready; UX still Light/Dark) |
| Resolution | Shared `lib/appearancePrefs.ts` (web + mobile import) |
| Typography | Single SF Pro / LifeOS Medium (unchanged) |
| Navigation owner | Untouched |

## Shipped in this PR

1. **Design archive included** — cherry-picked `current-2026-10-18` from #132 so Phase 1 does not fight that branch. Prefer merging #132 first if both land separately (archive content is identical).
2. **`docs/design-system.md` synced** to shipped Atelier Light tokens in `app/globals.css`; points at the archive.
3. **CSS Dark scaffold** — `:root` Light hexes unchanged; `.dark` / `[data-personality="atelier-dark"]` grouped and commented for future navy/charcoal command center. No full Dark art pass.
4. **Zod** — additive `personality` on `SettingsSchema`; `themeMode` already present.
5. **Web dual-read/write** — theme toggles update `dark` + `settings.themeMode` + `settings.personality`; hydrate resolves via `resolveDarkAppearance`.
6. **Mobile parity helpers** — App resolves dark via shared helper; Settings appearance writes `themeMode` + `personality`.
7. **Unit tests** — `__tests__/appearancePrefs.test.ts`.

## Deferred to Phase 2+

| Item | Phase |
|------|-------|
| Full Atelier Dark visual pass (shell chrome, Now, Settings) | 2 |
| Appearance Studio UI | 3 |
| Now widget engine / wallpaper / glass | 4+ |
| Rings expansion | 5 |
| Tasks Kanban | 6 |
| Immersive Focus redesign / Focus Enforcer unify | 7 |
| Mobile Dark art direction + `theme.ts` hex freeze | 8 |
| Deprecate Firebase `dark` boolean (stop dual-write) | after one release on dual-write |

## Non-goals confirmed

No Now layout changes · no new top-level Firebase keys · no Firebase schema migration · no mock data · no Copilot/MCP/executive edits · no merge to `main` (draft PR only).

## Verify locally

```bash
npx tsc --noEmit
npx jest __tests__/appearancePrefs.test.ts __tests__/onboardingGate.test.ts --no-coverage
# Optional: confirm :root Light hexes unchanged vs archive snapshot
diff -u <(sed -n '/^:root/,/^}/p' docs/design-archive/current-2026-10-18/snapshots/globals.css) \
        <(sed -n '/Atelier Light/,/^}/p' app/globals.css | head -n 20)
```
