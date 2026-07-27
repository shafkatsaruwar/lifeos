# 006 — Add backdrop blur entrance animation to modals

- **Status**: TODO
- **Commit**: e95a517
- **Severity**: LOW
- **Category**: Missed opportunities (audit category 8), Cohesion & tokens (audit category 7)
- **Estimated scope**: 1 file (app/globals.css), adding ~10 lines

## Problem

Modal backdrops (`.modal-layer`) fade in instantly with no blur effect, causing visual clutter and eye distraction from the modal content. Adding a subtle blur animation to the backdrop during entrance would:
- Create visual separation between modal and background content
- Reduce cognitive load by de-emphasizing out-of-focus content
- Follow Apple's design pattern (iOS modals blur background)
- Complete the modal "depth" hierarchy

Per [AUDIT.md](AUDIT.md) section 8 (Missed opportunities):
- "A jarring crossfade that shows two overlapping states can be masked with subtle `filter: blur(2px)` during the transition."

Current state: `app/globals.css` line ~590 defines `.modal-layer` with `background: rgba(0, 0, 0, 0.5)` and Framer Motion opacity animation; no blur.

## Target

Add CSS `filter: blur()` entrance animation:
- Backdrop blurs from 0px → 2px over modal entrance (~250ms)
- Blur timing synchronized with modal fade-in
- Uses CSS custom property for future adjustments
- Per AUDIT.md section 5: blur kept under 20px (2px is safe)

```css
.modal-layer {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(var(--modal-blur));
  transition: backdrop-filter 250ms cubic-bezier(0.23, 1, 0.32, 1);
}

.modal-layer[data-open="true"] {
  --modal-blur: 2px;
}
```

## Repo conventions to follow

- CSS filters stored as `filter: blur()` or `backdrop-filter: blur()` (backdrop-filter preferred for background blur without blurring children)
- Duration: 250ms (modal entrance duration, from existing animations in page.tsx)
- Blur amount: 2px (subtle, per AUDIT.md; keeps Safari performance good)
- Easing: `--ease-out` or `cubic-bezier(0.23, 1, 0.32, 1)` (responsive entrance)
- CSS variables in `:root` for `--modal-blur` threshold

## Steps

1. **Add `--modal-blur` token** to `:root` block in `app/globals.css` (if plan 003 completed):
   ```css
   :root {
     /* ...existing easing/duration tokens... */
     --modal-blur: 0px; /* default: no blur until modal opens */
   }
   ```

2. **Locate `.modal-layer` rule** in `app/globals.css` (approximately line 590):
   ```css
   .modal-layer {
     position: fixed;
     inset: 0;
     background: rgba(0, 0, 0, 0.5);
     display: flex;
     align-items: center;
     justify-content: center;
     z-index: 1000;
   }
   ```

3. **Add `backdrop-filter` and transition**:
   ```css
   .modal-layer {
     position: fixed;
     inset: 0;
     background: rgba(0, 0, 0, 0.5);
     backdrop-filter: blur(var(--modal-blur));
     transition: backdrop-filter 250ms cubic-bezier(0.23, 1, 0.32, 1);
     display: flex;
     align-items: center;
     justify-content: center;
     z-index: 1000;
   }
   ```

4. **Add animate state** (if using data attribute in page.tsx):
   - If page.tsx applies `data-state="open"` to `.modal-layer`, add:
     ```css
     .modal-layer[data-state="open"] {
       --modal-blur: 2px;
     }
     ```
   - If Framer Motion handles animation directly, update JSX in page.tsx to set variable:
     ```jsx
     <motion.div
       className="modal-layer"
       style={{ "--modal-blur": "2px" }}
       initial={{ "--modal-blur": "0px" }}
       animate={{ "--modal-blur": "2px" }}
       transition={{ duration: 0.25 }}
     >
     ```

5. **Test build**:
   ```bash
   npm run typecheck
   npm run dev
   ```

## Boundaries

- Do NOT blur modal content itself (only backdrop via `backdrop-filter`)
- Do NOT blur child elements (backdrop-filter is applied only to the background)
- Do NOT exceed 2px blur radius (AUDIT.md limit for Safari performance)
- Do NOT remove opacity animation; blur is additive (both fade + blur happen together)
- Do NOT change modal structure or add new elements

## Verification

- **Mechanical**:
  ```bash
  grep -n "backdrop-filter" app/globals.css
  # Should return 1 (the .modal-layer rule)
  grep -n "modal-blur" app/globals.css
  # Should return >= 2 (token definition + usage)
  npm run typecheck
  npm run dev
  # No errors
  ```

- **Feel check**:
  1. Open dev server: `npm run dev`
  2. Open any Study Abroad modal (e.g., Universities add dialog)
  3. Observe modal entrance:
     - Backdrop fades in with opacity (black overlay)
     - Background content blurs slightly (2px), softening the edge of content outside modal
     - Blur and fade timing synchronized (~250ms)
  4. In DevTools Rendering panel:
     - Turn on "Paint flashing" and open modal
     - Backdrop blur should not cause excessive repaints (backdrop-filter is GPU-accelerated)
  5. Close modal:
     - Backdrop unblurs smoothly (blur 2px → 0px over 250ms)
     - Content comes back into focus
  6. On low-end device (DevTools throttle to "Slow 4G" or simulate older Mac):
     - Blur animation remains smooth (not janky)
     - No frame drops

- **Done when**:
  - `.modal-layer` applies `backdrop-filter: blur(var(--modal-blur))`
  - Backdrop blurs from 0 → 2px over ~250ms on modal entrance
  - Blur animation synchronized with opacity fade
  - DevTools shows no excessive repaints; GPU acceleration active
  - Visual feel: soft, polished, not jarring
