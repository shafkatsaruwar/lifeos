/**
 * Future AI extension points. Do not call from v1 UI.
 * Later: generate lesson plans, questions, explanations, error analysis,
 * next-lesson recommendations, quizzes, and personalized homework.
 */
export type AILessonDraft = {
  title: string;
  objective: string;
  skillIds: string[];
  sections: { type: string; title: string; content: string }[];
};

export type AIQuestionDraft = {
  text: string;
  answer: string;
  explanation?: string;
  skillId?: string;
  difficulty?: string;
};

export async function generateLessonPlan(input: { skillIds: string[]; studentId: string }): Promise<AILessonDraft> {
  void input;
  throw new Error("AI lesson generation is not enabled in v1.");
}

export async function generatePracticeQuestions(input: { skillId: string; count: number }): Promise<AIQuestionDraft[]> {
  void input;
  throw new Error("AI question generation is not enabled in v1.");
}

export async function analyzeErrorPatterns(studentId: string): Promise<{ insight: string }> {
  void studentId;
  throw new Error("AI error analysis is not enabled in v1.");
}
