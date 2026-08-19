import { z } from 'zod';

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

// Parse and validate data from Firebase
export const validateTasks = (data: unknown) => {
  return z.array(TaskSchema).safeParse(data);
};

export const validateProjects = (data: unknown) => {
  return z.array(ProjectSchema).safeParse(data);
};

export const validateCalendarEvents = (data: unknown) => {
  return z.array(CalendarEventSchema).safeParse(data);
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
