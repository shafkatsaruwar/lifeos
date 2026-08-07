import {
  emptyStudyAbroadHub,
  type ApplicationStage,
  type DocumentStatus,
  type ProgramStatus,
  type StudyAbroadApplication,
  type StudyAbroadCountry,
  type StudyAbroadDocument,
  type StudyAbroadFunding,
  type StudyAbroadHub,
  type StudyAbroadProgram,
  type StudyAbroadRequirement,
  type StudyAbroadTask,
  type StudyAbroadTimelineEvent,
  type StudyAbroadUniversity,
} from "./studyAbroadTypes";

export function newId(prefix = "sa") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function daysUntil(date?: string) {
  if (!date) return null;
  const target = new Date(date.slice(0, 10) + "T12:00:00");
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getCountry(hub: StudyAbroadHub, id?: string) {
  return hub.countries.find((item) => item.id === id);
}

export function getUniversity(hub: StudyAbroadHub, id?: string) {
  return hub.universities.find((item) => item.id === id);
}

export function getProgram(hub: StudyAbroadHub, id?: string) {
  return hub.programs.find((item) => item.id === id);
}

export function getApplication(hub: StudyAbroadHub, id?: string) {
  return hub.applications.find((item) => item.id === id);
}

export function getDocument(hub: StudyAbroadHub, id?: string) {
  return hub.documents.find((item) => item.id === id);
}

export function getFunding(hub: StudyAbroadHub, id?: string) {
  return hub.funding.find((item) => item.id === id);
}

export function universityCountry(hub: StudyAbroadHub, university?: StudyAbroadUniversity) {
  return university ? getCountry(hub, university.countryId) : undefined;
}

export function programUniversity(hub: StudyAbroadHub, program?: StudyAbroadProgram) {
  return program ? getUniversity(hub, program.universityId) : undefined;
}

export function programCountry(hub: StudyAbroadHub, program?: StudyAbroadProgram) {
  return universityCountry(hub, programUniversity(hub, program));
}

export function applicationProgram(hub: StudyAbroadHub, application?: StudyAbroadApplication) {
  return application ? getProgram(hub, application.programId) : undefined;
}

export function programsForUniversity(hub: StudyAbroadHub, universityId: string) {
  return hub.programs.filter((item) => item.universityId === universityId);
}

export function universitiesForCountry(hub: StudyAbroadHub, countryId: string) {
  return hub.universities.filter((item) => item.countryId === countryId);
}

export function programsForCountry(hub: StudyAbroadHub, countryId: string) {
  const uniIds = new Set(universitiesForCountry(hub, countryId).map((item) => item.id));
  return hub.programs.filter((item) => uniIds.has(item.universityId));
}

export function applicationsForProgram(hub: StudyAbroadHub, programId: string) {
  return hub.applications.filter((item) => item.programId === programId);
}

export function requirementsForProgram(hub: StudyAbroadHub, programId: string) {
  return hub.requirements.filter((item) => item.programId === programId);
}

export function requirementsForApplication(hub: StudyAbroadHub, applicationId: string) {
  return hub.requirements.filter((item) => item.applicationId === applicationId);
}

export function tasksForParent(hub: StudyAbroadHub, parentType: StudyAbroadTask["parentType"], parentId: string) {
  return hub.tasks.filter((item) => item.parentType === parentType && item.parentId === parentId && !item.done);
}

export function fundingForProgram(hub: StudyAbroadHub, programId: string) {
  const ids = new Set(hub.programFunding.filter((item) => item.programId === programId).map((item) => item.fundingId));
  return hub.funding.filter((item) => ids.has(item.id));
}

export function documentsUsedByApplication(hub: StudyAbroadHub, applicationId: string) {
  const ids = new Set(
    hub.applicationDocuments.filter((item) => item.applicationId === applicationId).map((item) => item.documentId),
  );
  return hub.documents.filter((item) => ids.has(item.id));
}

export function applicationsUsingDocument(hub: StudyAbroadHub, documentId: string) {
  const appIds = new Set(
    hub.applicationDocuments.filter((item) => item.documentId === documentId).map((item) => item.applicationId),
  );
  return hub.applications.filter((item) => appIds.has(item.id));
}

export function shortlistedPrograms(hub: StudyAbroadHub) {
  return hub.programs
    .filter((item) => item.shortlisted || item.status === "shortlisted" || item.status === "preparing")
    .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0) || a.name.localeCompare(b.name));
}

export function openTasks(hub: StudyAbroadHub) {
  return hub.tasks.filter((item) => !item.done).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
}

export function nextDeadline(hub: StudyAbroadHub): {
  program: StudyAbroadProgram;
  university?: StudyAbroadUniversity;
  country?: StudyAbroadCountry;
  deadline: string;
  days: number;
} | null {
  const candidates = hub.programs
    .map((program) => {
      const days = daysUntil(program.deadline);
      if (days === null || days < 0) return null;
      if (["rejected", "withdrawn", "accepted"].includes(program.status)) return null;
      const university = programUniversity(hub, program);
      return {
        program,
        university,
        country: universityCountry(hub, university),
        deadline: program.deadline!,
        days,
      };
    })
    .filter(Boolean) as Array<{
    program: StudyAbroadProgram;
    university?: StudyAbroadUniversity;
    country?: StudyAbroadCountry;
    deadline: string;
    days: number;
  }>;
  candidates.sort((a, b) => a.days - b.days);
  return candidates[0] ?? null;
}

export function requirementReadiness(requirements: StudyAbroadRequirement[]) {
  if (!requirements.length) return { ready: 0, total: 0, percent: 0, missing: [] as StudyAbroadRequirement[] };
  const readyStatuses: StudyAbroadRequirement["status"][] = ["ready", "submitted", "waived"];
  const ready = requirements.filter((item) => readyStatuses.includes(item.status)).length;
  const missing = requirements.filter((item) => item.status === "missing" || item.status === "draft");
  return {
    ready,
    total: requirements.length,
    percent: Math.round((ready / requirements.length) * 100),
    missing,
  };
}

export function applicationReadiness(hub: StudyAbroadHub, applicationId: string) {
  const application = getApplication(hub, applicationId);
  if (!application) return { ready: 0, total: 0, percent: 0, missing: [] as StudyAbroadRequirement[] };
  const reqs = [
    ...requirementsForApplication(hub, applicationId),
    ...requirementsForProgram(hub, application.programId),
  ];
  // De-dupe by id
  const map = new Map(reqs.map((item) => [item.id, item]));
  return requirementReadiness([...map.values()]);
}

export function documentsReadyPercent(hub: StudyAbroadHub) {
  if (!hub.documents.length) return 0;
  const readyStatuses: DocumentStatus[] = ["ready", "submitted"];
  const ready = hub.documents.filter((item) => readyStatuses.includes(item.status)).length;
  return Math.round((ready / hub.documents.length) * 100);
}

export function blockingDocumentInsight(hub: StudyAbroadHub): {
  document: StudyAbroadDocument;
  applicationCount: number;
} | null {
  const blockers = hub.documents
    .filter((item) => item.status === "missing" || item.status === "need_to_obtain" || item.status === "expired")
    .map((document) => ({
      document,
      applicationCount: applicationsUsingDocument(hub, document.id).length ||
        hub.requirements.filter((req) => req.documentId === document.id).length,
    }))
    .sort((a, b) => b.applicationCount - a.applicationCount);
  return blockers[0] ?? null;
}

export function whatMattersNow(hub: StudyAbroadHub): {
  title: string;
  detail: string;
  actionLabel: string;
  actionView: "documents" | "applications" | "programs" | "funding" | "explore" | "dashboard";
  focusId?: string;
} {
  const blocker = blockingDocumentInsight(hub);
  if (blocker && blocker.applicationCount > 0) {
    return {
      title: `Complete your ${blocker.document.category.toLowerCase()} set.`,
      detail: `${blocker.document.name} is blocking ${blocker.applicationCount} application${blocker.applicationCount === 1 ? "" : "s"}.`,
      actionLabel: "Open Documents",
      actionView: "documents",
      focusId: blocker.document.id,
    };
  }

  const open = openTasks(hub)[0];
  if (open) {
    return {
      title: open.title,
      detail: "Next open Study Abroad task with context from its parent object.",
      actionLabel: "View applications",
      actionView: "applications",
      focusId: open.id,
    };
  }

  const deadline = nextDeadline(hub);
  if (deadline) {
    return {
      title: `Work toward ${deadline.program.name}.`,
      detail: `Deadline in ${deadline.days} day${deadline.days === 1 ? "" : "s"} · ${deadline.university?.name || "Program"}`,
      actionLabel: "Open program",
      actionView: "programs",
      focusId: deadline.program.id,
    };
  }

  if (!hub.programs.length) {
    return {
      title: "Start exploring programs.",
      detail: "Add a country, then universities and programs. Your shortlist will form here.",
      actionLabel: "Explore",
      actionView: "explore",
    };
  }

  return {
    title: "Review your shortlist.",
    detail: "Pick the strongest options and turn them into applications when ready.",
    actionLabel: "Open programs",
    actionView: "programs",
  };
}

export function parentLabel(hub: StudyAbroadHub, task: StudyAbroadTask) {
  switch (task.parentType) {
    case "country":
      return getCountry(hub, task.parentId)?.name || "Country";
    case "university":
      return getUniversity(hub, task.parentId)?.name || "University";
    case "program":
      return getProgram(hub, task.parentId)?.name || "Program";
    case "application": {
      const program = applicationProgram(hub, getApplication(hub, task.parentId));
      return program?.name || "Application";
    }
    case "document":
      return getDocument(hub, task.parentId)?.name || "Document";
    case "funding":
      return getFunding(hub, task.parentId)?.name || "Funding";
    default:
      return task.parentType;
  }
}

export function programStatusLabel(status: ProgramStatus) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function applicationStageLabel(stage: ApplicationStage) {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map Study Abroad timeline events into LifeOS calendar event shape. */
export function studyAbroadToCalendarEvents(
  events: StudyAbroadTimelineEvent[],
  color = "#625af6",
): Array<{ id: string; title: string; start: string; end?: string; source: "LifeOS"; color: string; notes?: string }> {
  return events.map((event) => ({
    id: `study-abroad-${event.id}`,
    title: event.title,
    start: event.date.length === 10 ? `${event.date}T09:00:00` : event.date,
    source: "LifeOS" as const,
    color,
    notes: event.notes ? `[Study Abroad] ${event.notes}` : "[Study Abroad]",
  }));
}

/**
 * Migrate legacy Study Abroad hubs (pre-rebuild) into the normalized model.
 * Preserves universities/programs/scholarships/applications/documents when present.
 */
export function normalizeStudyAbroadHub(raw: unknown): StudyAbroadHub {
  if (!raw || typeof raw !== "object") return emptyStudyAbroadHub;
  const data = raw as Record<string, any>;

  // Already normalized
  if (Array.isArray(data.countries) || Array.isArray(data.universities)) {
    return {
      ...emptyStudyAbroadHub,
      countries: Array.isArray(data.countries) ? data.countries : [],
      universities: Array.isArray(data.universities) ? data.universities : [],
      programs: Array.isArray(data.programs) ? data.programs : [],
      applications: Array.isArray(data.applications) ? data.applications : [],
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      documents: Array.isArray(data.documents) ? data.documents : [],
      applicationDocuments: Array.isArray(data.applicationDocuments) ? data.applicationDocuments : [],
      funding: Array.isArray(data.funding)
        ? data.funding
        : Array.isArray(data.scholarships)
          ? migrateScholarships(data.scholarships)
          : [],
      programFunding: Array.isArray(data.programFunding) ? data.programFunding : [],
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      knowledge: Array.isArray(data.knowledge)
        ? data.knowledge
        : Array.isArray(data.observations)
          ? migrateObservations(data.observations)
          : [],
      costs: Array.isArray(data.costs) ? data.costs : [],
      timelineEvents: Array.isArray(data.timelineEvents) ? data.timelineEvents : [],
      history: Array.isArray(data.history) ? data.history : [],
      sessionMemory: data.sessionMemory && typeof data.sessionMemory === "object" ? data.sessionMemory : {},
    };
  }

  return emptyStudyAbroadHub;
}

function migrateScholarships(list: any[]): StudyAbroadFunding[] {
  return list.map((item) => ({
    id: String(item.id || newId("fund")),
    name: String(item.name || "Scholarship"),
    kind: "scholarship" as const,
    amount: item.stipendAmount != null ? String(item.stipendAmount) : undefined,
    coverage: item.coverageType,
    eligibility: Array.isArray(item.eligibilityRequirements) ? item.eligibilityRequirements.join("; ") : item.eligibility,
    deadline: item.deadline,
    status: mapOldScholarshipStatus(item.status),
    officialUrl: Array.isArray(item.sourceUrls) ? item.sourceUrls[0] : item.officialUrl,
    notes: item.notes,
    createdAt: item.createdAt || nowIso(),
    updatedAt: item.updatedAt || nowIso(),
  }));
}

function mapOldScholarshipStatus(status?: string): StudyAbroadFunding["status"] {
  switch (status) {
    case "eligible":
      return "eligible";
    case "possibly_eligible":
      return "maybe";
    case "preparing":
      return "preparing";
    case "submitted":
      return "applied";
    case "awarded":
      return "awarded";
    case "rejected":
    case "not_eligible":
    case "expired":
      return "rejected";
    default:
      return "researching";
  }
}

function migrateObservations(list: any[]) {
  return list.map((item) => ({
    id: String(item.id || newId("know")),
    title: String(item.title || item.type || "Note"),
    body: item.detail || item.notes || item.body,
    contextType: "general" as const,
    createdAt: item.createdAt || nowIso(),
    updatedAt: item.updatedAt || nowIso(),
  }));
}

export function appendHistory(
  hub: StudyAbroadHub,
  title: string,
  detail?: string,
  contextType?: string,
  contextId?: string,
): StudyAbroadHub {
  return {
    ...hub,
    history: [
      {
        id: newId("hist"),
        at: nowIso(),
        title,
        detail,
        contextType,
        contextId,
      },
      ...(hub.history || []),
    ].slice(0, 200),
  };
}

/** Compact context for LifeOS Copilot when Study Abroad is relevant. */
export function buildStudyAbroadCopilotContext(hub: StudyAbroadHub) {
  const matter = whatMattersNow(hub);
  const deadline = nextDeadline(hub);
  const open = openTasks(hub).slice(0, 6).map((task) => ({
    id: task.id,
    title: task.title,
    parent: parentLabel(hub, task),
    due: task.due,
  }));
  return {
    whatMattersNow: matter,
    nextDeadline: deadline
      ? {
          program: deadline.program.name,
          university: deadline.university?.name,
          country: deadline.country?.name,
          deadline: deadline.deadline,
          days: deadline.days,
        }
      : null,
    counts: {
      countries: hub.countries.length,
      programs: hub.programs.length,
      shortlisted: shortlistedPrograms(hub).length,
      applications: hub.applications.length,
      documentsReadyPercent: documentsReadyPercent(hub),
      openTasks: openTasks(hub).length,
    },
    openTasks: open,
    shortlist: shortlistedPrograms(hub).slice(0, 5).map((program) => ({
      id: program.id,
      name: program.name,
      university: programUniversity(hub, program)?.name,
      country: programCountry(hub, program)?.name,
      status: program.status,
      fitScore: program.fitScore,
      deadline: program.deadline,
    })),
    lastProgramId: hub.sessionMemory?.lastProgramId,
    lastNote: hub.sessionMemory?.lastNote,
  };
}

export function linkFundingToProgram(hub: StudyAbroadHub, programId: string, fundingId: string) {
  if (hub.programFunding.some((item) => item.programId === programId && item.fundingId === fundingId)) return hub;
  const funding = getFunding(hub, fundingId);
  const program = getProgram(hub, programId);
  return appendHistory(
    {
      ...hub,
      programFunding: [...hub.programFunding, { id: newId("pf"), programId, fundingId }],
    },
    `Linked funding to program`,
    `${funding?.name || "Funding"} → ${program?.name || "Program"}`,
    "program",
    programId,
  );
}

export function createDocumentVariant(hub: StudyAbroadHub, baseId: string, variantLabel: string) {
  const base = getDocument(hub, baseId);
  if (!base) return hub;
  const stamp = nowIso();
  const variant = {
    ...base,
    id: newId("doc"),
    name: base.name,
    variantOf: base.id,
    variantLabel,
    status: "draft" as const,
    createdAt: stamp,
    updatedAt: stamp,
  };
  return appendHistory(
    { ...hub, documents: [...hub.documents, variant] },
    `Created ${base.category} variant`,
    variantLabel,
    "document",
    variant.id,
  );
}

export function linkDocumentToApplication(hub: StudyAbroadHub, applicationId: string, documentId: string, requirementId?: string) {
  if (hub.applicationDocuments.some((item) => item.applicationId === applicationId && item.documentId === documentId)) {
    return hub;
  }
  const doc = getDocument(hub, documentId);
  const program = applicationProgram(hub, getApplication(hub, applicationId));
  return appendHistory(
    {
      ...hub,
      applicationDocuments: [
        ...hub.applicationDocuments,
        { id: newId("ad"), applicationId, documentId, requirementId },
      ],
    },
    `Linked document to application`,
    `${doc?.name || "Document"} → ${program?.name || "Application"}`,
    "application",
    applicationId,
  );
}

/** Ensure country records exist for legacy universities that only stored country as a string. */
export function ensureCountriesFromUniversities(hub: StudyAbroadHub): StudyAbroadHub {
  const countries = [...hub.countries];
  const universities = hub.universities.map((uni) => {
    if (uni.countryId && countries.some((c) => c.id === uni.countryId)) return uni;
    const name = (uni as any).country || "Unknown";
    let country = countries.find((c) => c.name.toLowerCase() === String(name).toLowerCase());
    if (!country) {
      country = {
        id: newId("country"),
        name: String(name),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        active: true,
      };
      countries.push(country);
    }
    return { ...uni, countryId: country.id };
  });
  return { ...hub, countries, universities };
}
