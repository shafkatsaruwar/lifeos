// WorkOS Type Definitions
// ========================

export type JobApplicationStatus = "saved" | "applied" | "reviewing" | "interviewing" | "offered" | "rejected" | "accepted" | "declined";
export type InterviewType = "phone" | "video" | "in-person" | "async";
export type InterviewOutcome = "pending" | "positive" | "negative" | "advance" | "reject";
export type RelationshipType = "mentor" | "peer" | "junior" | "contact";
export type OfferStatus = "received" | "negotiating" | "accepted" | "declined";
export type CertificationStatus = "planned" | "in-progress" | "completed" | "expired";
export type SkillProficiency = "beginner" | "intermediate" | "advanced" | "expert";
export type GoalCategory = "role" | "skill" | "project" | "company" | "income" | "learning";
export type GoalStatus = "active" | "on-hold" | "completed" | "abandoned";
export type GoalPriority = "high" | "medium" | "low";
export type OpportunityType = "company" | "recruiter" | "contact" | "event" | "conference" | "fair";
export type OpportunityStatus = "discovered" | "contacted" | "pursuing" | "passed";
export type PotentialLevel = "high" | "medium" | "low";

export interface JobApplication {
  id: string;
  company: string;
  position: string;
  url: string;
  appliedDate: string;
  status: JobApplicationStatus;
  jobDescription?: string;
  notes?: string;
  contacts?: string[];
  taskIds?: number[];
  calendarEventIds?: string[];
  resourceIds?: string[];
  salary?: string;
  deadline?: string;
  progress?: number;
  color?: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  date: string;
  time?: string;
  type: InterviewType;
  interviewers?: string[];
  topics?: string[];
  notes?: string;
  outcome?: InterviewOutcome;
  followUp?: string;
  linkedCalendarEventId?: string;
  linkedTaskId?: number;
}

export interface Recruiter {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  specialties?: string[];
  contacted?: boolean;
  lastContact?: string;
  notes?: string;
  linkedContactIds?: string[];
}

export interface NetworkConnection {
  id: string;
  name: string;
  company?: string;
  role?: string;
  relationship: RelationshipType;
  email?: string;
  linkedin?: string;
  lastContact?: string;
  notes?: string;
  opportunities?: string[];
}

export interface JobOffer {
  id: string;
  company: string;
  position: string;
  salary?: string;
  benefits?: string[];
  startDate?: string;
  status: OfferStatus;
  applicationId?: string;
  notes?: string;
  deadline?: string;
  linkedTaskId?: number;
}

export interface Certification {
  id: string;
  name: string;
  provider?: string;
  status: CertificationStatus;
  earnedDate?: string;
  expiryDate?: string;
  credentialUrl?: string;
  associatedSkillIds?: string[];
  linkedProjectNames?: string[];
  resourceIds?: string[];
  linkedTaskId?: number;
}

export interface Skill {
  id: string;
  name: string;
  category?: string;
  proficiency: SkillProficiency;
  yearsOfExperience?: number;
  endorsements?: number;
  linkedProjectNames?: string[];
  linkedCertificationIds?: string[];
  learningResourceIds?: string[];
  nextStep?: string;
  tags?: string[];
}

export interface CareerGoal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  targetDate?: string;
  status: GoalStatus;
  priority: GoalPriority;
  progress?: number;
  linkedProjectNames?: string[];
  linkedTaskIds?: number[];
  linkedCertificationIds?: string[];
  linkedApplicationIds?: string[];
  linkedSkillIds?: string[];
  notes?: string;
  createdDate: string;
  completedDate?: string;
}

export interface PortfolioProject {
  id: string;
  projectName: string;
  description: string;
  techStack: string[];
  highlights: string[];
  imageUrls?: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured: boolean;
  status: "active" | "archived" | "in-progress";
  linkedResourceIds?: string[];
  linkedTaskIds?: number[];
  createdDate: string;
  updatedDate: string;
}

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description?: string;
  date?: string;
  company?: string;
  contactName?: string;
  contactEmail?: string;
  potential: PotentialLevel;
  status: OpportunityStatus;
  linkedApplicationIds?: string[];
  linkedTaskIds?: number[];
  notes?: string;
  url?: string;
}

export const emptyJobApplication = (): JobApplication => ({
  id: `app-${Date.now()}`,
  company: "",
  position: "",
  url: "",
  appliedDate: new Date().toISOString().split("T")[0],
  status: "saved",
  progress: 0,
});

export const emptyInterview = (applicationId: string): Interview => ({
  id: `int-${Date.now()}`,
  applicationId,
  date: new Date().toISOString().split("T")[0],
  type: "phone",
  outcome: "pending",
});

export const emptyRecruiter = (): Recruiter => ({
  id: `rec-${Date.now()}`,
  name: "",
  contacted: false,
});

export const emptyNetworkConnection = (): NetworkConnection => ({
  id: `net-${Date.now()}`,
  name: "",
  relationship: "contact",
});

export const emptyJobOffer = (): JobOffer => ({
  id: `off-${Date.now()}`,
  company: "",
  position: "",
  status: "received",
});

export const emptyCertification = (): Certification => ({
  id: `cert-${Date.now()}`,
  name: "",
  status: "planned",
});

export const emptySkill = (): Skill => ({
  id: `skill-${Date.now()}`,
  name: "",
  proficiency: "beginner",
  endorsements: 0,
});

export const emptyCareerGoal = (): CareerGoal => ({
  id: `goal-${Date.now()}`,
  title: "",
  category: "role",
  status: "active",
  priority: "high",
  createdDate: new Date().toISOString().split("T")[0],
});

export const emptyPortfolioProject = (projectName: string): PortfolioProject => ({
  id: `port-${Date.now()}`,
  projectName,
  description: "",
  techStack: [],
  highlights: [],
  featured: false,
  status: "in-progress",
  createdDate: new Date().toISOString().split("T")[0],
  updatedDate: new Date().toISOString().split("T")[0],
});

export const emptyOpportunity = (): Opportunity => ({
  id: `opp-${Date.now()}`,
  type: "company",
  title: "",
  potential: "medium",
  status: "discovered",
});
