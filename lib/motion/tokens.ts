/**
 * LifeOS motion tokens — shared durations, easings, and springs.
 * Prototype library only; not wired app-wide yet.
 *
 * Prefer transform/opacity. Use springs for tactile lift/press/settle;
 * use short tweens for page/nav fades where predictability matters.
 */

import type { Transition } from "framer-motion";

/** Duration in seconds (framer-motion) and ms (CSS / timers). */
export const duration = {
  instant: 0,
  /** Micro feedback (press) */
  xs: 0.12,
  /** Nav / content swap fade */
  sm: 0.16,
  /** Page / panel enter */
  md: 0.22,
  /** Exit / settle */
  lg: 0.28,
  /** Stagger step between list items */
  stagger: 0.035,
} as const;

export const durationMs = {
  instant: 0,
  xs: 120,
  sm: 160,
  md: 220,
  lg: 280,
  stagger: 35,
} as const;

/** Cubic-bezier easings — not Pane-derived; standard soft-out curves. */
export const ease = {
  /** Soft exit for overlays / fades */
  out: [0.22, 1, 0.36, 1] as const,
  /** Slightly snappier content swap */
  outSoft: [0.16, 1, 0.3, 1] as const,
  /** Symmetric for reversible toggles */
  inOut: [0.4, 0, 0.2, 1] as const,
} as const;

/** Spring presets — used sparingly for tactile affordances. */
export const spring = {
  /** Card lift / hover settle */
  soft: { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.85 },
  /** Press / complete snap-back */
  snappy: { type: "spring" as const, stiffness: 520, damping: 34, mass: 0.7 },
  /** List reorder layout */
  layout: { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.9 },
} as const;

export type MotionRole =
  | "page"
  | "panel"
  | "card"
  | "press"
  | "list"
  | "nav"
  | "settle"
  | "fade";

/** Tween transition builders (seconds). */
export function tween(
  role: MotionRole,
  reduceMotion: boolean,
): Transition {
  if (reduceMotion) {
    return { duration: duration.instant };
  }
  switch (role) {
    case "page":
      return { duration: duration.md, ease: ease.out };
    case "panel":
      return { duration: duration.md, ease: ease.out };
    case "nav":
      return { duration: duration.sm, ease: ease.outSoft };
    case "fade":
      return { duration: duration.sm, ease: ease.out };
    case "settle":
      return { duration: duration.lg, ease: ease.out };
    case "press":
      return { duration: duration.xs, ease: ease.inOut };
    case "card":
    case "list":
    default:
      return { duration: duration.md, ease: ease.out };
  }
}

/** Spring or tween depending on role + reduceMotion. */
export function transitionFor(
  role: MotionRole,
  reduceMotion: boolean,
): Transition {
  if (reduceMotion) {
    return { duration: duration.instant };
  }
  if (role === "card" || role === "press") return spring.snappy;
  if (role === "list") return spring.layout;
  if (role === "settle") return spring.soft;
  return tween(role, false);
}

/** CSS custom-property map for non-framer surfaces in the lab. */
export const cssVarDefaults: Record<string, string> = {
  "--motion-xs": `${durationMs.xs}ms`,
  "--motion-sm": `${durationMs.sm}ms`,
  "--motion-md": `${durationMs.md}ms`,
  "--motion-lg": `${durationMs.lg}ms`,
  "--motion-ease-out": "cubic-bezier(0.22, 1, 0.36, 1)",
  "--motion-ease-soft": "cubic-bezier(0.16, 1, 0.3, 1)",
};
