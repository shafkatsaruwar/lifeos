import type { MasteryState, StudentSkill } from "./types";

/** Modular mastery rules — swap later without touching UI. */
export function computeMasteryState(accuracy: number, attempts: number, flaggedReview = false): MasteryState {
  if (flaggedReview) return "needs_review";
  if (attempts <= 0) return "not_started";
  if (accuracy < 50) return "learning";
  if (accuracy < 70) return "practicing";
  if (accuracy < 85) return "proficient";
  if (attempts >= 8 && accuracy >= 85) return "mastered";
  return "proficient";
}

export function applyQuestionResult(current: StudentSkill, correct: boolean, practicedAt: string): StudentSkill {
  const attempts = current.attempts + 1;
  const hits = Math.round((current.accuracy / 100) * current.attempts) + (correct ? 1 : 0);
  const accuracy = Math.round((hits / attempts) * 100);
  const recentHits = Math.round((current.recentAccuracy / 100) * Math.min(current.attempts, 5));
  const recentWindow = Math.min(attempts, 5);
  const recentAccuracy = Math.round(((recentHits + (correct ? 1 : 0)) / recentWindow) * 100);
  return {
    ...current,
    attempts,
    accuracy,
    recentAccuracy,
    lastPracticed: practicedAt,
    masteryState: computeMasteryState(accuracy, attempts, current.masteryState === "needs_review" && !correct),
  };
}

export function masteryLabel(state: MasteryState) {
  return {
    not_started: "Not started",
    learning: "Learning",
    practicing: "Practicing",
    proficient: "Proficient",
    mastered: "Mastered",
    needs_review: "Needs review",
  }[state];
}

export function masteryTone(state: MasteryState) {
  return {
    not_started: "#8a8e98",
    learning: "#d99b38",
    practicing: "#4b8bdc",
    proficient: "#47a47b",
    mastered: "#625af6",
    needs_review: "#cf625a",
  }[state];
}

/** Extension point for future AI: recommend next lesson from weak skills. */
export function recommendNextSkill(skills: StudentSkill[]) {
  const attention = skills
    .filter((item) => item.masteryState === "needs_review" || item.masteryState === "learning" || (item.accuracy > 0 && item.accuracy < 70))
    .sort((a, b) => a.accuracy - b.accuracy);
  return attention[0] ?? null;
}
