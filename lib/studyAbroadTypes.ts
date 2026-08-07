/** Study Abroad OS — normalized hub types. Programs are the application center. */

export type StudyAbroadView =
  | "dashboard"
  | "explore"
  | "countries"
  | "universities"
  | "programs"
  | "applications"
  | "funding"
  | "documents"
  | "knowledge"
  | "history"
  | "database"
  | "compare";

export type ProgramStatus =
  | "discovering"
  | "researching"
  | "shortlisted"
  | "preparing"
  | "applied"
  | "interview"
  | "accepted"
  | "rejected"
  | "waitlisted"
  | "withdrawn";

export type ApplicationStage =
  | "preparing"
  | "ready"
  | "submitted"
  | "waiting"
  | "interview"
  | "accepted"
  | "rejected";

export type RequirementStatus = "missing" | "draft" | "ready" | "submitted" | "waived";

export type DocumentStatus =
  | "missing"
  | "need_to_obtain"
  | "draft"
  | "ready"
  | "submitted"
  | "expired";

export type DocumentCategory =
  | "Passport"
  | "Diploma"
  | "Transcript"
  | "English proficiency"
  | "CV"
  | "SOP"
  | "Recommendation"
  | "Certificate"
  | "Portfolio"
  | "Financial proof"
  | "Other";

export type FundingStatus =
  | "researching"
  | "eligible"
  | "maybe"
  | "preparing"
  | "applied"
  | "awarded"
  | "rejected";

export type FundingKind =
  | "scholarship"
  | "university"
  | "government"
  | "tuition_waiver"
  | "assistantship"
  | "other";

export type TaskParentType =
  | "country"
  | "university"
  | "program"
  | "application"
  | "requirement"
  | "document"
  | "funding"
  | "visa"
  | "cost";

export type KnowledgeContextType =
  | "country"
  | "university"
  | "program"
  | "application"
  | "funding"
  | "general";

export type TimelineEventKind =
  | "application_open"
  | "deadline"
  | "scholarship_deadline"
  | "interview"
  | "visa_appointment"
  | "document_deadline"
  | "decision"
  | "semester_start"
  | "orientation"
  | "travel"
  | "other";

export type StudyAbroadCountry = {
  id: string;
  name: string;
  code?: string; // ISO-ish, e.g. DE — optional, for small flag/id only
  tuitionLevel?: "low" | "medium" | "high" | "unknown";
  livingCostLevel?: "low" | "medium" | "high" | "unknown";
  languageNotes?: string;
  visaNotes?: string;
  residenceNotes?: string;
  financialProofNotes?: string;
  postStudyNotes?: string;
  costOfLivingNotes?: string;
  applicationComplexity?: "low" | "medium" | "high" | "unknown";
  notes?: string;
  active?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StudyAbroadUniversity = {
  id: string;
  countryId: string;
  name: string;
  city?: string;
  type?: "public" | "private" | "unknown";
  websiteUrl?: string;
  applicationPortalUrl?: string;
  applicationMethod?: string; // uni-assist / direct / VPD / other — free text
  contacts?: string;
  notes?: string;
  saved?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StudyAbroadProgram = {
  id: string;
  universityId: string;
  name: string;
  degree?: string;
  field?: string;
  language?: string;
  duration?: string;
  ects?: string;
  tuition?: string;
  semesterFee?: string;
  intake?: string;
  deadline?: string;
  opensAt?: string;
  admissionRequirements?: string;
  academicRequirements?: string;
  languageRequirements?: string;
  portfolioRequired?: boolean;
  workExperienceRequired?: boolean;
  applicationMethod?: string;
  officialUrl?: string;
  fundingNotes?: string;
  notes?: string;
  whyLike?: string;
  concerns?: string;
  fitScore?: number; // 1–10, user-entered only
  priority?: "high" | "medium" | "low";
  status: ProgramStatus;
  saved?: boolean;
  shortlisted?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StudyAbroadRequirement = {
  id: string;
  programId?: string;
  applicationId?: string;
  title: string;
  category?: DocumentCategory | string;
  status: RequirementStatus;
  documentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudyAbroadApplication = {
  id: string;
  programId: string;
  intake?: string;
  stage: ApplicationStage;
  portalUrl?: string;
  applicantNumber?: string;
  submittedAt?: string;
  decisionAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudyAbroadDocument = {
  id: string;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  variantOf?: string; // base SOP/CV → program-specific version
  variantLabel?: string;
  issueDate?: string;
  expirationDate?: string;
  fileReference?: string;
  notes?: string;
  versionLabel?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudyAbroadApplicationDocument = {
  id: string;
  applicationId: string;
  documentId: string;
  requirementId?: string;
};

export type StudyAbroadFunding = {
  id: string;
  name: string;
  kind: FundingKind;
  countryId?: string;
  universityId?: string;
  amount?: string;
  coverage?: string;
  tuitionCoverage?: string;
  livingStipend?: string;
  eligibility?: string;
  deadline?: string;
  requirements?: string;
  status: FundingStatus;
  officialUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudyAbroadProgramFunding = {
  id: string;
  programId: string;
  fundingId: string;
  note?: string;
};

export type StudyAbroadTask = {
  id: string;
  title: string;
  parentType: TaskParentType;
  parentId: string;
  done?: boolean;
  due?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type StudyAbroadKnowledge = {
  id: string;
  title: string;
  body?: string;
  contextType: KnowledgeContextType;
  contextId?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudyAbroadCost = {
  id: string;
  title: string;
  amount?: string;
  currency?: string;
  countryId?: string;
  programId?: string;
  applicationId?: string;
  category?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudyAbroadTimelineEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD or ISO
  kind: TimelineEventKind;
  contextType?: KnowledgeContextType | "application" | "document";
  contextId?: string;
  notes?: string;
  createdAt: string;
};

export type StudyAbroadSessionMemory = {
  lastProgramId?: string;
  lastView?: StudyAbroadView;
  lastNote?: string;
  updatedAt?: string;
};

export type StudyAbroadHistoryEvent = {
  id: string;
  at: string;
  title: string;
  detail?: string;
  contextType?: string;
  contextId?: string;
};

export type StudyAbroadHub = {
  countries: StudyAbroadCountry[];
  universities: StudyAbroadUniversity[];
  programs: StudyAbroadProgram[];
  applications: StudyAbroadApplication[];
  requirements: StudyAbroadRequirement[];
  documents: StudyAbroadDocument[];
  applicationDocuments: StudyAbroadApplicationDocument[];
  funding: StudyAbroadFunding[];
  programFunding: StudyAbroadProgramFunding[];
  tasks: StudyAbroadTask[];
  knowledge: StudyAbroadKnowledge[];
  costs: StudyAbroadCost[];
  timelineEvents: StudyAbroadTimelineEvent[];
  history: StudyAbroadHistoryEvent[];
  sessionMemory: StudyAbroadSessionMemory;
};

export const emptyStudyAbroadHub: StudyAbroadHub = {
  countries: [],
  universities: [],
  programs: [],
  applications: [],
  requirements: [],
  documents: [],
  applicationDocuments: [],
  funding: [],
  programFunding: [],
  tasks: [],
  knowledge: [],
  costs: [],
  timelineEvents: [],
  history: [],
  sessionMemory: {},
};

export const PROGRAM_STATUSES: ProgramStatus[] = [
  "discovering",
  "researching",
  "shortlisted",
  "preparing",
  "applied",
  "interview",
  "accepted",
  "rejected",
  "waitlisted",
  "withdrawn",
];

export const APPLICATION_STAGES: ApplicationStage[] = [
  "preparing",
  "ready",
  "submitted",
  "waiting",
  "interview",
  "accepted",
  "rejected",
];

export const DOCUMENT_STATUSES: DocumentStatus[] = [
  "missing",
  "need_to_obtain",
  "draft",
  "ready",
  "submitted",
  "expired",
];

export const FUNDING_STATUSES: FundingStatus[] = [
  "researching",
  "eligible",
  "maybe",
  "preparing",
  "applied",
  "awarded",
  "rejected",
];
