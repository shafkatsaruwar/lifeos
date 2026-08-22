export type CourseStatus = "draft" | "active" | "complete" | "paused";
export type LessonStatus = "planned" | "ready" | "in_progress" | "complete";
export type AssignmentType = "homework" | "practice" | "worksheet" | "quiz" | "test" | "project" | "diagnostic";
export type AssignmentStatus = "assigned" | "in_progress" | "submitted" | "graded";
export type MasteryState = "not_started" | "learning" | "practicing" | "proficient" | "mastered" | "needs_review";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "multiple_choice" | "short_answer" | "numeric" | "true_false" | "open_response";
export type LessonSectionType = "warm_up" | "teach" | "examples" | "guided_practice" | "independent_practice" | "exit_ticket" | "homework";
export type MistakeType =
  | "concept_not_understood"
  | "misread_question"
  | "calculation_error"
  | "careless_mistake"
  | "vocabulary_issue"
  | "time_pressure"
  | "forgot_rule"
  | "trap_answer"
  | "other";
export type AssessmentType = "diagnostic" | "quiz" | "test" | "practice";

export type Student = {
  id: string;
  name: string;
  gradeLevel?: string;
  notes?: string;
  createdAt: string;
};

export type Course = {
  id: string;
  name: string;
  description: string;
  status: CourseStatus;
  startDate: string;
  targetDate?: string;
};

export type Enrollment = { studentId: string; courseId: string };

export type Unit = {
  id: string;
  courseId: string;
  title: string;
  order: number;
};

export type Lesson = {
  id: string;
  unitId: string;
  studentId: string;
  title: string;
  objective: string;
  date: string;
  duration: number;
  status: LessonStatus;
  notes?: string;
  skillIds: string[];
};

export type LessonSection = {
  id: string;
  lessonId: string;
  type: LessonSectionType;
  title: string;
  content: string;
  order: number;
  complete?: boolean;
};

export type Skill = {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  domain?: string;
};

export type StudentSkill = {
  studentId: string;
  skillId: string;
  masteryState: MasteryState;
  accuracy: number;
  attempts: number;
  recentAccuracy: number;
  lastPracticed?: string;
};

export type Question = {
  id: string;
  text: string;
  answer: string;
  explanation?: string;
  difficulty: Difficulty;
  questionType: QuestionType;
  skillId?: string;
  courseId?: string;
  subject?: string;
  source?: string;
  choices?: string[];
  notes?: string;
};

export type Assignment = {
  id: string;
  courseId: string;
  studentId: string;
  lessonId?: string;
  title: string;
  type: AssignmentType;
  assignedDate: string;
  dueDate?: string;
  status: AssignmentStatus;
  totalPoints: number;
  score?: number;
};

export type AssignmentQuestion = {
  assignmentId: string;
  questionId: string;
  order: number;
  points?: number;
};

export type QuestionResult = {
  id: string;
  studentId: string;
  questionId: string;
  assignmentId?: string;
  correct: boolean;
  response?: string;
  mistakeType?: MistakeType;
  pointsEarned?: number;
};

export type Assessment = {
  id: string;
  courseId: string;
  studentId: string;
  type: AssessmentType;
  title: string;
  date: string;
  score?: number;
  total?: number;
  sections?: { label: string; score: number; total?: number }[];
  skillScores?: { skillId: string; accuracy: number }[];
};

export type TeacherNote = {
  id: string;
  text: string;
  createdAt: string;
  studentId?: string;
  courseId?: string;
  lessonId?: string;
  skillId?: string;
};

export type MasterOSState = {
  students: Student[];
  courses: Course[];
  enrollments: Enrollment[];
  units: Unit[];
  lessons: Lesson[];
  lessonSections: LessonSection[];
  skills: Skill[];
  studentSkills: StudentSkill[];
  questions: Question[];
  assignments: Assignment[];
  assignmentQuestions: AssignmentQuestion[];
  questionResults: QuestionResult[];
  assessments: Assessment[];
  teacherNotes: TeacherNote[];
};
