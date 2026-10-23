# LifeOS 3.0 — Motion Prototype Write-up

**Status:** Contained prototype for user review  
**Date:** 2026-10-18  
**Branch:** `cursor/lifeos-3-motion-prototype-b1ae`  
**Open:** `http://localhost:3000/motion-lab` (or deployed `/motion-lab`)

## Intent

Ship **interaction quality** (fluidity / tactile feedback) inspired by the *feel* of products like Pane — **without** copying Pane’s look, licensed source, or animation implementations. Prototype first; **stop for review** before any app-wide rollout.

## What shipped

| Deliverable | Location |
|-------------|----------|
| Audit | `docs/lifeos-3-motion-audit.md` |
| Tokens | `lib/motion/tokens.ts`, `lib/motion/reduceMotion.ts` |
| Primitives | `components/motion/*` |
| Lab route | `app/motion-lab/` → **`/motion-lab`** |
| Tests | `__tests__/motionTokens.test.ts` |

### Lab demos (mapped to request)

1. **View switch** — Now ↔ Tasks via `PageTransition`  
2. **Task open/close** — `PanelDialog` (existing modal pattern shape)  
3. **Move task** — drag (`ListReorderHint`) + keyboard ↑↓  
4. **Complete** — `CardLift` settle (opacity/scale)  
5. **Focus** — lab-only `FocusIslandCapsule` using the same session fields as `FloatingFocusDock` (`title`, `remainingSeconds`, `isRunning`, `hasStarted`); single countdown in the lab parent — **no** duplicate toast system

Glass: subtle layered depth on **lab shell / island only**. Atelier Light personality forced on the lab page. `reduceMotion` toggle in the lab + OS preference via `useReduceMotion`.

## Motion choices

### Why tween vs spring

| Role | Choice | Why |
|------|--------|-----|
| Page / content enter | **Tween** ~220ms, `ease.out` | Predictable nav; springs feel “floaty” on full-page remounts |
| Nav segment swap | **Tween** ~160ms, `ease.outSoft` | Shorter than page; tiny X travel reads as tab change, not route change |
| Panel / dialog | **Tween** ~220ms | Overlay timing should match notifications (~0.22s) already in product |
| Card hover / press | **Spring** snappy | Tactile press needs overshoot damp; tween feels plastic |
| Complete settle | **Spring** soft | “Comes to rest” better than a linear fade |
| List reorder layout | **Spring** layout | FM `layout` + spring keeps siblings coherent while dragging |

### Timings (seconds)

- `xs` 0.12 — press  
- `sm` 0.16 — nav swap  
- `md` 0.22 — page / panel (aligns with NotificationCenter)  
- `lg` 0.28 — settle exits  
- stagger step 0.035 — reserved token; lab does not spam remount staggers

### Easings

- `ease.out` = `[0.22, 1, 0.36, 1]` — already used by notification banners  
- `ease.outSoft` = `[0.16, 1, 0.3, 1]` — already used by Settings bento demos  

These are **standard soft-out curves**, not Pane-derived curves.

### reduceMotion

When on (settings flag, `html.reduce-motion`, or `prefers-reduced-motion`):

- Transitions → `duration: 0` (instant), or  
- Enter/exit → **opacity only** (no Y/X/scale travel)  
- List drag disabled; keyboard reorder still works  

### What was rejected

| Idea | Why rejected |
|------|----------------|
| App-wide replace of `page.tsx` view `AnimatePresence` | Out of scope until prototype approval; remount risk needs careful migration |
| Global floating focus island replacing `FloatingFocusDock` | Would fork focus UX; lab island is sandbox-only |
| Spring on every page transition | Feels mushy; harder to sync with CSS chrome |
| Shared layoutId hero morphs across hubs | High remount / state cost; Pane-like continuity deferred |
| Copying Pane animation code / timings blindly | Hard rule — quality reference only |
| Third toast / banner system for lab feedback | Status line text only; reuse existing notice/notification mental model |
| Restyling whole app with glass | Glass limited to lab surfaces |
| Rolling motion into Kanban / production lists | Explicitly deferred |

## How to review

1. `npm run dev` → open **`/motion-lab`**  
2. Toggle **reduceMotion** and re-run the five demos  
3. Confirm Atelier Light look (no personality drift)  
4. Approve / request timing tweaks **before** any production wiring  

## Deferred (until approval)

- App-wide navigation continuity  
- Global focus island  
- Global glass pass  
- Kanban / list production rollout of new motion primitives  
- Migrating every `motion.*` call site in `app/page.tsx` onto tokens  
