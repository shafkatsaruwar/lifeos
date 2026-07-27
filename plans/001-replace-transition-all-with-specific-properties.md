# 001 — Replace `transition: all` with specific properties

- **Status**: TODO
- **Commit**: e95a517
- **Severity**: HIGH
- **Category**: Performance (audit category 5)
- **Estimated scope**: 1 file (app/globals.css), ~30 instances

## Problem

`transition: all` animates every property changing on an element. This triggers layout recalculation, paint, and composite for unintended properties (`width`, `height`, `margin`, `padding`, `left`, `top`) instead of using GPU-accelerated transforms. Results in dropped frames under load, especially on hover states and rapid interactions.

Current state: `app/globals.css` contains ~30 instances of `transition: all`. Example at lines 487, 512, 536, 561, etc.:

```css
/* app/globals.css:487 — current */
.add-button:hover { transition: all 200ms ease; background-color: var(--accent); }
```

Per [AUDIT.md](AUDIT.md) section 5 (Performance): "`transition: all` animates unintended properties off-GPU — always a finding."

## Target

Replace every `transition: all` with explicit `transform` and `opacity` transitions only. GPU-accelerated properties:
- `transform` (includes `scale`, `translate`, `rotate`)
- `opacity`
- `filter` (if used for blur/brightness)

No other properties should animate; layout changes must be instant.

```css
/* target */
.add-button:hover {
  transition: transform 200ms ease-out, opacity 200ms ease-out;
  background-color: var(--accent);
}
```

## Repo conventions to follow

- Easing tokens in `app/globals.css` (lines 1–50): use `var(--ease-out)`, `var(--ease-in-out)`, etc.
- Current token example at line 40: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`
- Duration follow Bootstrap scale: 100–160ms for button feedback, 150–250ms for dropdowns/modals (per AUDIT.md section 2)
- All hover transitions use `ease` (not ease-out), based on AUDIT.md decision order: "Hover / color change → ease"

## Steps

1. **Identify all `transition: all` instances in `app/globals.css`** (full file scan via grep confirms 30+ instances).

2. **For each `.add-button:hover` or direct color-change hovers** (no transform intended):
   - Remove `transition: all 200ms ease`
   - Replace with no transition (if color is instant) or `transition: background-color 200ms ease` (if animation intended)
   - Example: `.add-button:hover { background-color: var(--accent); }` (no transition)

3. **For elements with `scale()`/`transform` on hover** (e.g., `.study-card:hover`):
   - Replace `transition: all Xms ease` with `transition: transform Xms ease-out, opacity Xms ease-out`
   - Example at line 512:
     - Current: `transition: all 250ms ease;`
     - Target: `transition: transform 250ms ease-out, opacity 250ms ease-out;`

4. **For form inputs and interactive elements** with multiple style changes:
   - If only background/color change (no transform): remove transition
   - If transform or opacity change occurs: use `transition: transform 150ms ease-out, opacity 150ms ease-out`

5. **Run TypeScript check** to ensure no CSS parser breaks:
   ```bash
   npm run typecheck
   ```

6. **Visual verification**: Open dev server (`npm run dev`), navigate to Study Abroad modals and hover over buttons:
   - Buttons should respond instantly to hover (no jank)
   - No "stretched" layout during transitions
   - Transform-based animations remain smooth

## Boundaries

- Do NOT add new CSS classes; only modify existing transition properties.
- Do NOT change markup or structure.
- Do NOT add Framer Motion props; this is CSS-only.
- Do NOT touch keyframes; only inline transitions in rule sets.
- If a `transition: all` is attached to `@media (prefers-reduced-motion: reduce)`, replace with specific properties there too.

## Verification

- **Mechanical**: 
  ```bash
  grep -n "transition: all" app/globals.css | wc -l
  # Should return 0 after edits
  npm run typecheck
  # Should pass without CSS errors
  ```

- **Feel check**:
  1. Run dev server: `npm run dev`
  2. Hover over buttons in Study Abroad modals (Universities, Programs, Applications)
  3. Confirm buttons respond instantly (no animation lag)
  4. In DevTools Animations panel, set playback to 10% speed
  5. Confirm only transform/opacity properties animate; no width/padding/margin flicker
  6. Open any form and rapidly click/blur inputs; confirm no layout jumps

- **Done when**: 
  - `grep -n "transition: all" app/globals.css` returns 0 results
  - All instances replaced with explicit `transform` + `opacity` or no transition
  - Dev server runs without console errors
  - Visual spot-check confirms buttons respond instantly on hover
