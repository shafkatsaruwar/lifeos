"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useMasterOS } from "@/lib/masteros/store";
import { ASSIGNMENT_LABEL, MISTAKE_LABEL, assignmentStatusLabel, formatDate, scorePercent } from "@/lib/masteros/helpers";
import type { AssignmentStatus, MistakeType } from "@/lib/masteros/types";

const STATUSES: AssignmentStatus[] = ["assigned", "in_progress", "submitted", "graded"];

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, updateAssignment, recordResult, addAssignmentQuestion, addNote } = useMasterOS();
  const assignment = state.assignments.find((item) => item.id === id);
  const [addId, setAddId] = useState("");
  const [note, setNote] = useState("");

  const questions = useMemo(() => {
    if (!assignment) return [];
    return state.assignmentQuestions
      .filter((item) => item.assignmentId === assignment.id)
      .sort((a, b) => a.order - b.order)
      .map((link) => ({
        link,
        question: state.questions.find((item) => item.id === link.questionId),
        result: state.questionResults.find(
          (item) => item.assignmentId === assignment.id && item.questionId === link.questionId,
        ),
      }))
      .filter((row) => row.question);
  }, [assignment, state]);

  if (!assignment) {
    return (
      <div className="mos-page">
        <p>Assignment not found.</p>
        <Link href="/masteros/assignments">Back</Link>
      </div>
    );
  }

  const student = state.students.find((item) => item.id === assignment.studentId);
  const course = state.courses.find((item) => item.id === assignment.courseId);
  const unused = state.questions.filter(
    (item) => item.courseId === assignment.courseId && !questions.some((row) => row.question?.id === item.id),
  );

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) return;
    addNote({ studentId: assignment.studentId, courseId: assignment.courseId, lessonId: assignment.lessonId, text: note.trim() });
    setNote("");
  };

  return (
    <div className="mos-page">
      <div className="mos-top">
        <div>
          <p className="eyebrow">{ASSIGNMENT_LABEL[assignment.type]}</p>
          <h1>{assignment.title}</h1>
          <p>{student?.name} · {course?.name} · Due {formatDate(assignment.dueDate)}</p>
        </div>
        <select
          className="mos-ghost"
          value={assignment.status}
          onChange={(e) => updateAssignment(assignment.id, { status: e.target.value as AssignmentStatus })}
        >
          {STATUSES.map((status) => <option key={status} value={status}>{assignmentStatusLabel(status)}</option>)}
        </select>
      </div>

      <div className="mos-grid mos-3" style={{ marginBottom: 16 }}>
        <article className="mos-stat"><span>Score</span><strong>{assignment.score != null ? `${assignment.score}/${assignment.totalPoints}` : "—"}</strong></article>
        <article className="mos-stat"><span>Percentage</span><strong>{assignment.score != null ? scorePercent(assignment.score, assignment.totalPoints) : "—"}</strong></article>
        <article className="mos-stat"><span>Questions</span><strong>{questions.length}</strong></article>
      </div>

      <section className="mos-card" style={{ marginBottom: 16 }}>
        <header><h2>Grade & tag skills</h2></header>
        <div className="mos-pad">
          {questions.map((row, index) => {
            const question = row.question!;
            const skill = state.skills.find((item) => item.id === question.skillId);
            return (
              <article key={question.id} className="mos-section">
                <header>
                  <strong>{index + 1}. {question.text}</strong>
                  <span className="mos-chip">{skill?.name ?? "Untagged"}</span>
                </header>
                <p className="mos-muted">Answer: {question.answer}</p>
                {question.explanation ? <p className="mos-muted">{question.explanation}</p> : null}
                <div className="mos-actions" style={{ marginTop: 10 }}>
                  <button
                    className={row.result?.correct ? "primary" : "mos-ghost"}
                    type="button"
                    onClick={() => recordResult({
                      studentId: assignment.studentId,
                      questionId: question.id,
                      assignmentId: assignment.id,
                      correct: true,
                      response: question.answer,
                    })}
                  >
                    Correct
                  </button>
                  <button
                    className={row.result && !row.result.correct ? "primary" : "mos-ghost"}
                    type="button"
                    onClick={() => recordResult({
                      studentId: assignment.studentId,
                      questionId: question.id,
                      assignmentId: assignment.id,
                      correct: false,
                      mistakeType: row.result?.mistakeType ?? "other",
                    })}
                  >
                    Missed
                  </button>
                  {row.result && !row.result.correct ? (
                    <select
                      className="mos-ghost"
                      value={row.result.mistakeType ?? "other"}
                      onChange={(e) => recordResult({
                        studentId: assignment.studentId,
                        questionId: question.id,
                        assignmentId: assignment.id,
                        correct: false,
                        mistakeType: e.target.value as MistakeType,
                      })}
                    >
                      {Object.entries(MISTAKE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  ) : null}
                </div>
              </article>
            );
          })}
          <div className="mos-actions" style={{ marginTop: 8 }}>
            <select className="mos-ghost" value={addId} onChange={(e) => setAddId(e.target.value)}>
              <option value="">Add question from bank…</option>
              {unused.map((item) => <option key={item.id} value={item.id}>{item.text.slice(0, 80)}</option>)}
            </select>
            <button className="mos-ghost" type="button" disabled={!addId} onClick={() => { addAssignmentQuestion(assignment.id, addId); setAddId(""); }}>
              Add
            </button>
          </div>
        </div>
      </section>

      <section className="mos-card">
        <header><h2>Teacher note</h2></header>
        <form className="mos-pad" onSubmit={submitNote}>
          <label className="mos-field"><span>Private note</span><textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <button className="primary">Save note</button>
        </form>
      </section>
    </div>
  );
}
