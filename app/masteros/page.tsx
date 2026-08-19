"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Plus } from "lucide-react";
import { masteryLabel, masteryTone } from "@/lib/masteros/mastery";
import { formatDate, initials, percent, todayKey } from "@/lib/masteros/helpers";
import { attentionSkills, courseProgress, coursesForStudent, useMasterOS } from "@/lib/masteros/store";
import { MISTAKE_LABEL } from "@/lib/masteros/helpers";

export default function MasterOSHome() {
  const { state } = useMasterOS();
  const today = todayKey();
  const lessons = [...state.lessons].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = lessons.filter((item) => item.status !== "complete").slice(0, 4);
  const results = [...state.assignments.filter((item) => item.status === "graded"), ...state.assessments.map((item) => ({
    id: item.id, title: item.title, score: item.score, totalPoints: item.total, studentId: item.studentId, type: item.type, dueDate: item.date,
  }))].slice(0, 6);
  const diagnostic = state.assessments.find((item) => item.type === "diagnostic");
  const mistakes = state.questionResults.filter((item) => item.mistakeType);
  const topMistake = Object.entries(
    mistakes.reduce<Record<string, number>>((acc, item) => {
      if (item.mistakeType) acc[item.mistakeType] = (acc[item.mistakeType] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="mos-page">
      <div className="os-hero" style={{ marginBottom: 22 }}>
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1>MasterOS</h1>
          <p>Create the lesson, teach it, assign practice, then let skill mastery tell you what comes next.</p>
        </div>
      </div>

      <div className="mos-quick">
        <Link href="/masteros/lessons?new=1"><Plus size={16} /> New Lesson</Link>
        <Link href="/masteros/assignments?new=1"><Plus size={16} /> New Assignment</Link>
        <Link href="/masteros/students?new=1"><Plus size={16} /> Add Student</Link>
        <Link href="/masteros/courses?new=1"><Plus size={16} /> Add Course</Link>
        <Link href="/masteros/questions?new=1"><Plus size={16} /> Add Question</Link>
      </div>

      <div className="mos-grid mos-2">
        <section className="mos-card">
          <header><div><h2>Today’s teaching</h2></div><Link href="/masteros/lessons">All lessons <ChevronRight size={14} /></Link></header>
          {upcoming.length ? upcoming.map((lesson) => {
            const student = state.students.find((item) => item.id === lesson.studentId);
            const unit = state.units.find((item) => item.id === lesson.unitId);
            const course = state.courses.find((item) => item.id === unit?.courseId);
            return (
              <div key={lesson.id} className="mos-pad" style={{ borderBottom: "1px solid var(--line)" }}>
                <div className="mos-row" style={{ border: 0, padding: 0 }}>
                  <div style={{ flex: 1 }}>
                    <strong>{lesson.title}</strong>
                    <p className="mos-muted" style={{ margin: "4px 0 0" }}>{student?.name} · {course?.name} · {unit?.title} · {formatDate(lesson.date)}</p>
                  </div>
                  <span className="mos-chip" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>{lesson.status.replace("_", " ")}</span>
                  <Link className="primary" href={`/masteros/lessons/${lesson.id}/teach`}>Start Lesson</Link>
                </div>
              </div>
            );
          }) : <p className="mos-empty">No upcoming lessons. Plan one from Lessons.</p>}
        </section>

        <section className="mos-card">
          <header><h2>Needs attention</h2></header>
          <div className="mos-pad">
            {state.students.map((student) => {
              const weak = attentionSkills(state, student.id).slice(0, 3);
              if (!weak.length) return null;
              return (
                <div key={student.id} style={{ marginBottom: 14 }}>
                  <Link href={`/masteros/students/${student.id}`} style={{ fontWeight: 800, textDecoration: "none", color: "inherit" }}>{student.name}</Link>
                  {weak.map((row) => {
                    const skill = state.skills.find((item) => item.id === row.skillId);
                    return (
                      <div key={row.skillId} className="mos-skill">
                        <span>{skill?.name}</span>
                        <span className="mos-chip" style={{ color: masteryTone(row.masteryState), background: `${masteryTone(row.masteryState)}22` }}>{masteryLabel(row.masteryState)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {topMistake ? <p className="mos-muted">Most common mistake: {MISTAKE_LABEL[topMistake[0]]} ({topMistake[1]}).</p> : null}
          </div>
        </section>
      </div>

      {diagnostic ? (
        <section className="mos-card" style={{ marginTop: 16 }}>
          <header>
            <h2>Latest diagnostic</h2>
            <Link href={`/masteros/students/${diagnostic.studentId}`}>Open profile <ChevronRight size={14} /></Link>
          </header>
          <div className="mos-pad">
            <div className="mos-grid mos-3">
              {diagnostic.sections?.map((section) => (
                <article key={section.label} className="mos-stat">
                  <span>{section.label}</span>
                  <strong>{section.score}{section.total ? ` / ${section.total}` : ""}</strong>
                </article>
              ))}
              <article className="mos-stat">
                <span>Total</span>
                <strong>{diagnostic.score}{diagnostic.total ? ` / ${diagnostic.total}` : ""}</strong>
              </article>
            </div>
            <div className="mos-grid mos-2" style={{ marginTop: 14 }}>
              {diagnostic.skillScores?.slice(0, 8).map((row) => {
                const skill = state.skills.find((item) => item.id === row.skillId);
                return (
                  <div key={row.skillId} className="mos-skill">
                    <span>{skill?.name}</span>
                    <strong>{row.accuracy}%</strong>
                    <div className="mos-bar" style={{ gridColumn: "1 / -1" }}><i style={{ width: `${row.accuracy}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <div className="mos-grid mos-2" style={{ marginTop: 16 }}>
        <section className="mos-card">
          <header><h2>Students</h2><Link href="/masteros/students">All <ChevronRight size={14} /></Link></header>
          {state.students.map((student) => {
            const course = coursesForStudent(state, student.id)[0];
            const progress = course ? courseProgress(state, student.id, course.id) : 0;
            const recent = state.assignments.filter((item) => item.studentId === student.id && item.score != null).slice(-1)[0];
            return (
              <Link key={student.id} href={`/masteros/students/${student.id}`} className="mos-student">
                <span className="mos-avatar">{initials(student.name)}</span>
                <span style={{ flex: 1 }}>
                  <strong>{student.name}</strong>
                  <small className="mos-muted" style={{ display: "block" }}>{course?.name ?? "No course"} · {progress}% mastery</small>
                  <div className="mos-bar" style={{ marginTop: 8 }}><i style={{ width: `${progress}%` }} /></div>
                </span>
                <small className="mos-muted">{recent ? `${percent(recent.score, recent.totalPoints)}% last` : "—"}</small>
              </Link>
            );
          })}
        </section>

        <section className="mos-card">
          <header><h2>Recent results</h2></header>
          {results.length ? results.map((item) => {
            const student = state.students.find((row) => row.id === item.studentId);
            return (
              <div key={item.id} className="mos-row">
                <CheckCircle2 size={16} color="var(--accent)" />
                <div style={{ flex: 1 }}>
                  <strong>{item.title}</strong>
                  <p className="mos-muted" style={{ margin: "3px 0 0" }}>{student?.name} · {formatDate("dueDate" in item ? item.dueDate : today)}</p>
                </div>
                <strong>{item.score}{item.totalPoints ? ` / ${item.totalPoints}` : ""}</strong>
              </div>
            );
          }) : <p className="mos-empty">Graded work will land here.</p>}
        </section>
      </div>
    </div>
  );
}
