"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatDate, SECTION_LABEL } from "@/lib/masteros/helpers";
import { useMasterOS } from "@/lib/masteros/store";

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, updateLesson, updateSection, reorderSections, deleteLesson } = useMasterOS();
  const lesson = state.lessons.find((item) => item.id === id);
  if (!lesson) return <div className="mos-page"><p>Lesson not found.</p></div>;
  const student = state.students.find((item) => item.id === lesson.studentId);
  const unit = state.units.find((item) => item.id === lesson.unitId);
  const course = state.courses.find((item) => item.id === unit?.courseId);
  const sections = state.lessonSections.filter((item) => item.lessonId === lesson.id).sort((a, b) => a.order - b.order);
  const skills = state.skills.filter((item) => lesson.skillIds.includes(item.id));

  const move = (index: number, dir: -1 | 1) => {
    const next = [...sections];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    reorderSections(lesson.id, next.map((item) => item.id));
  };

  return (
    <div className="mos-page">
      <div className="mos-top">
        <div>
          <p className="eyebrow">Lesson</p>
          <h1>{lesson.title}</h1>
          <p>{student?.name} · {course?.name} · {unit?.title} · {formatDate(lesson.date)} · {lesson.duration} min</p>
        </div>
        <div className="mos-actions">
          <select className="mos-ghost" value={lesson.status} onChange={(e) => updateLesson(lesson.id, { status: e.target.value as typeof lesson.status })}>
            <option value="planned">Planned</option>
            <option value="ready">Ready</option>
            <option value="in_progress">In progress</option>
            <option value="complete">Complete</option>
          </select>
          <Link className="primary" href={`/masteros/lessons/${lesson.id}/teach`}>Start Lesson</Link>
          <button
            className="mos-ghost"
            type="button"
            onClick={() => {
              if (!window.confirm(`Delete “${lesson.title}”? This cannot be undone.`)) return;
              deleteLesson(lesson.id);
              router.push("/masteros/lessons");
            }}
          >
            Delete
          </button>
        </div>
      </div>
      <section className="mos-card" style={{ marginBottom: 16 }}>
        <header><h2>Learning objective</h2></header>
        <div className="mos-pad">
          <p>{lesson.objective || "Add an objective."}</p>
          <p className="mos-muted" style={{ marginTop: 10 }}>Skills: {skills.map((item) => item.name).join(", ") || "None tagged"}</p>
          {lesson.notes ? <p className="mos-muted" style={{ marginTop: 8 }}>{lesson.notes}</p> : null}
          {course ? (
            <div className="mos-actions" style={{ marginTop: 12 }}>
              {state.skills.filter((item) => item.courseId === course.id).map((skill) => {
                const on = lesson.skillIds.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    className={on ? "primary" : "mos-ghost"}
                    onClick={() => updateLesson(lesson.id, {
                      skillIds: on ? lesson.skillIds.filter((id) => id !== skill.id) : [...lesson.skillIds, skill.id],
                    })}
                  >
                    {skill.name}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
      {sections.map((section, index) => (
        <article key={section.id} className="mos-section">
          <header>
            <strong>{SECTION_LABEL[section.type] ?? section.title}</strong>
            <div className="mos-actions">
              <button className="mos-ghost" type="button" onClick={() => move(index, -1)}>Up</button>
              <button className="mos-ghost" type="button" onClick={() => move(index, 1)}>Down</button>
              <button className="mos-ghost" type="button" onClick={() => updateSection(section.id, { complete: !section.complete })}>
                {section.complete ? "Done" : "Mark done"}
              </button>
            </div>
          </header>
          <textarea className="mos-field" style={{ width: "100%", minHeight: 90, border: "1px solid var(--line)", borderRadius: 9, padding: 10, background: "var(--panel)" }} value={section.content} onChange={(e) => updateSection(section.id, { content: e.target.value })} />
        </article>
      ))}
    </div>
  );
}
