"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMasterOS } from "@/lib/masteros/store";
import { ASSIGNMENT_LABEL, formatDate, percent } from "@/lib/masteros/helpers";
import type { AssignmentType } from "@/lib/masteros/types";

function avg(types: AssignmentType[], rows: { type: AssignmentType; pct: number | null }[]) {
  const subset = rows.filter((row) => types.includes(row.type) && row.pct != null);
  if (!subset.length) return null;
  return Math.round(subset.reduce((sum, row) => sum + (row.pct ?? 0), 0) / subset.length);
}

export default function GradebookPage() {
  const { state } = useMasterOS();
  const [studentId, setStudentId] = useState(state.students[0]?.id ?? "");
  const [courseId, setCourseId] = useState(state.courses[0]?.id ?? "");

  const rows = useMemo(() => {
    return state.assignments
      .filter((item) => (!studentId || item.studentId === studentId) && (!courseId || item.courseId === courseId))
      .map((assignment) => {
        const links = state.assignmentQuestions.filter((item) => item.assignmentId === assignment.id);
        const skills = [
          ...new Set(
            links
              .map((link) => state.questions.find((item) => item.id === link.questionId)?.skillId)
              .map((id) => state.skills.find((item) => item.id === id)?.name)
              .filter(Boolean),
          ),
        ];
        return {
          assignment,
          pct: percent(assignment.score, assignment.totalPoints),
          skills: skills.join(", ") || "—",
        };
      })
      .sort((a, b) => b.assignment.assignedDate.localeCompare(a.assignment.assignedDate));
  }, [state, studentId, courseId]);

  const typed = rows.map((row) => ({ type: row.assignment.type, pct: row.pct }));
  const courseAvg = avg(["homework", "practice", "worksheet", "quiz", "test", "project", "diagnostic"], typed);
  const recent = avg(["homework", "practice", "worksheet", "quiz", "test", "project", "diagnostic"], typed.slice(0, 3));
  const quizAvg = avg(["quiz"], typed);
  const testAvg = avg(["test", "diagnostic"], typed);

  return (
    <div className="mos-page">
      <div className="mos-top">
        <div>
          <p className="eyebrow">Signals, not the whole story</p>
          <h1>Gradebook</h1>
          <p>Scores sit beside skill mastery. A quiz average never replaces “still learning percentages.”</p>
        </div>
      </div>

      <div className="mos-actions" style={{ marginBottom: 16 }}>
        <select className="mos-ghost" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          {state.students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="mos-ghost" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {state.courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>

      <div className="mos-grid mos-3" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", marginBottom: 16 }}>
        <article className="mos-stat"><span>Course average</span><strong>{courseAvg == null ? "—" : `${courseAvg}%`}</strong></article>
        <article className="mos-stat"><span>Recent average</span><strong>{recent == null ? "—" : `${recent}%`}</strong></article>
        <article className="mos-stat"><span>Quiz average</span><strong>{quizAvg == null ? "—" : `${quizAvg}%`}</strong></article>
        <article className="mos-stat"><span>Test average</span><strong>{testAvg == null ? "—" : `${testAvg}%`}</strong></article>
      </div>

      <section className="mos-card">
        <table className="mos-table">
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Type</th>
              <th>Date</th>
              <th>Score</th>
              <th>%</th>
              <th>Skills tested</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.assignment.id}>
                <td><Link href={`/masteros/assignments/${row.assignment.id}`}>{row.assignment.title}</Link></td>
                <td>{ASSIGNMENT_LABEL[row.assignment.type]}</td>
                <td>{formatDate(row.assignment.assignedDate)}</td>
                <td>{row.assignment.score != null ? `${row.assignment.score}/${row.assignment.totalPoints}` : "—"}</td>
                <td>{row.pct == null ? "—" : `${row.pct}%`}</td>
                <td>{row.skills}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
