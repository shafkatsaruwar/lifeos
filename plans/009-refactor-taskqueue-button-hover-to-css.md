# Plan 009: Refactor TaskQueueModal Button Hover to CSS Transitions

**Severity:** MEDIUM  
**Category:** Interruptibility, cohesion  
**Estimated time:** 15 minutes  
**Dependencies:** None (standalone; optionally uses plan 003 tokens)  
**Commit baseline:** Current app/page.tsx with TaskQueueModal  

## Problem

The TaskQueueModal "available tasks" buttons use imperative `onMouseEnter`/`onMouseLeave` handlers that directly mutate inline styles (border-color, background). This approach:
1. **Breaks interruptibility** — If user's pointer re-enters mid-animation, there's no smooth transition; styles jump instantly.
2. **Can't be interrupted** — JavaScript event handlers fire after CSS transitions would, creating micro-jank.
3. **Inconsistent with app** — Other buttons use CSS transitions (`.18s all` or specific properties).

**Impact:** ~20 interactions/day (users adding tasks to queue); subtle but compounds with perception of polish.

## Solution

Replace imperative handlers with pure CSS transitions on `:hover` state. This allows:
- Smooth interruption if pointer moves
- GPU-accelerated transitions
- Consistency with app's motion language

Keep the accent color and background tint logic, just apply via CSS instead of JavaScript.

## Files to Modify

1. **`/home/user/lifeos/app/page.tsx`** — TaskQueueModal component, available task buttons

## Current Code

**File:** `app/page.tsx`  
**Lines 2038–2067** (available task buttons in TaskQueueModal):

```typescript
{availableTasks.map(task => (
  <button
    key={task.id}
    type="button"
    onClick={() => addToQueue(task.id)}
    style={{
      padding: '12px',
      border: '1px solid var(--line)',
      borderRadius: '8px',
      background: 'var(--canvas)',
      textAlign: 'left',
      cursor: 'pointer',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '12px',
      alignItems: 'center',
      transition: 'all .15s',
    }}
    onMouseEnter={(e) => { 
      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; 
      (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--accent) 10%, var(--canvas))'; 
    }}
    onMouseLeave={(e) => { 
      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--line)'; 
      (e.currentTarget as HTMLButtonElement).style.background = 'var(--canvas)'; 
    }}
  >
    {/* button content */}
  </button>
))}
```

## Implementation Steps

### Step 1: Remove imperative handlers and add className

**File:** `app/page.tsx`  
**Lines 2038–2067**:

Replace the entire button with class-based styling:

**Current button code:**
```typescript
<button
  key={task.id}
  type="button"
  onClick={() => addToQueue(task.id)}
  style={{
    padding: '12px',
    border: '1px solid var(--line)',
    borderRadius: '8px',
    background: 'var(--canvas)',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '12px',
    alignItems: 'center',
    transition: 'all .15s',
  }}
  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--accent) 10%, var(--canvas))'; }}
  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--line)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--canvas)'; }}
>
```

**New:**
```typescript
<button
  key={task.id}
  type="button"
  onClick={() => addToQueue(task.id)}
  className="queue-available-task"
>
```

Keep the button content unchanged (the `<div>` with title/description and the `<Plus>` icon).

### Step 2: Add CSS class to globals.css

**File:** `app/globals.css`  
**After the `.now-right-section` styles** (around line 910, after greeting section styles):

Add:

```css
.queue-available-task {
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--canvas);
  text-align: left;
  cursor: pointer;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.queue-available-task:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--canvas));
}
```

**Explanation:**
- Uses CSS `:hover` pseudo-class (interruptible, GPU-accelerated)
- Transitions only `border-color` and `background-color` (specific properties vs. `all`)
- Duration 0.15s matches the inline `transition: 'all .15s'` from original
- `ease` is default easing (same as original implicit easing)

### Step 3: Update button closing tags

Ensure the button content `</div>` and `</Plus>` close properly, followed by `</button>`.

**No change needed** — the closing tags remain; only the opening `<button>` tag and its attributes change.

## Verification Steps

### Mechanical (in code):
1. ✓ `onMouseEnter` and `onMouseLeave` handlers are removed from the button
2. ✓ `className="queue-available-task"` is added to the button
3. ✓ Inline `style={}` object is removed from the button (keep only className)
4. ✓ `.queue-available-task` CSS class is added to `app/globals.css` with:
   - Base styles: `padding`, `border`, `background`, `display: grid`, `cursor: pointer`, etc.
   - `transition: border-color 0.15s ease, background-color 0.15s ease;`
   - `:hover` pseudo-class with `border-color: var(--accent)` and `background: color-mix(...)`
5. ✓ File compiles without TypeScript errors

### Feel checks (in browser, localhost:3002):
1. **Hover entrance:** Move pointer over an available task button. Border and background transition smoothly to accent color. Should take ~150ms.
2. **Hover exit:** Move pointer away from the button. Border and background transition back to default. Smooth reverse.
3. **Interruption:** Move pointer over button, then quickly move away mid-transition. Should not jump or flicker; motion should interpolate smoothly.
4. **Consistency:** Compare with other buttons in the app (e.g., "Now" view action buttons). Should feel similar in responsiveness.
5. **Performance:** Use DevTools Performance tab to verify no jank or forced repaints on hover.

### Regression check:
- TaskQueueModal opens without errors
- Available tasks list renders
- Clicking "add to queue" button works (adds task to queued list)
- Hover still provides visual feedback (accent border + tinted background)
- No TypeScript errors in build output

## Notes

- **Why remove `transition: all`?** Specific properties (`border-color`, `background-color`) are better for performance than animating all properties. GPU can optimize these two properties better.
- **Easing:** Default `ease` is used (equivalent to `cubic-bezier(0.25, 0.46, 0.45, 0.94)`, a standard ease-in-out). If plan 003 (tokens) is executed first, can replace with `var(--ease-standard)`.
- **Accessibility:** CSS `:hover` state still applies; users with assistive tech that don't use pointer (keyboard nav, touch) will see the state change on focus. Consider adding `:focus` and `:focus-visible` states if needed (separate enhancement).

## Related Plans

- **Plan 003** (Define easing/duration tokens) — After tokens are defined, replace inline `0.15s ease` with `var(--motion-quick) var(--ease-standard)` for consistency across the codebase.
- **Plan 002** (prefers-reduced-motion) — When accessibility support is added, add this class to the reduced-motion list: `@media(prefers-reduced-motion:reduce) { .queue-available-task { transition: none; } }`

---

_Execution time estimate: 15 minutes. Standalone refactor; improves feel and performance._
