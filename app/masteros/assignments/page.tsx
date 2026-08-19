"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMasterOS } from "@/lib/masteros/store";
import { ASSIGNMENT_LABEL, assignmentStatusLabel, formatDate, scorePercent, todayKey } from "@/lib/masteros/helpers";
import type { AssignmentType } from "@/lib/masteros/types";

function AssignmentsInner() {
  const { state, addAssignment } = useMasterOS();
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get("new") === "1");
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState(state.courses[0]?.id ?? "");
  const [studentId, setStudentId] = useState(state.students[0]?.id ?? "");
  const [type, setType] = useState<AssignmentType>("homework");
  const [dueDate, setDueDate] = useState("");

  const rows = useMemo(
    () => [...state.assignments].sort((a, b) => b.assignedDate.localeCompare(a.assignedDate)),
    [state.assignments],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    addAssignment({
      courseId,
      studentId,
      title: title.trim(),
      type,
      assignedDate: todayKey(),
      dueDate: dueDate || undefined,
      status: "assigned",
      totalPoints: 10,
    });
    setTitle("");
    setOpen(false);
  };

  return (
    <div className="mos-page">
      <div className="mos-top">
        <div>
          <p className="eyebrow">Practice loop</p>
          <h1>Assignments</h1>
          <p>Homework, practice, quizzes, tests, and diagnostics — then tag misses to skills.</p>
        </div>
        <button className="primary" type="button" onClick={() => setOpen(true)}>New assignment</button>
      </div>

      <section className="mos-card">
        <table className="mos-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Student</th>
              <th>Type</th>
              <th>Due</th>
              <th>Status</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((assignment) => {
              const student = state.students.find((item) => item.id === assignment.studentId);
              return (
                <tr key={assignment.id}>
                  <td><Link href={`/masteros/assignments/${assignment.id}`}>{assignment.title}</Link></td>
                  <td>{student?.name}</td>
                  <td>{ASSIGNMENT_LABEL[assignment.type]}</td>
                  <td>{formatDate(assignment.dueDate)}</td>
                  <td><span className="mos-chip">{assignmentStatusLabel(assignment.status)}</span></td>
                  <td>{assignment.score != null ? scorePercent(assignment.score, assignment.totalPoints) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {open ? (
        <div className="mos-modal" onClick={() => setOpen(false)}>
          <form onClick={(event) => event.stopPropagation()} onSubmit={submit}>
            <h2 style={{ marginTop: 0 }}>New assignment</h2>
            <label className="mos-field"><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></label>
            <label className="mos-field"><span>Type</span>
              <select value={type} onChange={(e) => setType(e.target.value as AssignmentType)}>
                {Object.entries(ASSIGNMENT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="mos-field"><span>Course</span>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {state.courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="mos-field"><span>Student</span>
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                {state.students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="mos-field"><span>Due date</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
            <div className="mos-actions"><button className="mos-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary">Create</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<div className="mos-page"><p className="mos-muted">Loading assignments…</p></div>}>
      <AssignmentsInner />
    </Suspense>
  );
}
