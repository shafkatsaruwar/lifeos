# LifeOS design archive — current Atelier / LifeOS (2026-10-18)

Frozen snapshot of the **current** LifeOS web look as of `main` tip
`a794703` (*Merge pull request #131 … mobile-task-calendar-parity*).

This archive is **separate** from the older pre-lock backup. Do not merge or
overwrite `pre-lock-2026-10.md` / `snapshots/pre-cleanup-now/` /
`snapshots/pre-branch-main/`.

| Archive | What it is |
|---------|------------|
| [../pre-lock-2026-10.md](../pre-lock-2026-10.md) | Pre-lock / chips-era Atelier Now (dark mark, Inter + Instrument Serif, Quick Capture on Now) |
| **This folder** | Post–Home / Navigation / SF Pro / black-on-white mark / Settings bento / Focus strip hubs |

Provenance: see `SNAPSHOT_SHA.txt` and `SNAPSHOT_META.txt`.

## Visual / product characteristics (this snapshot)

- **Typography:** Single UI font family `LifeOS` via `@font-face` →
  `/fonts/SFProDisplay-Medium.ttf` (SF Pro Display Medium). `--font-sans` and
  `--font-display` both resolve to `"LifeOS"` (no Inter / serif display stack).
- **Brand mark:** White tile + black equalizer bars (6 / 11 / 8) — `.brand-mark`
  and matching `public/favicon.svg`. Not the classic dark `#242428` tile.
- **Now / Atelier chrome:** Greeting + weather + Focus card; hub Focus strip
  driven by `lib/focusStrip.ts` (enabled hubs).
- **Sidebar / Home:** Life environment labeled **Home** in nav
  (`navName: "Life"` / label `"Home"` in `page.tsx`).
- **Settings:** Light Settings bento (`components/ui/bento-grid-01.tsx` +
  `.settings-bento*` in `globals.css`).
- **Navigation:** Owner-only Executive Function page
  (`lib/navigationOwner.ts` + `ExecutivePanel.tsx`), gated by email allowlist.
- **Tasks ↔ Calendar:** Live shell includes calendar day/tasks integration and
  related chrome in `page.tsx` / calendar CSS blocks.
- **Tokens (light):** `--canvas #F7F9FC`, `--panel #FFFFFF`, `--ink #111827`,
  `--muted #64748B`, `--line #E2E8F0`, `--accent #2563EB`.

Note: the living `docs/design-system.md` copy frozen here may still describe
older Inter/serif + dark-mark language; **prefer `snapshots/globals.css` and
`snapshots/favicon.svg` as the visual source of truth for this date.**

## How this differs from the old archive

| | Pre-lock (`pre-lock-2026-10`) | Current (`current-2026-10-18`) |
|--|-------------------------------|--------------------------------|
| Mark | Dark tile `#242428`, white bars | White tile, black bars + light border |
| Fonts | Inter + Instrument Serif | SF Pro / LifeOS only |
| Now strip | Chips Career → Life → School → Tasks | Focus strip from enabled hubs (`focusStrip`) |
| Settings | Classic settings cards | Light bento grid |
| Navigation | Utility strip / not owner page | Owner-only Navigation view |
| Home naming | Environments as Life / … | Home label for Life OS |

Screenshot from the **old** era (for contrast only):  
[../assets/now-atelier-pre-lock.png](../assets/now-atelier-pre-lock.png)

(No new UI screenshots were captured in this archive pass; restore via files below.)

## How to restore (conceptual)

Checkout onto a branch — do not force-push `main`:

```bash
git checkout -b restore/current-2026-10-18
git checkout a794703 -- \
  app/globals.css \
  app/page.tsx \
  app/layout.tsx \
  public/favicon.svg \
  public/fonts \
  components/ui/bento-grid-01.tsx \
  app/components/ExecutivePanel.tsx \
  app/components/NowWeatherWidget.tsx \
  app/components/PreAuthOnboarding.tsx \
  lib/navigationOwner.ts \
  lib/focusStrip.ts
```

Or copy from the frozen tree:

```bash
BASE=docs/design-archive/current-2026-10-18/snapshots
cp "$BASE/globals.css" app/globals.css
cp "$BASE/page.tsx" app/page.tsx
cp "$BASE/layout.tsx" app/layout.tsx
cp "$BASE/favicon.svg" public/favicon.svg
cp "$BASE/bento-grid-01.tsx" components/ui/bento-grid-01.tsx
cp "$BASE/ExecutivePanel.tsx" app/components/ExecutivePanel.tsx
cp "$BASE/NowWeatherWidget.tsx" app/components/NowWeatherWidget.tsx
cp "$BASE/PreAuthOnboarding.tsx" app/components/PreAuthOnboarding.tsx
cp "$BASE/navigationOwner.ts" lib/navigationOwner.ts
cp "$BASE/focusStrip.ts" lib/focusStrip.ts
cp "$BASE/fonts/SFProDisplay-Medium.ttf" public/fonts/SFProDisplay-Medium.ttf
cp "$BASE/fonts/README.md" public/fonts/README.md
```

Restoring only CSS/favicon is enough for a quick visual comparison; full shell
behavior needs `page.tsx` plus the listed components/libs.

## What’s in this folder

```
docs/design-archive/current-2026-10-18/
  README.md                 ← this file
  SNAPSHOT_SHA.txt          ← a794703…
  SNAPSHOT_META.txt
  assets/                   ← reserved for optional screenshots
  snapshots/
    globals.css
    page.tsx
    layout.tsx
    favicon.svg
    bento-grid-01.tsx
    ExecutivePanel.tsx
    NowWeatherWidget.tsx
    PreAuthOnboarding.tsx
    navigationOwner.ts
    focusStrip.ts
    design-system.md
    fonts/
      README.md
      SFProDisplay-Medium.ttf
```

## Live paths (at snapshot time)

| Area | Path |
|------|------|
| Shell / Now / Settings / Calendar | `app/page.tsx` |
| Tokens / brand / layout CSS | `app/globals.css` |
| Root layout / metadata | `app/layout.tsx` |
| Settings bento | `components/ui/bento-grid-01.tsx` |
| Navigation (owner) | `app/components/ExecutivePanel.tsx`, `lib/navigationOwner.ts` |
| Focus strip hubs | `lib/focusStrip.ts` |
| Favicon / mark | `public/favicon.svg` |
| Font | `public/fonts/SFProDisplay-Medium.ttf` |
