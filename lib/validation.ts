import { z } from 'zod';
import { MAX_FOCUS_MINUTES, MIN_FOCUS_MINUTES } from './constants';

// Zod schemas for runtime validation of Firebase data
export const TaskSchema = z.object({
  id: z.number(),
  title: z.string().min(1, 'Task title required'),
  project: z.string(),
  color: z.string(),
  due: z.string(), // ISO date format
  startTime: z.string().optional(), // HH:MM format, e.g., "14:30"
  priority: z.enum(['High', 'Medium', 'Low']),
  focusMinutes: z.number().min(5).max(240),
  energy: z.enum(['Low', 'Medium', 'High']),
  checklist: z.array(z.string()).optional(),
  checklistProgress: z.array(z.boolean()).optional(),
  handoffNote: z.string().optional(),
  nextAction: z.string().optional(),
  followUpDate: z.string().optional(),
  recurringDays: z.number().optional(),
  completedAt: z.string().optional(),
  done: z.boolean().optional(),
  canceled: z.boolean().optional(),
  pointsEarned: z.number().min(0).optional(),
  pointsPossible: z.number().min(0).optional(),
  calendarEventId: z.string().optional(),
});

export const ProjectSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['maintenance', 'finishable']),
  // Older LifeOS records store `iconName` because React icon components cannot
  // be persisted. Accept both shapes so a harmless UI update never makes a
  // user's existing spaces look like invalid/missing cloud data.
  icon: z.enum(['Zap', 'Aperture', 'Sparkles', 'FileText', 'UserRound', 'FolderKanban', 'BriefcaseBusiness', 'Camera', 'Code2', 'HeartPulse', 'Utensils', 'BookOpen']).optional(),
  iconName: z.enum(['Zap', 'Aperture', 'Sparkles', 'FileText', 'UserRound', 'FolderKanban', 'BriefcaseBusiness', 'Camera', 'Code2', 'HeartPulse', 'Utensils', 'BookOpen']).optional(),
  color: z.string(),
  desc: z.string().optional(),
}).refine(project => Boolean(project.icon || project.iconName), {
  message: 'A project icon is required',
});

export const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(), // ISO datetime
  end: z.string().optional(),
  source: z.enum(['LifeOS', 'iCal', 'Google', 'Outlook', 'Work', 'Synapse']),
  color: z.string(),
  notes: z.string().optional(),
  location: z.string().optional(),
});

export const SettingsSchema = z.object({
  accent: z.string().optional(),
  compactMode: z.boolean().optional(),
  reduceMotion: z.boolean().optional(),
  dailyDigest: z.boolean().optional(),
  focusReminders: z.boolean().optional(),
  calendarAlerts: z.boolean().optional(),
  soundEffects: z.boolean().optional(),
  defaultFocusMinutes: z.number().optional(),
  defaultEnergy: z.enum(['Low', 'Medium', 'High']).optional(),
  weekStartsMonday: z.boolean().optional(),
  nowTaskId: z.number().nullable().optional(),
  spaceContext: z.record(z.string(), z.object({
    lastTaskId: z.number().optional(),
    lastFilter: z.string().optional(),
    updatedAt: z.string().optional(),
  })).optional(),
  ambientActivity: z.object({
    title: z.string(),
    startedAt: z.string(),
    note: z.string().optional(),
    spaceName: z.string().optional(),
    spaceColor: z.string().optional(),
  }).nullable().optional(),
  currentEnergy: z.enum(['Low', 'Medium', 'High']).optional(),
  dailyReviewDate: z.string().optional(),
  weeklyReviewDate: z.string().optional(),
  momentumLog: z.array(z.object({
    id: z.string(),
    at: z.string(),
    type: z.enum(['done', 'focus', 'capture']),
    title: z.string(),
  })).optional(),
  showCaptureCommands: z.boolean().optional(),
  nowQueueIds: z.array(z.number()).optional(),
  enableLifeOS: z.boolean().optional(),
  enableSchoolOS: z.boolean().optional(),
  enableWorkOS: z.boolean().optional(),
  enableStudyAbroad: z.boolean().optional(),
  enableMasterOS: z.boolean().optional(),
  preferredName: z.string().optional(),
  /** Mobile first-run onboarding — preserve across web sync. */
  onboardingStartedAt: z.string().optional(),
  onboardingCompletedAt: z.string().optional(),
  onboardingVersion: z.number().optional(),
});

export const ResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  url: z.string(),
  uploadedAt: z.string(),
  classId: z.string().optional(),
  projectName: z.string().optional(),
  storagePath: z.string().optional(),
  storage: z.enum(['cloud', 'local']).optional(),
});

/**
 * Firebase RTDB stores dense 0..n arrays as arrays, but any hole (or some
 * client writes) turns the path into an object map `{ "0": ..., "2": ... }`.
 * Treating that as "no data" is how a full task list can disappear on load.
 */
export function coerceFirebaseList(data: unknown): unknown[] | null {
  if (data == null) return null;
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data as Record<string, unknown>);
  return null;
}

function softRepairTask(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const task = { ...(raw as Record<string, unknown>) };

  if (typeof task.focusMinutes === 'number' && Number.isFinite(task.focusMinutes)) {
    task.focusMinutes = Math.min(
      MAX_FOCUS_MINUTES,
      Math.max(MIN_FOCUS_MINUTES, Math.round(task.focusMinutes)),
    );
  } else if (task.focusMinutes != null) {
    const parsed = Number(task.focusMinutes);
    task.focusMinutes = Number.isFinite(parsed)
      ? Math.min(MAX_FOCUS_MINUTES, Math.max(MIN_FOCUS_MINUTES, Math.round(parsed)))
      : 45;
  }

  if (task.priority !== 'High' && task.priority !== 'Medium' && task.priority !== 'Low') {
    task.priority = 'Medium';
  }
  if (task.energy !== 'Low' && task.energy !== 'Medium' && task.energy !== 'High') {
    task.energy = 'Medium';
  }
  if (typeof task.title !== 'string' || !task.title.trim()) {
    task.title = typeof task.title === 'string' && task.title.length ? task.title : 'Untitled task';
  }
  if (typeof task.project !== 'string') task.project = 'Inbox';
  if (typeof task.color !== 'string' || !task.color) task.color = '#625af6';
  if (typeof task.due !== 'string') task.due = '';
  if (typeof task.id !== 'number' || !Number.isFinite(task.id)) {
    const asNum = Number(task.id);
    task.id = Number.isFinite(asNum) ? asNum : Date.now();
  }

  return task;
}

export type ParsedCloudTasks = {
  success: boolean;
  /** Valid (or soft-repaired) tasks. Empty when the cloud value was empty. */
  data: z.infer<typeof TaskSchema>[];
  dropped: number;
  /** True when the payload was not array-shaped and not an object map. */
  invalidShape: boolean;
};

/** Parse tasks from Firebase without all-or-nothing rejection. */
export function parseTasksFromCloud(data: unknown): ParsedCloudTasks {
  const list = coerceFirebaseList(data);
  if (list === null) {
    return { success: false, data: [], dropped: 0, invalidShape: data != null };
  }

  const parsed: z.infer<typeof TaskSchema>[] = [];
  let dropped = 0;

  for (const item of list) {
    const direct = TaskSchema.safeParse(item);
    if (direct.success) {
      parsed.push(direct.data);
      continue;
    }
    const repaired = TaskSchema.safeParse(softRepairTask(item));
    if (repaired.success) {
      parsed.push(repaired.data);
      continue;
    }
    dropped += 1;
  }

  return { success: true, data: parsed, dropped, invalidShape: false };
}

// Parse and validate data from Firebase
export const validateTasks = (data: unknown) => {
  const parsed = parseTasksFromCloud(data);
  if (parsed.invalidShape) {
    return {
      success: false as const,
      error: { errors: [{ message: 'Tasks payload must be an array or object map' }] },
    };
  }
  // Soft-parse: keep valid/repaired items so one bad record cannot wipe the list.
  return { success: true as const, data: parsed.data };
};

export const validateProjects = (data: unknown) => {
  const list = coerceFirebaseList(data);
  if (list === null) return z.array(ProjectSchema).safeParse(data);
  return z.array(ProjectSchema).safeParse(list);
};

export const validateCalendarEvents = (data: unknown) => {
  const list = coerceFirebaseList(data);
  if (list === null) return z.array(CalendarEventSchema).safeParse(data);
  return z.array(CalendarEventSchema).safeParse(list);
};

export const validateSettings = (data: unknown) => {
  return SettingsSchema.safeParse(data);
};

export const validateResources = (data: unknown) => {
  return z.array(ResourceSchema).safeParse(data);
};

// Type exports
export type Task = z.infer<typeof TaskSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
