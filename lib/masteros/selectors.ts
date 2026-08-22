import type { MasterOSState } from "./types";

export function selectStudent(state: MasterOSState, id: string) {
  return state.students.find((item) => item.id === id);
}

export function coursesForStudent(state: MasterOSState, studentId: string) {
  const ids = new Set(state.enrollments.filter((item) => item.studentId === studentId).map((item) => item.courseId));
  return state.courses.filter((item) => ids.has(item.id));
}

export function studentsForCourse(state: MasterOSState, courseId: string) {
  const ids = new Set(state.enrollments.filter((item) => item.courseId === courseId).map((item) => item.studentId));
  return state.students.filter((item) => ids.has(item.id));
}

export function unitsForCourse(state: MasterOSState, courseId: string) {
  return state.units.filter((item) => item.courseId === courseId).sort((a, b) => a.order - b.order);
}

export function attentionSkills(state: MasterOSState, studentId: string) {
  return state.studentSkills
    .filter((item) => item.studentId === studentId)
    .filter((item) => item.masteryState === "needs_review" || item.masteryState === "learning" || item.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy);
}

export function courseProgress(state: MasterOSState, studentId: string, courseId: string) {
  const courseSkills = state.skills.filter((item) => item.courseId === courseId);
  if (!courseSkills.length) return 0;
  const rows = courseSkills.map((skill) => state.studentSkills.find((item) => item.studentId === studentId && item.skillId === skill.id));
  const score = rows.reduce((sum, row) => {
    if (!row || row.masteryState === "not_started") return sum;
    if (row.masteryState === "mastered") return sum + 1;
    if (row.masteryState === "proficient") return sum + 0.8;
    if (row.masteryState === "practicing") return sum + 0.5;
    if (row.masteryState === "learning" || row.masteryState === "needs_review") return sum + 0.25;
    return sum;
  }, 0);
  return Math.round((score / courseSkills.length) * 100);
}
