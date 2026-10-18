# LifeOS 3.0 — Motion Audit

**Status:** Audit for interaction-choreography prototype  
**Date:** 2026-10-18  
**Branch:** `cursor/lifeos-3-motion-prototype-b1ae`  
**Scope:** Existing framer-motion + CSS transitions in the Next.js web app (excludes `docs/design-archive/**`, mobile unless noted)

## Summary

Motion today is **ad hoc**: many one-off `motion.*` props in `app/page.tsx`, a few shared-ish easings in notifications/settings bento, and CSS `transition` / `@keyframes` sprinkled through `globals.css`. There is **no shared token module**. `settings.reduceMotion` toggles `html.reduce-motion` (near-instant CSS) and some components take a `reduceMotion` prop — but most framer-motion calls **ignore** that flag.

---

## A. Framer Motion usage (active app code)

| Surface | File | Pattern | Durations / notes |
|---------|------|---------|-------------------|
| View swap | `app/page.tsx` | `AnimatePresence mode="wait"` + `motion.div key={view}` | `opacity` + `y: 5→0` / exit `y: -4`, **0.18s** |
| Mobile scrim | `app/page.tsx` | `AnimatePresence` opacity | default FM timing |
| Toast / notice | `app/page.tsx` | `motion.div` enter/exit `y: 10` | default |
| Modals (capture, command, reviews, class, ambient, break, welcome…) | `app/page.tsx` | Layer opacity + panel `scale: .98, y: 8` | mostly default; exits vary |
| Project / space / class cards | `app/page.tsx` | Enter `opacity, y: 8` + **stagger delay** `.04` / `.035` | no shared spring |
| Task workspace | `app/page.tsx` | `motion.div` fade in | opacity only |
| Floating focus dock | `app/page.tsx` | enter/exit `y: 18`, **0.2s** | separate from view swap |
| Focus mode + break overlay | `app/page.tsx` | opacity / `scale: .96, y: 12` | nested `AnimatePresence` |
| Notification banners / center | `app/components/NotificationCenter.tsx` | enter `y: -12, scale: .96`, ease `[0.22,1,0.36,1]`, **0.22s**; panel **0.18s** | closest thing to a “system” easing |
| Settings bento demos | `components/ui/bento-grid-01.tsx` | springs + long tweens (0.5–0.8s), infinite pulse | demo-only; ease `[0.16,1,0.3,1]` |
| NL task modal | `app/components/NLTaskCreationModal.tsx` | FM presence | local |
| Marketing-ish | `components/Briefing.tsx`, `components/Details.tsx` | 0.2–0.3s fades / delays | not core product shell |

**Dependency:** `framer-motion@^11.15.0` in root `package.json`.

---

## B. CSS transitions / keyframes

| Area | Typical values | Notes |
|------|----------------|-------|
| Task/project rows, table rows | `background .2s`, check `all .15s`, `:active scale(.96)` | Hover feedback; competes with FM card enters |
| Class / space cards | `transform/border/box-shadow .18s` | Parallel to FM enter (double motion risk on first paint) |
| Sidebar mobile | `transform .2s` | Remount-safe |
| Toggles | `transform .18s` | Fine |
| Focus studio / timer ring | `.18–.28s` + glow | Immersive focus; some `prefers-reduced-motion` overrides |
| Activity rings | `stroke-dasharray .45s` | Honors `reduceMotion` via `.no-motion` |
| Loading spinner | `@keyframes spin .8s` | Hit by `.reduce-motion` nuke |
| Copilot bounce | `@keyframes` 1s | Has `prefers-reduced-motion` kill |
| Glass chrome | `backdrop-filter` on sidebar/topbar | Phase 8 `reduce-transparency` strips blur |

**Global reduce-motion (Phase 8):**

```css
.reduce-motion *, … {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}
```

Also older rule `.reduce-motion * { transition:none!important; animation:none!important }` still present earlier in the file — **two competing CSS strategies**.

`lib/accessibility.ts` sets `--motion-safe` to `0s` / `0.3s` from `prefers-reduced-motion`, but **product UI rarely reads that variable**.

---

## C. Inconsistencies / risks

1. **Competing durations:** view swap **0.18s**, dock **0.2s**, notifications **0.22s**, bento demos **0.5–0.8s**, CSS hovers **0.15–0.2s**, rings **0.45s**. No canonical scale.
2. **Competing easings:** default FM ease vs `[0.22,1,0.36,1]` vs `[0.16,1,0.3,1]` vs CSS `ease`.
3. **Remount risk:** entire page content keyed on `view` inside `AnimatePresence mode="wait"` — correct for fade, but **destroys subtree state** on every nav (focus dock is outside, good; in-page scroll/selection resets).
4. **Double motion:** CSS `transform` hover on cards + FM enter `y` + sometimes both fire.
5. **reduceMotion gaps:** most `motion.*` in `page.tsx` never read `settings.reduceMotion`; only CSS hammer + selective props (rings, Settings bento, Appearance Studio).
6. **Exit asymmetry:** some modals animate exit; ambient wrap modal uses `exit={{ opacity: 1 }}` (likely bug / no fade-out).
7. **Stagger without budget:** project/space/class grids stagger forever on remount when revisiting Spaces.
8. **Notification timers vs toasts:** banners own a 5s interval; page `notice` toast is separate — fine, but a future motion system must **not** add a third toast engine.

---

## D. What is reusable for a unified system

| Asset | Reuse |
|-------|--------|
| `settings.reduceMotion` + `html.reduce-motion` | Keep as the single settings switch; wire FM tokens to it |
| Notification easing `[0.22, 1, 0.36, 1]` | Adopt as **ease.out** token (already feel-aligned) |
| Bento soft ease `[0.16, 1, 0.3, 1]` | Adopt as **ease.outSoft** for nav swaps |
| View swap pattern (`AnimatePresence` + key) | Formalize as `PageTransition` primitive |
| Modal layer + panel scale/Y | Formalize as `PanelDialog` |
| Floating focus dock session fields | Reuse shape for lab focus island — **no second timer** |
| Phase 8 transparency / focus-visible | Respect; glass only where opted in |
| Atelier Light CSS variables | Motion must not restyle brand colors |

**Not reusable as-is:** one-off delays, infinite bento pulses, archive snapshots under `docs/design-archive/**` (do not modify).

---

## E. Prototype direction (this PR)

- New `lib/motion/` tokens + `components/motion/` primitives  
- Contained route `/motion-lab` only  
- **Out of scope until approval:** app-wide nav continuity, global focus island, global glass, Kanban/list production rollout

See also: `docs/lifeos-3-motion-prototype.md`
