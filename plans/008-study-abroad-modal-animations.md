# Plan 008: Add Animations to Study Abroad Module Modals

**Severity:** HIGH  
**Category:** Physicality & interaction, cohesion  
**Estimated time:** 45 minutes  
**Dependencies:** Plan 003 (tokens, optional — this plan uses inline values)  
**Commit baseline:** Last updated from git status  

## Problem

The Study Abroad module contains 5 high-visibility modals (University, Program, Document, Application, Scholarship) with **zero animations**. They are static div pop-ins with no entrance/exit transitions. This is the main feature area of LifeOS and feels unpolished compared to other animated modals in the app.

**Impact:** High-frequency user interactions (Study Abroad is a primary LifeOS flow); creates feel inconsistency vs. other modals which use Framer Motion scale/fade.

## Solution

Wrap all Study Abroad modal containers with Framer Motion `motion.div` components. Add:
- Backdrop: fade-in (opacity 0→1, duration 0.2s)
- Modal content: scale + fade entrance (scale 0.92→1, opacity 0→1, delay 0.08s)
- Exit animations: reverse (scale 1→0.92, opacity 1→0)
- Spring easing for responsiveness (defer to plan 003 if tokens defined; otherwise use inline cubic-bezier)

This matches the motion language of existing modals while feeling more deliberate (stronger scale change than 0.98).

## Files to Modify

1. **`/home/user/lifeos/app/components/StudyAbroadModals.tsx`** (UniversityModal, ProgramModal, DocumentModal, ApplicationModal, ScholarshipModal)

## Current Code

**File:** `app/components/StudyAbroadModals.tsx`  
**Lines 40–89** (UniversityModal):

```typescript
export function UniversityModal({
  university,
  close,
  save,
}: {
  university?: University;
  close: () => void;
  save: (university: University) => void;
}) {
  // ... state setup ...

  return (
    <div className="modal-layer hub-modal-layer" onMouseDown={close}>
      <form className="hub-profile-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header>
          {/* content */}
        </header>
        {/* form sections */}
      </form>
    </div>
  );
}
```

Similar pattern for ProgramModal (lines 160–244), DocumentModal (lines 397–476), ApplicationModal (lines 702–841), ScholarshipModal (lines 842–961).

## Implementation Steps

### Step 1: Add Framer Motion import

**File:** `app/components/StudyAbroadModals.tsx`  
**Line 2** (after React import):

Add:
```typescript
import { motion } from "framer-motion";
```

**Current line 1:**
```typescript
"use client";

import { useState } from "react";
```

**After edit (insert before line 3):**
```typescript
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
```

### Step 2: Wrap UniversityModal backdrop and content

**File:** `app/components/StudyAbroadModals.tsx`  
**Lines 79–142** (UniversityModal return statement):

Replace the outer `<div className="modal-layer">` and its form child:

**Current:**
```typescript
  return (
    <div className="modal-layer hub-modal-layer" onMouseDown={close}>
      <form className="hub-profile-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header>
          <div>
            <h2>{university ? "Edit University" : "Add University"}</h2>
            <p>Record university information and application details.</p>
          </div>
          <button type="button" onClick={close}>
            <X size={18} />
          </button>
        </header>
        {/* rest of form */}
      </form>
    </div>
  );
```

**New:**
```typescript
  return (
    <motion.div 
      className="modal-layer hub-modal-layer" 
      onMouseDown={close}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.form 
        className="hub-profile-modal" 
        onMouseDown={(e) => e.stopPropagation()} 
        onSubmit={handleSubmit}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.25, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      >
        <header>
          <div>
            <h2>{university ? "Edit University" : "Add University"}</h2>
            <p>Record university information and application details.</p>
          </div>
          <button type="button" onClick={close}>
            <X size={18} />
          </button>
        </header>
        {/* rest of form unchanged */}
      </motion.form>
    </motion.div>
  );
```

**Easing breakdown:**
- `ease: [0.16, 1, 0.3, 1]` = cubic-bezier deceleration (iOS-style spring approximation)
- `duration: 0.2` (backdrop fade)
- `duration: 0.25, delay: 0.08` (content scale+fade — staggered entrance)

### Step 3: Repeat for ProgramModal (lines 160–244)

**File:** `app/components/StudyAbroadModals.tsx`  
**Lines 229–243** (ProgramModal return):

Change:
```typescript
    <div className="modal-layer hub-modal-layer" onMouseDown={close}>
      <form className="hub-profile-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
```

To:
```typescript
    <motion.div 
      className="modal-layer hub-modal-layer" 
      onMouseDown={close}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.form 
        className="hub-profile-modal" 
        onMouseDown={(e) => e.stopPropagation()} 
        onSubmit={handleSubmit}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.25, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      >
```

And close the `</motion.form>` and `</motion.div>` at the end.

### Step 4: Repeat for DocumentModal (lines 443–475)

**File:** `app/components/StudyAbroadModals.tsx`  
**Lines 443–475** (DocumentModal return):

Apply same Framer Motion wrapping pattern as steps 2–3.

### Step 5: Repeat for ApplicationModal (lines 745–839)

**File:** `app/components/StudyAbroadModals.tsx`  
**Lines 745–839** (ApplicationModal return):

Apply same Framer Motion wrapping pattern.

### Step 6: Repeat for ScholarshipModal (lines 892–958)

**File:** `app/components/StudyAbroadModals.tsx`  
**Lines 892–958** (ScholarshipModal return):

Apply same Framer Motion wrapping pattern.

### Step 7: Wrap StudyAbroadCollectionView modal (lines 646–700)

**File:** `app/components/StudyAbroadModals.tsx`  
**Lines 646–700** (StudyAbroadCollectionView return, collection modal):

Current:
```typescript
    <div className="modal-layer hub-modal-layer" onMouseDown={close}>
      <div className="hub-collection-modal" onMouseDown={(e) => e.stopPropagation()}>
```

Change to:
```typescript
    <motion.div 
      className="modal-layer hub-modal-layer" 
      onMouseDown={close}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div 
        className="hub-collection-modal" 
        onMouseDown={(e) => e.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.25, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      >
```

## Verification Steps

### Mechanical (in code):
1. ✓ Framer Motion is imported at top of file
2. ✓ All 5 modal functions (University, Program, Document, Application, Scholarship) have `<motion.div>` + `<motion.form/div>` wrappers
3. ✓ Each has `initial={{ opacity: 0 }}` and `initial={{ scale: 0.92, opacity: 0 }}`
4. ✓ Each has matching `exit={{` animation
5. ✓ Backdrop: `transition={{ duration: 0.2 }}`
6. ✓ Content: `transition={{ duration: 0.25, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}`
7. ✓ File compiles without TypeScript errors

### Feel checks (in browser, dev server at localhost:3002):
1. **Entrance:** Open any Study Abroad modal (University/Program/Document/Application/Scholarship). Backdrop fades in smoothly (0.2s), then content scales up and fades in (0.25s, staggered). Feels deliberate and polished.
2. **Timing:** Entrance takes ~330ms total (200ms backdrop + 80ms delay + 250ms content). Should feel snappy but not abrupt.
3. **Exit:** Close the modal. Content scales down and fades, backdrop fades. Feels responsive and reverses entrance.
4. **Consistency:** All 5 modals behave identically (same timing, same easing).
5. **Touch/interaction:** On mobile/slow connection, entrance should still feel responsive (no jank). Use DevTools Performance tab to verify 60fps.

### Regression check:
- Study Abroad Dashboard loads without errors
- Clicking "Add University" / "Edit University" opens modal with animation
- Clicking backdrop closes modal with animation
- All form functionality works (submit, close button, etc.)
- No TypeScript errors in build output

## Notes

- **Easing:** `[0.16, 1, 0.3, 1]` is a deceleration curve that approximates iOS spring physics. If plan 003 (tokens) is executed first, replace with `var(--ease-out)` once defined.
- **Scale value:** 0.92 (vs. the more conservative 0.98 in other modals) creates stronger visual entrance—appropriate for Study Abroad's prominence.
- **No AnimatePresence needed** here because modals are conditionally rendered at call site (their state is already managed by parent component). If wrapped with AnimatePresence at parent level, exit animations will fire properly.

## Related Plans

- **Plan 003** (Define easing/duration tokens) — After tokens are defined, replace inline `ease: [0.16, 1, 0.3, 1]` with `var(--ease-out)` for consistency.
- **Plan 002** (prefers-reduced-motion) — When accessibility support is added, Study Abroad modals will automatically respect motion preferences because they use Framer Motion.

---

_Execution time estimate: 45 minutes. No dependencies beyond Framer Motion (already in package.json)._
