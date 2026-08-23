"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { initials } from "@/lib/masteros/helpers";
import { attentionSkills, courseProgress, coursesForStudent, useMasterOS } from "@/lib/masteros/store";

function StudentsInner() {
  const { state, addStudent, deleteStudent } = useMasterOS();
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get("new") === "1");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    addStudent({ name: name.trim(), gradeLevel: grade.trim() || undefined });
    setName(""); setGrade(""); setOpen(false);
  };

  return (
    <div className="mos-page">
      <div className="mos-top">
        <div><p className="eyebrow">People</p><h1>Students</h1><p>Profiles, courses, and the skills that need a next lesson.</p></div>
        <button className="primary" onClick={() => setOpen(true)}>Add student</button>
      </div>
      <div className="mos-list-page">
        {state.students.map((student) => {
          const course = coursesForStudent(state, student.id)[0];
          const progress = course ? courseProgress(state, student.id, course.id) : 0;
          const weak = attentionSkills(state, student.id)[0];
          const skill = weak ? state.skills.find((item) => item.id === weak.skillId) : null;
          return (
            <article key={student.id} className="mos-entity" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <Link href={`/masteros/students/${student.id}`} style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <span className="mos-avatar">{initials(student.name)}</span>
                  <div style={{ flex: 1 }}>
                    <strong>{student.name}</strong>
                    <p className="mos-muted" style={{ margin: "4px 0 0" }}>{student.gradeLevel ? `Grade ${student.gradeLevel}` : "No grade"} · {course?.name ?? "No course"} · {progress}% mastery</p>
                  </div>
                  {skill ? <span className="mos-chip" style={{ background: "#cf625a18", color: "#cf625a" }}>{skill.name}</span> : null}
                </div>
              </Link>
              <button
                className="mos-ghost"
                type="button"
                onClick={() => {
                  if (!window.confirm(`Delete “${student.name}” and all their lessons, assignments, and progress?`)) return;
                  deleteStudent(student.id);
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
          <form onClick={(event) => event.stopPropagation()} onSubmit={submit}>
            <h2 style={{ marginTop: 0 }}>Add student</h2>
            <label className="mos-field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
            <label className="mos-field"><span>Grade / label</span><input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="11" /></label>
            <div className="mos-actions"><button className="mos-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary">Save</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<div className="mos-page"><p className="mos-muted">Loading students…</p></div>}>
      <StudentsInner />
    </Suspense>
  );
}
