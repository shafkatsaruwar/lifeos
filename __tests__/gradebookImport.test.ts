import {
  parseGradebookText,
  planGradebookApply,
  suggestCategoryDefaults,
} from "../lib/gradebookImport";

const BRIGHTSPACE = `
Grade Item	Points	Grade
1-1 Discussion: The Importance of Technical Communications	20	-
1-3 Short Paper: Team Building and Collaboration	70	-
2-2 Final Project Milestone One: Area of Focus	50	-
9-2 Final Submission: Communication Framework and Training Plan	300	-
`.trim();

const CANVAS = `
Assignment Name	Score	Out of
Module 1 Quiz	9/10	10
Essay 1	—	100
Discussion: Week 2	18/20	20
`.trim();

const BLACKBOARD = `
Graded Item	Points Possible	Grade
Lab 1 Report	50	-
Midterm Exam	100	-
`.trim();

const MOODLE = `
Activity	Grade	Range
Forum: Introductions	8.00	0–10
Assignment: Reflection	—	0–50
`.trim();

describe("gradebookImport", () => {
  it("parses Brightspace table paste", () => {
    const rows = parseGradebookText(BRIGHTSPACE);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      title: "1-1 Discussion: The Importance of Technical Communications",
      pointsPossible: 20,
      academicType: "Discussion",
    });
    expect(rows[1]).toMatchObject({ pointsPossible: 70, academicType: "Assignment" });
    expect(rows[2]).toMatchObject({ pointsPossible: 50, academicType: "Project" });
  });

  it("parses Canvas score / out-of columns", () => {
    const rows = parseGradebookText(CANVAS);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Module 1 Quiz", pointsPossible: 10, pointsEarned: 9 }),
        expect.objectContaining({ title: "Essay 1", pointsPossible: 100 }),
        expect.objectContaining({ title: "Discussion: Week 2", pointsPossible: 20 }),
      ]),
    );
  });

  it("parses Blackboard points-possible columns", () => {
    const rows = parseGradebookText(BLACKBOARD);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Lab 1 Report", pointsPossible: 50, academicType: "Lab" }),
        expect.objectContaining({ title: "Midterm Exam", pointsPossible: 100, academicType: "Exam" }),
      ]),
    );
  });

  it("parses Moodle activity / range paste", () => {
    const rows = parseGradebookText(MOODLE);
    expect(rows.some((row) => row.title.includes("Introductions") && row.pointsPossible === 10)).toBe(true);
    expect(rows.some((row) => row.title.includes("Reflection") && row.pointsPossible === 50)).toBe(true);
  });

  it("matches existing tasks and plans creates for the rest", () => {
    const rows = parseGradebookText(BRIGHTSPACE);
    const plan = planGradebookApply(
      [
        { id: 1, title: "1-1 Discussion: The Importance of Technical Communications" },
        { id: 2, title: "1-3 Short Paper: Team Building and Collaboration" },
      ],
      rows,
    );
    expect(plan.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, pointsPossible: 20 }),
        expect.objectContaining({ id: 2, pointsPossible: 70 }),
      ]),
    );
    expect(plan.creates.length).toBe(2);
  });

  it("suggests category default points from any LMS paste", () => {
    const defaults = suggestCategoryDefaults(parseGradebookText(BRIGHTSPACE));
    expect(defaults.discussions).toBe(20);
    expect(defaults.assignments).toBe(70);
    expect(defaults.projects).toBe(50);
  });
});
