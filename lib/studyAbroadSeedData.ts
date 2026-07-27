import type { StudyAbroadHub, University, Program, Application, StudyDocument, DecisionRecord } from "./studyAbroadTypes";

export const seedUniversities: University[] = [
  {
    id: "uni-deggendorf",
    name: "Deggendorf Institute of Technology",
    country: "Germany",
    city: "Deggendorf",
    websiteUrl: "https://www.th-deg.de",
    applicationPortalUrl: "https://www.th-deg.de/en",
    universityType: "public",
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "uni-frankfurt",
    name: "Frankfurt",
    country: "Germany",
    city: "Frankfurt",
    notes: "Inquiry sent, awaiting response",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "uni-darmstadt",
    name: "Darmstadt",
    country: "Germany",
    city: "Darmstadt",
    notes: "Inquiry sent, awaiting response",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const seedPrograms: Program[] = [
  {
    id: "prog-deggendorf-dh",
    universityId: "uni-deggendorf",
    name: "Master's in Digital Health",
    degreeType: "MSc",
    field: "Digital Health",
    intake: "Winter Semester 2026/27",
    applicationStatus: "rejected",
    confidence: "verified",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const seedDocuments: StudyDocument[] = [];

export const seedApplications: Application[] = [
  {
    id: "app-deggendorf",
    universityId: "uni-deggendorf",
    programId: "prog-deggendorf-dh",
    intake: "Winter Semester 2026/27",
    status: "rejected",
    applicantNumber: "7382",
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const seedDecisions: DecisionRecord[] = [
  {
    id: "dec-deggendorf",
    applicationId: "app-deggendorf",
    outcome: "rejected",
    decisionDate: "2026-07-27",
    officialReason: "Due to the high number of applicants, we could not admit all qualified applicants.",
    personalInterpretation: "The diploma was not uploaded by the required deadline because it was not available. This may have affected the application.",
    notes: "Decision letter: Ablehnungsbescheid_218079.PDF",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function createStudyAbroadSeedData(): StudyAbroadHub {
  return {
    universities: seedUniversities,
    programs: seedPrograms,
    scholarships: [],
    applications: seedApplications,
    documents: seedDocuments,
    decisions: seedDecisions,
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
}
