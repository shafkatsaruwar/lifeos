# LifeOS design archive — pre-lock snapshot (2026-10)

Frozen reference of how LifeOS looked **before** locking further Atelier / Now chrome changes.
Use this to restore or compare without guessing.

> For the **current** (post–SF Pro / Home / Settings bento / Focus strip) look, see the separate archive: **[current-2026-10-18/](./current-2026-10-18/)**. Do not overwrite this pre-lock tree.

## How to restore

| Goal | Git commit | Frozen files |
|------|------------|--------------|
| **Now as in the Arc screenshot** (chips-era strip Career → Life → School → Tasks, Quick Capture still present, classic dark mark) | `85c93e3` — *Atelier 2.0: Now skyline weather, quote, and Today timeline* | `snapshots/pre-cleanup-now/` |
| **Main tip before Home / Navigation / SF Pro / black-on-white mark** | `e8dcd14` — *remove leftover merge conflict markers* | `snapshots/pre-branch-main/` |

Restore example (check out files onto a branch; do not force-push `main`):

```bash
git checkout -b restore/pre-cleanup-now
git checkout 85c93e3 -- app/globals.css app/page.tsx public/favicon.svg
```

Or copy from the frozen tree:

```bash
cp docs/design-archive/snapshots/pre-cleanup-now/globals.css app/globals.css
cp docs/design-archive/snapshots/pre-cleanup-now/page.tsx app/page.tsx
cp docs/design-archive/snapshots/pre-cleanup-now/favicon.svg public/favicon.svg
```

## Visual look (screenshot era)

<img alt="Now / Atelier pre-lock" src="./assets/now-atelier-pre-lock.png" />

What that frame shows:

- **Sidebar:** LifeOS wordmark + dark equalizer mark, Search ⌘K, Environments (Now / Life / Career…), Navigation (Tasks / Calendar / Library), Settings + profile.
- **Now hero:** “Good afternoon…”, date, Boston weather, quote, large Focus card.
- **Hub strip under Focus (old order):** Career → Life → School → Tasks.
- **Today** timeline card + **Quick Capture** + **LifeOS Copilot**.
- **Executive Function** still lived as a utility strip on Now (not yet a sidebar “Navigation” item).

## Brand mark (pre-lock)

Canonical pre-lock mark (also in `design-system.md`):

- Tile `#242428` / `#111111`, white bars heights **6 / 11 / 8**.
- Do not treat the later white-tile / black-bar or accent-tinted atelier variants as the archive baseline.

Frozen CSS excerpt lives at the top of `snapshots/pre-cleanup-now/globals.css` (and again later in that file where Atelier temporarily overrode the mark — prefer the early `#242428` block when restoring the classic look).

## Tokens (pre-lock)

From `snapshots/pre-cleanup-now/globals.css` / living `design-system.md`:

| Token | Light |
|-------|--------|
| `--canvas` | `#F7F9FC` |
| `--panel` | `#FFFFFF` |
| `--ink` | `#111827` |
| `--muted` | `#64748B` |
| `--line` | `#E2E8F0` |
| `--accent` | `#2563EB` (atelier) / older violet `#625af6` in places |
| `--font-sans` | Inter + system |
| `--font-display` | Instrument Serif |

## What’s in this folder

```
docs/design-archive/
  pre-lock-2026-10.md          ← this index
  assets/now-atelier-pre-lock.png
  snapshots/
    pre-cleanup-now/           ← 85c93e3 globals + page + favicon
    pre-branch-main/           ← e8dcd14 globals + favicon
    design-system-living.md    ← copy of docs/design-system.md at archive time
```

## Key live paths (current tree)

| Area | Path |
|------|------|
| Shell / Now / nav | `app/page.tsx` |
| Tokens / brand / Now layout | `app/globals.css` |
| Executive panel | `app/components/ExecutivePanel.tsx` |
| Favicon | `public/favicon.svg` |
| Design notes | `docs/design-system.md` |
