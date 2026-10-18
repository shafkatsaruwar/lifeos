/**
 * LifeOS 3.0 Phase 8 — mobile theme aligned to web Atelier personalities.
 *
 * Web source of truth: `app/globals.css` `:root` / `.dark` (+ `[data-personality]`).
 * Expo ≠ CSS — do not pretend `backdrop-filter` / glass ports here.
 *
 * Mapped: bg=canvas, surface=panel, text=ink, muted=muted, border=line, accent=accent.
 * Mobile-only convenience: soft, danger, success, warning, blue, highlight.
 */

/** Same swatches as web Settings → Appearance (spaces / accent picker). */
export const SPACE_COLORS = [
  "#625af6",
  "#4b8bdc",
  "#47a47b",
  "#d99b38",
  "#e48b6b",
  "#cf625a",
  "#8b5cf6",
  "#06b6d4",
  "#0d9488",
  "#65a30d",
  "#db2777",
  "#e11d48",
  "#4338ca",
  "#0ea5e9",
  "#f59e0b",
  "#ea580c",
  "#c026d3",
  "#64748b",
] as const;

/** Defaults aligned with tab tints / web Settings → Workspace colors. */
export const DEFAULT_WORKSPACE_COLORS = {
  life: "#d99b38",
  school: "#8b5cf6",
  work: "#4338ca",
  studyAbroad: "#0d9488",
  treasuryOS: "#47a47b",
  masterOS: "#625af6",
} as const;

export function workspaceColorFor(
  settings: { workspaceColors?: Partial<Record<keyof typeof DEFAULT_WORKSPACE_COLORS, string>>; accent?: string },
  key: keyof typeof DEFAULT_WORKSPACE_COLORS,
): string {
  return settings.workspaceColors?.[key]?.trim() || DEFAULT_WORKSPACE_COLORS[key];
}

/** Atelier Light — matches web `:root` / `[data-personality="atelier-light"]`. */
export const LIGHT = {
  bg: "#F7F9FC",
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#64748B",
  border: "#E2E8F0",
  /** Web Light default CSS accent; user accent still overrides via resolveTheme. */
  accent: "#2563EB",
  danger: "#D95754",
  soft: "#EEF3FA",
  highlight: "#F5E7DF",
  success: "#31926A",
  warning: "#D38232",
  blue: "#3F7ED7",
};

/**
 * Atelier Dark — matches web `.dark` / `[data-personality="atelier-dark"]`
 * (navy/charcoal command center — not inverted Light).
 */
export const DARK = {
  bg: "#0B1020",
  surface: "#141C2E",
  text: "#E8EEF8",
  muted: "#8B9BB4",
  border: "#1E2A3F",
  accent: "#5B8DEF",
  danger: "#E07A8A",
  soft: "#1A2438",
  highlight: "#302724",
  success: "#3DB8A8",
  warning: "#E0A45A",
  blue: "#5B8DEF",
};

export type Theme = typeof LIGHT;

/** Named personality ids shared with web (`settings.personality`). */
export type MobilePersonality = "atelier-light" | "atelier-dark";

export function personalityFromDark(dark: boolean): MobilePersonality {
  return dark ? "atelier-dark" : "atelier-light";
}

/** Apply the user's saved accent (shared with web) onto the base light/dark palette. */
export function resolveTheme(dark: boolean, accent?: string): Theme {
  const base = dark ? DARK : LIGHT;
  const next = accent?.trim();
  if (!next) return base;
  return {
    ...base,
    accent: next,
    soft: dark ? "#1A2438" : `${next}18`,
  };
}

// Web's section-icon accent families (used for dashboard card icon chips, badges, etc).
export const ACCENTS = {
  violet: "#665DF6",
  blue: "#3F7ED7",
  orange: "#D38232",
  green: "#31926A",
};

export const PRIORITY_COLOR: Record<string, string> = {
  High: "#D95754",
  Medium: "#D99B38",
  Low: "#4E8BD7",
};
