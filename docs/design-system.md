# LifeOS Design System

**Status:** Living document — **Atelier Light frozen as source of truth** (LifeOS 3.0 Phase 1)  
**Last updated:** 2026-10-18  
**Canonical implementations:**  
- Web tokens → `app/globals.css` (`:root` / `.dark` + `[data-personality]`)  
- Mobile theme → `lifeos-mobile/src/lib/theme.ts` (Phase 1: preference parity only; hex drift OK until Phase 8)  
- Preference helper → `lib/appearancePrefs.ts`  
- Frozen snapshot → `docs/design-archive/current-2026-10-18`

This document describes how LifeOS should look and feel. Prefer extending these tokens over inventing one-off colors or radii.

**Personalities (Phase 1 naming):**

| Personality id | UX label today | Status |
|----------------|----------------|--------|
| `atelier-light` | Light | **Shipped / frozen** |
| `atelier-dark` | Dark | Token **scaffold only** — full command-center visual pass is Phase 2 |

Preference SoT: `settings.themeMode` (`system` \| `light` \| `dark`). Web dual-writes legacy `users/{uid}/dark` boolean for one release.

---

## 1. Design principles

1. **Calm density** — Information-rich without shouting. Small type is OK when hierarchy is clear.  
2. **Paper + ink** — Surfaces read as soft paper (`canvas` / `panel`); primary text is near-black ink, not pure `#000`.  
3. **Single UI font** — SF Pro Display Medium shipped as `LifeOS` for both chrome and display (no Inter / serif stack).  
4. **Environment color as signal** — Life / School / Work / etc. tint icons and active nav, not the whole chrome.  
5. **Cards, not dashboards of glass** — Prefer simple bordered panels with light shadow over heavy glassmorphism.  
6. **One accent, many statuses** — Default CSS accent is blue (`#2563EB`); user/workspace accents override `--accent`.  
7. **Cross-surface parity** — Mobile maps the same token names to RN styles; don’t drift Light hexes without updating the archive.

---

## 2. Brand

| Element | Spec |
|---------|------|
| Product name | **LifeOS** |
| Tagline (metadata) | “Your life, in focus” / “A calm personal operating system…” |
| Mark | White tile + black equalizer bars (6 / 11 / 8) — `.brand-mark` (+ light border `#e8e8e8`) |
| Wordmark | LifeOS Medium, weight 700, tracking `-0.025em` |

Do not restore the classic dark `#242428` mark unless explicitly redesigning brand.

---

## 3. Color

### 3.1 Core semantic tokens (Atelier Light — frozen)

Values match shipped `app/globals.css` `:root`:

| Token | Web CSS | Light (frozen) | Dark scaffold | Mobile key |
|-------|---------|----------------|---------------|------------|
| Canvas / page bg | `--canvas` | `#F7F9FC` | `#0B1220` | `theme.bg` |
| Panel / surface | `--panel` | `#FFFFFF` | `#111827` | `theme.surface` |
| Surface 2 | `--surface-2` | `#EEF3FA` | `#1E293B` | — |
| Ink / text | `--ink` | `#111827` | `#F8FAFC` | `theme.text` |
| Muted | `--muted` | `#64748B` | `#94A3B8` | `theme.muted` |
| Line / border | `--line` | `#E2E8F0` | `#1E293B` | `theme.border` |
| Accent | `--accent` | `#2563EB` | `#3B82F6` | `theme.accent` |
| Accent 2 | `--accent-2` | `#7C3AED` | `#A78BFA` | — |
| Accent teal | `--accent-teal` | `#0D9488` | `#2DD4BF` | — |
| Accent coral | `--accent-coral` | `#F43F5E` | `#FB7185` | — |

Dark values are a **scaffold** for a future navy/charcoal command center — not a finished Atelier Dark art direction.

User-selectable **accent** and per-workspace colors override `--accent` at runtime. Persist via Settings.

### 3.2 Mobile-only convenience tokens

Mobile `LIGHT` / `DARK` in `theme.ts` may still list older hexes until Phase 8 parity. Prefer web Light values above when reconciling.

| Token | Typical Light | Use |
|-------|---------------|-----|
| `soft` | Accent tint | Icon button chips, selected soft fills |
| `danger` | `#D95754` family | Destructive actions |
| `success` | `#31926A` family | Positive / done accents |
| `warning` | `#D38232` family | Caution / medium emphasis |
| `blue` | `#3F7ED7` family | Info / calendar-adjacent |

### 3.3 Section icon families (web + mobile)

Used for card header glyphs (`.section-icon`):

| Family | Foreground | Soft fill (~8–15% alpha) |
|--------|------------|---------------------------|
| Violet | `#665DF6` | `#665DF615` |
| Blue | `#3F7ED7` | `#3F7ED715` |
| Orange | `#D38232` | `#D3823215` |
| Green | `#31926A` | `#31926A15` |

### 3.4 Environment colors (defaults)

Active nav gets an **inset 3px accent bar** in the environment color.

| Environment | Default | CSS var |
|-------------|---------|---------|
| Life / Home | `#D99B38` | `--env-life` |
| School | `#8B5CF6` | `--env-school` |
| Work | `#4338CA` | `--env-work` |
| Career | `#0F766E` | `--env-career` |
| Study Abroad | `#0D9488` | `--env-study-abroad` |
| Treasury | `#47A47B` | `--env-treasury` |
| Mastery / MasterOS | `#625AF6` | `--env-master` |

Users can override via Settings → workspace colors.

### 3.5 Priority colors

| Priority | Hex | Notes |
|----------|-----|--------|
| High | `#D95754` / `#CF625A` | Aligns with danger |
| Medium | `#D99B38` / `#CC8A25` | Warm amber |
| Low | `#4E8BD7` / `#4F8BC4` | Cool blue |

### 3.6 Space / accent swatch palette

Shared picker (web Settings + mobile `SPACE_COLORS`):

`#625AF6` `#4B8BDC` `#47A47B` `#D99B38` `#E48B6B` `#CF625A` `#8B5CF6` `#06B6D4` `#0D9488` `#65A30D` `#DB2777` `#E11D48` `#4338CA` `#0EA5E9` `#F59E0B` `#EA580C` `#C026D3` `#64748B`

### 3.7 Overlay & chrome

| Use | Spec |
|-----|------|
| Modal scrim | Near-ink @ ~40% + light blur |
| Primary / capture CTA | `--accent` fill, white label |
| Selection wash | `color-mix(in srgb, var(--accent) 8%, var(--panel))` |

### 3.8 Rules

- Prefer `color-mix(in srgb, …)` or `{hex}15` / `{hex}22` tints over inventing new greys.  
- Don’t use purple-on-white marketing gradients for in-app chrome.  
- Danger actions: red text/border; never rely on color alone (also label “Delete”).  
- **Do not change Atelier Light hexes** without an explicit design decision + archive bump.

---

## 4. Typography

### 4.1 Families

| Role | Web | Mobile |
|------|-----|--------|
| UI + display | **LifeOS** → `/fonts/SFProDisplay-Medium.ttf` (`--font-sans` + `--font-display`) | System / San Francisco |

Single face for LifeOS 3.0 Phase 1–2. No second display face without font licensing + files.

### 4.2 Type scale (web conventions)

| Style | Size | Weight | Tracking | Notes |
|-------|------|--------|----------|-------|
| Page H1 | 38px (29–34 OS heroes; 26 mobile) | 400 | `-0.025em` | LifeOS Medium |
| Eyebrow | 9px | 700 | `0.11em` | Uppercase muted |
| Card H2 | 11–12px | 600–700 | — | |
| Body / task title | 10–13px | 600–700 | — | Dense by design |
| Meta / captions | 8–11px | 600–700 | often `0.08em` uppercase | Muted |
| Breadcrumb | 11px | — | — | Muted with strong ink segment |

### 4.3 Rules

- Eyebrows always muted + uppercase + wide tracking.  
- Keep one shipped font file (SF Pro / LifeOS Medium).

---

## 5. Layout & spacing

### 5.1 Shell (web)

| Region | Spec |
|--------|------|
| Sidebar | Fixed, **236px**, pad `22px 14px 15px`, blur over canvas |
| Main | `margin-left: 236px`, content pad typically `38px` (tighter on small screens) |
| Topbar | Sticky, **65px** (56 mobile), blur |
| Content max | OS pages ~**1240–1440px** |

### 5.2 Spacing scale (practical)

Use multiples of **4 / 8**:

`4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24 · 28 · 32 · 38`

Common patterns:

- Card padding: **14–19px**  
- Card header min-height: **48–56px**  
- Stack gaps in dashboards: **16–18px**  
- Page title block margin-bottom: **24–32px**

### 5.3 Grid

- Dashboard: `1.18fr / 0.82fr`  
- Project cards: 3 columns → 1 on narrow  
- Calendar: main + **330px** side panel  
- Collapse to single column under ~760–900px  

### 5.4 Mobile tab bar

- In-layout stop (not absolute overlay)  
- Pill height **64**, horizontal inset **14**, top border hairline  
- Safe-area padding under pill  

---

## 6. Radius, stroke, elevation

| Token | Value | Use |
|-------|-------|-----|
| Radius md | **12px** (`--radius-md`) | Buttons, search, nav items |
| Radius lg | **16px** (`--radius-lg`) | Cards, modals |
| Radius pill | **999px** | Chips, view mode tabs |
| Border | `1px solid var(--line)` | Default |
| Shadow card (Light) | `0 1px 2px rgba(15,23,42,.04), 0 10px 28px rgba(15,23,42,.06)` | Panels |

---

## 7. Iconography

- Lucide on web; Feather / similar on mobile.  
- Prefer 15–18px in dense chrome; 20–22px for primary actions.  
- Environment-colored icons in sidebar via `--env-*`.

---

## 8. Motion

- `framer-motion` for view transitions / modals.  
- Honor `settings.reduceMotion` → `.reduce-motion` on `html`.  
- Prefer short fades / small lifts over bounce.

---

## 9. Appearance preferences (Phase 1)

| Field | Where | Values |
|-------|-------|--------|
| `settings.themeMode` | Firebase `settings` | `system` \| `light` \| `dark` (SoT) |
| `settings.personality` | Firebase `settings` | `atelier-light` \| `atelier-dark` (optional) |
| `dark` | Firebase top-level | boolean — **dual-write from web** for compatibility |

Resolution: `lib/appearancePrefs.ts` → `resolveDarkAppearance()`.

Runtime DOM: `html.dark` class + `data-personality="atelier-light|atelier-dark"`.

---

## 10. Archives

| Archive | Path |
|---------|------|
| Current Atelier freeze (2026-10-18) | `docs/design-archive/current-2026-10-18/` |
| Pre-lock / chips-era | `docs/design-archive/pre-lock-2026-10.md` |

When Light tokens change intentionally, bump a new dated archive folder — do not overwrite `current-2026-10-18`.

---

## 11. Out of scope here (later phases)

Appearance Studio UI, wallpaper/glass, widget layout engine, rings expansion, Tasks Kanban, immersive Focus redesign, full Atelier Dark visual pass, mobile Dark art direction.
