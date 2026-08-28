import { DIFFICULTY_LABEL } from "./helpers";
import type { MasterOSState, Question } from "./types";

export const CATEGORY_SPLIT_THRESHOLD = 8;

export function resolveQuestionCategory(
  question: Pick<Question, "category" | "skillId" | "courseId" | "source" | "difficulty">,
  state: MasterOSState,
): string {
  if (question.category?.trim()) return question.category.trim();
  if (question.skillId) {
    const skill = state.skills.find((item) => item.id === question.skillId);
    if (skill) return skill.domain ? `${skill.domain}: ${skill.name}` : skill.name;
  }
  if (question.courseId) {
    const course = state.courses.find((item) => item.id === question.courseId);
    if (course) return course.name;
  }
  if (question.source === "custom") return "Custom questions";
  return "General";
}

export type QuestionCategoryGroup = {
  key: string;
  label: string;
  questions: Question[];
};

function subdivideLargeGroup(label: string, items: Question[], state: MasterOSState): QuestionCategoryGroup[] {
  const sub = new Map<string, Question[]>();
  for (const question of items) {
    const skill = state.skills.find((item) => item.id === question.skillId);
    const tail = skill?.name ?? DIFFICULTY_LABEL[question.difficulty] ?? "Other";
    const subLabel = `${label} · ${tail}`;
    const list = sub.get(subLabel) ?? [];
    list.push(question);
    sub.set(subLabel, list);
  }
  return [...sub.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([subLabel, questions]) => ({ key: subLabel, label: subLabel, questions }));
}

export function groupQuestionsForBank(questions: Question[], state: MasterOSState): QuestionCategoryGroup[] {
  const bucket = new Map<string, Question[]>();
  for (const question of questions) {
    const label = resolveQuestionCategory(question, state);
    const list = bucket.get(label) ?? [];
    list.push({ ...question, category: question.category ?? label });
    bucket.set(label, list);
  }

  const groups: QuestionCategoryGroup[] = [];
  for (const [label, items] of [...bucket.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (items.length >= CATEGORY_SPLIT_THRESHOLD) {
      groups.push(...subdivideLargeGroup(label, items, state));
    } else {
      groups.push({ key: label, label, questions: items });
    }
  }
  return groups;
}

export function prepareQuestionForBank(
  input: Omit<Question, "id">,
  state: MasterOSState,
): Omit<Question, "id"> {
  const category = resolveQuestionCategory(input, state);
  return { ...input, category };
}
