# Animation Improvement Plans

This directory contains prioritized, self-contained implementation plans for improving animations and motion in LifeOS per [Emil Kowalski's design engineering philosophy](https://emilkowal.ski/). Each plan is complete with exact file paths, code snippets, target values, and verification steps.

## Overview

**Total plans**: 9  
**High severity**: 3 (performance, accessibility, Study Abroad animations)  
**Medium severity**: 3 (tokens, interaction feedback, button interruptibility)  
**Low severity**: 3 (polish, missed opportunities)  

**Recommended execution**: Sequential (some plans build on earlier work)

**New in this session:**
- **Plan 008** — Study Abroad module modal animations (HIGH priority, user-facing feature)
- **Plan 009** — TaskQueueModal button hover interruptibility (MEDIUM priority, feel improvement)

## Plans at a Glance

| # | Title | Severity | Status | Category | Dependencies |
| --- | --- | --- | --- | --- | --- |
| 001 | Replace `transition: all` with specific properties | HIGH | TODO | Performance | None |
| 002 | Add `prefers-reduced-motion` accessibility support | HIGH | TODO | Accessibility | None (but 003 recommended first) |
| 003 | Define easing and duration tokens | MEDIUM | TODO | Cohesion & tokens | None |
| 004 | Add active-state press feedback to modal header buttons | MEDIUM | TODO | Physicality & interaction | 003 (optional; can use inline values) |
| 005 | Add staggered form field entrance animations | LOW | TODO | Missed opportunities | None |
| 006 | Add backdrop blur entrance animation to modals | LOW | TODO | Missed opportunities | 003 (optional; can use inline values) |
| 007 | Add focus state animations to form fields | LOW | TODO | Missed opportunities | 003 (optional; can use inline values) |
| 008 | Add animations to Study Abroad module modals | HIGH | TODO | Physicality & interaction | None (Framer Motion ready to use) |
| 009 | Refactor TaskQueueModal button hover to CSS | MEDIUM | TODO | Interruptibility & performance | None (standalone) |

## Execution Order & Rationale

### Phase 1: Foundation (must complete first)

**Plan 001 — Replace `transition: all`** (HIGH, ~30 minutes)
- Fix the biggest performance footgun: unbounded property animation across 30+ instances
- Must complete before other CSS changes to avoid conflicts
- No dependencies; can start immediately

### Phase 2: Accessibility & Tokens (high impact, sequential)

**Plan 003 — Define easing/duration tokens** (MEDIUM, ~20 minutes)
- Create reusable token system for all future animations
- Makes subsequent plans shorter and more consistent
- Recommended before 002, 004, 006, 007 (though not strictly required)

**Plan 002 — Add `prefers-reduced-motion` support** (HIGH, ~25 minutes)
- Ensure motion sickness accessibility once animations are in place
- Works with any easing setup (plan 001 or after plan 003)
- Recommended after plans 001 or 003

### Phase 3: Interaction & Polish (low priority)

**Plan 004 — Active-state press feedback** (MEDIUM, ~10 minutes)
- Add tactile button press feedback
- Depends on plan 003 for tokens (or use inline cubic-bezier)
- Self-contained; can execute independently

**Plan 005 — Staggered form field reveals** (LOW, ~30 minutes)
- Add visual hierarchy to form modals
- Framer Motion only; no CSS tokens needed
- Independent; can execute anytime

**Plan 006 — Backdrop blur animation** (LOW, ~15 minutes)
- Polished modal entrance effect
- Uses plan 003 tokens (or inline values)
- Independent; can execute anytime

**Plan 007 — Focus state animations** (LOW, ~20 minutes)
- Form field focus feedback
- Uses plan 003 tokens (or inline values)
- Independent; can execute anytime

## Recommended Execution Path

For maximum impact with minimum complexity, execute in this order:

1. **001** — Replace transition:all (~30 min) — fixes performance immediately
2. **003** — Define tokens (~20 min) — sets up system for consistency
3. **002** — Add prefers-reduced-motion (~25 min) — ensures accessibility
4. **008** — Study Abroad modal animations (~45 min) — high-visibility feature area
5. **009** — TaskQueueModal button hover refactor (~15 min) — improves interruptibility
6. **004** — Active press feedback (~10 min) — adds interaction polish
7. **005** — Staggered reveals (~30 min) — improves form UX
8. **006** — Backdrop blur (~15 min) — modal polish
9. **007** — Focus animations (~20 min) — final polish

**Total estimated time: ~3.5 hours (including new plans 008 & 009)**

Alternative (fast path, HIGH severity only):
- 001, 003, 002, 008 (~120 minutes) — covers performance, accessibility, + Study Abroad feature animations

## Plan Dependencies & Cross-References

- **001** (transition:all) → independent, must run first
- **002** (prefers-reduced-motion) → works with any easing; recommends 001 or 003 done first
- **003** (tokens) → independent; enables cleaner code in 002, 004, 006, 007
- **004** (press feedback) → uses `var(--duration-fast)` and `var(--ease-out)` from 003 (or inline values)
- **005** (stagger reveals) → independent; Framer Motion only
- **006** (backdrop blur) → uses `var(--modal-blur)` token and duration from 003 (or inline values)
- **007** (focus animations) → uses `var(--ease-out)` from 003 (or inline values)

## Status Legend

- **TODO** — Not started
- **IN PROGRESS** — Being implemented
- **DONE** — Completed and verified

## Notes

Each plan is fully self-contained. The executor (any model or human) has:
- Exact file paths for every edit
- Current code snippets (verbatim from commit e95a517)
- Target code with all values inlined (never "use the curve discussed above")
- Verification steps (mechanical + feel checks in DevTools/slow motion)
- No references to other plans (only optional dependency notes for human reading)

Plans drawn from:
- [Emil Kowalski's Animation Audit Framework](https://emilkowal.ski/) — 8 audit categories
- [AUDIT.md](AUDIT.md) — precise standards for easing, duration, physics, performance
- User request: "improve my LifeOS website with this skill" (all 7 plans address findings from the animation audit)

## Updating This README

After each plan is executed:
1. Change status from TODO → IN PROGRESS → DONE
2. Update the commit hash if plans are chained
3. Report any drift (code at file:line doesn't match plan expectation) before proceeding

---

_Generated from improve-animations audit; commit e95a517_
