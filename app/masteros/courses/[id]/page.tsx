"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDate } from "@/lib/masteros/helpers";
import { studentsForCourse, unitsForCourse, useMasterOS } from "@/lib/masteros/store";

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, addUnit, deleteUnit, deleteCourse, addNote } = useMasterOS();
  const course = state.courses.find((item) => item.id === id);
  const [unitTitle, setUnitTitle] = useState("");
  const [note, setNote] = useState("");
  if (!course) return <div className="mos-page"><p>Course not found.</p></div>;
  const units = unitsForCourse(state, course.id);
  const students = studentsForCourse(state, course.id);
  const skills = state.skills.filter((item) => item.courseId === course.id);
  const notes = state.teacherNotes.filter((item) => item.courseId === course.id && !item.lessonId && !item.skillId);

  const submitUnit = (event: FormEvent) => {
    event.preventDefault();
    if (!unitTitle.trim()) return;
    addUnit(course.id, unitTitle.trim());
    setUnitTitle("");
  };

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) return;
    addNote({ courseId: course.id, studentId: students[0]?.id, text: note.trim() });
    setNote("");
  };

  return (
    <div className="mos-page">
      <div className="mos-top">
        <div>
          <p className="eyebrow">Course</p>
          <h1>{course.name}</h1>
          <p>{course.description}</p>
        </div>
        <div className="mos-actions">
          <Link className="primary" href="/masteros/lessons?new=1">New lesson</Link>
          <button
            className="mos-ghost"
            type="button"
            onClick={() => {
              if (!window.confirm(`Delete “${course.name}” and all its units, lessons, and assignments?`)) return;
              deleteCourse(course.id);
              router.push("/masteros/courses");
            }}
          >
            Delete course
          </button>
        </div>
      </div>
      <p className="mos-muted" style={{ marginBottom: 18 }}>{students.map((item) => item.name).join(", ")} · {course.startDate}{course.targetDate ? ` → ${course.targetDate}` : ""} · {course.status}</p>
      {units.map((unit) => {
        const lessons = state.lessons.filter((item) => item.unitId === unit.id);
        return (
          <section key={unit.id} className="mos-unit">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{unit.order}. {unit.title}</h3>
              <button
                className="mos-ghost"
                type="button"
                onClick={() => {
                  const detail = lessons.length
                    ? `Delete “${unit.title}” and its ${lessons.length} lesson${lessons.length === 1 ? "" : "s"}?`
                    : `Delete “${unit.title}”?`;
                  if (!window.confirm(detail)) return;
                  deleteUnit(unit.id);
                }}
              >
                Delete unit
              </button>
            </div>
            {lessons.length ? lessons.map((lesson) => (
              <Link key={lesson.id} href={`/masteros/lessons/${lesson.id}`} className="mos-entity" style={{ marginBottom: 8 }}>
                <strong>{lesson.title}</strong>
                <p className="mos-muted">{formatDate(lesson.date)} · {lesson.duration} min · {lesson.status.replace("_", " ")}</p>
              </Link>
            )) : <p className="mos-muted">No lessons in this unit yet.</p>}
          </section>
        );
      })}
      <form className="mos-card" style={{ marginBottom: 16 }} onSubmit={submitUnit}>
        <header><h2>Add a unit</h2></header>
        <div className="mos-pad mos-actions">
          <input className="mos-ghost" style={{ flex: 1, height: 36 }} value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} placeholder="New unit title" />
          <button className="primary">Add unit</button>
        </div>
      </form>
      {!units.length ? <p className="mos-empty">Add units to this course, then drop lessons inside them.</p> : null}
      <section className="mos-card" style={{ marginTop: 20 }}>
        <header><h2>Skills in this course</h2></header>
        <div className="mos-pad" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {skills.map((skill) => <span key={skill.id} className="mos-chip" style={{ background: "var(--canvas)" }}>{skill.domain ? `${skill.domain}: ` : ""}{skill.name}</span>)}
        </div>
      </section>
      <section className="mos-card" style={{ marginTop: 16 }}>
        <header><h2>Course notes</h2></header>
        <form className="mos-pad" onSubmit={submitNote}>
          <label className="mos-field"><span>Private teacher note</span><textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <button className="primary">Save note</button>
        </form>
        {notes.map((item) => (
          <div key={item.id} className="mos-row"><div><strong>{item.text}</strong><p className="mos-muted">{formatDate(item.createdAt)}</p></div></div>
        ))}
      </section>
    </div>
  );
}
