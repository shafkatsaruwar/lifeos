import { extractDueDate, parseSyllabusText } from "../lib/syllabusImport";

describe("syllabusImport", () => {
  it("extracts named month due dates", () => {
    const result = extractDueDate("Assignment 1 due September 20, 2026", 2026);
    expect(result.due).toBe("2026-09-20");
    expect(result.title.toLowerCase()).toContain("assignment");
  });

  it("parses multiple syllabus lines", () => {
    const items = parseSyllabusText(`Course Syllabus
Assignment 1 — due Sep 20, 2026
Midterm exam October 15, 2026
Final project due 12/5/2026`);
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.some((item) => item.due === "2026-09-20")).toBe(true);
    expect(items.some((item) => item.academicType === "Exam")).toBe(true);
  });
});
