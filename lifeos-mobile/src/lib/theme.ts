// Reconciled against app/globals.css design tokens from the web app:
//   :root  { --canvas:#f6f7f9; --panel:#fff;    --ink:#202124; --muted:#777b84; --line:#e8e9ed; --accent:#625af6; }
//   .dark  { --canvas:#111214; --panel:#191a1d; --ink:#f1f1f2; --muted:#92959e; --line:#292b30; --accent:#8b83ff; }
// Mapped onto the mobile theme shape (bg=canvas, surface=panel, text=ink, muted=muted,
// border=line, accent=accent). "soft" and "danger" are mobile-only convenience tokens
// not present as CSS vars on web; soft is derived from the accent tint used for
// .section-icon.violet backgrounds, danger matches the web's error/danger red family.
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
