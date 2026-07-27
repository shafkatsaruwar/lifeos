# 003 — Define easing and duration tokens as CSS variables

- **Status**: TODO
- **Commit**: e95a517
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens (audit category 7)
- **Estimated scope**: 1 file (app/globals.css), adding ~20 lines at the top

## Problem

Easing curves and durations are hand-typed throughout `app/globals.css` and component files, with near-identical but not-identical values scattered across the codebase (e.g., `200ms`, `250ms`, `300ms` used inconsistently; bare `ease`, `ease-in-out` mixed with no clear pattern).

Per [AUDIT.md](AUDIT.md) section 7 (Cohesion & tokens):
- "Curves and durations should live as shared tokens. Five hand-typed cubic-beziers that almost match is a consolidation finding."

Current state: `app/globals.css` lines 1–50 reference no tokens; durations are embedded in rules (e.g., `transition: all 200ms ease` at line 487).

## Target

Add CSS custom properties (variables) at the top of `app/globals.css` for reusable easing curves and duration values, following [AUDIT.md](AUDIT.md) section 2 (Easing & Duration):

```css
:root {
  /* Easing curves — strong custom curves, not weak CSS defaults */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);        /* responsive entrance */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);    /* on-screen movement */
  --ease: cubic-bezier(0.25, 0.46, 0.45, 0.94);      /* smooth color/hover */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);     /* iOS-like drawer */

  /* Duration budget — UI animations stay under 300ms */
  --duration-instant: 50ms;
  --duration-fast: 100ms;     /* button press feedback */
  --duration-normal: 200ms;   /* tooltips, hover */
  --duration-medium: 250ms;   /* dropdowns, selects */
  --duration-slow: 300ms;     /* modals, large reveals */
}
```

Values sourced directly from [AUDIT.md](AUDIT.md):
- Easing curves: exactly as specified in section 2
- Durations: button press 100–160ms, tooltips 125–200ms, dropdowns 150–250ms, modals 200–500ms

## Repo conventions to follow

- CSS variables stored in `:root` pseudo-element at top of `app/globals.css`
- Tokens prefixed with `--` (CSS standard)
- Duration tokens use `ms` unit
- Used via `var(--token-name)` in all transition/animation rules
- No Tailwind config changes; CSS variables sufficient

## Steps

1. **Open `app/globals.css` and locate the first rule** (around line 1).

2. **Add `:root { }` block with easing + duration tokens** before any other CSS:
   ```css
   :root {
     /* Easing curves — strong custom curves per Emil Kowalski design system */
     --ease-out: cubic-bezier(0.23, 1, 0.32, 1);        /* responsive entrance/exit */
     --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);    /* on-screen movement/morph */
     --ease: cubic-bezier(0.25, 0.46, 0.45, 0.94);      /* smooth color/hover changes */
     --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);     /* iOS-like drawer motion */

     /* Duration budget — UI animations under 300ms per AUDIT.md */
     --duration-instant: 50ms;   /* micro-feedback */
     --duration-fast: 100ms;     /* button press, quick feedback */
     --duration-normal: 200ms;   /* tooltips, small popovers, hovers */
     --duration-medium: 250ms;   /* dropdowns, form transitions */
     --duration-slow: 300ms;     /* modals, large reveals, drawers */
   }
   ```

3. **Search and replace sample transitions** to use tokens:
   - Find: `transition: all 200ms ease` → Replace: `transition: transform var(--duration-normal) var(--ease-out), opacity var(--duration-normal) var(--ease-out);`
   - Find: `transition: background-color 250ms ease` → Replace: `transition: background-color var(--duration-medium) var(--ease);`

4. **Update existing tokens** (if any duplicate the new definitions):
   - If `app/globals.css` contains existing easing tokens, remove duplicates and consolidate to the new `:root` block

5. **Verify no hardcoded durations remain** in high-traffic animations:
   ```bash
   grep -E "transition:.*[0-9]+ms|animation:.*[0-9]+ms" app/globals.css | head -20
   # Should show minimal matches after edits (only complex cases)
   ```

6. **Test build**:
   ```bash
   npm run typecheck
   ```

## Boundaries

- Do NOT change animation behavior; only tokenize existing values.
- Do NOT add new animations or transitions.
- Do NOT modify Tailwind config; pure CSS tokens in globals.css.
- Do NOT touch component files (React JSX); CSS-only in globals.css.
- Do NOT add dark-mode overrides for easing (easing is theme-independent).

## Verification

- **Mechanical**:
  ```bash
  grep -c "var(--ease" app/globals.css
  # Should return > 5 (all easing uses tokenized)
  grep -c "var(--duration" app/globals.css
  # Should return > 10 (durations tokenized)
  npm run typecheck
  # Should pass
  ```

- **Feel check**:
  1. Run dev server: `npm run dev`
  2. Hover over buttons in Study Abroad modals:
     - Motion should feel identical to before (tokens preserve existing curves/durations)
     - No change in responsiveness or smoothness
  3. Open form modals (Universities, Programs, Applications):
     - Entrance timing unchanged (~250ms)
     - Easing remains consistent
  4. Inspect DevTools: verify animations panel shows same durations as before

- **Done when**:
  - `:root` block at top of `app/globals.css` contains all easing + duration tokens
  - High-traffic animations (hover, focus, entrance) use tokenized durations
  - No hardcoded cubic-bezier values remain in inline rules
  - Motion feel preserved; no timing changes in UI
