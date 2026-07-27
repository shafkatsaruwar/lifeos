# 002 — Add `prefers-reduced-motion` accessibility support

- **Status**: TODO
- **Commit**: e95a517
- **Severity**: HIGH
- **Category**: Accessibility (audit category 6)
- **Estimated scope**: 1 file (app/globals.css), adding ~15 new rules

## Problem

No `@media (prefers-reduced-motion: reduce)` blocks exist in `app/globals.css`. Users who have enabled reduced-motion in OS preferences (macOS: System Preferences → Accessibility → Display, Windows: Settings → Ease of Access → Display, Web: DevTools Rendering panel) still see all animations and transforms, causing motion sickness or discomfort.

Per [AUDIT.md](AUDIT.md) section 6 (Accessibility):
- "Reduced motion means fewer and gentler animations, **not zero** — keep transitions that aid comprehension, remove position changes."
- Movement without prefers-reduced-motion handling is a finding.

Currently: `app/globals.css` has zero instances of `@media (prefers-reduced-motion: reduce)`.

## Target

Wrap all spatial motion (transforms, position changes, sliding reveals) in `@media (prefers-reduced-motion: reduce)` media queries, dropping movement but keeping opacity/color feedback for comprehension.

Target pattern:

```css
/* normal motion */
.element {
  transition: transform 200ms ease-out, opacity 200ms ease-out;
}

/* reduce motion: keep opacity, drop transform */
@media (prefers-reduced-motion: reduce) {
  .element {
    transition: opacity 200ms ease-out;
    /* transform removed or set to none */
  }
}
```

## Repo conventions to follow

- All animations in `app/globals.css` use variable-based durations/easing (e.g., `var(--ease-out)`, `200ms`)
- Reduced-motion rules appear immediately after their unreduced counterparts
- Example from AUDIT.md:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .element { animation: fade 0.2s ease; } /* keep opacity/color, drop movement */
  }
  ```

## Steps

1. **Identify animated elements with spatial motion** in `app/globals.css`:
   - Look for: `transform: translate()`, `transform: scale()`, `top:`, `left:`, `margin-left:`, etc.
   - Priority: `.add-button:hover`, `.study-card:hover`, `.modal-layer`, `.study-abroad-timeline`, form field reveals

2. **For modal/drawer entrance animations** (e.g., `.modal-layer` using Framer Motion opacity):
   - CSS: Add `@media (prefers-reduced-motion: reduce)` → remove any background blur or keep opacity only
   - Example: If modal backdrop has `filter: blur(2px)`, remove in reduced-motion

3. **For hover state transforms** (scale, translate effects):
   - Add rule: 
     ```css
     @media (prefers-reduced-motion: reduce) {
       .element:hover { transform: none; }
     }
     ```

4. **For form field focus animations** (if they slide or scale):
   - Add:
     ```css
     @media (prefers-reduced-motion: reduce) {
       input:focus-visible { transform: none; border-color: var(--accent); }
     }
     ```

5. **For button press feedback** (`.hub-profile-modal>header>button:active` or similar):
   - If using `scale(0.95)`, replace in reduced-motion:
     ```css
     @media (prefers-reduced-motion: reduce) {
       .button:active { transform: none; opacity: 0.85; }
     }
     ```

6. **For staggered reveals** (if added later via keyframes):
   - Replace with instant show: `animation: none; opacity: 1;`

## Boundaries

- Do NOT add new interactive features or markup.
- Do NOT remove opacity/color transitions; keep those for feedback.
- Do NOT touch Framer Motion components (e.g., `<motion.div>` in page.tsx); prefers-reduced-motion support there is handled via `useReducedMotion()` hook if needed.
- Do NOT change easing curves; just drop transforms.

## Verification

- **Mechanical**:
  ```bash
  grep -c "@media (prefers-reduced-motion" app/globals.css
  # Should return > 0 after edits (at least 5–10 new blocks)
  npm run typecheck
  # Should pass
  ```

- **Feel check**:
  1. Run dev server: `npm run dev`
  2. In DevTools Rendering panel, check "Emulate CSS media feature prefers-reduced-motion: reduce"
  3. Navigate Study Abroad modals and hover buttons:
     - Buttons should have instant background-color change (no transform/scale animation)
     - No sliding or scaling effects
     - Color feedback remains (e.g., button darkens on hover)
  4. Open form fields and focus:
     - Focus state visible (e.g., outline/border change)
     - No animation, no scale/slide
  5. Uncheck reduced-motion emulation; confirm movement returns

- **Done when**:
  - `@media (prefers-reduced-motion: reduce)` blocks exist for all movement-based animations
  - At least 5 CSS rules updated with reduced-motion handling
  - DevTools reduced-motion emulation shows no transforms or position changes
  - Color/opacity feedback remains in both modes
