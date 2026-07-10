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
  done: z.boolean().optional(),
  canceled: z.boolean().optional(),
});

export const ProjectSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['maintenance', 'finishable']),
  icon: z.enum(['Zap', 'Aperture', 'Sparkles', 'FileText', 'UserRound', 'FolderKanban']),
  color: z.string(),
  desc: z.string().optional(),
});

export const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(), // ISO datetime
  end: z.string().optional(),
  source: z.enum(['LifeOS', 'iCal']),
  color: z.string(),
  notes: z.string().optional(),
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
});

export const ResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  url: z.string(),
  uploadedAt: z.string(),
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
