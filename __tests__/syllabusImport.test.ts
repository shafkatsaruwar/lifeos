import { dueForModule, extractDueDate, extractTextFromPdfBytes, parseSyllabusText } from "../lib/syllabusImport";
import { readFileSync } from "fs";

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

  it("maps module items onto term weeks", () => {
    expect(dueForModule("2026-09-07", 1)).toBe("2026-09-13");
    expect(dueForModule("2026-09-07", 2)).toBe("2026-09-20");
    expect(dueForModule("2026-09-07", 9)).toBe("2026-11-08");
  });

  it("parses SNHU-style module schedules with termStart", () => {
    const text = `
Weekly Assignment Schedule
Module Topics and Assignments
One Technical Communications Objectives and Collaboration
1-1 Discussion: The Importance of Technical Communications
1-2 Review: Final Project
1-3 Short Paper: Team Building and Collaboration
Two Audience Recognition
2-1 Discussion: Knowing Your Audience
2-2 Final Project Milestone One: Area of Focus
9-2 Final Submission: Communication Framework and Training Plan
10-1 Discussion: Reflection
ADA/504 Grievances Policy (version 1.2 effective October 16, 2017)
Late Assignments Students who need extra time may submit assignments
`;
    const items = parseSyllabusText(text, { termStart: "2026-09-07" });
    expect(items.length).toBeGreaterThanOrEqual(6);
    expect(items.every((item) => item.due)).toBe(true);
    expect(items.some((item) => /1-1 Discussion/i.test(item.title) && item.due === "2026-09-13")).toBe(true);
    expect(items.some((item) => /2-2 Final Project Milestone/i.test(item.title) && item.due === "2026-09-20")).toBe(true);
    expect(items.some((item) => /October 16, 2017/i.test(item.title))).toBe(false);
    expect(items.some((item) => /late assignment/i.test(item.title))).toBe(false);
    expect(items.some((item) => /1-2 Review/i.test(item.title))).toBe(false);
  });

  it("extracts text from FlateDecode syllabus PDFs when available", () => {
    const path = "/home/ubuntu/.cursor/projects/workspace/uploads/IT_520_Syllabus_dc30.pdf";
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(readFileSync(path));
    } catch {
      return; // fixture only present in cloud agent uploads
    }
    const text = extractTextFromPdfBytes(bytes);
    expect(text.toLowerCase()).toContain("technical communication");
    const items = parseSyllabusText(text, { termStart: "2026-09-07" });
    expect(items.filter((item) => item.due).length).toBeGreaterThanOrEqual(15);
    expect(items.some((item) => /discussion/i.test(item.title))).toBe(true);
    expect(items.some((item) => /short paper/i.test(item.title))).toBe(true);
  });
});
