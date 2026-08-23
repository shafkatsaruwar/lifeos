"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { formatDate, todayKey } from "@/lib/masteros/helpers";
import { groupLessonsBySubject, useMasterOS } from "@/lib/masteros/store";
import type { LessonSectionType, LessonStatus } from "@/lib/masteros/types";

const DEFAULT_SECTIONS: { type: LessonSectionType; title: string; content: string; order: number }[] = [
  { type: "warm_up", title: "Warm-Up", content: "", order: 1 },
  { type: "teach", title: "Teach", content: "", order: 2 },
  { type: "examples", title: "Examples", content: "", order: 3 },
  { type: "guided_practice", title: "Guided Practice", content: "", order: 4 },
  { type: "independent_practice", title: "Independent Practice", content: "", order: 5 },
  { type: "exit_ticket", title: "Exit Ticket", content: "", order: 6 },
  { type: "homework", title: "Homework", content: "", order: 7 },
];

function LessonsInner() {
  const { state, addLesson, deleteLesson } = useMasterOS();
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get("new") === "1");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [studentId, setStudentId] = useState(state.students[0]?.id ?? "");
  const [unitId, setUnitId] = useState(state.units[0]?.id ?? "");
  const [date, setDate] = useState(todayKey());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !studentId || !unitId) return;
    addLesson({
      unitId, studentId, title: title.trim(), objective: objective.trim(), date, duration: 60, status: "planned" as LessonStatus, skillIds: [],
    }, DEFAULT_SECTIONS);
    setOpen(false); setTitle(""); setObjective("");
  };

  const groups = useMemo(() => groupLessonsBySubject(state), [state]);

  return (
    <div className="mos-page">
      <div className="mos-top">
        <div><p className="eyebrow">Teach</p><h1>Lessons</h1><p>Warm-up, teach, practice, exit ticket — then start Teaching Mode beside the board.</p></div>
        <button className="primary" onClick={() => setOpen(true)}>New lesson</button>
      </div>
      {!groups.length ? <p className="mos-empty">No lessons yet. Create one to start Teaching Mode.</p> : null}
      {groups.map((group) => (
        <section key={group.label} className="mos-unit">
          <h3>
            {group.label}{" "}
            <span className="mos-muted" style={{ fontWeight: 400 }}>({group.lessons.length})</span>
          </h3>
          <div className="mos-list-page">
            {group.lessons.map((lesson) => {
              const student = state.students.find((item) => item.id === lesson.studentId);
              const unit = state.units.find((item) => item.id === lesson.unitId);
              const course = state.courses.find((item) => item.id === unit?.courseId);
              return (
                <article key={lesson.id} className="mos-entity" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <Link href={`/masteros/lessons/${lesson.id}`} style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
                    <strong>{lesson.title}</strong>
                    <p className="mos-muted">{student?.name} · {course?.name} · {unit?.title} · {formatDate(lesson.date)} · {lesson.status.replace("_", " ")}</p>
                  </Link>
                  <button
                    className="mos-ghost"
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Delete “${lesson.title}”?`)) return;
                      deleteLesson(lesson.id);
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
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h2 style={{ marginTop: 0 }}>New lesson</h2>
            <label className="mos-field"><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label className="mos-field"><span>Objective</span><textarea value={objective} onChange={(e) => setObjective(e.target.value)} /></label>
            <label className="mos-field"><span>Student</span>
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>{state.students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </label>
            <label className="mos-field"><span>Unit</span>
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                {state.units.map((item) => {
                  const course = state.courses.find((row) => row.id === item.courseId);
                  return <option key={item.id} value={item.id}>{course?.name} · {item.title}</option>;
                })}
              </select>
            </label>
            <label className="mos-field"><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <p className="mos-muted">Starts with Warm-Up → Teach → Examples → Guided → Independent → Exit Ticket. You can reorder on the lesson page.</p>
            <div className="mos-actions" style={{ marginTop: 12 }}><button className="mos-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary">Create</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default function LessonsPage() {
  return (
    <Suspense fallback={<div className="mos-page"><p className="mos-muted">Loading lessons…</p></div>}>
      <LessonsInner />
    </Suspense>
  );
}
