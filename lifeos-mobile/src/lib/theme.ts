// Reconciled against app/globals.css design tokens from the web app:
//   :root  { --canvas:#f6f7f9; --panel:#fff;    --ink:#202124; --muted:#777b84; --line:#e8e9ed; --accent:#625af6; }
//   .dark  { --canvas:#111214; --panel:#191a1d; --ink:#f1f1f2; --muted:#92959e; --line:#292b30; --accent:#8b83ff; }
// Mapped onto the mobile theme shape (bg=canvas, surface=panel, text=ink, muted=muted,
// border=line, accent=accent). "soft" and "danger" are mobile-only convenience tokens
// not present as CSS vars on web; soft is derived from the accent tint used for
// .section-icon.violet backgrounds, danger matches the web's error/danger red family.

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

export const LIGHT = {
  bg: "#F6F7F9",
  surface: "#FFFFFF",
  text: "#202124",
  muted: "#777B84",
  border: "#E8E9ED",
  accent: "#625AF6",
  danger: "#D95754",
  soft: "#EFEEFF",
  highlight: "#F5E7DF",
  success: "#31926A",
  warning: "#D38232",
  blue: "#3F7ED7",
};

export const DARK = {
  bg: "#111214",
  surface: "#191A1D",
  text: "#F1F1F2",
  muted: "#92959E",
  border: "#292B30",
  accent: "#8B83FF",
  danger: "#FF7770",
  soft: "#26243A",
  highlight: "#302724",
  success: "#63C89A",
  warning: "#E0A45A",
  blue: "#74A8EA",
};

export type Theme = typeof LIGHT;

/** Apply the user's saved accent (shared with web) onto the base light/dark palette. */
export function resolveTheme(dark: boolean, accent?: string): Theme {
  const base = dark ? DARK : LIGHT;
  const next = accent?.trim();
  if (!next) return base;
  return {
    ...base,
    accent: next,
    soft: dark ? "#26243A" : `${next}18`,
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
