import type { MasterOSState } from "./types";
import { computeMasteryState } from "./mastery";

const S = {
  wafia: "stu-wafia",
  omar: "stu-omar",
  layla: "stu-layla",
  sat: "crs-sat-prep",
  satGroup: "cls-sat-saturday",
};

const units = [
  "Diagnostic",
  "Algebra Foundations",
  "Advanced Math",
  "Problem Solving & Data Analysis",
  "Geometry",
  "Reading Comprehension",
  "Grammar & Standard English",
  "Rhetorical Skills",
  "Mixed Practice",
  "Full Practice Tests",
].map((title, order) => ({
  id: `unit-${order + 1}`,
  courseId: S.sat,
  title,
  order: order + 1,
}));

const mathSkills = [
  ["sk-linear", "Linear equations", "Solve and interpret linear equations in one or two variables."],
  ["sk-systems", "Systems of equations", "Solve systems algebraically and by substitution."],
  ["sk-ineq", "Inequalities", "Graph and solve linear inequalities."],
  ["sk-percent", "Percentages", "Percent change, setup, and word problems."],
  ["sk-ratio", "Ratios and rates", "Proportional reasoning and unit rates."],
  ["sk-fn", "Functions", "Interpret function notation and graphs."],
  ["sk-quad", "Quadratics", "Factor, complete the square, and interpret graphs."],
  ["sk-exp", "Exponents", "Exponent rules and radical equivalents."],
  ["sk-geo", "Geometry", "Angles, triangles, circles, and area."],
  ["sk-data", "Data analysis", "Tables, scatterplots, and statistics."],
] as const;

const rwSkills = [
  ["sk-main", "Main idea", "Identify the central claim or purpose of a passage."],
  ["sk-evidence", "Evidence", "Support an answer with the best textual evidence."],
  ["sk-vocab", "Vocabulary in context", "Determine meaning from surrounding text."],
  ["sk-bounds", "Sentence boundaries", "Fix run-ons, fragments, and comma splices."],
  ["sk-grammar", "Grammar", "Agreement, tense, and standard conventions."],
  ["sk-trans", "Transitions", "Choose the most logical connecting word or phrase."],
  ["sk-rhetor", "Rhetorical synthesis", "Combine ideas clearly and concisely."],
  ["sk-charts", "Charts and data", "Read graphs and tables in reading passages."],
] as const;

const skills = [...mathSkills, ...rwSkills].map(([id, name, description]) => ({
  id,
  courseId: S.sat,
  name,
  description,
  domain: mathSkills.some((item) => item[0] === id) ? "Math" : "Reading/Writing",
}));

function skillRow(skillId: string, accuracy: number, attempts: number, lastPracticed: string, review = false) {
  return {
    studentId: S.wafia,
    skillId,
    accuracy,
    attempts,
    recentAccuracy: Math.min(100, accuracy + 6),
    lastPracticed,
    masteryState: computeMasteryState(accuracy, attempts, review),
  };
}

export function createSeedState(): MasterOSState {
  return {
    students: [
      { id: S.wafia, name: "Wafia", gradeLevel: "11", notes: "Thoughtful, careful with reading. Algebra setup is the current bottleneck.", createdAt: "2026-07-01T12:00:00.000Z" },
      { id: S.omar, name: "Omar", gradeLevel: "11", notes: "Strong mental math; needs reading pacing.", createdAt: "2026-07-15T12:00:00.000Z" },
      { id: S.layla, name: "Layla", gradeLevel: "10", notes: "Motivated in group settings; shy one-on-one.", createdAt: "2026-08-01T12:00:00.000Z" },
    ],
    courses: [{
      id: S.sat,
      name: "SAT Prep",
      description: "A reusable SAT prep course: diagnostic first, then algebra, data, geometry, reading, and grammar — with mixed practice and full tests.",
      status: "active",
      startDate: "2026-08-04",
      targetDate: "2026-12-05",
    }],
    classes: [{
      id: S.satGroup,
      name: "SAT Saturday Group",
      courseId: S.sat,
      studentIds: [S.wafia, S.omar, S.layla],
      schedule: "Sat 10:00",
      notes: "Small group · percent and algebra focus",
      createdAt: "2026-08-04T12:00:00.000Z",
    }],
    enrollments: [
      { studentId: S.wafia, courseId: S.sat },
      { studentId: S.omar, courseId: S.sat },
      { studentId: S.layla, courseId: S.sat },
    ],
    units,
    lessons: [
      {
        id: "les-diag-review",
        unitId: "unit-1",
        studentId: S.wafia,
        title: "Diagnostic debrief",
        objective: "Walk through Wafia’s diagnostic by skill and pick the first two targets.",
        date: "2026-08-11",
        duration: 75,
        status: "complete",
        notes: "Percent setup and vocab-in-context were the clear gaps. Linear equations were stronger than she expected.",
        skillIds: ["sk-percent", "sk-vocab", "sk-linear"],
      },
      {
        id: "les-linear",
        unitId: "unit-2",
        studentId: S.wafia,
        title: "Linear equations, clean setup",
        objective: "Translate word problems into linear equations and solve without dropping signs.",
        date: "2026-08-18",
        duration: 90,
        status: "complete",
        notes: "Understands equations but forgets negative signs when distributing.",
        skillIds: ["sk-linear", "sk-systems"],
      },
      {
        id: "les-percent",
        unitId: "unit-4",
        studentId: S.wafia,
        title: "Percent problems: find the whole",
        objective: "Set up percent-of, percent-change, and reverse-percent questions with a consistent diagram.",
        date: "2026-08-19",
        duration: 90,
        status: "ready",
        notes: "",
        skillIds: ["sk-percent", "sk-ratio"],
      },
      {
        id: "les-vocab",
        unitId: "unit-6",
        studentId: S.wafia,
        title: "Vocabulary in context",
        objective: "Use nearby contrast and examples to choose the best meaning — not the first synonym.",
        date: "2026-08-21",
        duration: 75,
        status: "planned",
        skillIds: ["sk-vocab", "sk-main"],
      },
    ],
    lessonSections: [
      ...sections("les-diag-review", [
        ["warm_up", "Warm-Up", "Two easy linear questions to settle in. No timer."],
        ["teach", "Teach", "Show the diagnostic heatmap. Math 610 / RW 640 / Total 1250. Skill bars underneath — not just one score."],
        ["examples", "Examples", "Replay one percent miss and one vocab miss. Name the mistake type out loud."],
        ["guided_practice", "Guided Practice", "Together: rewrite two percent setups using part/whole."],
        ["independent_practice", "Independent Practice", "Wafia classifies 4 missed items: concept vs careless vs vocab."],
        ["exit_ticket", "Exit Ticket", "1) What is your weakest math skill today? 2) What is the next lesson for?"],
        ["homework", "Homework", "Finish classifying remaining diagnostic misses. 15 minutes max."],
      ]),
      ...sections("les-linear", [
        ["warm_up", "Warm-Up", "Solve: 3(x − 4) = 2x + 5. Watch the sign when distributing."],
        ["teach", "Teach", "Word → equation checklist: unknown, operations, equals. Keep negatives attached to the term they belong to."],
        ["examples", "Examples", "A number decreased by 8 is four times its opposite. Write and solve."],
        ["guided_practice", "Guided Practice", "Two SAT-style linear items. Teacher writes the skeleton; student fills numbers."],
        ["independent_practice", "Independent Practice", "Three items, silent. Circle any sign you almost dropped."],
        ["exit_ticket", "Exit Ticket", "Solve 2(3 − x) = 5x − 9. Then write one sentence about where signs go."],
        ["homework", "Homework", "Linear practice set (8 questions). Tag any miss as sign / setup / arithmetic."],
      ]),
      ...sections("les-percent", [
        ["warm_up", "Warm-Up", "What is 18% of 250? What percent of 40 is 14?"],
        ["teach", "Teach", "Always write: part = percent × whole. For reverse percent, divide. For change: difference / original."],
        ["examples", "Examples", "A jacket is marked down 30% to $56. What was the original price?"],
        ["guided_practice", "Guided Practice", "Draw the bar model together on the whiteboard. Two reverse-percent items."],
        ["independent_practice", "Independent Practice", "Four mixed percent items. No calculator until the setup is written."],
        ["exit_ticket", "Exit Ticket", "A price rises from 80 to 100. Percent increase? Then: 100 is 125% of what?"],
        ["homework", "Homework", "Percent worksheet. Bring one problem that still feels slippery."],
      ]),
      ...sections("les-vocab", [
        ["warm_up", "Warm-Up", "In the sentence, “Her tone was dry, almost arid,” what does dry most nearly mean?"],
        ["teach", "Teach", "Don’t pick the common meaning first. Find contrast words: but, although, rather."],
        ["examples", "Examples", "Work one passage sentence with two tempting synonyms. Cross out the everyday meaning."],
        ["guided_practice", "Guided Practice", "Two context items. Student explains the clue word before choosing."],
        ["independent_practice", "Independent Practice", "Three items, timed lightly (90 seconds each)."],
        ["exit_ticket", "Exit Ticket", "Write the clue word you used for the last item."],
      ]),
    ],
    skills,
    studentSkills: [
      skillRow("sk-linear", 83, 18, "2026-08-18", false),
      skillRow("sk-systems", 61, 9, "2026-08-18"),
      skillRow("sk-ineq", 70, 6, "2026-08-11"),
      skillRow("sk-percent", 50, 12, "2026-08-11", true),
      skillRow("sk-ratio", 58, 8, "2026-08-11"),
      skillRow("sk-fn", 42, 10, "2026-08-11"),
      skillRow("sk-quad", 55, 7, "2026-08-11"),
      skillRow("sk-exp", 74, 8, "2026-08-11"),
      skillRow("sk-geo", 75, 11, "2026-08-11"),
      skillRow("sk-data", 68, 9, "2026-08-11"),
      skillRow("sk-main", 70, 14, "2026-08-11"),
      skillRow("sk-evidence", 66, 10, "2026-08-11"),
      skillRow("sk-vocab", 48, 16, "2026-08-11", true),
      skillRow("sk-bounds", 80, 9, "2026-08-11"),
      skillRow("sk-grammar", 88, 20, "2026-08-11"),
      skillRow("sk-trans", 91, 12, "2026-08-11"),
      skillRow("sk-rhetor", 64, 8, "2026-08-11"),
      skillRow("sk-charts", 72, 7, "2026-08-11"),
    ],
    questions: [
      q("q-lin-1", "Solve 3(x − 4) = 2x + 5.", "x = 17", "sk-linear", "easy", "Distribute, collect x terms: 3x − 12 = 2x + 5 → x = 17."),
      q("q-lin-2", "A number decreased by 8 is four times its opposite. Find the number.", "8/5", "sk-linear", "medium", "n − 8 = 4(−n) → n − 8 = −4n → 5n = 8 → n = 8/5."),
      q("q-pct-1", "18% of 250 is?", "45", "sk-percent", "easy", "0.18 × 250 = 45.", "numeric"),
      q("q-pct-2", "A jacket is 30% off and costs $56. Original price?", "80", "sk-percent", "medium", "0.70x = 56 → x = 80.", "numeric"),
      q("q-pct-3", "A price rises from 80 to 100. Percent increase?", "25%", "sk-percent", "easy", "20/80 = 25%."),
      q("q-voc-1", "In context, “dry” most nearly means: A) thirsty B) unemotional C) desert-like D) illegal", "B", "sk-vocab", "medium", "Tone of speech: unemotional, not literal dryness.", "multiple_choice"),
      q("q-fn-1", "If f(x) = 2x − 3, f(5) = ?", "7", "sk-fn", "easy", "2(5) − 3 = 7.", "numeric"),
      q("q-geo-1", "A triangle has angles 40° and 65°. The third angle is?", "75°", "sk-geo", "easy", "180 − 105 = 75.", "numeric"),
    ],
    assignments: [
      { id: "asg-diag", courseId: S.sat, studentId: S.wafia, lessonId: "les-diag-review", title: "August diagnostic", type: "diagnostic", assignedDate: "2026-08-04", dueDate: "2026-08-10", status: "graded", totalPoints: 1600, score: 1250 },
      { id: "asg-linear-hw", courseId: S.sat, studentId: S.wafia, lessonId: "les-linear", title: "Linear equations practice set", type: "homework", assignedDate: "2026-08-18", dueDate: "2026-08-19", status: "graded", totalPoints: 8, score: 6 },
      { id: "asg-percent", courseId: S.sat, studentId: S.wafia, lessonId: "les-percent", title: "Percent worksheet", type: "worksheet", assignedDate: "2026-08-19", dueDate: "2026-08-21", status: "assigned", totalPoints: 10 },
      { id: "asg-quiz-alg", courseId: S.sat, studentId: S.wafia, title: "Algebra foundations quiz", type: "quiz", assignedDate: "2026-08-12", dueDate: "2026-08-15", status: "graded", totalPoints: 20, score: 15 },
    ],
    assignmentQuestions: [
      { assignmentId: "asg-linear-hw", questionId: "q-lin-1", order: 1, points: 4 },
      { assignmentId: "asg-linear-hw", questionId: "q-lin-2", order: 2, points: 4 },
      { assignmentId: "asg-percent", questionId: "q-pct-1", order: 1, points: 4 },
      { assignmentId: "asg-percent", questionId: "q-pct-2", order: 2, points: 3 },
      { assignmentId: "asg-percent", questionId: "q-pct-3", order: 3, points: 3 },
    ],
    questionResults: [
      { id: "qr-1", studentId: S.wafia, questionId: "q-lin-1", assignmentId: "asg-linear-hw", correct: true, response: "17" },
      { id: "qr-2", studentId: S.wafia, questionId: "q-lin-2", assignmentId: "asg-linear-hw", correct: false, response: "-8", mistakeType: "careless_mistake" },
      { id: "qr-3", studentId: S.wafia, questionId: "q-pct-2", assignmentId: "asg-diag", correct: false, response: "56 / 0.3", mistakeType: "concept_not_understood" },
      { id: "qr-4", studentId: S.wafia, questionId: "q-voc-1", assignmentId: "asg-diag", correct: false, response: "C", mistakeType: "vocabulary_issue" },
    ],
    assessments: [
      {
        id: "ass-diag",
        courseId: S.sat,
        studentId: S.wafia,
        type: "diagnostic",
        title: "August SAT diagnostic",
        date: "2026-08-10",
        score: 1250,
        total: 1600,
        sections: [
          { label: "Math", score: 610, total: 800 },
          { label: "Reading/Writing", score: 640, total: 800 },
        ],
        skillScores: [
          { skillId: "sk-linear", accuracy: 83 },
          { skillId: "sk-percent", accuracy: 50 },
          { skillId: "sk-fn", accuracy: 42 },
          { skillId: "sk-geo", accuracy: 75 },
          { skillId: "sk-grammar", accuracy: 88 },
          { skillId: "sk-main", accuracy: 70 },
          { skillId: "sk-vocab", accuracy: 48 },
          { skillId: "sk-trans", accuracy: 91 },
        ],
      },
    ],
    teacherNotes: [
      { id: "tn-1", studentId: S.wafia, text: "Confident when the algebra is already set up. Slows down on story problems.", createdAt: "2026-08-11T18:00:00.000Z" },
      { id: "tn-2", studentId: S.wafia, courseId: S.sat, lessonId: "les-linear", text: "Rushed through percentage setup last week. Today: understands equations but forgets negative signs.", createdAt: "2026-08-18T17:30:00.000Z" },
      { id: "tn-3", studentId: S.wafia, skillId: "sk-percent", text: "Needs a consistent part/whole diagram before calculating.", createdAt: "2026-08-11T18:10:00.000Z" },
    ],
  };
}

function sections(lessonId: string, rows: [string, string, string][]) {
  return rows.map(([type, title, content], index) => ({
    id: `${lessonId}-sec-${index + 1}`,
    lessonId,
    type: type as never,
    title,
    content,
    order: index + 1,
    complete: lessonId !== "les-percent" && lessonId !== "les-vocab",
  }));
}

function q(
  id: string,
  text: string,
  answer: string,
  skillId: string,
  difficulty: "easy" | "medium" | "hard",
  explanation: string,
  questionType: "multiple_choice" | "short_answer" | "numeric" | "true_false" | "open_response" = "short_answer",
) {
  const rw = ["sk-main", "sk-evidence", "sk-vocab", "sk-bounds", "sk-grammar", "sk-trans", "sk-rhetor", "sk-charts"];
  return {
    id,
    text,
    answer,
    explanation,
    difficulty,
    questionType,
    skillId,
    courseId: "crs-sat-prep",
    subject: rw.includes(skillId) ? "Reading/Writing" : "Math",
    source: "MasterOS demo bank",
  };
}

export const DEMO_STUDENT_ID = S.wafia;
export const DEMO_COURSE_ID = S.sat;
