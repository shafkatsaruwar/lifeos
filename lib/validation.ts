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
  source: z.enum(['LifeOS', 'iCal', 'Google', 'Outlook']),
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

// Study Abroad Schemas
export const UniversitySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'University name required'),
  country: z.enum(['Germany', 'Netherlands', 'Sweden', 'Finland', 'United Kingdom', 'Other']),
  city: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  applicationPortalUrl: z.string().url().optional(),
  universityType: z.enum(['public', 'private', 'unknown']).optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProgramSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  name: z.string().min(1, 'Program name required'),
  degreeType: z.enum(['MSc', 'MA', 'MEng', 'Other']).optional(),
  field: z.enum(['Digital Health', 'Health Informatics', 'Artificial Intelligence', 'Computer Science', 'Cybersecurity', 'Information Systems', 'Data Science', 'Other']).optional(),
  teachingLanguage: z.string().optional(),
  intake: z.string().optional(),
  durationMonths: z.number().optional(),
  tuitionAmount: z.number().optional(),
  tuitionCurrency: z.string().optional(),
  tuitionFrequency: z.enum(['total', 'annual', 'semester', 'monthly']).optional(),
  tuitionNotes: z.string().optional(),
  estimatedMonthlyLivingCostMin: z.number().optional(),
  estimatedMonthlyLivingCostMax: z.number().optional(),
  livingCostCurrency: z.string().optional(),
  applicationDeadline: z.string().optional(),
  scholarshipDeadline: z.string().optional(),
  applicationStatus: z.enum(['researching', 'considering', 'preparing', 'blocked', 'ready_to_submit', 'submitted', 'awaiting_response', 'interview', 'offer', 'rejected', 'withdrawn', 'deferred']),
  confidence: z.enum(['unverified', 'partially_verified', 'verified']),
  eligibilityNotes: z.string().optional(),
  sourceUrls: z.array(z.string().url()).optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ScholarshipSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Scholarship name required'),
  provider: z.string().optional(),
  country: z.enum(['Germany', 'Netherlands', 'Sweden', 'Finland', 'United Kingdom', 'Other']).optional(),
  coverageType: z.enum(['full_tuition', 'partial_tuition', 'tuition_and_stipend', 'stipend_only', 'other']),
  tuitionCoveragePercent: z.number().optional(),
  stipendAmount: z.number().optional(),
  stipendCurrency: z.string().optional(),
  stipendFrequency: z.enum(['monthly', 'annual', 'one_time']).optional(),
  deadline: z.string().optional(),
  eligibilityRequirements: z.array(z.string()).optional(),
  requiredDocumentIds: z.array(z.string()).optional(),
  linkedProgramIds: z.array(z.string()).optional(),
  status: z.enum(['researching', 'eligible', 'possibly_eligible', 'not_eligible', 'preparing', 'submitted', 'awarded', 'rejected', 'expired']),
  confidence: z.enum(['unverified', 'partially_verified', 'verified']),
  sourceUrls: z.array(z.string().url()).optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const StudyDocumentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Document name required'),
  category: z.enum(['Diploma', 'Transcript', 'Passport', 'Resume', 'Statement of Purpose', 'Recommendation Letter', 'English Test', 'Financial Document', 'Application Decision', 'Other']),
  status: z.enum(['available', 'requested', 'pending', 'blocked', 'expired', 'not_available']),
  issuedBy: z.string().optional(),
  issueDate: z.string().optional(),
  expirationDate: z.string().optional(),
  blockingReason: z.string().optional(),
  amountNeededToResolve: z.number().optional(),
  currency: z.string().optional(),
  fileReference: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ApplicationSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  programId: z.string(),
  intake: z.string().optional(),
  status: z.enum(['researching', 'considering', 'preparing', 'blocked', 'ready_to_submit', 'submitted', 'awaiting_response', 'interview', 'offer', 'rejected', 'withdrawn', 'deferred']),
  applicationDeadline: z.string().optional(),
  scholarshipDeadline: z.string().optional(),
  dateStarted: z.string().optional(),
  dateSubmitted: z.string().optional(),
  lastUpdated: z.string(),
  applicationPortalLink: z.string().url().optional(),
  applicantNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional(),
  followUpDate: z.string().optional(),
  linkedDocumentIds: z.array(z.string()).optional(),
  linkedScholarshipIds: z.array(z.string()).optional(),
  blockingReasons: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DecisionRecordSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  outcome: z.enum(['offer', 'conditional_offer', 'rejected', 'waitlisted']),
  decisionDate: z.string().optional(),
  officialReason: z.string().optional(),
  personalInterpretation: z.string().optional(),
  appealAvailable: z.boolean().optional(),
  appealDeadline: z.string().optional(),
  decisionDocumentId: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const StudyAbroadHubSchema = z.object({
  universities: z.array(UniversitySchema),
  programs: z.array(ProgramSchema),
  scholarships: z.array(ScholarshipSchema),
  applications: z.array(ApplicationSchema),
  documents: z.array(StudyDocumentSchema),
  decisions: z.array(DecisionRecordSchema),
  observations: z.array(z.object({
    id: z.string(),
    module: z.literal('study_abroad'),
    type: z.enum(['deadline', 'application_status', 'document_blocker', 'scholarship', 'follow_up', 'decision', 'financial_requirement', 'stale_record']),
    fact: z.string(),
    timestamp: z.string(),
    metadata: z.record(z.unknown()),
  })),
  preferences: z.object({
    tuitionAffordability: z.number(),
    scholarshipAvailability: z.number(),
    monthlyLivingCost: z.number(),
    digitalHealthFit: z.number(),
    aiFit: z.number(),
    careerOutcome: z.number(),
    englishTaught: z.number(),
    immigrationPath: z.number(),
    documentFeasibility: z.number(),
  }),
});

export const validateStudyAbroad = (data: unknown) => {
  return StudyAbroadHubSchema.safeParse(data);
};

// Type exports
export type Task = z.infer<typeof TaskSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
