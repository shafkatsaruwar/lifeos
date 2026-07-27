// Study Abroad Module Type Definitions

export type Country =
  | "Germany"
  | "Netherlands"
  | "Sweden"
  | "Finland"
  | "United Kingdom"
  | "Other";

export type ResearchConfidence =
  | "unverified"
  | "partially_verified"
  | "verified";

export type ApplicationStatus =
  | "researching"
  | "considering"
  | "preparing"
  | "blocked"
  | "ready_to_submit"
  | "submitted"
  | "awaiting_response"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "deferred";

export type DocumentStatus =
  | "available"
  | "requested"
  | "pending"
  | "blocked"
  | "expired"
  | "not_available";

export type ScholarshipCoverage =
  | "full_tuition"
  | "partial_tuition"
  | "tuition_and_stipend"
  | "stipend_only"
  | "other";

export type ScholarshipStatus =
  | "researching"
  | "eligible"
  | "possibly_eligible"
  | "not_eligible"
  | "preparing"
  | "submitted"
  | "awarded"
  | "rejected"
  | "expired";

export type DecisionOutcome =
  | "offer"
  | "conditional_offer"
  | "rejected"
  | "waitlisted";

export type ObservationType =
  | "deadline"
  | "application_status"
  | "document_blocker"
  | "scholarship"
  | "follow_up"
  | "decision"
  | "financial_requirement"
  | "stale_record";

export interface University {
  id: string;
  name: string;
  country: Country;
  city?: string;
  websiteUrl?: string;
  applicationPortalUrl?: string;
  universityType?: "public" | "private" | "unknown";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Program {
  id: string;
  universityId: string;
  name: string;
  degreeType?: "MSc" | "MA" | "MEng" | "Other";
  field?:
    | "Digital Health"
    | "Health Informatics"
    | "Artificial Intelligence"
    | "Computer Science"
    | "Cybersecurity"
    | "Information Systems"
    | "Data Science"
    | "Other";
  teachingLanguage?: string;
  intake?: string;
  durationMonths?: number;
  tuitionAmount?: number;
  tuitionCurrency?: string;
  tuitionFrequency?: "total" | "annual" | "semester" | "monthly";
  tuitionNotes?: string;
  estimatedMonthlyLivingCostMin?: number;
  estimatedMonthlyLivingCostMax?: number;
  livingCostCurrency?: string;
  applicationDeadline?: string;
  scholarshipDeadline?: string;
  applicationStatus: ApplicationStatus;
  confidence: ResearchConfidence;
  eligibilityNotes?: string;
  sourceUrls?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Scholarship {
  id: string;
  name: string;
  provider?: string;
  country?: Country;
  coverageType: ScholarshipCoverage;
  tuitionCoveragePercent?: number;
  stipendAmount?: number;
  stipendCurrency?: string;
  stipendFrequency?: "monthly" | "annual" | "one_time";
  deadline?: string;
  eligibilityRequirements?: string[];
  requiredDocumentIds?: string[];
  linkedProgramIds?: string[];
  status: ScholarshipStatus;
  confidence: ResearchConfidence;
  sourceUrls?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyDocument {
  id: string;
  name: string;
  category:
    | "Diploma"
    | "Transcript"
    | "Passport"
    | "Resume"
    | "Statement of Purpose"
    | "Recommendation Letter"
    | "English Test"
    | "Financial Document"
    | "Application Decision"
    | "Other";
  status: DocumentStatus;
  issuedBy?: string;
  issueDate?: string;
  expirationDate?: string;
  blockingReason?: string;
  amountNeededToResolve?: number;
  currency?: string;
  fileReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  universityId: string;
  programId: string;
  intake?: string;
  status: ApplicationStatus;
  applicationDeadline?: string;
  scholarshipDeadline?: string;
  dateStarted?: string;
  dateSubmitted?: string;
  lastUpdated: string;
  applicationPortalLink?: string;
  applicantNumber?: string;
  contactPerson?: string;
  contactEmail?: string;
  followUpDate?: string;
  linkedDocumentIds?: string[];
  linkedScholarshipIds?: string[];
  blockingReasons?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionRecord {
  id: string;
  applicationId: string;
  outcome: DecisionOutcome;
  decisionDate?: string;
  officialReason?: string;
  personalInterpretation?: string;
  appealAvailable?: boolean;
  appealDeadline?: string;
  decisionDocumentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Observation {
  id: string;
  module: "study_abroad";
  type: ObservationType;
  fact: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface StudyPreferenceWeights {
  tuitionAffordability: number;
  scholarshipAvailability: number;
  monthlyLivingCost: number;
  digitalHealthFit: number;
  aiFit: number;
  careerOutcome: number;
  englishTaught: number;
  immigrationPath: number;
  documentFeasibility: number;
}

export interface StudyAbroadHub {
  universities: University[];
  programs: Program[];
  scholarships: Scholarship[];
  applications: Application[];
  documents: StudyDocument[];
  decisions: DecisionRecord[];
  observations: Observation[];
  preferences: StudyPreferenceWeights;
}

export const emptyStudyAbroadHub: StudyAbroadHub = {
  universities: [],
  programs: [],
  scholarships: [],
  applications: [],
  documents: [],
  decisions: [],
  observations: [],
  preferences: {
    tuitionAffordability: 1,
    scholarshipAvailability: 1,
    monthlyLivingCost: 1,
    digitalHealthFit: 1,
    aiFit: 0.5,
    careerOutcome: 1,
    englishTaught: 1,
    immigrationPath: 1,
    documentFeasibility: 1,
  },
};
