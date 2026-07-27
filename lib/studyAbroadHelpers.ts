import type {
  StudyAbroadHub,
  Application,
  Program,
  University,
  StudyDocument,
  Observation,
  StudyPreferenceWeights,
} from "./studyAbroadTypes";

export function getUniversityById(hub: StudyAbroadHub, id: string): University | undefined {
  return hub.universities.find((u) => u.id === id);
}

export function getProgramById(hub: StudyAbroadHub, id: string): Program | undefined {
  return hub.programs.find((p) => p.id === id);
}

export function getScholarshipById(hub: StudyAbroadHub, id: string) {
  return hub.scholarships.find((s) => s.id === id);
}

export function getApplicationById(hub: StudyAbroadHub, id: string): Application | undefined {
  return hub.applications.find((a) => a.id === id);
}

export function getDocumentById(hub: StudyAbroadHub, id: string): StudyDocument | undefined {
  return hub.documents.find((d) => d.id === id);
}

export function getProgramsForUniversity(hub: StudyAbroadHub, universityId: string): Program[] {
  return hub.programs.filter((p) => p.universityId === universityId);
}

export function getApplicationsForProgram(hub: StudyAbroadHub, programId: string): Application[] {
  return hub.applications.filter((a) => a.programId === programId);
}

export function getAffectedApplicationsByDocument(hub: StudyAbroadHub, documentId: string): Application[] {
  return hub.applications.filter((a) => a.linkedDocumentIds?.includes(documentId));
}

export function countApplicationsByStatus(hub: StudyAbroadHub, status: string): number {
  return hub.applications.filter((a) => a.status === status).length;
}

export function upcomingDeadlines(hub: StudyAbroadHub): Array<{
  type: "application" | "scholarship";
  title: string;
  deadline: string;
  daysUntil: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlines: Array<{
    type: "application" | "scholarship";
    title: string;
    deadline: string;
    daysUntil: number;
  }> = [];

  hub.applications.forEach((app) => {
    if (app.applicationDeadline) {
      const deadline = new Date(app.applicationDeadline);
      const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0) {
        const prog = getProgramById(hub, app.programId);
        const uni = getUniversityById(hub, app.universityId);
        deadlines.push({
          type: "application",
          title: `${uni?.name || "Unknown"} - ${prog?.name || "Unknown"}`,
          deadline: app.applicationDeadline,
          daysUntil,
        });
      }
    }
    if (app.scholarshipDeadline) {
      const deadline = new Date(app.scholarshipDeadline);
      const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0) {
        const uni = getUniversityById(hub, app.universityId);
        deadlines.push({
          type: "scholarship",
          title: `${uni?.name || "Unknown"} - Scholarship`,
          deadline: app.scholarshipDeadline,
          daysUntil,
        });
      }
    }
  });

  return deadlines.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function calculateFitScore(
  program: Program,
  hub: StudyAbroadHub,
  weights: StudyPreferenceWeights
): { score: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // Tuition affordability
  if (program.tuitionAmount) {
    const tuitionScore = Math.max(0, 100 - (program.tuitionAmount / 50000) * 100);
    totalScore += tuitionScore * weights.tuitionAffordability;
    totalWeight += weights.tuitionAffordability;
    if (tuitionScore >= 80) breakdown.push("Tuition is affordable");
    else if (tuitionScore >= 50) breakdown.push("Tuition is moderate");
    else breakdown.push("Tuition is expensive");
  }

  // Scholarship availability
  const linkedScholarships = hub.scholarships.filter((s) => s.linkedProgramIds?.includes(program.id));
  const fullScholarships = linkedScholarships.filter((s) => s.coverageType === "full_tuition");
  if (fullScholarships.length > 0) {
    totalScore += 100 * weights.scholarshipAvailability;
    breakdown.push("Full tuition scholarship available");
  } else if (linkedScholarships.length > 0) {
    totalScore += 60 * weights.scholarshipAvailability;
    breakdown.push("Partial scholarship available");
  }
  totalWeight += weights.scholarshipAvailability;

  // Living costs
  if (program.estimatedMonthlyLivingCostMax) {
    const livingCostScore = Math.max(0, 100 - (program.estimatedMonthlyLivingCostMax / 3000) * 100);
    totalScore += livingCostScore * weights.monthlyLivingCost;
    totalWeight += weights.monthlyLivingCost;
    if (livingCostScore >= 80) breakdown.push("Living costs are low");
    else if (livingCostScore >= 50) breakdown.push("Living costs are moderate");
    else breakdown.push("Living costs are high");
  }

  // Field alignment
  if (program.field === "Digital Health") {
    totalScore += 100 * weights.digitalHealthFit;
    breakdown.push("Strong Digital Health alignment");
  } else if (program.field === "Artificial Intelligence") {
    totalScore += 100 * weights.aiFit;
    breakdown.push("AI specialization available");
  }
  totalWeight += weights.digitalHealthFit + weights.aiFit;

  // English taught
  if (program.teachingLanguage === "English") {
    totalScore += 90 * weights.englishTaught;
    breakdown.push("English-taught program");
  } else if (!program.teachingLanguage) {
    totalScore += 50 * weights.englishTaught;
    breakdown.push("Teaching language not specified");
  }
  totalWeight += weights.englishTaught;

  // Document feasibility
  const requiredDocs = hub.documents.filter(
    (d) => hub.applications.some((a) => a.programId === program.id && a.linkedDocumentIds?.includes(d.id))
  );
  const blockedDocs = requiredDocs.filter((d) => d.status === "blocked");
  if (blockedDocs.length === 0) {
    totalScore += 90 * weights.documentFeasibility;
    if (requiredDocs.length === 0) breakdown.push("No blocking documents");
    else breakdown.push("All required documents available");
  } else {
    totalScore += 30 * weights.documentFeasibility;
    breakdown.push(`${blockedDocs.length} blocked document(s)`);
  }
  totalWeight += weights.documentFeasibility;

  const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  return { score: finalScore, breakdown };
}

export function generateObservations(hub: StudyAbroadHub): Observation[] {
  const observations: Observation[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Document blockers
  hub.documents.forEach((doc) => {
    if (doc.status === "blocked") {
      const affectedApps = getAffectedApplicationsByDocument(hub, doc.id);
      if (affectedApps.length > 0) {
        observations.push({
          id: `obs-doc-${doc.id}`,
          module: "study_abroad",
          type: "document_blocker",
          fact: `The ${doc.name} is currently unavailable and is linked to ${affectedApps.length} active application(s).`,
          timestamp: new Date().toISOString(),
          metadata: {
            documentId: doc.id,
            affectedApplicationIds: affectedApps.map((a) => a.id),
            blockingReason: doc.blockingReason,
          },
        });
      }
    }
  });

  // Upcoming deadlines
  upcomingDeadlines(hub).forEach((deadline) => {
    if (deadline.daysUntil <= 30 && deadline.daysUntil > 0) {
      observations.push({
        id: `obs-deadline-${deadline.deadline}-${deadline.type}`,
        module: "study_abroad",
        type: "deadline",
        fact: `${deadline.title} ${deadline.type} deadline is in ${deadline.daysUntil} days.`,
        timestamp: new Date().toISOString(),
        metadata: {
          deadline: deadline.deadline,
          daysUntil: deadline.daysUntil,
          type: deadline.type,
        },
      });
    }
  });

  // Stale records
  hub.applications.forEach((app) => {
    const lastUpdated = new Date(app.lastUpdated);
    const daysSinceUpdate = Math.floor((today.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate > 14 && (app.status === "submitted" || app.status === "awaiting_response")) {
      const prog = getProgramById(hub, app.programId);
      const uni = getUniversityById(hub, app.universityId);
      observations.push({
        id: `obs-stale-${app.id}`,
        module: "study_abroad",
        type: "stale_record",
        fact: `Application to ${uni?.name || "Unknown"} - ${prog?.name || "Unknown"} has not been updated in ${daysSinceUpdate} days.`,
        timestamp: new Date().toISOString(),
        metadata: {
          applicationId: app.id,
          daysSinceUpdate,
          lastUpdated: app.lastUpdated,
        },
      });
    }
  });

  // Follow-up inquiries without responses
  hub.applications.forEach((app) => {
    if (app.status === "researching" || app.status === "considering") {
      const uni = getUniversityById(hub, app.universityId);
      if (!app.dateStarted && !app.contactEmail) {
        observations.push({
          id: `obs-followup-${app.id}`,
          module: "study_abroad",
          type: "follow_up",
          fact: `${uni?.name || "Unknown"} inquiry awaiting response.`,
          timestamp: new Date().toISOString(),
          metadata: {
            applicationId: app.id,
            institution: uni?.name,
            status: app.status,
          },
        });
      }
    }
  });

  return observations;
}
