import {
  computeCourseGrade,
  letterForPercent,
  normalizeGradeCategories,
  DEFAULT_LETTER_SCALE,
} from "../lib/grades";

describe("grades", () => {
  it("maps percent to letter scale", () => {
    expect(letterForPercent(94, DEFAULT_LETTER_SCALE)).toBe("A");
    expect(letterForPercent(90, DEFAULT_LETTER_SCALE)).toBe("A-");
    expect(letterForPercent(59, DEFAULT_LETTER_SCALE)).toBe("F");
  });

  it("computes category averages and remaining weight", () => {
    const categories = normalizeGradeCategories([
      { id: "exams", name: "Exams", weight: 50 },
      { id: "assignments", name: "Assignments", weight: 50 },
    ]);
    const result = computeCourseGrade(
      [
        { id: 1, title: "Midterm", academicType: "Exam", pointsEarned: 90, pointsPossible: 100 },
        { id: 2, title: "Essay", academicType: "Assignment" },
      ],
      { categories, mode: "categories" },
    );
    expect(result.percent).toBeCloseTo(90, 5);
    expect(result.letter).toBe("A-");
    expect(result.remainingWeight).toBe(50);
    const needB = result.neededOnRemaining.find((row) => row.letter === "B");
    expect(needB?.needPercent).not.toBeNull();
  });

  it("uses item weights when mode is items", () => {
    const result = computeCourseGrade(
      [
        { id: 1, title: "A", gradeWeight: 40, pointsEarned: 100, pointsPossible: 100 },
        { id: 2, title: "B", gradeWeight: 60, pointsEarned: 50, pointsPossible: 100 },
      ],
      { mode: "items" },
    );
    expect(result.percent).toBeCloseTo(70, 5);
    expect(result.letter).toBe("C-");
  });

  it("applies what-if overrides", () => {
    const result = computeCourseGrade(
      [{ id: 1, title: "Quiz", academicType: "Quiz", gradeWeight: 100 }],
      {
        mode: "items",
        overrides: { "1": { pointsEarned: 9, pointsPossible: 10 } },
      },
    );
    expect(result.percent).toBeCloseTo(90, 5);
    expect(result.items[0].isWhatIf).toBe(true);
  });
});
