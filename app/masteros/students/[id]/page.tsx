"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { masteryLabel, masteryTone } from "@/lib/masteros/mastery";
import { ASSIGNMENT_LABEL, formatDate, percent } from "@/lib/masteros/helpers";
import { attentionSkills, courseProgress, coursesForStudent, useMasterOS } from "@/lib/masteros/store";

const TABS = ["Overview", "Courses", "Assignments", "Assessments", "Skills", "Notes"] as const;

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { state, addNote } = useMasterOS();
  const student = state.students.find((item) => item.id === id);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [note, setNote] = useState("");
  if (!student) return <div className="mos-page"><p>Student not found.</p></div>;

  const courses = coursesForStudent(state, student.id);
  const assignments = state.assignments.filter((item) => item.studentId === student.id);
  const assessments = state.assessments.filter((item) => item.studentId === student.id);
  const skills = state.studentSkills.filter((item) => item.studentId === student.id);
  const notes = state.teacherNotes.filter((item) => item.studentId === student.id);
  const weak = attentionSkills(state, student.id);

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) return;
    addNote({ studentId: student.id, text: note.trim() });
    setNote("");
  };

  return (
    <div className="mos-page">
      <div className="mos-top">
        <div>
          <p className="eyebrow">Student</p>
          <h1>{student.name}</h1>
          <p>{student.gradeLevel ? `Grade ${student.gradeLevel}` : "No grade label"} · {courses.map((item) => item.name).join(", ") || "No courses yet"}</p>
        </div>
      </div>
      <div className="mos-tabs">
        {TABS.map((item) => (
          <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="mos-grid mos-2">
          <section className="mos-card">
            <header><h2>Skills needing attention</h2></header>
            <div className="mos-pad">
              {weak.length ? weak.map((row) => {
                const skill = state.skills.find((item) => item.id === row.skillId);
                return (
                  <div key={row.skillId} className="mos-skill">
                    <div>
                      <strong>{skill?.name}</strong>
                      <p className="mos-muted" style={{ margin: "3px 0 0" }}>{row.accuracy}% · {row.attempts} attempts</p>
                    </div>
                    <span className="mos-chip" style={{ color: masteryTone(row.masteryState), background: `${masteryTone(row.masteryState)}22` }}>{masteryLabel(row.masteryState)}</span>
                  </div>
                );
              }) : <p className="mos-empty">No weak skills right now.</p>}
            </div>
          </section>
          <section className="mos-card">
            <header><h2>Recent scores</h2></header>
            {assignments.filter((item) => item.score != null).slice(-5).reverse().map((item) => (
              <div key={item.id} className="mos-row">
                <div style={{ flex: 1 }}><strong>{item.title}</strong><p className="mos-muted" style={{ margin: "3px 0 0" }}>{ASSIGNMENT_LABEL[item.type]} · {formatDate(item.dueDate)}</p></div>
                <strong>{percent(item.score, item.totalPoints)}%</strong>
              </div>
            ))}
            {student.notes ? <div className="mos-pad"><p className="mos-muted">{student.notes}</p></div> : null}
          </section>
        </div>
      )}

      {tab === "Courses" && courses.map((course) => (
        <Link key={course.id} href={`/masteros/courses/${course.id}`} className="mos-entity" style={{ marginBottom: 10 }}>
          <strong>{course.name}</strong>
          <p className="mos-muted">{courseProgress(state, student.id, course.id)}% mastery · {course.status}</p>
          <div className="mos-bar" style={{ marginTop: 10 }}><i style={{ width: `${courseProgress(state, student.id, course.id)}%` }} /></div>
        </Link>
      ))}

      {tab === "Assignments" && assignments.map((item) => (
        <Link key={item.id} href={`/masteros/assignments/${item.id}`} className="mos-entity" style={{ marginBottom: 10 }}>
          <strong>{item.title}</strong>
          <p className="mos-muted">{ASSIGNMENT_LABEL[item.type]} · {item.status} · {item.score != null ? `${percent(item.score, item.totalPoints)}%` : "Ungraded"}</p>
        </Link>
      ))}

      {tab === "Assessments" && assessments.map((item) => {
        const math = item.skillScores?.filter((row) => {
          const skill = state.skills.find((s) => s.id === row.skillId);
          return skill?.domain === "Math";
        }) ?? [];
        const rw = item.skillScores?.filter((row) => {
          const skill = state.skills.find((s) => s.id === row.skillId);
          return skill?.domain === "Reading/Writing";
        }) ?? [];
        const other = item.skillScores?.filter((row) => {
          const skill = state.skills.find((s) => s.id === row.skillId);
          return skill?.domain !== "Math" && skill?.domain !== "Reading/Writing";
        }) ?? [];
        return (
          <div key={item.id} className="mos-card" style={{ marginBottom: 12 }}>
            <header>
              <h2>{item.title}</h2>
              <span className="mos-chip">{item.type}</span>
            </header>
            <div className="mos-pad">
              <p className="mos-muted">{formatDate(item.date)}</p>
              <div className="mos-grid mos-3" style={{ margin: "14px 0" }}>
                {item.sections?.map((section) => (
                  <article key={section.label} className="mos-stat">
                    <span>{section.label}</span>
                    <strong>{section.score}{section.total ? ` / ${section.total}` : ""}</strong>
                  </article>
                ))}
                <article className="mos-stat">
                  <span>Total</span>
                  <strong>{item.score}{item.total ? ` / ${item.total}` : ""}</strong>
                </article>
              </div>
              {[["Math", math], ["Reading/Writing", rw], ["Skills", other]].map(([label, rows]) => {
                const list = rows as typeof math;
                if (!list.length) return null;
                return (
                  <div key={String(label)} style={{ marginBottom: 12 }}>
                    <p className="eyebrow">{String(label)}</p>
                    {list.map((row) => {
                      const skill = state.skills.find((s) => s.id === row.skillId);
                      return (
                        <div key={row.skillId} className="mos-skill">
                          <span>{skill?.name}</span>
                          <strong>{row.accuracy}%</strong>
                          <div className="mos-bar" style={{ gridColumn: "1 / -1" }}><i style={{ width: `${row.accuracy}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {tab === "Skills" && (
        <section className="mos-card"><div className="mos-pad">
          {skills.map((row) => {
            const skill = state.skills.find((item) => item.id === row.skillId);
            return (
              <div key={row.skillId} className="mos-skill">
                <div><strong>{skill?.name}</strong><p className="mos-muted">{row.accuracy}% · {row.attempts} questions · last {formatDate(row.lastPracticed)}</p></div>
                <span className="mos-chip" style={{ color: masteryTone(row.masteryState), background: `${masteryTone(row.masteryState)}22` }}>{masteryLabel(row.masteryState)}</span>
              </div>
            );
          })}
        </div></section>
      )}

      {tab === "Notes" && (
        <section className="mos-card">
          <form className="mos-pad" onSubmit={submitNote}>
            <label className="mos-field"><span>Private teacher note</span><textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
            <button className="primary">Save note</button>
          </form>
          {notes.map((item) => (
            <div key={item.id} className="mos-row"><div><strong>{item.text}</strong><p className="mos-muted">{formatDate(item.createdAt)}</p></div></div>
          ))}
        </section>
      )}
    </div>
  );
}
