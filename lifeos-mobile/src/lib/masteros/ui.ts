import type { Theme } from "../theme";

export const mos = {
  sidebarWidth: 168,
  teachRailWidth: 120,
  teachSideWidth: 220,
  radius: 14,
  chipRadius: 999,
};

export function masteryLabel(state: string) {
  if (state === "needs_review") return "Needs review";
  if (state === "learning") return "Learning";
  if (state === "practicing") return "Practicing";
  if (state === "proficient") return "Proficient";
  if (state === "mastered") return "Mastered";
  return "Not started";
}

export function masteryTone(theme: Theme, state: string) {
  if (state === "needs_review") return theme.danger;
  if (state === "learning") return theme.warning;
  if (state === "mastered" || state === "proficient") return theme.success;
  return theme.muted;
}
