"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useMasterOS } from "@/lib/masteros/store";
import { studentsForClass } from "@/lib/masteros/selectors";

function ClassesInner() {
  const { state, addClass, deleteClass } = useMasterOS();
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get("new") === "1");
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState("");
  const [courseId, setCourseId] = useState(state.courses[0]?.id ?? "");
  const [studentIds, setStudentIds] = useState<string[]>([]);

  const toggleStudent = (id: string) => {
    setStudentIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    addClass({
      name: name.trim(),
      courseId: courseId || undefined,
      schedule: schedule.trim() || undefined,
      studentIds,
    });
    setName("");
    setSchedule("");
    setStudentIds([]);
    setOpen(false);
  };

  const sorted = useMemo(
    () => [...state.classes].sort((a, b) => a.name.localeCompare(b.name)),
    [state.classes],
  );

  return (
    <div className="mos-page">
      <div className="mos-top">
        <div>
          <p className="eyebrow">Groups</p>
          <h1>Classes</h1>
          <p>Teach one student or many — a class is your roster for a course or session block.</p>
        </div>
        <button className="primary" type="button" onClick={() => setOpen(true)}>Add class</button>
      </div>
      <div className="mos-list-page">
        {sorted.map((teachingClass) => {
          const roster = studentsForClass(state, teachingClass.id);
          const course = state.courses.find((item) => item.id === teachingClass.courseId);
          return (
            <article key={teachingClass.id} className="mos-entity" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{teachingClass.name}</strong>
                <p className="mos-muted" style={{ margin: "4px 0 0" }}>
                  {roster.length} student{roster.length === 1 ? "" : "s"}
                  {course ? ` · ${course.name}` : ""}
                  {teachingClass.schedule ? ` · ${teachingClass.schedule}` : ""}
                </p>
                {roster.length ? (
                  <p className="mos-muted" style={{ margin: "6px 0 0", fontSize: 12 }}>
                    {roster.map((item) => item.name).join(" · ")}
                  </p>
                ) : null}
              </div>
              <button
                className="mos-ghost"
                type="button"
                onClick={() => {
                  if (!window.confirm(`Delete “${teachingClass.name}”? Students and courses stay — only the group is removed.`)) return;
                  deleteClass(teachingClass.id);
                }}
              >
                Delete
              </button>
            </article>
          );
        })}
        {!sorted.length ? <p className="mos-empty">No classes yet. Group students for group lessons or recurring sessions.</p> : null}
      </div>
      {open ? (
        <div className="mos-modal" onClick={() => setOpen(false)}>
          <form onClick={(event) => event.stopPropagation()} onSubmit={submit}>
            <h2 style={{ marginTop: 0 }}>Add class</h2>
            <label className="mos-field">
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="SAT Saturday Group" />
            </label>
            <label className="mos-field">
              <span>Course</span>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">No linked course</option>
                {state.courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
            </label>
            <label className="mos-field">
              <span>Schedule</span>
              <input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="Sat 10:00" />
            </label>
            <div className="mos-field">
              <span>Students</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {state.students.map((student) => (
                  <label key={student.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={studentIds.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                    />
                    {student.name}
                    {student.gradeLevel ? ` · Grade ${student.gradeLevel}` : ""}
                  </label>
                ))}
              </div>
            </div>
            <div className="mos-actions">
              <button className="mos-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="primary" type="submit">Save</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default function ClassesPage() {
  return (
    <Suspense fallback={<div className="mos-page"><p className="mos-muted">Loading classes…</p></div>}>
      <ClassesInner />
    </Suspense>
  );
}
