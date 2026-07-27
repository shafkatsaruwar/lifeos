# 004 — Add active-state press feedback to modal header buttons

- **Status**: TODO
- **Commit**: e95a517
- **Severity**: MEDIUM
- **Category**: Physicality & origin (audit category 3), Missed opportunities (category 8)
- **Estimated scope**: 1 file (app/globals.css), adding ~5 lines

## Problem

Modal header buttons (e.g., close button in `.hub-profile-modal>header>button`) lack `:active` press feedback. When a user taps or clicks them, there is no tactile confirmation that the button was activated. This makes the UI feel unresponsive and breaks Apple's interaction principle of immediate feedback.

Current state: `app/globals.css` line ~550 defines `.hub-profile-modal>header>button` with no `:active` rule.

Per [AUDIT.md](AUDIT.md) section 3 (Physicality & origin):
- "Press feedback: `transform: scale(0.97)` on `:active` with `transition: transform 160ms ease-out`. Keep it subtle (0.95–0.98)."

## Target

Add `:active` state with subtle scale feedback (0.97) and instant transition that completes before button releases:

```css
.hub-profile-modal>header>button:active {
  transform: scale(0.97);
  transition: transform 100ms ease-out;
}
```

This provides:
- Scale from 97% (subtle, not jarring)
- 100ms transition (completes in one gesture)
- `ease-out` curve (responsive, starts fast)
- Applies only during press (`:active` is duration of finger/mouse contact)

## Repo conventions to follow

- Press feedback durations: 100–160ms per AUDIT.md section 2
- Scale factor: 0.95–0.98 per AUDIT.md section 3 (use 0.97, middle of range)
- Easing: `ease-out` for instant responsiveness (will use `var(--ease-out)` after plan 003)
- Existing button styling at `app/globals.css:~550` defines base `width`, `height`, `border`, `background`

## Steps

1. **Locate `.hub-profile-modal>header>button` rule** in `app/globals.css` (approximately line 550):
   ```css
   .hub-profile-modal>header>button {
     width: 36px;
     height: 36px;
     border: 1px solid var(--line);
     border-radius: 8px;
     background: var(--canvas);
     display: grid;
     place-items: center;
     flex-shrink: 0;
   }
   ```

2. **Add `:active` pseudo-class rule immediately after the base button rule**:
   ```css
   .hub-profile-modal>header>button:active {
     transform: scale(0.97);
     transition: transform 100ms cubic-bezier(0.23, 1, 0.32, 1);
   }
   ```
   - Scale: 0.97 (subtle, 3% reduction in size)
   - Duration: 100ms (completes during press)
   - Easing: `cubic-bezier(0.23, 1, 0.32, 1)` (strong ease-out for responsiveness)
   - Transition: transform only (no need for opacity, color on press)

3. **Alternatively, if plan 003 (tokens) is complete first**, use token:
   ```css
   .hub-profile-modal>header>button:active {
     transform: scale(0.97);
     transition: transform var(--duration-fast) var(--ease-out);
   }
   ```

4. **Test interaction**:
   ```bash
   npm run dev
   ```

5. **Verify no style leakage** (ensure `:active` does not affect other modals):
   ```bash
   grep -n "\.hub-profile-modal" app/globals.css
   # Confirm only one definition and one `:active` rule
   ```

## Boundaries

- Do NOT add `:hover` or `:focus` states; only `:active` for press feedback.
- Do NOT change the base button styling (size, color, border).
- Do NOT add new button classes; edit only `.hub-profile-modal>header>button:active`.
- Do NOT apply to other buttons without explicit per-plan review.

## Verification

- **Mechanical**:
  ```bash
  grep -A2 "\.hub-profile-modal>header>button:active" app/globals.css | grep -E "transform|transition"
  # Should show scale(0.97) and transition: transform
  npm run typecheck
  # Should pass
  ```

- **Feel check**:
  1. Run dev server: `npm run dev`
  2. Open any Study Abroad modal (University, Program, Application, Scholarship)
  3. Press and hold the close button (✕) in the modal header:
     - Button should shrink slightly (scale 0.97) instantly on press
     - Release: button returns to normal size over 100ms (smooth spring-back)
     - Feel: tactile, responsive, not janky
  4. In DevTools Animations panel (10% speed):
     - Confirm scale eases from 0.97 → 1.0 over ~100ms on release
     - No color/opacity changes; pure transform
  5. Press rapidly (click multiple times):
     - Each press shows feedback
     - No lag, no animation restart jumps

- **Done when**:
  - `.hub-profile-modal>header>button:active` rule exists with `transform: scale(0.97)` and `transition: transform 100ms`
  - Pressing close button shows immediate visual feedback
  - Button scales back smoothly (100ms) on release
  - No console errors or style conflicts
