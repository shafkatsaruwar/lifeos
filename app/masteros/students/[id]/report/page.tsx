"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { formatLongDate, todayKey } from "@/lib/masteros/helpers";
import { buildStudentReportCard } from "@/lib/masteros/reportCard";
import { useMasterOS } from "@/lib/masteros/store";

export default function StudentReportCardPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useMasterOS();
  const student = state.students.find((item) => item.id === id);
  if (!student) {
    return (
      <div className="mos-report">
        <p>Student not found.</p>
        <Link href="/masteros/students">Back to students</Link>
      </div>
    );
  }

  const sections = buildStudentReportCard(state, student.id);
  const issued = formatLongDate(todayKey());

  return (
    <div className="mos-report">
      <div className="mos-report-toolbar no-print">
        <Link className="mos-ghost" href={`/masteros/students/${student.id}`}>Back to profile</Link>
        <button className="primary" type="button" onClick={() => window.print()}>Print report</button>
      </div>

      <header className="mos-report-header">
        <p className="eyebrow">Progress report</p>
        <h1>{student.name}</h1>
        <p className="mos-muted">
          {student.gradeLevel ? `Grade ${student.gradeLevel}` : "Student progress"}
          {" · "}Issued {issued}
        </p>
      </header>

      {!sections.length ? (
        <p className="mos-empty">No enrolled courses yet. Enroll this student in a course to generate a report.</p>
      ) : null}

      {sections.map((course) => (
        <section key={course.courseId} className="mos-report-course">
          <div className="mos-report-course-top">
            <div>
              <h2>{course.courseName}</h2>
              <p className="mos-muted">{course.courseStatus}</p>
            </div>
            <div className="mos-report-progress">
              <span>Overall mastery</span>
              <strong>{course.progress}%</strong>
              <div className="mos-bar"><i style={{ width: `${course.progress}%` }} /></div>
            </div>
          </div>

          {course.skills.length ? (
            <div className="mos-report-block">
              <h3>Skills</h3>
              <div className="mos-report-grid">
                {course.skills.map((skill) => (
                  <article key={skill.name} className="mos-report-skill">
                    <strong>{skill.name}</strong>
                    <span>{skill.mastery}</span>
                    <small>{skill.accuracy}% accuracy</small>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {course.assignments.length ? (
            <div className="mos-report-block">
              <h3>Recent work</h3>
              <table className="mos-table">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Type</th>
                    <th>Due</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {course.assignments.map((item) => (
                    <tr key={`${item.title}-${item.date}`}>
                      <td>{item.title}</td>
                      <td>{item.type}</td>
                      <td>{item.date}</td>
                      <td>{item.scoreLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {course.assessment ? (
            <div className="mos-report-block">
              <h3>Latest assessment</h3>
              <p><strong>{course.assessment.title}</strong> · {course.assessment.date} · {course.assessment.scoreLabel}</p>
            </div>
          ) : null}
        </section>
      ))}

      <footer className="mos-report-footer">
        <p className="mos-muted">Prepared in MasterOS · Parent-friendly progress summary</p>
      </footer>
    </div>
  );
}
