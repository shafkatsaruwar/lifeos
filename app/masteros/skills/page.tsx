"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useMasterOS } from "@/lib/masteros/store";
import { formatDate } from "@/lib/masteros/helpers";
import { masteryLabel, masteryTone } from "@/lib/masteros/mastery";
import type { MasteryState } from "@/lib/masteros/types";

const ATTENTION: MasteryState[] = ["needs_review", "learning", "practicing"];

export default function SkillsPage() {
  const { state, addNote } = useMasterOS();
  const [studentId, setStudentId] = useState(state.students[0]?.id ?? "");
  const [courseId, setCourseId] = useState(state.courses[0]?.id ?? "");
  const [noteSkill, setNoteSkill] = useState("");
  const [note, setNote] = useState("");
  const student = state.students.find((item) => item.id === studentId);

  const rows = useMemo(() => {
    return state.skills
      .filter((skill) => !courseId || skill.courseId === courseId)
      .map((skill) => ({
        skill,
        ss: state.studentSkills.find((item) => item.studentId === studentId && item.skillId === skill.id),
        related: state.lessons.filter((lesson) => lesson.studentId === studentId && lesson.skillIds.includes(skill.id)),
      }))
      .sort((a, b) => (a.skill.domain ?? "").localeCompare(b.skill.domain ?? "") || a.skill.name.localeCompare(b.skill.name));
  }, [state, studentId, courseId]);

  const attention = rows.filter((row) => row.ss && ATTENTION.includes(row.ss.masteryState));

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim() || !noteSkill) return;
    addNote({ studentId, courseId, skillId: noteSkill, text: note.trim() });
    setNote("");
  };

  return (
    <div className="mos-page">
      <div className="mos-top">
        <div>
          <p className="eyebrow">Mastery</p>
          <h1>Skills</h1>
          <p>Every course defines its own skills. Mastery is the real progress meter.</p>
        </div>
      </div>

      <div className="mos-actions" style={{ marginBottom: 16 }}>
        <select className="mos-ghost" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          {state.students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="mos-ghost" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {state.courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>

      {attention.length > 0 && (
        <section className="mos-card" style={{ marginBottom: 16 }}>
          <header><h2>Needs attention · {student?.name}</h2></header>
          <div className="mos-pad" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {attention.map((row) => (
              <span
                key={row.skill.id}
                className="mos-chip"
                style={{ color: masteryTone(row.ss!.masteryState), background: `${masteryTone(row.ss!.masteryState)}22` }}
              >
                {row.skill.name}: {masteryLabel(row.ss!.masteryState)}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mos-skill-grid">
        {rows.map(({ skill, ss, related }) => (
          <article key={skill.id} className="mos-card mos-skill-card">
            <header>
              <h2>{skill.name}</h2>
              <span
                className="mos-chip"
                style={{ color: masteryTone(ss?.masteryState ?? "not_started"), background: `${masteryTone(ss?.masteryState ?? "not_started")}22` }}
              >
                {ss ? masteryLabel(ss.masteryState) : "Not started"}
              </span>
            </header>
            <div className="mos-pad">
              {skill.domain ? <p className="eyebrow" style={{ marginBottom: 8 }}>{skill.domain}</p> : null}
              {skill.description ? <p className="mos-muted">{skill.description}</p> : null}
              <div className="mos-grid mos-2" style={{ marginTop: 12, gap: 8 }}>
                <div><span className="mos-muted">Accuracy</span><strong style={{ display: "block" }}>{ss?.accuracy ?? 0}%</strong></div>
                <div><span className="mos-muted">Attempts</span><strong style={{ display: "block" }}>{ss?.attempts ?? 0}</strong></div>
                <div><span className="mos-muted">Recent</span><strong style={{ display: "block" }}>{ss?.recentAccuracy ?? 0}%</strong></div>
                <div><span className="mos-muted">Last practiced</span><strong style={{ display: "block" }}>{formatDate(ss?.lastPracticed)}</strong></div>
              </div>
              {related.length > 0 && (
                <p className="mos-muted" style={{ marginTop: 12 }}>
                  Lessons:{" "}
                  {related.map((lesson, index) => (
                    <span key={lesson.id}>{index > 0 && ", "}<Link href={`/masteros/lessons/${lesson.id}`}>{lesson.title}</Link></span>
                  ))}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      <section className="mos-card" style={{ marginTop: 16 }}>
        <header><h2>Skill note</h2></header>
        <form className="mos-pad" onSubmit={submitNote}>
          <label className="mos-field"><span>Skill</span>
            <select value={noteSkill} onChange={(e) => setNoteSkill(e.target.value)}>
              <option value="">Choose a skill</option>
              {rows.map((row) => <option key={row.skill.id} value={row.skill.id}>{row.skill.name}</option>)}
            </select>
          </label>
          <label className="mos-field"><span>Private teacher note</span><textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <button className="primary">Save note</button>
        </form>
      </section>
    </div>
  );
}
