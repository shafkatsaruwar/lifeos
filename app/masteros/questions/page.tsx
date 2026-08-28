"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMasterOS } from "@/lib/masteros/store";
import { DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/lib/masteros/helpers";
import { groupQuestionsForBank, resolveQuestionCategory } from "@/lib/masteros/questionBank";
import type { Difficulty, QuestionType } from "@/lib/masteros/types";

function QuestionsInner() {
  const { state, addQuestion, deleteQuestion } = useMasterOS();
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get("new") === "1");
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [category, setCategory] = useState("");
  const [courseId, setCourseId] = useState(state.courses[0]?.id ?? "");
  const [skillId, setSkillId] = useState(state.skills[0]?.id ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questionType, setQuestionType] = useState<QuestionType>("short_answer");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const skills = state.skills.filter((item) => item.courseId === courseId);
  const filtered = useMemo(
    () => state.questions.filter((item) => {
      if (filterCourse && item.courseId !== filterCourse) return false;
      if (filterCategory && resolveQuestionCategory(item, state) !== filterCategory) return false;
      return true;
    }),
    [state, filterCourse, filterCategory],
  );
  const groups = useMemo(() => groupQuestionsForBank(filtered, state), [filtered, state]);
  const categories = useMemo(
    () => [...new Set(state.questions.map((item) => resolveQuestionCategory(item, state)))].sort(),
    [state],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || !answer.trim()) return;
    addQuestion({
      text: text.trim(),
      answer: answer.trim(),
      explanation: explanation.trim(),
      category: category.trim() || undefined,
      subject: state.courses.find((item) => item.id === courseId)?.name ?? "",
      courseId,
      skillId: skillId || undefined,
      difficulty,
      questionType,
      source: "teacher",
    });
    setText("");
    setAnswer("");
    setExplanation("");
    setCategory("");
    setOpen(false);
  };

  return (
    <div className="mos-page">
      <div className="mos-top">
        <div>
          <p className="eyebrow">Reusable items</p>
          <h1>Question Bank</h1>
          <p>Custom questions save here automatically. Large sets group into categories.</p>
        </div>
        <button className="primary" type="button" onClick={() => setOpen(true)}>Add question</button>
      </div>

      <div className="mos-actions" style={{ marginBottom: 16 }}>
        <select className="mos-ghost" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
          <option value="">All courses</option>
          {state.courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="mos-ghost" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {!groups.length ? <p className="mos-empty">No questions yet. Add one here or write a custom question on an assignment.</p> : null}

      {groups.map((group) => (
        <section key={group.key} className="mos-unit">
          <h3>{group.label} <span className="mos-muted" style={{ fontWeight: 400 }}>({group.questions.length})</span></h3>
          <div className="mos-list-page">
            {group.questions.map((question) => {
              const skill = state.skills.find((item) => item.id === question.skillId);
              return (
                <article key={question.id} className="mos-entity" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mos-actions" style={{ marginBottom: 8 }}>
                      <span className="mos-chip">{DIFFICULTY_LABEL[question.difficulty]}</span>
                      <span className="mos-chip">{QUESTION_TYPE_LABEL[question.questionType]}</span>
                      {skill ? <span className="mos-chip">{skill.name}</span> : null}
                    </div>
                    <strong>{question.text}</strong>
                    <p className="mos-muted" style={{ marginTop: 8 }}><strong>Answer:</strong> {question.answer}</p>
                    {question.explanation ? <p className="mos-muted">{question.explanation}</p> : null}
                    {question.source ? <p className="mos-muted">Source: {question.source}</p> : null}
                  </div>
                  <button
                    className="mos-ghost"
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Delete this question from the bank?\n\n${question.text.slice(0, 120)}`)) return;
                      deleteQuestion(question.id);
                    }}
                  >
                    Delete
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {open ? (
        <div className="mos-modal" onClick={() => setOpen(false)}>
          <form onClick={(event) => event.stopPropagation()} onSubmit={submit}>
            <h2 style={{ marginTop: 0 }}>Add question</h2>
            <label className="mos-field"><span>Question</span><textarea value={text} onChange={(e) => setText(e.target.value)} /></label>
            <label className="mos-field"><span>Answer</span><input value={answer} onChange={(e) => setAnswer(e.target.value)} /></label>
            <label className="mos-field"><span>Explanation</span><textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} /></label>
            <label className="mos-field"><span>Category</span><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Optional — auto-groups from skill or course" /></label>
            <label className="mos-field"><span>Course</span>
              <select
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setSkillId(state.skills.find((item) => item.courseId === e.target.value)?.id ?? "");
                }}
              >
                {state.courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="mos-field"><span>Skill</span>
              <select value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                <option value="">None</option>
                {skills.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="mos-field"><span>Difficulty</span>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="mos-field"><span>Type</span>
              <select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)}>
                {Object.entries(QUESTION_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div className="mos-actions"><button className="mos-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary">Save to bank</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<div className="mos-page"><p className="mos-muted">Loading question bank…</p></div>}>
      <QuestionsInner />
    </Suspense>
  );
}
