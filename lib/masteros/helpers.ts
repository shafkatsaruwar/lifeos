export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDate(value?: string) {
  if (!value) return "No date";
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatLongDate(value?: string) {
  if (!value) return "";
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function percent(score?: number, total?: number) {
  if (score == null || !total) return null;
  return Math.round((score / total) * 100);
}

export const SECTION_LABEL: Record<string, string> = {
  warm_up: "Warm-Up",
  teach: "Teach",
  examples: "Examples",
  guided_practice: "Guided Practice",
  independent_practice: "Independent Practice",
  exit_ticket: "Exit Ticket",
  homework: "Homework",
};

export const ASSIGNMENT_LABEL: Record<string, string> = {
  homework: "Homework",
  practice: "Practice set",
  worksheet: "Worksheet",
  quiz: "Quiz",
  test: "Test",
  project: "Project",
  diagnostic: "Diagnostic",
};

export const MISTAKE_LABEL: Record<string, string> = {
  concept_not_understood: "Concept not understood",
  misread_question: "Misread question",
  calculation_error: "Calculation error",
  careless_mistake: "Careless mistake",
  vocabulary_issue: "Vocabulary issue",
  time_pressure: "Time pressure",
  forgot_rule: "Forgot rule/formula",
  trap_answer: "Fell for trap answer",
  other: "Other",
};

export const QUESTION_TYPE_LABEL: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  short_answer: "Short Answer",
  numeric: "Numeric",
  true_false: "True/False",
  open_response: "Open Response",
};

export const ASSIGNMENT_STATUS_LABEL: Record<string, string> = {
  assigned: "Assigned",
  in_progress: "In Progress",
  submitted: "Submitted",
  graded: "Graded",
};

export const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export function assignmentTypeLabel(type?: string) {
  return (type && ASSIGNMENT_LABEL[type]) || type || "";
}

export function assignmentStatusLabel(status?: string) {
  return (status && ASSIGNMENT_STATUS_LABEL[status]) || status?.replaceAll("_", " ") || "";
}

export function questionTypeLabel(type?: string) {
  return (type && QUESTION_TYPE_LABEL[type]) || type || "";
}

export function difficultyLabel(value?: string) {
  return (value && DIFFICULTY_LABEL[value]) || value || "";
}

export function scorePercent(score?: number, total?: number) {
  const value = percent(score, total);
  return value == null ? "—" : `${value}%`;
}

export function questionPoints(link?: { points?: number } | null) {
  const value = link?.points;
  return value == null || value < 0 ? 1 : value;
}

export function roundMark(value: number) {
  return Math.round(value * 100) / 100;
}

export function earnedPoints(
  result: { correct?: boolean; pointsEarned?: number } | undefined,
  max = 1,
) {
  if (!result) return null;
  if (result.pointsEarned != null) return roundMark(Math.min(max, Math.max(0, result.pointsEarned)));
  return result.correct ? max : 0;
}

export function tallyAssignmentMarks(
  links: { assignmentId: string; questionId: string; points?: number }[],
  results: { assignmentId?: string; questionId: string; correct: boolean; pointsEarned?: number }[],
  assignmentId: string,
) {
  const mine = links.filter((item) => item.assignmentId === assignmentId);
  const totalPoints = roundMark(mine.reduce((sum, item) => sum + questionPoints(item), 0));
  const graded = mine.map((link) =>
    results.find((item) => item.assignmentId === assignmentId && item.questionId === link.questionId),
  );
  const gradedCount = graded.filter(Boolean).length;
  const score = roundMark(
    mine.reduce((sum, link, index) => sum + (earnedPoints(graded[index], questionPoints(link)) ?? 0), 0),
  );
  return {
    score,
    totalPoints: totalPoints || mine.length,
    gradedCount,
    complete: mine.length > 0 && gradedCount >= mine.length,
  };
}
