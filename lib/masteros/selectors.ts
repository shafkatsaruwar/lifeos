import type { Lesson, MasterOSState } from "./types";

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

export function studentsForClass(state: MasterOSState, classId: string) {
  const teachingClass = state.classes.find((item) => item.id === classId);
  if (!teachingClass) return [];
  const ids = new Set(teachingClass.studentIds);
  return state.students.filter((item) => ids.has(item.id));
}

export function classesForStudent(state: MasterOSState, studentId: string) {
  return state.classes.filter((item) => item.studentIds.includes(studentId));
}

/** Subject label for a lesson: skill domain when known, otherwise course name. */
export function lessonSubject(state: MasterOSState, lessonId: string): string {
  const lesson = state.lessons.find((item) => item.id === lessonId);
  if (!lesson) return "Uncategorized";
  const domainCounts = new Map<string, number>();
  for (const skillId of lesson.skillIds) {
    const domain = state.skills.find((item) => item.id === skillId)?.domain?.trim();
    if (!domain) continue;
    domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
  }
  if (domainCounts.size) {
    return [...domainCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  }
  const unit = state.units.find((item) => item.id === lesson.unitId);
  const course = state.courses.find((item) => item.id === unit?.courseId);
  const courseName = course?.name?.trim();
  if (!courseName) return "Uncategorized";
  // "SAT PREP - MATH" → group under Math; keep full name when no subject suffix.
  const dash = courseName.lastIndexOf(" - ");
  if (dash > 0) {
    const suffix = courseName.slice(dash + 3).trim();
    if (suffix) return suffix;
  }
  return courseName;
}

/** Curriculum order: unit sequence, then date, then natural title sort. */
export function compareLessonsByCurriculum(state: MasterOSState, a: Lesson, b: Lesson): number {
  const unitA = state.units.find((item) => item.id === a.unitId);
  const unitB = state.units.find((item) => item.id === b.unitId);
  const orderDiff = (unitA?.order ?? Number.MAX_SAFE_INTEGER) - (unitB?.order ?? Number.MAX_SAFE_INTEGER);
  if (orderDiff !== 0) return orderDiff;
  const dateDiff = a.date.localeCompare(b.date);
  if (dateDiff !== 0) return dateDiff;
  return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
}

export function groupLessonsBySubject(state: MasterOSState) {
  const groups = new Map<string, typeof state.lessons>();
  for (const lesson of state.lessons) {
    const subject = lessonSubject(state, lesson.id);
    const list = groups.get(subject) ?? [];
    list.push(lesson);
    groups.set(subject, list);
  }
  return [...groups.entries()]
    .map(([label, lessons]) => ({
      label,
      lessons: [...lessons].sort((a, b) => compareLessonsByCurriculum(state, a, b)),
    }))
    .sort((a, b) => {
      if (a.label === "Uncategorized") return 1;
      if (b.label === "Uncategorized") return -1;
      return a.label.localeCompare(b.label);
    });
}

export type LessonListGroup = {
  key: string;
  label: string;
  subtitle: string;
  kind: "course" | "subject";
  lessons: Lesson[];
};

/** Group lessons for the list page: by course when multiple courses appear, otherwise by subject. */
export function groupLessonsForList(state: MasterOSState): LessonListGroup[] {
  if (!state.lessons.length) return [];

  const courseIdForLesson = (lesson: Lesson) =>
    state.units.find((item) => item.id === lesson.unitId)?.courseId;

  const courseIds = new Set(
    state.lessons.map(courseIdForLesson).filter((id): id is string => Boolean(id)),
  );
  const groupByCourse = courseIds.size > 1;
  const courseOrder = new Map(state.courses.map((item, index) => [item.id, index]));

  const buckets = new Map<string, { key: string; label: string; lessons: Lesson[] }>();

  for (const lesson of state.lessons) {
    const unit = state.units.find((item) => item.id === lesson.unitId);
    const course = state.courses.find((item) => item.id === unit?.courseId);

    let key: string;
    let label: string;

    if (groupByCourse && course) {
      key = course.id;
      label = course.name;
    } else {
      const subject = lessonSubject(state, lesson.id);
      key = subject;
      label = subject;
    }

    const bucket = buckets.get(key) ?? { key, label, lessons: [] };
    bucket.lessons.push(lesson);
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .map((bucket) => {
      const unitIds = new Set(bucket.lessons.map((item) => item.unitId));
      return {
        ...bucket,
        kind: groupByCourse ? "course" as const : "subject" as const,
        subtitle: `${bucket.lessons.length} lesson${bucket.lessons.length === 1 ? "" : "s"} · ${unitIds.size} unit${unitIds.size === 1 ? "" : "s"}`,
        lessons: [...bucket.lessons].sort((a, b) => compareLessonsByCurriculum(state, a, b)),
      };
    })
    .sort((a, b) => {
      if (groupByCourse) {
        const orderA = courseOrder.get(a.key) ?? Number.MAX_SAFE_INTEGER;
        const orderB = courseOrder.get(b.key) ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
      }
      if (a.label === "Uncategorized") return 1;
      if (b.label === "Uncategorized") return -1;
      return a.label.localeCompare(b.label);
    });
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
