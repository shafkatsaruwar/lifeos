"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SECTION_LABEL } from "@/lib/masteros/helpers";
import { useMasterOS } from "@/lib/masteros/store";

function TeachingModeInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, updateLesson, updateSection, addNote, completeLesson } = useMasterOS();
  const lesson = state.lessons.find((item) => item.id === id);
  const sections = useMemo(
    () => state.lessonSections.filter((item) => item.lessonId === id).sort((a, b) => a.order - b.order),
    [state.lessonSections, id],
  );
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [liveNote, setLiveNote] = useState("");
  const [wrap, setWrap] = useState(false);
  const [understood, setUnderstood] = useState("Mostly — needs another pass on setup");
  const [homework, setHomework] = useState("");
  const [nextNotes, setNextNotes] = useState("");
  const [improved, setImproved] = useState<string[]>([]);
  const [weak, setWeak] = useState<string[]>([]);

  useEffect(() => {
    if (!running || wrap) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running, wrap]);

  useEffect(() => {
    if (lesson && (lesson.status === "planned" || lesson.status === "ready")) {
      updateLesson(lesson.id, { status: "in_progress" });
    }
  }, [lesson, updateLesson]);

  useEffect(() => {
    const hw = sections.find((item) => item.type === "homework");
    if (hw?.content) setHomework((value) => value || hw.content);
  }, [sections]);

  if (!lesson) return <div className="mos-teach"><p>Lesson not found.</p></div>;
  const student = state.students.find((item) => item.id === lesson.studentId);
  const section = sections[index];
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const skills = state.skills.filter((item) => lesson.skillIds.includes(item.id));

  const saveLiveNote = () => {
    if (!liveNote.trim()) return;
    addNote({ studentId: lesson.studentId, lessonId: lesson.id, text: liveNote.trim() });
    setLiveNote("");
  };

  const finish = () => {
    completeLesson(lesson.id, { understood, improvedSkillIds: improved, weakSkillIds: weak, homework, nextNotes });
    router.push(`/masteros/lessons/${lesson.id}`);
  };

  if (wrap) {
    return (
      <div className="mos-teach">
        <div className="mos-teach-stage">
          <p className="eyebrow">Lesson wrap-up</p>
          <h2>How did it go?</h2>
          <label className="mos-field"><span>How well did {student?.name} understand today’s lesson?</span>
            <textarea value={understood} onChange={(e) => setUnderstood(e.target.value)} />
          </label>
          <p className="mos-muted">Skills improved</p>
          <div className="mos-actions" style={{ margin: "8px 0 16px" }}>
            {skills.map((skill) => (
              <button key={skill.id} type="button" className={improved.includes(skill.id) ? "primary" : "mos-ghost"} onClick={() => setImproved((curr) => curr.includes(skill.id) ? curr.filter((id) => id !== skill.id) : [...curr, skill.id])}>{skill.name}</button>
            ))}
          </div>
          <p className="mos-muted">Skills still weak</p>
          <div className="mos-actions" style={{ margin: "8px 0 16px" }}>
            {skills.map((skill) => (
              <button key={skill.id} type="button" className={weak.includes(skill.id) ? "primary" : "mos-ghost"} onClick={() => setWeak((curr) => curr.includes(skill.id) ? curr.filter((id) => id !== skill.id) : [...curr, skill.id])}>{skill.name}</button>
            ))}
          </div>
          <label className="mos-field"><span>Homework assigned</span><input value={homework} onChange={(e) => setHomework(e.target.value)} /></label>
          <label className="mos-field"><span>Notes for next lesson</span><textarea value={nextNotes} onChange={(e) => setNextNotes(e.target.value)} /></label>
          <div className="mos-actions">
            <button className="mos-ghost" onClick={() => setWrap(false)}>Back</button>
            <button className="primary" onClick={finish}>Save wrap-up</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mos-teach">
      <div className="mos-teach-top">
        <div>
          <p className="eyebrow">{student?.name}</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 28, margin: 0 }}>{lesson.title}</h1>
          <p className="mos-muted">{section ? `${index + 1} / ${sections.length} · ${SECTION_LABEL[section.type]}` : "No sections"}</p>
        </div>
        <div className="mos-timer">
          <strong>{mm}:{ss}</strong>
          <button className="mos-ghost" onClick={() => setRunning((value) => !value)}>{running ? "Pause" : "Resume"}</button>
        </div>
      </div>
      <div className="mos-section-nav">
        {sections.map((item, i) => (
          <button key={item.id} className={i === index ? "active" : ""} onClick={() => setIndex(i)}>{SECTION_LABEL[item.type] ?? item.title}</button>
        ))}
      </div>
      <div className="mos-teach-stage">
        <h2>{section?.title}</h2>
        <p>{section?.content || "Add content on the lesson page."}</p>
        <div className="mos-actions" style={{ marginTop: 24 }}>
          <button className="mos-ghost" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>Previous</button>
          <button className="primary" onClick={() => {
            if (section) updateSection(section.id, { complete: true });
            if (index < sections.length - 1) setIndex(index + 1);
            else setWrap(true);
          }}>{index < sections.length - 1 ? "Next" : "Wrap up"}</button>
        </div>
        <label className="mos-field" style={{ marginTop: 32 }}>
          <span>Quick observation</span>
          <textarea value={liveNote} onChange={(e) => setLiveNote(e.target.value)} placeholder="Rushed through percentage setup." />
        </label>
        <button className="mos-ghost" onClick={saveLiveNote}>Save note</button>
        <div style={{ marginTop: 24 }}><Link href={`/masteros/lessons/${lesson.id}`}>Exit teaching mode</Link></div>
      </div>
    </div>
  );
}

export default TeachingModeInner;
