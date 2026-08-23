import { applyQuestionResult, computeMasteryState, recommendNextSkill } from "@/lib/masteros/mastery";
import { createSeedState, DEMO_COURSE_ID, DEMO_STUDENT_ID } from "@/lib/masteros/seed";
import { attentionSkills, courseProgress } from "@/lib/masteros/selectors";
import { removeCourseFromState, removeQuestionFromState, removeStudentFromState, removeUnitFromState } from "@/lib/masteros/store";
import { buildStudentReportCard } from "@/lib/masteros/reportCard";
import { groupQuestionsForBank, prepareQuestionForBank, resolveQuestionCategory } from "@/lib/masteros/questionBank";
import { assignmentStatusLabel, assignmentTypeLabel, percent, tallyAssignmentMarks } from "@/lib/masteros/helpers";

describe("MasterOS mastery rules", () => {
  it("maps accuracy bands without SAT-specific logic", () => {
    expect(computeMasteryState(0, 0)).toBe("not_started");
    expect(computeMasteryState(40, 4)).toBe("learning");
    expect(computeMasteryState(60, 6)).toBe("practicing");
    expect(computeMasteryState(80, 8)).toBe("proficient");
    expect(computeMasteryState(90, 4)).toBe("proficient");
    expect(computeMasteryState(90, 8)).toBe("mastered");
    expect(computeMasteryState(90, 8, true)).toBe("needs_review");
  });

  it("updates accuracy and attempts after a question result", () => {
    const next = applyQuestionResult({
      studentId: "stu",
      skillId: "sk",
      masteryState: "learning",
      accuracy: 50,
      attempts: 2,
      recentAccuracy: 50,
    }, true, "2026-08-19");
    expect(next.attempts).toBe(3);
    expect(next.accuracy).toBe(67);
    expect(next.lastPracticed).toBe("2026-08-19");
  });
});

describe("MasterOS demo seed", () => {
  const state = createSeedState();

  it("seeds Wafia and a generic SAT Prep course configuration", () => {
    const student = state.students.find((item) => item.id === DEMO_STUDENT_ID);
    const course = state.courses.find((item) => item.id === DEMO_COURSE_ID);
    expect(student?.name).toBe("Wafia");
    expect(student?.gradeLevel).toBe("11");
    expect(course?.name).toBe("SAT Prep");
    expect(state.units.filter((item) => item.courseId === DEMO_COURSE_ID)).toHaveLength(10);
  });

  it("exposes diagnostic section and skill scores for Needs Attention", () => {
    const diagnostic = state.assessments.find((item) => item.type === "diagnostic");
    expect(diagnostic?.score).toBe(1250);
    expect(diagnostic?.sections?.map((item) => item.label)).toEqual(["Math", "Reading/Writing"]);
    const percentSkill = diagnostic?.skillScores?.find((item) => item.skillId === "sk-percent");
    const vocab = diagnostic?.skillScores?.find((item) => item.skillId === "sk-vocab");
    expect(percentSkill?.accuracy).toBe(50);
    expect(vocab?.accuracy).toBe(48);
    const weak = attentionSkills(state, DEMO_STUDENT_ID).map((item) => item.skillId);
    expect(weak).toEqual(expect.arrayContaining(["sk-percent", "sk-vocab", "sk-fn"]));
  });

  it("includes a ready lesson that can enter Teaching Mode", () => {
    const lesson = state.lessons.find((item) => item.id === "les-percent");
    expect(lesson?.status).toBe("ready");
    expect(lesson?.title).toMatch(/Percent/i);
    const sections = state.lessonSections.filter((item) => item.lessonId === "les-percent").map((item) => item.type);
    expect(sections).toEqual(expect.arrayContaining(["warm_up", "teach", "examples", "guided_practice", "exit_ticket"]));
  });

  it("computes course progress from skill mastery, not grades alone", () => {
    const progress = courseProgress(state, DEMO_STUDENT_ID, DEMO_COURSE_ID);
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(100);
    expect(percent(15, 20)).toBe(75);
  });

  it("recommends the weakest skill as a future AI extension point", () => {
    const next = recommendNextSkill(state.studentSkills);
    expect(next?.skillId).toBe("sk-fn");
  });
});

describe("MasterOS labels", () => {
  it("keeps assignment copy generic", () => {
    expect(assignmentTypeLabel("diagnostic")).toBe("Diagnostic");
    expect(assignmentStatusLabel("in_progress")).toBe("In Progress");
  });
});

describe("MasterOS course and unit deletion", () => {
  it("removes a unit and its lessons", () => {
    const state = createSeedState();
    const next = removeUnitFromState(state, "unit-4");
    expect(next.units.some((item) => item.id === "unit-4")).toBe(false);
    expect(next.lessons.some((item) => item.unitId === "unit-4")).toBe(false);
    expect(next.lessonSections.some((item) => item.lessonId === "les-percent")).toBe(false);
  });

  it("removes a course and its curriculum graph", () => {
    const state = createSeedState();
    const next = removeCourseFromState(state, DEMO_COURSE_ID);
    expect(next.courses.some((item) => item.id === DEMO_COURSE_ID)).toBe(false);
    expect(next.units.some((item) => item.courseId === DEMO_COURSE_ID)).toBe(false);
    expect(next.assignments.some((item) => item.courseId === DEMO_COURSE_ID)).toBe(false);
    expect(next.questions.some((item) => item.courseId === DEMO_COURSE_ID)).toBe(false);
  });

  it("removes a student and their progress without deleting courses", () => {
    const state = createSeedState();
    const next = removeStudentFromState(state, DEMO_STUDENT_ID);
    expect(next.students.some((item) => item.id === DEMO_STUDENT_ID)).toBe(false);
    expect(next.assignments.some((item) => item.studentId === DEMO_STUDENT_ID)).toBe(false);
    expect(next.courses.some((item) => item.id === DEMO_COURSE_ID)).toBe(true);
  });
});

describe("MasterOS report card", () => {
  it("builds parent-facing course sections for an enrolled student", () => {
    const state = createSeedState();
    const report = buildStudentReportCard(state, DEMO_STUDENT_ID);
    expect(report).toHaveLength(1);
    expect(report[0]?.courseName).toBe("SAT Prep");
    expect(report[0]?.progress).toBeGreaterThan(0);
    expect(report[0]?.skills.length).toBeGreaterThan(0);
  });
});

describe("MasterOS question bank", () => {
  it("auto-categorizes questions from skill or course", () => {
    const state = createSeedState();
    const prepared = prepareQuestionForBank({
      text: "Test",
      answer: "1",
      difficulty: "easy",
      questionType: "short_answer",
      courseId: DEMO_COURSE_ID,
      skillId: "sk-percent",
    }, state);
    expect(prepared.category).toBe("Math: Percentages");
  });

  it("splits large categories for tidy browsing", () => {
    const state = createSeedState();
    const extras = Array.from({ length: 8 }, (_, index) => ({
      id: `q-extra-${index}`,
      text: `Extra ${index}`,
      answer: String(index),
      difficulty: "easy" as const,
      questionType: "short_answer" as const,
      courseId: DEMO_COURSE_ID,
      category: "SAT Prep",
    }));
    const groups = groupQuestionsForBank([...state.questions.filter((item) => item.courseId === DEMO_COURSE_ID), ...extras], state);
    expect(groups.some((group) => group.label.includes("SAT Prep ·"))).toBe(true);
  });

  it("removes a bank question and unlinks it from assignments", () => {
    const state = createSeedState();
    const next = removeQuestionFromState(state, "q-pct-1");
    expect(next.questions.some((item) => item.id === "q-pct-1")).toBe(false);
    expect(next.assignmentQuestions.some((item) => item.questionId === "q-pct-1")).toBe(false);
  });
});

describe("MasterOS assignment marks", () => {
  it("tallies custom and partial credit against question points", () => {
    const tally = tallyAssignmentMarks(
      [
        { assignmentId: "asg", questionId: "q1", points: 5 },
        { assignmentId: "asg", questionId: "q2", points: 5 },
      ],
      [
        { assignmentId: "asg", questionId: "q1", correct: true, pointsEarned: 5 },
        { assignmentId: "asg", questionId: "q2", correct: false, pointsEarned: 2.5 },
      ],
      "asg",
    );
    expect(tally.score).toBe(7.5);
    expect(tally.totalPoints).toBe(10);
    expect(tally.complete).toBe(true);
  });
});
