# 005 — Add staggered form field entrance animations to Study Abroad modals

- **Status**: TODO
- **Commit**: e95a517
- **Severity**: LOW
- **Category**: Cohesion & tokens (audit category 7), Missed opportunities (audit category 8)
- **Estimated scope**: 4 component files (UniversityModal, ProgramModal, ApplicationModal, ScholarshipModal), adding Framer Motion stagger props

## Problem

Study Abroad modals (Universities, Programs, Applications, Scholarships) display all form fields at once when opened, creating a visually cluttered, overwhelming entrance. A staggered reveal, where fields appear in sequence with small delays (30–80ms per field), would:
- Guide the user's eye through the form
- Reduce cognitive load by breaking the form into visual chunks
- Feel more polished and intentional

Per [AUDIT.md](AUDIT.md) section 7 (Cohesion & tokens):
- "Everything-at-once group entrances where a **30–80ms stagger** belongs. Stagger is decorative — it must never block interaction."

Current state: All form fields in modals appear simultaneously via Framer Motion's `initial={{ opacity: 0 }}` and `animate={{ opacity: 1 }}` without stagger.

## Target

Add Framer Motion's `staggerContainer` and `staggerItem` variants to form sections in each modal:
- Parent container: `variants={containerVariants}` with `staggerChildren: 0.05` (50ms stagger)
- Child fields: `variants={itemVariants}` with individual offset delays
- Result: fields appear sequentially over 200–300ms total (5 fields × 50ms = 250ms)
- Non-blocking: form is fully interactive after modal opens; stagger is visual sugar only

Example pattern:

```jsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

<motion.form variants={containerVariants} initial="hidden" animate="visible">
  <motion.div variants={itemVariants}>{field1}</motion.div>
  <motion.div variants={itemVariants}>{field2}</motion.div>
  ...
</motion.form>
```

## Repo conventions to follow

- Framer Motion is already imported in all modal components (e.g., `import { motion } from 'framer-motion'`)
- Entrance animations use `opacity` + `y: 10` (10px upward offset), fading in over 300ms
- Stagger interval: 50ms (0.05s) per AUDIT.md section 7
- Easing: default Framer Motion (ease-out for entrances, handled by library)
- Non-blocking: stagger must complete during modal open animation; interaction not delayed

## Steps

1. **Open `/home/user/lifeos/app/components/UniversityModal.tsx`** (or the first modal file)

2. **Add Framer Motion variant definitions** near the top of the component (after imports, before JSX):
   ```jsx
   const containerVariants = {
     hidden: { opacity: 0 },
     visible: {
       opacity: 1,
       transition: { staggerChildren: 0.05 },
     },
   };

   const itemVariants = {
     hidden: { opacity: 0, y: 10 },
     visible: {
       opacity: 1,
       y: 0,
       transition: { duration: 0.3, ease: "easeOut" },
     },
   };
   ```

3. **Wrap the form fields section** with `<motion.form>` and apply variants:
   - Locate the form container (usually a `<div>` wrapping all input fields)
   - Change to: `<motion.form variants={containerVariants} initial="hidden" animate="visible">`

4. **Wrap each field group** with `<motion.div variants={itemVariants}>`:
   - Example: `<motion.div variants={itemVariants}><label>Name</label><input ... /></motion.div>`
   - Apply to: name, email, phone, address, major, graduation date, etc. (all main fields)
   - Group related fields (e.g., `firstName` and `lastName`) under one stagger item

5. **Repeat for other modal components**:
   - ProgramModal.tsx
   - ApplicationModal.tsx
   - ScholarshipModal.tsx

6. **Test build**:
   ```bash
   npm run typecheck
   npm run dev
   ```

## Boundaries

- Do NOT change the modal entrance animation (opacity fade-in already works)
- Do NOT add new fields or change field names
- Do NOT alter form validation logic
- Do NOT block form submission during stagger (interactions enabled immediately)
- Do NOT stagger submit/cancel buttons (only form fields)

## Verification

- **Mechanical**:
  ```bash
  grep -n "staggerChildren" app/components/UniversityModal.tsx app/components/ProgramModal.tsx
  # Should return > 0 for each file
  npm run typecheck
  npm run dev
  # No TypeScript errors, dev server runs
  ```

- **Feel check**:
  1. Open dev server: `npm run dev`
  2. Open Study Abroad modal (e.g., add University):
     - Modal fades in normally
     - Form fields appear sequentially from top to bottom (50ms between each)
     - All fields visible after ~250–300ms total
  3. In DevTools Animations panel (25% speed):
     - Watch each field fade in and slide up slightly (y: 10)
     - Confirm 50ms gaps between field animations
  4. **Non-blocking test**: While modal is animating, click an input field:
     - Input accepts focus/typing immediately (no wait for all animations)
     - Form is fully interactive before stagger completes
  5. Rapid modal open/close:
     - Stagger never stutters or jumps
     - Smooth visual progression

- **Done when**:
  - All 4 modal components (University, Program, Application, Scholarship) have stagger variants
  - Form fields appear sequentially over ~250–300ms on modal entrance
  - Stagger interval is 50ms (0.05s) between fields
  - Form interactions are non-blocking (fully responsive during animation)
  - DevTools animations show correct timing in 25% slow-motion
