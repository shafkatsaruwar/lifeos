"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMasterOS } from "@/lib/masteros/store";
import {
  ASSIGNMENT_LABEL,
  MISTAKE_LABEL,
  QUESTION_TYPE_LABEL,
  assignmentStatusLabel,
  earnedPoints,
  formatDate,
  questionPoints,
  scorePercent,
} from "@/lib/masteros/helpers";
import type { AssignmentStatus, Difficulty, MistakeType, Question, QuestionType, Skill } from "@/lib/masteros/types";

const STATUSES: AssignmentStatus[] = ["assigned", "in_progress", "submitted", "graded"];

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    state,
    updateAssignment,
    recordResult,
    addAssignmentQuestion,
    updateAssignmentQuestion,
    addQuestion,
    addNote,
    gradeAssignment,
  } = useMasterOS();
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
  const courseSkills = state.skills.filter((item) => item.courseId === assignment.courseId);

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) return;
    addNote({ studentId: assignment.studentId, courseId: assignment.courseId, lessonId: assignment.lessonId, text: note.trim() });
    setNote("");
  };

  const markQuestion = (questionId: string, pointsEarned: number, extra?: { mistakeType?: MistakeType }) => {
    recordResult({
      studentId: assignment.studentId,
      questionId,
      assignmentId: assignment.id,
      correct: true,
      pointsEarned,
      mistakeType: extra?.mistakeType,
    });
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
        <article className="mos-stat">
          <span>Score</span>
          <OverallMark
            key={`${assignment.score ?? "none"}-${assignment.totalPoints}`}
            score={assignment.score}
            total={assignment.totalPoints}
            onSave={(score, total) => gradeAssignment(assignment.id, score, total)}
          />
        </article>
        <article className="mos-stat"><span>Percentage</span><strong>{assignment.score != null ? scorePercent(assignment.score, assignment.totalPoints) : "—"}</strong></article>
        <article className="mos-stat"><span>Questions</span><strong>{questions.length}</strong></article>
      </div>

      <section className="mos-card" style={{ marginBottom: 16 }}>
        <header><h2>Grade & tag skills</h2></header>
        <div className="mos-pad">
          {questions.map((row, index) => {
            const question = row.question!;
            const skill = state.skills.find((item) => item.id === question.skillId);
            const max = questionPoints(row.link);
            const earned = earnedPoints(row.result, max);
            return (
              <article key={question.id} className="mos-section">
                <header>
                  <strong>{index + 1}. {question.text}</strong>
                  <span className="mos-chip">{skill?.name ?? "Untagged"}</span>
                </header>
                <p className="mos-muted">Answer: {question.answer}</p>
                {question.explanation ? <p className="mos-muted">{question.explanation}</p> : null}
                <div className="mos-actions" style={{ marginTop: 10, alignItems: "center" }}>
                  <button
                    className={row.result?.correct ? "primary" : "mos-ghost"}
                    type="button"
                    onClick={() => markQuestion(question.id, max)}
                  >
                    Correct
                  </button>
                  <button
                    className={row.result && !row.result.correct && (earned ?? 0) === 0 ? "primary" : "mos-ghost"}
                    type="button"
                    onClick={() => markQuestion(question.id, 0, { mistakeType: row.result?.mistakeType ?? "other" })}
                  >
                    Missed
                  </button>
                  <label className="mos-mark">
                    <span>Mark</span>
                    <input
                      type="number"
                      min={0}
                      max={max}
                      step="0.5"
                      value={earned ?? ""}
                      placeholder="—"
                      onChange={(e) => {
                        const value = e.target.value === "" ? 0 : Number(e.target.value);
                        if (!Number.isFinite(value)) return;
                        markQuestion(
                          question.id,
                          value,
                          value >= max ? undefined : { mistakeType: row.result?.mistakeType ?? "other" },
                        );
                      }}
                    />
                    <span>/</span>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={max}
                      aria-label="Points possible"
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (!Number.isFinite(value) || value < 0) return;
                        updateAssignmentQuestion(assignment.id, question.id, { points: value });
                      }}
                    />
                  </label>
                  {row.result && !row.result.correct ? (
                    <select
                      className="mos-ghost"
                      value={row.result.mistakeType ?? "other"}
                      onChange={(e) => markQuestion(question.id, earned ?? 0, { mistakeType: e.target.value as MistakeType })}
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
              Add from bank
            </button>
          </div>

          <CustomQuestionForm
            courseId={assignment.courseId}
            skills={courseSkills}
            onAdd={(question, points) => {
              const questionId = addQuestion(question);
              addAssignmentQuestion(assignment.id, questionId, points);
            }}
          />
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

function OverallMark({
  score,
  total,
  onSave,
}: {
  score?: number;
  total: number;
  onSave: (score: number, total: number) => void;
}) {
  const [earned, setEarned] = useState(score == null ? "" : String(score));
  const [outOf, setOutOf] = useState(String(total));

  return (
    <div className="mos-mark" style={{ marginTop: 8 }}>
      <input
        type="number"
        min={0}
        step="0.5"
        value={earned}
        placeholder="—"
        onChange={(e) => setEarned(e.target.value)}
        onBlur={() => {
          const nextScore = Number(earned);
          const nextTotal = Number(outOf);
          if (earned === "" || !Number.isFinite(nextScore) || !Number.isFinite(nextTotal) || nextTotal < 0) return;
          onSave(nextScore, nextTotal);
        }}
      />
      <span>/</span>
      <input
        type="number"
        min={0}
        step="0.5"
        value={outOf}
        onChange={(e) => setOutOf(e.target.value)}
        onBlur={() => {
          const nextScore = Number(earned);
          const nextTotal = Number(outOf);
          if (earned === "" || !Number.isFinite(nextScore) || !Number.isFinite(nextTotal) || nextTotal < 0) return;
          onSave(nextScore, nextTotal);
        }}
      />
    </div>
  );
}

function CustomQuestionForm({
  courseId,
  skills,
  onAdd,
}: {
  courseId: string;
  skills: Skill[];
  onAdd: (question: Omit<Question, "id">, points: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [skillId, setSkillId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questionType, setQuestionType] = useState<QuestionType>("short_answer");
  const [points, setPoints] = useState("1");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || !answer.trim()) return;
    const worth = Number(points);
    onAdd({
      text: text.trim(),
      answer: answer.trim(),
      explanation: explanation.trim(),
      subject: "",
      courseId,
      skillId: skillId || undefined,
      difficulty,
      questionType,
      source: "custom",
    }, Number.isFinite(worth) && worth >= 0 ? worth : 1);
    setText("");
    setAnswer("");
    setExplanation("");
    setPoints("1");
    setOpen(false);
  };

  if (!open) {
    return (
      <button className="mos-ghost" type="button" style={{ marginTop: 10 }} onClick={() => setOpen(true)}>
        Write custom question
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 14 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>Custom question</h3>
      <label className="mos-field"><span>Question</span><textarea value={text} onChange={(e) => setText(e.target.value)} /></label>
      <label className="mos-field"><span>Answer</span><input value={answer} onChange={(e) => setAnswer(e.target.value)} /></label>
      <label className="mos-field"><span>Explanation</span><textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} /></label>
      <div className="mos-grid mos-3">
        <label className="mos-field"><span>Skill</span>
          <select value={skillId} onChange={(e) => setSkillId(e.target.value)}>
            <option value="">None</option>
            {skills.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="mos-field"><span>Type</span>
          <select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)}>
            {Object.entries(QUESTION_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="mos-field"><span>Points</span>
          <input type="number" min={0} step="0.5" value={points} onChange={(e) => setPoints(e.target.value)} />
        </label>
      </div>
      <label className="mos-field"><span>Difficulty</span>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </label>
      <div className="mos-actions">
        <button className="mos-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
        <button className="primary">Add to assignment</button>
      </div>
    </form>
  );
}
