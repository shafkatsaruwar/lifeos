import { ASSIGNMENT_LABEL, formatDate, percent } from "./helpers";
import { masteryLabel } from "./mastery";
import { courseProgress } from "./selectors";
import type { MasterOSState } from "./types";

export type ReportCourseSection = {
  courseId: string;
  courseName: string;
  courseStatus: string;
  progress: number;
  skills: { name: string; mastery: string; accuracy: number }[];
  assignments: { title: string; type: string; scoreLabel: string; date: string }[];
  assessment?: { title: string; scoreLabel: string; date: string };
};

export function buildStudentReportCard(state: MasterOSState, studentId: string): ReportCourseSection[] {
  const enrollments = state.enrollments.filter((item) => item.studentId === studentId);
  return enrollments.flatMap((enrollment) => {
    const course = state.courses.find((item) => item.id === enrollment.courseId);
    if (!course) return [];
    const courseSkills = state.skills.filter((item) => item.courseId === course.id);
    const skills = courseSkills.map((skill) => {
      const row = state.studentSkills.find((item) => item.studentId === studentId && item.skillId === skill.id);
      return {
        name: skill.name,
        mastery: masteryLabel(row?.masteryState ?? "not_started"),
        accuracy: row?.accuracy ?? 0,
      };
    });
    const assignments = state.assignments
      .filter((item) => item.studentId === studentId && item.courseId === course.id && item.score != null)
      .sort((a, b) => (b.dueDate ?? b.assignedDate).localeCompare(a.dueDate ?? a.assignedDate))
      .slice(0, 6)
      .map((item) => ({
        title: item.title,
        type: ASSIGNMENT_LABEL[item.type] ?? item.type,
        scoreLabel: `${item.score}/${item.totalPoints} (${percent(item.score, item.totalPoints)}%)`,
        date: formatDate(item.dueDate ?? item.assignedDate),
      }));
    const assessment = state.assessments
      .filter((item) => item.studentId === studentId && item.courseId === course.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return [{
      courseId: course.id,
      courseName: course.name,
      courseStatus: course.status.replace("_", " "),
      progress: courseProgress(state, studentId, course.id),
      skills,
      assignments,
      assessment: assessment
        ? {
            title: assessment.title,
            scoreLabel: `${assessment.score ?? "—"}${assessment.total ? ` / ${assessment.total}` : ""}`,
            date: formatDate(assessment.date),
          }
        : undefined,
    }];
  });
}
