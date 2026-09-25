# LifeOS Design System

**Status:** Living document (source of truth for UI)  
**Last updated:** 2026-09-24  
**Canonical implementations:**  
- Web tokens → `app/globals.css` (`:root` / `.dark`)  
- Mobile theme → `lifeos-mobile/src/lib/theme.ts`  
- Mobile primitives → `lifeos-mobile/src/components/UI.tsx`  

This document describes how LifeOS should look and feel. Prefer extending these tokens over inventing one-off colors or radii.

---

## 1. Design principles

1. **Calm density** — Information-rich without shouting. Small type is OK when hierarchy is clear.  
2. **Paper + ink** — Surfaces read as soft paper (`canvas` / `panel`); primary text is near-black ink, not pure `#000`.  
3. **Serif for moments, sans for work** — Display headings use a transitional serif; UI chrome stays Inter / system sans.  
4. **Environment color as signal** — Life / School / Work / etc. tint icons and active nav, not the whole chrome.  
5. **Cards, not dashboards of glass** — Prefer simple bordered panels with light shadow over heavy glassmorphism.  
6. **One accent, many statuses** — Brand accent is violet by default; priority, success, warning, danger stay semantic.  
7. **Cross-surface parity** — Mobile maps the same token names to RN styles; don’t drift hex values without updating both.

---

## 2. Brand

| Element | Spec |
|---------|------|
| Product name | **LifeOS** |
| Tagline (metadata) | “Your life, in focus” / “A calm personal operating system…” |
| Mark | Dark rounded square (`#242428`) with three white bars (equalizer-style) — `.brand-mark` |
| Wordmark | Sans, weight 700, tracking `-0.025em` |

Do not replace the mark with a generic gradient logo blob.

---

## 3. Color

### 3.1 Core semantic tokens

| Token | Web CSS | Light | Dark | Mobile key |
|-------|---------|-------|------|------------|
| Canvas / page bg | `--canvas` | `#F6F7F9` | `#111214` | `theme.bg` |
| Panel / surface | `--panel` | `#FFFFFF` | `#191A1D` | `theme.surface` |
| Ink / text | `--ink` | `#202124` | `#F1F1F2` | `theme.text` |
| Muted | `--muted` | `#777B84` | `#92959E` | `theme.muted` |
| Line / border | `--line` | `#E8E9ED` | `#292B30` | `theme.border` |
| Accent | `--accent` | `#625AF6` | `#8B83FF` | `theme.accent` |

User-selectable **accent** overrides `--accent` / `theme.accent` (and soft tints). Persist via Settings.

### 3.2 Mobile-only convenience tokens

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `soft` | `#EFEEFF` (or `{accent}18`) | `#26243A` | Icon button chips, selected soft fills |
| `danger` | `#D95754` | `#FF7770` | Destructive actions |
| `success` | `#31926A` | `#63C89A` | Positive / done accents |
| `warning` | `#D38232` | `#E0A45A` | Caution / medium emphasis |
| `blue` | `#3F7ED7` | `#74A8EA` | Info / calendar-adjacent |
| `highlight` | `#F5E7DF` | `#302724` | Warm highlight surfaces |

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
| Study Abroad | `#0D9488` | `--env-study-abroad` |
| Treasury | `#47A47B` | `--env-treasury` |
| Mastery / MasterOS | `#625AF6` | `--env-master` |

Users can override via Settings → workspace colors. Mobile tab tints follow the same map (`FloatingTabBar`).

### 3.5 Priority colors

| Priority | Hex | Notes |
|----------|-----|--------|
| High | `#D95754` | Aligns with danger |
| Medium | `#D99B38` | Warm amber |
| Low | `#4E8BD7` | Cool blue |

On lists, prefer a **dot** or small label — not a full-row color wash.

### 3.6 Space / accent swatch palette

Shared picker (web Settings + mobile `SPACE_COLORS`):

`#625AF6` `#4B8BDC` `#47A47B` `#D99B38` `#E48B6B` `#CF625A` `#8B5CF6` `#06B6D4` `#0D9488` `#65A30D` `#DB2777` `#E11D48` `#4338CA` `#0EA5E9` `#F59E0B` `#EA580C` `#C026D3` `#64748B`

### 3.7 Overlay & chrome

| Use | Spec |
|-----|------|
| Modal scrim | `#08090C` @ ~40% + light blur (`backdrop-filter: blur(5px)`) |
| Primary button fill | `#27272B` (near-ink), white label — not pure accent (accent is for focus rings / selection) |
| Toast | `#252529` fill, white text, subtle border |
| Selection wash | `color-mix(in srgb, var(--accent) 8%, var(--panel))` |

### 3.8 Rules

- Prefer `color-mix(in srgb, …)` or `{hex}15` / `{hex}22` tints over inventing new greys.  
- Don’t use purple-on-white marketing gradients for in-app chrome.  
- Danger actions: red text/border; never rely on color alone (also label “Delete”).

---

## 4. Typography

### 4.1 Families

| Role | Web | Mobile |
|------|-----|--------|
| UI / body | **Inter** (`--font-inter` via `next/font`) → `--font-sans` | System / San Francisco stacking |
| Display | **Iowan Old Style / Baskerville / Times** → `--font-display` | Georgia (iOS notebook titles) or system |

### 4.2 Type scale (web conventions)

| Style | Size | Weight | Tracking | Notes |
|-------|------|--------|----------|-------|
| Page H1 | 38px (29–34 OS heroes; 26 mobile) | 400 | `-0.025em` | Display serif |
| Eyebrow | 9px | 700 | `0.11em` | Uppercase muted |
| Card H2 | 11–12px | 600–700 | — | Sans |
| Body / task title | 10–13px | 600–700 | — | Dense by design |
| Meta / captions | 8–11px | 600–700 | often `0.08em` uppercase | Muted |
| Breadcrumb | 11px | — | — | Muted with strong ink segment |

### 4.3 Mobile type conventions

| Style | Approx | Weight |
|-------|--------|--------|
| `Eyebrow` | 10–11 | 800, uppercase, letterSpacing ~0.8 |
| `Title` | 28–32 | 800 (sans; notebooks may use Georgia) |
| `Subtitle` | 13–14 | 600 muted |
| Row title | 15 | 700 |
| Meta | 11–12 | 600 muted |
| Tab label | 9 | 700 |

### 4.4 Rules

- Eyebrows always muted + uppercase + wide tracking.  
- Don’t set body copy in display serif.  
- Avoid Inter for marketing-only hero lockups outside the app shell if a campaign page is added later — in-app stays Inter + display serif.

---

## 5. Layout & spacing

### 5.1 Shell (web)

| Region | Spec |
|--------|------|
| Sidebar | Fixed, **236px**, pad `22px 14px 15px`, blur over canvas |
| Main | `margin-left: 236px`, content pad typically `38px` (tighter on small screens) |
| Topbar | Sticky, **65px** (56 mobile), blur |
| Content max | OS pages ~**1440px**; mobile reading width cap ~**820pt** on large iPads |

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
| Radius sm | 5–8px | Inputs, checks, small chips |
| Radius md | 9–12px | Buttons, search, nav items |
| Radius lg | **14px** | Cards, modals, focus cards |
| Radius pill | **999px** | Chips, view mode tabs, tab bar pill |
| Border | `1px solid var(--line)` | Default |
| Hairline | `StyleSheet.hairlineWidth` (RN) | Dense chrome |
| Shadow card | `0 10px 35px rgba(20,24,35,.035)` | Panels |
| Shadow hover | `0 16px 44px rgba(20,24,35,.06)` + 1px lift | Interactive cards |
| Shadow modal | `0 25px 90px rgba(0,0,0,.25)` | Command / capture |
| Shadow primary CTA | `0 3px 10px rgba(0,0,0,.12)` | Primary buttons |

---

## 7. Iconography

| Surface | Set |
|---------|-----|
| Web | **lucide-react** (stroke ~1.8, sizes 13–22) |
| Mobile | **@expo/vector-icons/Feather** (16–22; tabs 20–22) |

Rules:

- Icon-only controls need `aria-label` / `accessibilityLabel`.  
- Nav icons use muted; active uses ink or environment tint.  
- Section icons sit in **25×25**, radius **7**, tinted soft fill.

---

## 8. Components

### 8.1 Buttons

| Variant | Appearance | When |
|---------|------------|------|
| **Primary** | `#27272B` fill, white text, h 34–36, radius 8, weight 600 | Main CTA (New task, Capture) |
| **Ghost / quiet** | Panel or canvas + `line` border, muted text | Secondary |
| **Danger** | Soft red fill/border, `#D45F5F` / `theme.danger` text | Delete / destructive |
| **Break / secondary** | Panel + border, muted | Pause / cancel-adjacent |
| **Icon button** | Transparent or `soft` chip, 8–14 radius | Topbar, mobile headers |

Press feedback: opacity ~0.75 or scale `0.96` on checks — keep subtle.

### 8.2 Inputs

- Height ~36–44  
- Border `line`, radius 9–12  
- Placeholder = muted  
- Focus: accent border or soft accent ring (avoid thick glows)

### 8.3 Cards / modules

- Background `panel`, border `line`, radius **14**  
- Optional header row with section icon + H2 + trailing action  
- Dividers use `line`, not drop shadows between rows  

### 8.4 Lists & tables

- Row min-heights ~48–60  
- Hover: canvas mix 50%  
- Done: opacity ~0.5 + strikethrough (accent-tinted optional)  
- Checkboxes: 18–25 box, radius 5–8; selected = accent fill  

### 8.5 Tabs & segmented controls

- Enclosed track with `line` border, padding 3  
- Selected segment: canvas/panel fill + light shadow  
- Used for Open/Done, calendar modes, notebook filters  

### 8.6 Chips / pills

- Pill radius 999  
- Soft tint background `{color}20` + colored dot  
- Meta chips stay muted without heavy borders  

### 8.7 Eyebrow + title + subtitle

Standard page header stack (web `.page-title`, mobile `Eyebrow`/`Title`/`Subtitle`):

1. Eyebrow (uppercase muted)  
2. Display H1  
3. One-line muted subtitle  

Right side: action cluster (`primary`, ghost, danger).

### 8.8 Empty states

- Centered title (strong) + short muted body  
- Optional dashed capture zone for “add first item”  
- Teach the next action; don’t only say “nothing here”

### 8.9 Modals & sheets

| Pattern | Spec |
|---------|------|
| Center modal | Scrim + panel, radius 14–20, max width ~400–560 |
| Command palette | Top-biased (`padding-top: 14vh`), search row 58px |
| Mobile action sheet | Bottom sheet, handle bar, quick icon row + list (notebooks) |
| Confirm | Native `Alert` on iOS; in-app confirm on web for batch delete |

### 8.10 Toast

Fixed bottom-right (web), dark surface, ~10px type, short copy (“Priority deleted”).

### 8.11 Navigation

**Web sidebar:** brand · search trigger · nav labels · env items · profile  
**Mobile:** floating pill tab bar with per-tab tint highlight  

Active web item: panel fill + shadow; env-active: inset color bar.

### 8.12 Notebook covers (mobile)

- Aspect ~**1 : 1.28**  
- Cover styles: solid, minimal, colorful, academic, gradient, linen, slate, leather, band, sketch, midnight, mosaic, ribbon, kraft  
- Accent color from `NOTEBOOK_COLORS` / space swatches  
- ⋯ affordance on cover for Noteshelf-style actions  

---

## 9. Motion

| Token | Guidance |
|-------|----------|
| Default transition | ~150–200ms on backgrounds / borders |
| Reduce motion | Honor `settings.reduceMotion` — prefer fade / instant over spring |
| Tab highlight | Spring (`damping ~18`, `stiffness ~220`) unless reduced |
| Modal | Opacity + slight scale/y (`0.98` → `1`) |
| Card hover | 1px translateY + shadow deepen |

Avoid decorative infinite motion in productivity chrome.

---

## 10. Content & voice in UI

- Prefer short, direct labels: **New task**, **Move to Trash**, **Change Cover**.  
- Eyebrows can be slightly poetic (“Make it happen”) — body stays practical.  
- Errors explain the fix (“Allow site storage and reload…”).  
- Don’t use emoji as primary iconography in core chrome.

---

## 11. Accessibility

| Rule | Detail |
|------|--------|
| Contrast | Ink on canvas/panel meets readable contrast; muted is secondary only |
| Hit targets | Prefer ≥40–44pt on mobile primary controls |
| Labels | Every icon-only button labeled |
| Focus | Visible focus for keyboard users on web |
| Color | Priority/environment never the only signal |
| Safe area | Respect notches; tab bar includes bottom inset |

---

## 12. Dark mode

- Toggle via theme mode: system / light / dark  
- Same component structure; swap tokens only  
- Borders go darker (`#292B30`); accent lightens (`#8B83FF`)  
- Avoid pure white text on pure black — use ink/canvas tokens  

`theme-color` / viewport: light `#f6f7f9`, dark `#111214`.

---

## 13. Do / Don’t

**Do**

- Use semantic tokens (`canvas`, `panel`, `ink`, `muted`, `line`, `accent`)  
- Match environment colors to Settings defaults unless customized  
- Keep cards at 14px radius and hairline borders  
- Put primary actions in near-ink fills  

**Don’t**

- Introduce a second brand purple unrelated to `#625AF6` / `#8B83FF`  
- Use multi-layer neon glows or glass stacks on core screens  
- Stretch content edge-to-edge on large iPads without the reading width cap (except notebook canvas)  
- Ship absolute overlay tab bars that cover list rows  
- Mix Lucide and Feather metaphors for the same action across a single flow without reason  

---

## 14. Implementation checklist

When building UI:

1. Pull colors from CSS vars or `useLifeOS().theme` — no raw greys.  
2. Page = Eyebrow + Title + Subtitle + actions.  
3. Group content in `card` / `Card`.  
4. Destructive = danger variant + confirm.  
5. Verify light **and** dark.  
6. On mobile, account for in-layout tab bar (small content padding only).  
7. If adding a token, update **both** `globals.css` and `theme.ts`, then this doc.

---

## 15. File map

| Concern | File |
|---------|------|
| Web tokens & component CSS | `app/globals.css` |
| Web font load | `app/layout.tsx` |
| Mobile palette | `lifeos-mobile/src/lib/theme.ts` |
| Mobile primitives | `lifeos-mobile/src/components/UI.tsx` |
| Mobile tab bar | `lifeos-mobile/src/components/FloatingTabBar.tsx` |
| Notebook covers | `lifeos-mobile/src/components/NotebookCoverFace.tsx`, `lib/notebooks.ts` |
| Product requirements | `docs/PRD.md` |

---

*This design system mirrors the shipped product. When visual language changes in code, update this document in the same PR.*
