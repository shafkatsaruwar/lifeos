/**
 * Future remote data adapter for MasterOS.
 * v1 uses localStorage through lib/masteros/store.tsx.
 * When Supabase is configured, implement these against supabase/masteros.sql.
 */
import type { MasterOSState } from "./types";

export const MASTEROS_TABLES = [
  "students",
  "courses",
  "enrollments",
  "units",
  "lessons",
  "lesson_sections",
  "skills",
  "student_skills",
  "questions",
  "assignments",
  "assignment_questions",
  "question_results",
  "assessments",
  "teacher_notes",
] as const;

export async function fetchMasterOSState(): Promise<MasterOSState> {
  throw new Error("Supabase is not connected yet. Use the local MasterOSProvider.");
}

export async function persistMasterOSState(state: MasterOSState): Promise<void> {
  void state;
  throw new Error("Supabase is not connected yet.");
}
