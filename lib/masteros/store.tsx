"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { applyQuestionResult, computeMasteryState } from "./mastery";
import { createSeedState } from "./seed";
import { uid } from "./helpers";
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

type Store = {
  state: MasterOSState;
  ready: boolean;
  resetDemo: () => void;
  addStudent: (input: Pick<Student, "name" | "gradeLevel" | "notes">) => string;
  addCourse: (input: Pick<Course, "name" | "description" | "status" | "startDate" | "targetDate">, studentId?: string) => string;
  enroll: (studentId: string, courseId: string) => void;
  addLesson: (input: Omit<Lesson, "id">, sections?: Omit<LessonSection, "id" | "lessonId">[]) => string;
  updateLesson: (id: string, patch: Partial<Lesson>) => void;
  updateSection: (id: string, patch: Partial<LessonSection>) => void;
  reorderSections: (lessonId: string, orderedIds: string[]) => void;
  addNote: (note: Omit<TeacherNote, "id" | "createdAt">) => void;
  addQuestion: (input: Omit<Question, "id">) => string;
  addAssignment: (input: Omit<Assignment, "id">, questionIds?: string[]) => string;
  updateAssignment: (id: string, patch: Partial<Assignment>) => void;
  addAssignmentQuestion: (assignmentId: string, questionId: string) => void;
  addUnit: (courseId: string, title: string) => string;
  gradeAssignment: (id: string, score: number) => void;
  recordResult: (input: { studentId: string; questionId: string; assignmentId?: string; correct: boolean; response?: string; mistakeType?: MistakeType | null }) => void;
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
    addCourse: (input, studentId) => {
      const id = uid("crs");
      patch((current) => ({
        ...current,
        courses: [...current.courses, { ...input, id }],
        enrollments: studentId ? [...current.enrollments, { studentId, courseId: id }] : current.enrollments,
      }));
      return id;
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
      patch((current) => ({ ...current, questions: [...current.questions, { ...input, id }] }));
      return id;
    },
    addAssignment: (input, questionIds = []) => {
      const id = uid("asg");
      patch((current) => ({
        ...current,
        assignments: [...current.assignments, { ...input, id, totalPoints: input.totalPoints || questionIds.length || 10 }],
        assignmentQuestions: [
          ...current.assignmentQuestions,
          ...questionIds.map((questionId, order) => ({ assignmentId: id, questionId, order: order + 1 })),
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
    addAssignmentQuestion: (assignmentId, questionId) => {
      patch((current) => {
        if (current.assignmentQuestions.some((item) => item.assignmentId === assignmentId && item.questionId === questionId)) {
          return current;
        }
        const order = current.assignmentQuestions.filter((item) => item.assignmentId === assignmentId).length + 1;
        return { ...current, assignmentQuestions: [...current.assignmentQuestions, { assignmentId, questionId, order }] };
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
    gradeAssignment: (id, score) => {
      patch((current) => ({
        ...current,
        assignments: current.assignments.map((item) => (item.id === id ? { ...item, score, status: "graded" as const } : item)),
      }));
    },
    recordResult: ({ studentId, questionId, assignmentId, correct, response, mistakeType }) => {
      patch((current) => {
        const question = current.questions.find((item) => item.id === questionId);
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
            ? retallySkill(base, existingResult.correct, correct, practicedAt)
            : applyQuestionResult(base, correct, practicedAt);
          studentSkills = existing
            ? studentSkills.map((item) => (item === existing ? next : item))
            : [...studentSkills, next];
        }
        const result = {
          id: existingResult?.id ?? uid("qr"),
          studentId,
          questionId,
          assignmentId,
          correct,
          response,
          mistakeType: mistakeType ?? undefined,
        };
        const questionResults = existingResult
          ? current.questionResults.map((item) => (item.id === existingResult.id ? result : item))
          : [...current.questionResults, result];
        const assignments = current.assignments.map((assignment) => {
          if (assignment.id !== assignmentId) return assignment;
          const links = current.assignmentQuestions.filter((item) => item.assignmentId === assignment.id);
          const graded = questionResults.filter((item) => item.assignmentId === assignment.id);
          if (!links.length) return assignment;
          const correctCount = graded.filter((item) => item.correct).length;
          const score = Math.round((correctCount / links.length) * (assignment.totalPoints || links.length));
          const status = graded.length >= links.length ? ("graded" as const) : assignment.status;
          return { ...assignment, score, status };
        });
        return { ...current, studentSkills, questionResults, assignments };
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

