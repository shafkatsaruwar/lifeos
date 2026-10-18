/**
 * LifeOS 3.0 Phase 7 — FocusMode appearance (same timer engine).
 * Immersive is a presentation layer only — not Focus Enforcer, not a second timer.
 */

export type FocusAppearance = "standard" | "immersive";

export const DEFAULT_FOCUS_APPEARANCE: FocusAppearance = "standard";

export function isFocusAppearance(value: unknown): value is FocusAppearance {
  return value === "standard" || value === "immersive";
}

export function normalizeFocusAppearance(value: unknown): FocusAppearance {
  return isFocusAppearance(value) ? value : DEFAULT_FOCUS_APPEARANCE;
}

export const FOCUS_APPEARANCE_LABELS: Record<FocusAppearance, string> = {
  standard: "Standard",
  immersive: "Immersive",
};

/** Copy for Settings — honest about what FocusMode can and cannot do. */
export const FOCUS_IMMERSIVE_SETTINGS_NOTE =
  "Immersive simplifies the Focus screen (task, timer, next step). It does not silence your phone or OS notifications — use system Do Not Disturb if you need that. Focus Enforcer on mobile remains a separate product.";
