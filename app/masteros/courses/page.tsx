"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { courseProgress, studentsForCourse, useMasterOS } from "@/lib/masteros/store";

function CoursesInner() {
  const { state, addCourse, deleteCourse } = useMasterOS();
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get("new") === "1");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [studentId, setStudentId] = useState(state.students[0]?.id ?? "");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    addCourse({ name: name.trim(), description: description.trim(), status: "active", startDate: new Date().toISOString().slice(0, 10) }, studentId || undefined);
    setOpen(false); setName(""); setDescription("");
  };

  return (
    <div className="mos-page">
      <div className="mos-top">
        <div><p className="eyebrow">Curriculum</p><h1>Courses</h1><p>Any subject. Units and lessons live inside the course — SAT is just one configuration.</p></div>
        <button className="primary" onClick={() => setOpen(true)}>Add course</button>
      </div>
      <div className="mos-list-page">
        {state.courses.map((course) => {
          const students = studentsForCourse(state, course.id);
          const progress = students[0] ? courseProgress(state, students[0].id, course.id) : 0;
          const units = state.units.filter((item) => item.courseId === course.id).length;
          return (
            <article key={course.id} className="mos-entity" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <Link href={`/masteros/courses/${course.id}`} style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
                <strong>{course.name}</strong>
                <p className="mos-muted">{course.description}</p>
                <p className="mos-muted" style={{ marginTop: 8 }}>{students.map((item) => item.name).join(", ") || "No students"} · {units} units · {course.status} · {progress}%</p>
                <div className="mos-bar" style={{ marginTop: 10 }}><i style={{ width: `${progress}%` }} /></div>
              </Link>
              <button
                className="mos-ghost"
                type="button"
                onClick={() => {
                  if (!window.confirm(`Delete “${course.name}” and all its units, lessons, and assignments?`)) return;
                  deleteCourse(course.id);
                }}
              >
                Delete
              </button>
            </article>
          );
        })}
      </div>
      {open ? (
        <div className="mos-modal" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h2 style={{ marginTop: 0 }}>Add course</h2>
            <label className="mos-field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="CompTIA A+, Algebra 1, SAT Prep…" /></label>
            <label className="mos-field"><span>Description</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} /></label>
            <label className="mos-field"><span>Enroll student</span>
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">None yet</option>
                {state.students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <div className="mos-actions"><button className="mos-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary">Save</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={<div className="mos-page"><p className="mos-muted">Loading courses…</p></div>}>
      <CoursesInner />
    </Suspense>
  );
}
