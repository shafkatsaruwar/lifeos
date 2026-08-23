"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { applyQuestionResult, computeMasteryState } from "./mastery";
import { createSeedState } from "./seed";
import { questionPoints, tallyAssignmentMarks, uid } from "./helpers";
import { prepareQuestionForBank } from "./questionBank";
import type {
  Assignment,
  Course,
  Lesson,
  LessonSection,
  MasterOSState,
  MistakeType,
  Question,
  Student,
  StudentSkill,
  TeacherNote,
} from "./types";

const STORAGE_KEY = "masteros.v1";

function emptyState(): MasterOSState {
  return {
    students: [],
    courses: [],
    enrollments: [],
    units: [],
    lessons: [],
    lessonSections: [],
    skills: [],
    studentSkills: [],
    questions: [],
    assignments: [],
    assignmentQuestions: [],
    questionResults: [],
    assessments: [],
    teacherNotes: [],
  };
}

function loadState(): MasterOSState {
  if (typeof window === "undefined") return createSeedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    return { ...emptyState(), ...JSON.parse(raw) } as MasterOSState;
  } catch {
    return createSeedState();
  }
}

function retallySkill(current: StudentSkill, previous: boolean, next: boolean, practicedAt: string): StudentSkill {
  if (previous === next) return { ...current, lastPracticed: practicedAt };
  const hits = Math.max(0, Math.round((current.accuracy / 100) * current.attempts) + (next ? 1 : -1));
  const accuracy = current.attempts ? Math.round((hits / current.attempts) * 100) : 0;
  return {
    ...current,
    accuracy,
    lastPracticed: practicedAt,
    masteryState: computeMasteryState(accuracy, current.attempts, current.masteryState === "needs_review" && !next),
  };
}

export function removeQuestionFromState(current: MasterOSState, questionId: string): MasterOSState {
  const assignmentIds = new Set(
    current.assignmentQuestions
      .filter((item) => item.questionId === questionId)
      .map((item) => item.assignmentId),
  );
  let next: MasterOSState = {
    ...current,
    questions: current.questions.filter((item) => item.id !== questionId),
    assignmentQuestions: current.assignmentQuestions.filter((item) => item.questionId !== questionId),
    questionResults: current.questionResults.filter((item) => item.questionId !== questionId),
  };
  for (const assignmentId of assignmentIds) {
    next = retallyAssignment(next, assignmentId);
  }
  return next;
}

export function removeStudentFromState(current: MasterOSState, studentId: string): MasterOSState {
  const lessonIds = new Set(current.lessons.filter((item) => item.studentId === studentId).map((item) => item.id));
  const assignmentIds = new Set(current.assignments.filter((item) => item.studentId === studentId).map((item) => item.id));

  return {
    ...current,
    students: current.students.filter((item) => item.id !== studentId),
    enrollments: current.enrollments.filter((item) => item.studentId !== studentId),
    lessons: current.lessons.filter((item) => item.studentId !== studentId),
    lessonSections: current.lessonSections.filter((item) => !lessonIds.has(item.lessonId)),
    studentSkills: current.studentSkills.filter((item) => item.studentId !== studentId),
    assignments: current.assignments.filter((item) => item.studentId !== studentId),
    assignmentQuestions: current.assignmentQuestions.filter((item) => !assignmentIds.has(item.assignmentId)),
    questionResults: current.questionResults.filter((item) => item.studentId !== studentId),
    assessments: current.assessments.filter((item) => item.studentId !== studentId),
    teacherNotes: current.teacherNotes.filter((item) => item.studentId !== studentId),
  };
}

export function removeUnitFromState(current: MasterOSState, unitId: string): MasterOSState {
  const lessonIds = new Set(current.lessons.filter((item) => item.unitId === unitId).map((item) => item.id));
  return {
    ...current,
    units: current.units.filter((item) => item.id !== unitId),
    lessons: current.lessons.filter((item) => item.unitId !== unitId),
    lessonSections: current.lessonSections.filter((item) => !lessonIds.has(item.lessonId)),
    assignments: current.assignments.map((item) =>
      item.lessonId && lessonIds.has(item.lessonId) ? { ...item, lessonId: undefined } : item,
    ),
    teacherNotes: current.teacherNotes.map((item) =>
      item.lessonId && lessonIds.has(item.lessonId) ? { ...item, lessonId: undefined } : item,
    ),
  };
}

export function removeCourseFromState(current: MasterOSState, courseId: string): MasterOSState {
  const unitIds = new Set(current.units.filter((item) => item.courseId === courseId).map((item) => item.id));
  const lessonIds = new Set(current.lessons.filter((item) => unitIds.has(item.unitId)).map((item) => item.id));
  const skillIds = new Set(current.skills.filter((item) => item.courseId === courseId).map((item) => item.id));
  const questionIds = new Set(current.questions.filter((item) => item.courseId === courseId).map((item) => item.id));
  const assignmentIds = new Set(current.assignments.filter((item) => item.courseId === courseId).map((item) => item.id));

  return {
    ...current,
    courses: current.courses.filter((item) => item.id !== courseId),
    enrollments: current.enrollments.filter((item) => item.courseId !== courseId),
    units: current.units.filter((item) => item.courseId !== courseId),
    lessons: current.lessons.filter((item) => !unitIds.has(item.unitId)),
    lessonSections: current.lessonSections.filter((item) => !lessonIds.has(item.lessonId)),
    skills: current.skills.filter((item) => item.courseId !== courseId),
    studentSkills: current.studentSkills.filter((item) => !skillIds.has(item.skillId)),
    questions: current.questions.filter((item) => item.courseId !== courseId),
    assignments: current.assignments.filter((item) => item.courseId !== courseId),
    assignmentQuestions: current.assignmentQuestions.filter((item) => !assignmentIds.has(item.assignmentId)),
    questionResults: current.questionResults.filter(
      (item) =>
        (!item.assignmentId || !assignmentIds.has(item.assignmentId))
        && !questionIds.has(item.questionId),
    ),
    assessments: current.assessments.filter((item) => item.courseId !== courseId),
    teacherNotes: current.teacherNotes
      .filter((item) => item.courseId !== courseId)
      .map((item) => (item.lessonId && lessonIds.has(item.lessonId) ? { ...item, lessonId: undefined } : item))
      .map((item) => (item.skillId && skillIds.has(item.skillId) ? { ...item, skillId: undefined } : item)),
  };
}

function retallyAssignment(current: MasterOSState, assignmentId: string): MasterOSState {
  const links = current.assignmentQuestions.filter((item) => item.assignmentId === assignmentId);
  if (!links.length) return current;
  const tally = tallyAssignmentMarks(links, current.questionResults, assignmentId);
  return {
    ...current,
    assignments: current.assignments.map((item) => {
      if (item.id !== assignmentId) return item;
      return {
        ...item,
        totalPoints: tally.totalPoints,
        score: tally.gradedCount ? tally.score : item.score,
        status: tally.complete ? ("graded" as const) : item.status,
      };
    }),
  };
}

type Store = {
  state: MasterOSState;
  ready: boolean;
  resetDemo: () => void;
  addStudent: (input: Pick<Student, "name" | "gradeLevel" | "notes">) => string;
  deleteStudent: (id: string) => void;
  addCourse: (input: Pick<Course, "name" | "description" | "status" | "startDate" | "targetDate">, studentId?: string) => string;
  deleteCourse: (id: string) => void;
  enroll: (studentId: string, courseId: string) => void;
  addLesson: (input: Omit<Lesson, "id">, sections?: Omit<LessonSection, "id" | "lessonId">[]) => string;
  updateLesson: (id: string, patch: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;
  updateSection: (id: string, patch: Partial<LessonSection>) => void;
  reorderSections: (lessonId: string, orderedIds: string[]) => void;
  addNote: (note: Omit<TeacherNote, "id" | "createdAt">) => void;
  addQuestion: (input: Omit<Question, "id">) => string;
  deleteQuestion: (id: string) => void;
  addAssignment: (input: Omit<Assignment, "id">, questionIds?: string[]) => string;
  updateAssignment: (id: string, patch: Partial<Assignment>) => void;
  addAssignmentQuestion: (assignmentId: string, questionId: string, points?: number) => void;
  updateAssignmentQuestion: (assignmentId: string, questionId: string, patch: { points?: number }) => void;
  addUnit: (courseId: string, title: string) => string;
  deleteUnit: (id: string) => void;
  gradeAssignment: (id: string, score: number, totalPoints?: number) => void;
  recordResult: (input: {
    studentId: string;
    questionId: string;
    assignmentId?: string;
    correct: boolean;
    response?: string;
    mistakeType?: MistakeType | null;
    pointsEarned?: number;
  }) => void;
  completeLesson: (lessonId: string, wrap: { understood: string; improvedSkillIds: string[]; weakSkillIds: string[]; homework?: string; nextNotes?: string }) => void;
};

const Ctx = createContext<Store | null>(null);

export function MasterOSProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MasterOSState>(createSeedState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadState());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const patch = useCallback((updater: (current: MasterOSState) => MasterOSState) => {
    setState((current) => updater(current));
  }, []);

  const value = useMemo<Store>(() => ({
    state,
    ready,
    resetDemo: () => {
      const next = createSeedState();
      setState(next);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    addStudent: (input) => {
      const id = uid("stu");
      patch((current) => ({ ...current, students: [...current.students, { ...input, id, createdAt: new Date().toISOString() }] }));
      return id;
    },
    deleteStudent: (id) => {
      patch((current) => removeStudentFromState(current, id));
    },
    addCourse: (input, studentId) => {
      const id = uid("crs");
      patch((current) => ({
        ...current,
        courses: [...current.courses, { ...input, id }],
        enrollments: studentId ? [...current.enrollments, { studentId, courseId: id }] : current.enrollments,
      }));
      return id;
    },
    deleteCourse: (id) => {
      patch((current) => removeCourseFromState(current, id));
    },
    enroll: (studentId, courseId) => {
      patch((current) => {
        if (current.enrollments.some((item) => item.studentId === studentId && item.courseId === courseId)) return current;
        return { ...current, enrollments: [...current.enrollments, { studentId, courseId }] };
      });
    },
    addLesson: (input, sections = []) => {
      const id = uid("les");
      patch((current) => ({
        ...current,
        lessons: [...current.lessons, { ...input, id }],
        lessonSections: [
          ...current.lessonSections,
          ...sections.map((section, index) => ({ ...section, id: uid("sec"), lessonId: id, order: section.order ?? index + 1 })),
        ],
      }));
      return id;
    },
    updateLesson: (id, next) => {
      patch((current) => ({ ...current, lessons: current.lessons.map((item) => (item.id === id ? { ...item, ...next } : item)) }));
    },
    deleteLesson: (id) => {
      patch((current) => ({
        ...current,
        lessons: current.lessons.filter((item) => item.id !== id),
        lessonSections: current.lessonSections.filter((item) => item.lessonId !== id),
        assignments: current.assignments.map((item) =>
          item.lessonId === id ? { ...item, lessonId: undefined } : item,
        ),
        teacherNotes: current.teacherNotes.map((item) =>
          item.lessonId === id ? { ...item, lessonId: undefined } : item,
        ),
      }));
    },
    updateSection: (id, next) => {
      patch((current) => ({
        ...current,
        lessonSections: current.lessonSections.map((item) => (item.id === id ? { ...item, ...next } : item)),
      }));
    },
    reorderSections: (lessonId, orderedIds) => {
      patch((current) => ({
        ...current,
        lessonSections: current.lessonSections.map((item) => {
          const order = orderedIds.indexOf(item.id);
          return item.lessonId === lessonId && order >= 0 ? { ...item, order: order + 1 } : item;
        }),
      }));
    },
    addNote: (note) => {
      patch((current) => ({
        ...current,
        teacherNotes: [{ ...note, id: uid("note"), createdAt: new Date().toISOString() }, ...current.teacherNotes],
      }));
    },
    addQuestion: (input) => {
      const id = uid("q");
      patch((current) => ({
        ...current,
        questions: [...current.questions, { ...prepareQuestionForBank(input, current), id }],
      }));
      return id;
    },
    deleteQuestion: (id) => {
      patch((current) => removeQuestionFromState(current, id));
    },
    addAssignment: (input, questionIds = []) => {
      const id = uid("asg");
      patch((current) => ({
        ...current,
        assignments: [...current.assignments, { ...input, id, totalPoints: input.totalPoints || questionIds.length || 10 }],
        assignmentQuestions: [
          ...current.assignmentQuestions,
          ...questionIds.map((questionId, order) => ({ assignmentId: id, questionId, order: order + 1, points: 1 })),
        ],
      }));
      return id;
    },
    updateAssignment: (id, next) => {
      patch((current) => ({
        ...current,
        assignments: current.assignments.map((item) => (item.id === id ? { ...item, ...next } : item)),
      }));
    },
    addAssignmentQuestion: (assignmentId, questionId, points = 1) => {
      patch((current) => {
        if (current.assignmentQuestions.some((item) => item.assignmentId === assignmentId && item.questionId === questionId)) {
          return current;
        }
        const order = current.assignmentQuestions.filter((item) => item.assignmentId === assignmentId).length + 1;
        const assignmentQuestions = [...current.assignmentQuestions, { assignmentId, questionId, order, points }];
        return retallyAssignment({ ...current, assignmentQuestions }, assignmentId);
      });
    },
    updateAssignmentQuestion: (assignmentId, questionId, next) => {
      patch((current) => {
        const assignmentQuestions = current.assignmentQuestions.map((item) =>
          item.assignmentId === assignmentId && item.questionId === questionId ? { ...item, ...next } : item,
        );
        return retallyAssignment({ ...current, assignmentQuestions }, assignmentId);
      });
    },
    addUnit: (courseId, title) => {
      const id = uid("unit");
      patch((current) => {
        const order = current.units.filter((item) => item.courseId === courseId).length + 1;
        return { ...current, units: [...current.units, { id, courseId, title, order }] };
      });
      return id;
    },
    deleteUnit: (id) => {
      patch((current) => removeUnitFromState(current, id));
    },
    gradeAssignment: (id, score, totalPoints) => {
      patch((current) => ({
        ...current,
        assignments: current.assignments.map((item) =>
          item.id === id
            ? { ...item, score, totalPoints: totalPoints ?? item.totalPoints, status: "graded" as const }
            : item,
        ),
      }));
    },
    recordResult: ({ studentId, questionId, assignmentId, correct, response, mistakeType, pointsEarned }) => {
      patch((current) => {
        const question = current.questions.find((item) => item.id === questionId);
        const link = current.assignmentQuestions.find(
          (item) => item.assignmentId === assignmentId && item.questionId === questionId,
        );
        const max = questionPoints(link);
        const earned = pointsEarned != null ? Math.min(max, Math.max(0, pointsEarned)) : correct ? max : 0;
        const nextCorrect = earned >= max && max > 0;
        const practicedAt = new Date().toISOString().slice(0, 10);
        const existingResult = current.questionResults.find(
          (item) => item.studentId === studentId && item.questionId === questionId && item.assignmentId === assignmentId,
        );
        let studentSkills = current.studentSkills;
        if (question?.skillId) {
          const existing = studentSkills.find((item) => item.studentId === studentId && item.skillId === question.skillId);
          const base = existing ?? {
            studentId,
            skillId: question.skillId,
            masteryState: computeMasteryState(0, 0),
            accuracy: 0,
            attempts: 0,
            recentAccuracy: 0,
          };
          const next = existingResult
            ? retallySkill(base, existingResult.correct, nextCorrect, practicedAt)
            : applyQuestionResult(base, nextCorrect, practicedAt);
          studentSkills = existing
            ? studentSkills.map((item) => (item === existing ? next : item))
            : [...studentSkills, next];
        }
        const result = {
          id: existingResult?.id ?? uid("qr"),
          studentId,
          questionId,
          assignmentId,
          correct: nextCorrect,
          response,
          mistakeType: mistakeType ?? undefined,
          pointsEarned: earned,
        };
        const questionResults = existingResult
          ? current.questionResults.map((item) => (item.id === existingResult.id ? result : item))
          : [...current.questionResults, result];
        const nextState = { ...current, studentSkills, questionResults };
        return assignmentId ? retallyAssignment(nextState, assignmentId) : nextState;
      });
    },
    completeLesson: (lessonId, wrap) => {
      patch((current) => {
        const lesson = current.lessons.find((item) => item.id === lessonId);
        const studentSkills = current.studentSkills.map((item) => {
          if (!lesson || item.studentId !== lesson.studentId) return item;
          if (wrap.weakSkillIds.includes(item.skillId)) return { ...item, masteryState: "needs_review" as const };
          if (wrap.improvedSkillIds.includes(item.skillId) && item.masteryState === "learning") {
            return { ...item, masteryState: "practicing" as const };
          }
          return item;
        });
        const notes: TeacherNote[] = [];
        if (wrap.nextNotes) {
          notes.push({
            id: uid("note"),
            text: wrap.nextNotes,
            createdAt: new Date().toISOString(),
            studentId: lesson?.studentId,
            lessonId,
          });
        }
        if (wrap.understood) {
          notes.push({
            id: uid("note"),
            text: `Understanding: ${wrap.understood}`,
            createdAt: new Date().toISOString(),
            studentId: lesson?.studentId,
            lessonId,
          });
        }
        if (wrap.homework) {
          notes.push({
            id: uid("note"),
            text: `Homework assigned: ${wrap.homework}`,
            createdAt: new Date().toISOString(),
            studentId: lesson?.studentId,
            lessonId,
          });
        }
        return {
          ...current,
          studentSkills,
          lessons: current.lessons.map((item) => (item.id === lessonId ? { ...item, status: "complete" as const, notes: wrap.nextNotes || item.notes } : item)),
          teacherNotes: [...notes, ...current.teacherNotes],
        };
      });
    },
  }), [patch, ready, state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMasterOS() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMasterOS must be used inside MasterOSProvider");
  return ctx;
}

export {
  attentionSkills,
  courseProgress,
  coursesForStudent,
  selectStudent,
  studentsForCourse,
  unitsForCourse,
} from "./selectors";

