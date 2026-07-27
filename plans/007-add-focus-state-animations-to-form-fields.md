# 007 — Add focus state animations to form fields

- **Status**: TODO
- **Commit**: e95a517
- **Severity**: LOW
- **Category**: Missed opportunities (audit category 8), Cohesion & tokens (audit category 7)
- **Estimated scope**: 1 file (app/globals.css), adding ~15 new rules

## Problem

Form fields (inputs, textareas, selects) in Study Abroad modals have static focus states (e.g., outline color change only), missing subtle entrance animation. Adding focus animations would:
- Provide visual feedback that the field is active
- Guide user's attention to the focused field
- Feel more polished and intentional
- Follow Apple's interaction principle (immediate feedback on focus)

Per [AUDIT.md](AUDIT.md) section 8 (Missed opportunities):
- "State changes that teleport (content swaps, layout jumps) where a brief transition would prevent a jarring change."

Current state: Form fields use CSS outline/border on `:focus-visible` with no animation. Example:
```css
input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

## Target

Add subtle focus animations that emphasize the field without distracting:
- Border/outline color animates in over 150ms with `ease-out`
- Optional: subtle 2% scale (`scale(1.01)`) for tactile feedback
- Duration: 150ms (per AUDIT.md: dropdowns 150–250ms, use lower end for focus)
- Non-disruptive: no large transforms, only color + optional micro-scale

```css
input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  transition: outline-color 150ms var(--ease-out), transform 150ms var(--ease-out);
  transform: scale(1.01);
}
```

## Repo conventions to follow

- Focus animations use `:focus-visible` (not `:focus`, to avoid animating on keyboard-only interactions when not helpful)
- Duration: 150ms (form interaction speed per AUDIT.md)
- Easing: `var(--ease-out)` (or `cubic-bezier(0.23, 1, 0.32, 1)`)
- Scale: 1.01 (1% growth, subtle, not jarring per AUDIT.md section 3)
- Applied to: `input[type="text"]`, `input[type="email"]`, `input[type="number"]`, `textarea`, `select`
- Existing field styling at `app/globals.css` line ~650+

## Steps

1. **Locate form field styling** in `app/globals.css` (search for `input`, `textarea`, `select` rules; approximately line 650+).

2. **For `input:focus-visible` rule** (if exists) or create new:
   - Current (example):
     ```css
     input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
     ```
   - Update to:
     ```css
     input:focus-visible {
       outline: 2px solid var(--accent);
       outline-offset: 2px;
       transition: outline-color 150ms cubic-bezier(0.23, 1, 0.32, 1), transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
       transform: scale(1.01);
     }
     ```

3. **Apply same pattern to `textarea:focus-visible`**:
   ```css
   textarea:focus-visible {
     outline: 2px solid var(--accent);
     outline-offset: 2px;
     transition: outline-color 150ms cubic-bezier(0.23, 1, 0.32, 1), transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
     transform: scale(1.01);
   }
   ```

4. **Apply same pattern to `select:focus-visible`**:
   ```css
   select:focus-visible {
     outline: 2px solid var(--accent);
     outline-offset: 2px;
     transition: outline-color 150ms cubic-bezier(0.23, 1, 0.32, 1), transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
     transform: scale(1.01);
   }
   ```

5. **Optional: add base input styling** (if not already present) to ensure focus state is visible:
   ```css
   input, textarea, select {
     transition: outline-color 150ms cubic-bezier(0.23, 1, 0.32, 1), transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
   }
   ```

6. **Test build**:
   ```bash
   npm run typecheck
   npm run dev
   ```

## Boundaries

- Do NOT add large scale transforms (max 1.01 per AUDIT.md)
- Do NOT animate on `:focus` (only `:focus-visible` for keyboard accessibility)
- Do NOT change field colors, sizing, or layout
- Do NOT add new input types or fields
- Do NOT block form submission or validation
- Do NOT animate on browser's default focus outline; only custom outline/border

## Verification

- **Mechanical**:
  ```bash
  grep -n "input:focus-visible\|textarea:focus-visible\|select:focus-visible" app/globals.css
  # Should return >= 1 for each selector
  grep -n "transform: scale(1.01)" app/globals.css
  # Should return >= 3 (input, textarea, select)
  npm run typecheck
  npm run dev
  # No errors
  ```

- **Feel check**:
  1. Open dev server: `npm run dev`
  2. Open any Study Abroad modal (e.g., Universities add dialog)
  3. Tab through form fields (keyboard focus):
     - Each focused field grows 1% and outline color animates in over 150ms
     - Growth is subtle (barely noticeable but feels responsive)
     - Outline color smoothly transitions to accent color
  4. Click into a field (mouse focus):
     - Same animation triggers (focus-visible works on click+keyboard)
  5. In DevTools Animations panel (25% speed):
     - Watch outline color animate in
     - Watch scale(1.01) transform apply and reverse on blur
     - Confirm 150ms duration
  6. Rapidly tab through fields:
     - Animations never stutter or restart
     - Each field shows unique focus state
  7. **Accessibility check**: 
     - Turn on DevTools reduced-motion emulation (`@media (prefers-reduced-motion: reduce)`)
     - Tab through fields: outline still appears, but scale animation removed
     - Focus state still visible (outline change sufficient)

- **Done when**:
  - `input:focus-visible`, `textarea:focus-visible`, `select:focus-visible` all have transitions
  - Scale(1.01) applied to all three for 150ms on focus
  - Outline color animates in over 150ms with ease-out
  - Tab navigation shows smooth, responsive focus feedback
  - Reduced-motion mode disables scale but keeps outline focus indicator
