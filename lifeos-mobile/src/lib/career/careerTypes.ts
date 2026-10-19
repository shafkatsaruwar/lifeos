/**
 * Metro-safe copy for Expo (lives under lifeos-mobile/).
 * Keep in sync with repo-root `lib/careerTypes.ts`.
 */

/** Job Seeker OS — Career environment hub types (Firebase blob, not SQL). */

export type CareerView =
  | "overview"
  | "applications"
  | "pipeline"
  | "companies"
  | "interviews"
  | "contacts"
  | "documents"
  | "analytics"
  | "settings";

export type CareerStageId =
  | "saved"
  | "applied"
  | "assessment"
  | "recruiter_screening"
  | "hiring_manager"
  | "technical"
  | "final"
  | "offer"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type WorkArrangement = "remote" | "hybrid" | "onsite" | "unknown";
export type EmploymentType = "full_time" | "part_time" | "contract" | "internship" | "other";
export type SalaryPeriod = "year" | "month" | "hour" | "total";
export type ApplicationPriority = "high" | "medium" | "low";
export type ApplicationOutcome = "none" | "offer" | "accepted" | "rejected" | "withdrawn";
export type InterviewType = "phone" | "video" | "onsite" | "technical" | "panel" | "other";
export type InterviewOutcome = "pending" | "passed" | "rejected" | "cancelled" | "rescheduled";
export type InteractionType =
  | "email_received"
  | "email_sent"
  | "phone_call"
  | "recruiter_screening"
  | "interview"
  | "follow_up"
  | "other";
export type CareerDocumentType =
  | "resume"
  | "cover_letter"
  | "job_description"
  | "interview_notes"
  | "offer_letter"
  | "other";
export type CareerActivityType =
  | "application_created"
  | "application_updated"
  | "stage_changed"
  | "interview_scheduled"
  | "interview_updated"
  | "interaction_recorded"
  | "note_added"
  | "task_created"
  | "task_completed"
  | "document_linked"
  | "outcome_recorded"
  | "company_created";

export type CareerObservationType =
  | "career.application.created"
  | "career.application.stage_changed"
  | "career.interview.scheduled"
  | "career.interview.completed"
  | "career.followup.due"
  | "career.offer.received"
  | "career.application.rejected"
  | "career.application.accepted";

export type CareerStageDefinition = {
  id: CareerStageId;
  name: string;
  category: "pipeline" | "terminal";
  position: number;
  isTerminal: boolean;
};

export const CAREER_STAGES: CareerStageDefinition[] = [
  { id: "saved", name: "Saved", category: "pipeline", position: 0, isTerminal: false },
  { id: "applied", name: "Applied", category: "pipeline", position: 1, isTerminal: false },
  { id: "assessment", name: "Assessment", category: "pipeline", position: 2, isTerminal: false },
  { id: "recruiter_screening", name: "Recruiter Screening", category: "pipeline", position: 3, isTerminal: false },
  { id: "hiring_manager", name: "Hiring Manager Interview", category: "pipeline", position: 4, isTerminal: false },
  { id: "technical", name: "Technical Interview", category: "pipeline", position: 5, isTerminal: false },
  { id: "final", name: "Final Interview", category: "pipeline", position: 6, isTerminal: false },
  { id: "offer", name: "Offer", category: "pipeline", position: 7, isTerminal: false },
  { id: "accepted", name: "Accepted", category: "terminal", position: 8, isTerminal: true },
  { id: "rejected", name: "Rejected", category: "terminal", position: 9, isTerminal: true },
  { id: "withdrawn", name: "Withdrawn", category: "terminal", position: 10, isTerminal: true },
];

export type CareerCompany = {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  size?: string;
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CareerContact = {
  id: string;
  companyId?: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedInUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CareerApplication = {
  id: string;
  companyId: string;
  jobTitle: string;
  jobUrl?: string;
  location?: string;
  workArrangement?: WorkArrangement;
  employmentType?: EmploymentType;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: SalaryPeriod;
  source?: string;
  appliedAt?: string;
  stageId: CareerStageId;
  priority?: ApplicationPriority;
  description?: string;
  notes?: string;
  contactId?: string;
  resumeDocumentId?: string;
  coverLetterDocumentId?: string;
  nextAction?: string;
  nextActionDueAt?: string;
  lastContactAt?: string;
  outcome?: ApplicationOutcome;
  rejectionReason?: string;
  offerDetails?: string;
  createdAt: string;
  updatedAt: string;
};

export type CareerStageHistory = {
  id: string;
  applicationId: string;
  previousStageId?: CareerStageId;
  newStageId: CareerStageId;
  changedAt: string;
  note?: string;
};

export type CareerInteraction = {
  id: string;
  applicationId?: string;
  contactId?: string;
  companyId?: string;
  interactionType: InteractionType;
  occurredAt: string;
  notes?: string;
  createdAt: string;
};

export type CareerInterviewChecklist = {
  reviewJobDescription: boolean;
  researchCompany: boolean;
  reviewResume: boolean;
  prepareIntroduction: boolean;
  prepareStarExamples: boolean;
  prepareQuestions: boolean;
  testMeetingLink: boolean;
};

export type CareerInterview = {
  id: string;
  applicationId: string;
  title: string;
  interviewType?: InterviewType;
  startsAt: string;
  endsAt?: string;
  timezone?: string;
  meetingUrl?: string;
  location?: string;
  interviewerNames?: string;
  interviewerRoles?: string;
  preparationNotes?: string;
  questionsToAsk?: string;
  questionsReceived?: string;
  postNotes?: string;
  outcome?: InterviewOutcome;
  followUpAt?: string;
  checklist?: CareerInterviewChecklist;
  createdAt: string;
  updatedAt: string;
};

export type CareerTask = {
  id: string;
  applicationId?: string;
  title: string;
  description?: string;
  dueAt?: string;
  completedAt?: string;
  priority?: ApplicationPriority;
  createdAt: string;
  updatedAt: string;
};

export type CareerDocument = {
  id: string;
  applicationId?: string;
  companyId?: string;
  /** Library note id or resource id when linked into LifeOS Library */
  libraryDocumentId?: string;
  documentType: CareerDocumentType;
  title: string;
  /** Stable version label so historical apps keep the submitted résumé version */
  versionIdentifier?: string;
  url?: string;
  notes?: string;
  createdAt: string;
};

export type CareerActivity = {
  id: string;
  applicationId?: string;
  companyId?: string;
  activityType: CareerActivityType;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
  occurredAt: string;
};

/** Factual observation for Personal Context Kernel (stored + mappable to kernel Observation). */
export type CareerObservation = {
  id: string;
  type: CareerObservationType;
  sourceEnvironment: "Career";
  entityId: string;
  timestamp: string;
  payload: Record<string, string | number | boolean | null>;
  provenance: "user_action";
  privacy: "private";
};

export type CareerHub = {
  version: 1;
  companies: CareerCompany[];
  applications: CareerApplication[];
  stageHistory: CareerStageHistory[];
  contacts: CareerContact[];
  interactions: CareerInteraction[];
  interviews: CareerInterview[];
  tasks: CareerTask[];
  documents: CareerDocument[];
  activity: CareerActivity[];
  observations: CareerObservation[];
  settings: {
    defaultCurrency?: string;
    defaultTimezone?: string;
  };
};

function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export const emptyCareerHub = (): CareerHub => ({
  version: 1,
  companies: [],
  applications: [],
  stageHistory: [],
  contacts: [],
  interactions: [],
  interviews: [],
  tasks: [],
  documents: [],
  activity: [],
  observations: [],
  settings: {
    defaultCurrency: "USD",
    defaultTimezone: defaultTimezone(),
  },
});

export const emptyInterviewChecklist = (): CareerInterviewChecklist => ({
  reviewJobDescription: false,
  researchCompany: false,
  reviewResume: false,
  prepareIntroduction: false,
  prepareStarExamples: false,
  prepareQuestions: false,
  testMeetingLink: false,
});
