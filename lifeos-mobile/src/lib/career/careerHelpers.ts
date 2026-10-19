/**
 * Metro-safe copy for Expo (lives under lifeos-mobile/). Keep in sync with
 * repo-root `lib/careerHelpers.ts`. Do not import monorepo `lib/lifeos-kernel`.
 */
import {
  CAREER_STAGES,
  emptyCareerHub,
  emptyInterviewChecklist,
  type ApplicationPriority,
  type CareerActivity,
  type CareerActivityType,
  type CareerApplication,
  type CareerCompany,
  type CareerContact,
  type CareerDocument,
  type CareerDocumentType,
  type CareerHub,
  type CareerInteraction,
  type CareerInterview,
  type CareerObservation,
  type CareerObservationType,
  type CareerStageId,
  type CareerTask,
  type InteractionType,
  type InterviewType,
  type WorkArrangement,
} from "./careerTypes";

type KernelObservation = {
  id: string;
  module: string;
  type: "deadline" | "queue" | "milestone" | "status" | "activity";
  fact: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  importance: "critical" | "high" | "normal" | "low";
};

export function newCareerId(prefix = "cr") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function stageLabel(stageId: CareerStageId) {
  return CAREER_STAGES.find((s) => s.id === stageId)?.name ?? stageId;
}

export function isTerminalStage(stageId: CareerStageId) {
  return CAREER_STAGES.find((s) => s.id === stageId)?.isTerminal ?? false;
}

export function normalizeCareerHub(raw: unknown): CareerHub {
  const empty = emptyCareerHub();
  if (!raw || typeof raw !== "object") return empty;
  const data = raw as Partial<CareerHub>;
  return {
    version: 1,
    companies: Array.isArray(data.companies) ? data.companies : [],
    applications: Array.isArray(data.applications) ? data.applications : [],
    stageHistory: Array.isArray(data.stageHistory) ? data.stageHistory : [],
    contacts: Array.isArray(data.contacts) ? data.contacts : [],
    interactions: Array.isArray(data.interactions) ? data.interactions : [],
    interviews: Array.isArray(data.interviews) ? data.interviews : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    documents: Array.isArray(data.documents) ? data.documents : [],
    activity: Array.isArray(data.activity) ? data.activity : [],
    observations: Array.isArray(data.observations) ? data.observations : [],
    settings: {
      defaultCurrency: data.settings?.defaultCurrency || empty.settings.defaultCurrency,
      defaultTimezone: data.settings?.defaultTimezone || empty.settings.defaultTimezone,
    },
  };
}

function pushActivity(
  hub: CareerHub,
  activityType: CareerActivityType,
  summary: string,
  opts: { applicationId?: string; companyId?: string; metadata?: CareerActivity["metadata"] } = {},
): CareerHub {
  const entry: CareerActivity = {
    id: newCareerId("act"),
    applicationId: opts.applicationId,
    companyId: opts.companyId,
    activityType,
    summary,
    metadata: opts.metadata,
    occurredAt: nowIso(),
  };
  return { ...hub, activity: [entry, ...hub.activity].slice(0, 500) };
}

/** Idempotent observation append — skips if same id already present. */
export function publishCareerObservation(
  hub: CareerHub,
  observation: Omit<CareerObservation, "sourceEnvironment" | "provenance" | "privacy"> &
    Partial<Pick<CareerObservation, "sourceEnvironment" | "provenance" | "privacy">>,
): CareerHub {
  if (hub.observations.some((o) => o.id === observation.id)) return hub;
  const full: CareerObservation = {
    id: observation.id,
    type: observation.type,
    sourceEnvironment: "Career",
    entityId: observation.entityId,
    timestamp: observation.timestamp || nowIso(),
    payload: observation.payload || {},
    provenance: "user_action",
    privacy: "private",
  };
  return { ...hub, observations: [full, ...hub.observations].slice(0, 500) };
}

/** Map Career observations into kernel Observation shape for Personal Context. */
export function careerObservationsToKernel(hub: CareerHub): KernelObservation[] {
  return hub.observations.map((obs) => ({
    id: obs.id,
    module: "Career",
    type: mapObservationKind(obs.type),
    fact: observationFact(obs),
    timestamp: new Date(obs.timestamp),
    metadata: { ...obs.payload, careerType: obs.type, entityId: obs.entityId, privacy: obs.privacy },
    importance: observationImportance(obs.type),
  }));
}

function mapObservationKind(type: CareerObservationType): KernelObservation["type"] {
  if (type.includes("interview")) return "deadline";
  if (type.includes("followup")) return "queue";
  if (type.includes("offer") || type.includes("accepted")) return "milestone";
  if (type.includes("rejected")) return "status";
  if (type.includes("stage")) return "status";
  return "activity";
}

function observationFact(obs: CareerObservation): string {
  switch (obs.type) {
    case "career.application.created":
      return `Application created: ${obs.payload.jobTitle ?? "role"} at ${obs.payload.companyName ?? "company"}`;
    case "career.application.stage_changed":
      return `Application moved to ${obs.payload.newStage ?? "a new stage"}`;
    case "career.interview.scheduled":
      return `Interview scheduled: ${obs.payload.title ?? "Interview"}`;
    case "career.interview.completed":
      return `Interview completed: ${obs.payload.title ?? "Interview"}`;
    case "career.followup.due":
      return `Follow-up due: ${obs.payload.nextAction ?? "action"}`;
    case "career.offer.received":
      return `Offer received for ${obs.payload.jobTitle ?? "a role"}`;
    case "career.application.rejected":
      return `Application rejected: ${obs.payload.jobTitle ?? "role"}`;
    case "career.application.accepted":
      return `Offer accepted: ${obs.payload.jobTitle ?? "role"}`;
    default:
      return obs.type;
  }
}

function observationImportance(type: CareerObservationType): KernelObservation["importance"] {
  if (type === "career.offer.received" || type === "career.application.accepted") return "critical";
  if (type === "career.interview.scheduled" || type === "career.followup.due") return "high";
  if (type === "career.application.rejected") return "normal";
  return "normal";
}

export function findCompanyByName(hub: CareerHub, name: string) {
  const key = name.trim().toLowerCase();
  return hub.companies.find((c) => c.name.trim().toLowerCase() === key);
}

export function ensureCompany(hub: CareerHub, name: string): { hub: CareerHub; company: CareerCompany } {
  const existing = findCompanyByName(hub, name);
  if (existing) return { hub, company: existing };
  const now = nowIso();
  const company: CareerCompany = {
    id: newCareerId("co"),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  };
  let next = { ...hub, companies: [company, ...hub.companies] };
  next = pushActivity(next, "company_created", `Company added: ${company.name}`, { companyId: company.id });
  return { hub: next, company };
}

export function upsertCompany(hub: CareerHub, input: Partial<CareerCompany> & { name: string; id?: string }) {
  const now = nowIso();
  if (input.id) {
    return {
      ...hub,
      companies: hub.companies.map((c) =>
        c.id === input.id ? { ...c, ...input, name: input.name.trim(), updatedAt: now } : c,
      ),
    };
  }
  const { hub: withCo } = ensureCompany(hub, input.name);
  const created = findCompanyByName(withCo, input.name)!;
  return {
    ...withCo,
    companies: withCo.companies.map((c) =>
      c.id === created.id
        ? {
            ...c,
            website: input.website ?? c.website,
            industry: input.industry ?? c.industry,
            location: input.location ?? c.location,
            size: input.size ?? c.size,
            description: input.description ?? c.description,
            notes: input.notes ?? c.notes,
            updatedAt: now,
          }
        : c,
    ),
  };
}

export function deleteCompany(hub: CareerHub, companyId: string): CareerHub | { error: string } {
  if (hub.applications.some((a) => a.companyId === companyId)) {
    return { error: "Remove or reassign applications linked to this company first." };
  }
  return {
    ...hub,
    companies: hub.companies.filter((c) => c.id !== companyId),
    contacts: hub.contacts.map((c) => (c.companyId === companyId ? { ...c, companyId: undefined } : c)),
  };
}

export type CreateApplicationInput = {
  jobTitle: string;
  companyName: string;
  jobUrl?: string;
  location?: string;
  workArrangement?: WorkArrangement;
  employmentType?: CareerApplication["employmentType"];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: CareerApplication["salaryPeriod"];
  source?: string;
  appliedAt?: string;
  stageId?: CareerStageId;
  priority?: ApplicationPriority;
  description?: string;
  notes?: string;
  nextAction?: string;
  nextActionDueAt?: string;
};

export function createApplication(hub: CareerHub, input: CreateApplicationInput): CareerHub | { error: string } {
  const jobTitle = input.jobTitle.trim();
  const companyName = input.companyName.trim();
  if (!jobTitle) return { error: "Job title is required." };
  if (!companyName) return { error: "Company is required." };

  const { hub: withCompany, company } = ensureCompany(hub, companyName);
  const now = nowIso();
  const stageId = input.stageId ?? (input.appliedAt ? "applied" : "saved");
  const application: CareerApplication = {
    id: newCareerId("app"),
    companyId: company.id,
    jobTitle,
    jobUrl: input.jobUrl?.trim() || undefined,
    location: input.location?.trim() || undefined,
    workArrangement: input.workArrangement,
    employmentType: input.employmentType,
    salaryMin: input.salaryMin,
    salaryMax: input.salaryMax,
    salaryCurrency: input.salaryCurrency || withCompany.settings.defaultCurrency,
    salaryPeriod: input.salaryPeriod,
    source: input.source?.trim() || undefined,
    appliedAt: input.appliedAt || undefined,
    stageId,
    priority: input.priority || "medium",
    description: input.description?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    nextAction: input.nextAction?.trim() || undefined,
    nextActionDueAt: input.nextActionDueAt || undefined,
    outcome: "none",
    createdAt: now,
    updatedAt: now,
  };

  let next: CareerHub = {
    ...withCompany,
    applications: [application, ...withCompany.applications],
    stageHistory: [
      {
        id: newCareerId("sh"),
        applicationId: application.id,
        newStageId: stageId,
        changedAt: now,
        note: "Application created",
      },
      ...withCompany.stageHistory,
    ],
  };
  next = pushActivity(next, "application_created", `Applied tracking: ${jobTitle} @ ${company.name}`, {
    applicationId: application.id,
    companyId: company.id,
  });
  next = publishCareerObservation(next, {
    id: `obs-app-created-${application.id}`,
    type: "career.application.created",
    entityId: application.id,
    timestamp: now,
    payload: { jobTitle, companyName: company.name, stageId },
  });
  return next;
}

export function updateApplication(
  hub: CareerHub,
  applicationId: string,
  patch: Partial<CareerApplication>,
): CareerHub | { error: string } {
  const current = hub.applications.find((a) => a.id === applicationId);
  if (!current) return { error: "Application not found." };
  const now = nowIso();
  const nextApp: CareerApplication = {
    ...current,
    ...patch,
    id: current.id,
    companyId: patch.companyId || current.companyId,
    jobTitle: (patch.jobTitle ?? current.jobTitle).trim(),
    updatedAt: now,
  };
  let next: CareerHub = {
    ...hub,
    applications: hub.applications.map((a) => (a.id === applicationId ? nextApp : a)),
  };
  next = pushActivity(next, "application_updated", `Updated ${nextApp.jobTitle}`, {
    applicationId,
    companyId: nextApp.companyId,
  });
  return next;
}

export function deleteApplication(hub: CareerHub, applicationId: string): CareerHub {
  return {
    ...hub,
    applications: hub.applications.filter((a) => a.id !== applicationId),
    stageHistory: hub.stageHistory.filter((h) => h.applicationId !== applicationId),
    interviews: hub.interviews.filter((i) => i.applicationId !== applicationId),
    interactions: hub.interactions.filter((i) => i.applicationId !== applicationId),
    tasks: hub.tasks.filter((t) => t.applicationId !== applicationId),
    documents: hub.documents.map((d) =>
      d.applicationId === applicationId ? { ...d, applicationId: undefined } : d,
    ),
    activity: hub.activity.filter((a) => a.applicationId !== applicationId),
  };
}

/** Atomic stage change + history + observation. */
export function moveApplicationStage(
  hub: CareerHub,
  applicationId: string,
  newStageId: CareerStageId,
  note?: string,
): CareerHub | { error: string } {
  const current = hub.applications.find((a) => a.id === applicationId);
  if (!current) return { error: "Application not found." };
  if (current.stageId === newStageId) return hub;
  if (!CAREER_STAGES.some((s) => s.id === newStageId)) return { error: "Invalid stage." };

  const now = nowIso();
  let outcome = current.outcome;
  if (newStageId === "offer") outcome = "offer";
  if (newStageId === "accepted") outcome = "accepted";
  if (newStageId === "rejected") outcome = "rejected";
  if (newStageId === "withdrawn") outcome = "withdrawn";

  let next: CareerHub = {
    ...hub,
    applications: hub.applications.map((a) =>
      a.id === applicationId ? { ...a, stageId: newStageId, outcome, updatedAt: now } : a,
    ),
    stageHistory: [
      {
        id: newCareerId("sh"),
        applicationId,
        previousStageId: current.stageId,
        newStageId,
        changedAt: now,
        note,
      },
      ...hub.stageHistory,
    ],
  };
  const company = hub.companies.find((c) => c.id === current.companyId);
  next = pushActivity(
    next,
    "stage_changed",
    `${current.jobTitle}: ${stageLabel(current.stageId)} → ${stageLabel(newStageId)}`,
    { applicationId, companyId: current.companyId, metadata: { from: current.stageId, to: newStageId } },
  );
  next = publishCareerObservation(next, {
    id: `obs-stage-${applicationId}-${newStageId}-${now}`,
    type: "career.application.stage_changed",
    entityId: applicationId,
    timestamp: now,
    payload: {
      jobTitle: current.jobTitle,
      companyName: company?.name ?? null,
      previousStage: current.stageId,
      newStage: newStageId,
    },
  });
  if (newStageId === "offer") {
    next = publishCareerObservation(next, {
      id: `obs-offer-${applicationId}-${now}`,
      type: "career.offer.received",
      entityId: applicationId,
      timestamp: now,
      payload: { jobTitle: current.jobTitle, companyName: company?.name ?? null },
    });
    next = pushActivity(next, "outcome_recorded", `Offer recorded for ${current.jobTitle}`, {
      applicationId,
      companyId: current.companyId,
    });
  }
  if (newStageId === "rejected") {
    next = publishCareerObservation(next, {
      id: `obs-rejected-${applicationId}-${now}`,
      type: "career.application.rejected",
      entityId: applicationId,
      timestamp: now,
      payload: { jobTitle: current.jobTitle, companyName: company?.name ?? null },
    });
  }
  if (newStageId === "accepted") {
    next = publishCareerObservation(next, {
      id: `obs-accepted-${applicationId}-${now}`,
      type: "career.application.accepted",
      entityId: applicationId,
      timestamp: now,
      payload: { jobTitle: current.jobTitle, companyName: company?.name ?? null },
    });
  }
  return next;
}

export function createInterview(
  hub: CareerHub,
  input: {
    applicationId: string;
    title: string;
    startsAt: string;
    endsAt?: string;
    interviewType?: InterviewType;
    meetingUrl?: string;
    location?: string;
    timezone?: string;
    interviewerNames?: string;
    preparationNotes?: string;
  },
): CareerHub | { error: string } {
  const app = hub.applications.find((a) => a.id === input.applicationId);
  if (!app) return { error: "Application not found." };
  if (!input.title.trim()) return { error: "Interview title is required." };
  if (!input.startsAt) return { error: "Start time is required." };
  const now = nowIso();
  const interview: CareerInterview = {
    id: newCareerId("iv"),
    applicationId: input.applicationId,
    title: input.title.trim(),
    interviewType: input.interviewType,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone || hub.settings.defaultTimezone,
    meetingUrl: input.meetingUrl?.trim() || undefined,
    location: input.location?.trim() || undefined,
    interviewerNames: input.interviewerNames?.trim() || undefined,
    preparationNotes: input.preparationNotes?.trim() || undefined,
    outcome: "pending",
    checklist: emptyInterviewChecklist(),
    createdAt: now,
    updatedAt: now,
  };
  let next: CareerHub = { ...hub, interviews: [interview, ...hub.interviews] };
  next = pushActivity(next, "interview_scheduled", `Interview: ${interview.title}`, {
    applicationId: app.id,
    companyId: app.companyId,
  });
  next = publishCareerObservation(next, {
    id: `obs-interview-${interview.id}`,
    type: "career.interview.scheduled",
    entityId: interview.id,
    timestamp: now,
    payload: {
      title: interview.title,
      applicationId: app.id,
      jobTitle: app.jobTitle,
      startsAt: interview.startsAt,
    },
  });
  return next;
}

export function updateInterview(
  hub: CareerHub,
  interviewId: string,
  patch: Partial<CareerInterview>,
): CareerHub | { error: string } {
  const current = hub.interviews.find((i) => i.id === interviewId);
  if (!current) return { error: "Interview not found." };
  const now = nowIso();
  const nextInterview = { ...current, ...patch, id: current.id, updatedAt: now };
  let next: CareerHub = {
    ...hub,
    interviews: hub.interviews.map((i) => (i.id === interviewId ? nextInterview : i)),
  };
  next = pushActivity(next, "interview_updated", `Updated interview: ${nextInterview.title}`, {
    applicationId: nextInterview.applicationId,
  });
  if (patch.outcome && patch.outcome !== "pending" && current.outcome === "pending") {
    next = publishCareerObservation(next, {
      id: `obs-interview-done-${interviewId}-${now}`,
      type: "career.interview.completed",
      entityId: interviewId,
      timestamp: now,
      payload: { title: nextInterview.title, outcome: patch.outcome },
    });
  }
  return next;
}

export function deleteInterview(hub: CareerHub, interviewId: string): CareerHub {
  return { ...hub, interviews: hub.interviews.filter((i) => i.id !== interviewId) };
}

export function upsertContact(
  hub: CareerHub,
  input: Partial<CareerContact> & { name: string; id?: string },
): CareerHub | { error: string } {
  if (!input.name.trim()) return { error: "Contact name is required." };
  const now = nowIso();
  if (input.id) {
    return {
      ...hub,
      contacts: hub.contacts.map((c) =>
        c.id === input.id ? { ...c, ...input, name: input.name.trim(), updatedAt: now } : c,
      ),
    };
  }
  const contact: CareerContact = {
    id: newCareerId("ct"),
    name: input.name.trim(),
    companyId: input.companyId,
    role: input.role,
    email: input.email,
    phone: input.phone,
    linkedInUrl: input.linkedInUrl,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  return { ...hub, contacts: [contact, ...hub.contacts] };
}

export function recordInteraction(
  hub: CareerHub,
  input: {
    interactionType: InteractionType;
    occurredAt?: string;
    notes?: string;
    applicationId?: string;
    contactId?: string;
    companyId?: string;
  },
): CareerHub {
  const now = nowIso();
  const interaction: CareerInteraction = {
    id: newCareerId("ix"),
    interactionType: input.interactionType,
    occurredAt: input.occurredAt || now,
    notes: input.notes?.trim() || undefined,
    applicationId: input.applicationId,
    contactId: input.contactId,
    companyId: input.companyId,
    createdAt: now,
  };
  let next: CareerHub = { ...hub, interactions: [interaction, ...hub.interactions] };
  if (input.applicationId) {
    next = {
      ...next,
      applications: next.applications.map((a) =>
        a.id === input.applicationId ? { ...a, lastContactAt: interaction.occurredAt, updatedAt: now } : a,
      ),
    };
  }
  next = pushActivity(next, "interaction_recorded", `Interaction: ${input.interactionType.replace(/_/g, " ")}`, {
    applicationId: input.applicationId,
    companyId: input.companyId,
  });
  return next;
}

export function createTask(
  hub: CareerHub,
  input: {
    title: string;
    description?: string;
    dueAt?: string;
    applicationId?: string;
    priority?: ApplicationPriority;
  },
): CareerHub | { error: string } {
  if (!input.title.trim()) return { error: "Task title is required." };
  const now = nowIso();
  const task: CareerTask = {
    id: newCareerId("tk"),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    dueAt: input.dueAt,
    applicationId: input.applicationId,
    priority: input.priority || "medium",
    createdAt: now,
    updatedAt: now,
  };
  let next: CareerHub = { ...hub, tasks: [task, ...hub.tasks] };
  next = pushActivity(next, "task_created", `Follow-up: ${task.title}`, { applicationId: input.applicationId });
  if (task.dueAt) {
    const app = hub.applications.find((a) => a.id === input.applicationId);
    next = publishCareerObservation(next, {
      id: `obs-followup-${task.id}`,
      type: "career.followup.due",
      entityId: task.id,
      timestamp: now,
      payload: {
        nextAction: task.title,
        dueAt: task.dueAt,
        jobTitle: app?.jobTitle ?? null,
      },
    });
  }
  return next;
}

export function completeTask(hub: CareerHub, taskId: string): CareerHub | { error: string } {
  const task = hub.tasks.find((t) => t.id === taskId);
  if (!task) return { error: "Task not found." };
  if (task.completedAt) return hub;
  const now = nowIso();
  let next: CareerHub = {
    ...hub,
    tasks: hub.tasks.map((t) => (t.id === taskId ? { ...t, completedAt: now, updatedAt: now } : t)),
  };
  next = pushActivity(next, "task_completed", `Completed: ${task.title}`, { applicationId: task.applicationId });
  return next;
}

export function rescheduleTask(hub: CareerHub, taskId: string, dueAt: string): CareerHub | { error: string } {
  const task = hub.tasks.find((t) => t.id === taskId);
  if (!task) return { error: "Task not found." };
  return {
    ...hub,
    tasks: hub.tasks.map((t) =>
      t.id === taskId ? { ...t, dueAt, completedAt: undefined, updatedAt: nowIso() } : t,
    ),
  };
}

export function linkDocument(
  hub: CareerHub,
  input: {
    title: string;
    documentType: CareerDocumentType;
    applicationId?: string;
    companyId?: string;
    libraryDocumentId?: string;
    versionIdentifier?: string;
    url?: string;
    notes?: string;
  },
): CareerHub | { error: string } {
  if (!input.title.trim()) return { error: "Document title is required." };
  const now = nowIso();
  const doc: CareerDocument = {
    id: newCareerId("doc"),
    title: input.title.trim(),
    documentType: input.documentType,
    applicationId: input.applicationId,
    companyId: input.companyId,
    libraryDocumentId: input.libraryDocumentId,
    versionIdentifier: input.versionIdentifier || `v-${now.slice(0, 10)}`,
    url: input.url,
    notes: input.notes,
    createdAt: now,
  };
  let next: CareerHub = { ...hub, documents: [doc, ...hub.documents] };
  if (input.applicationId && input.documentType === "resume") {
    next = {
      ...next,
      applications: next.applications.map((a) =>
        a.id === input.applicationId ? { ...a, resumeDocumentId: doc.id, updatedAt: now } : a,
      ),
    };
  }
  if (input.applicationId && input.documentType === "cover_letter") {
    next = {
      ...next,
      applications: next.applications.map((a) =>
        a.id === input.applicationId ? { ...a, coverLetterDocumentId: doc.id, updatedAt: now } : a,
      ),
    };
  }
  next = pushActivity(next, "document_linked", `Document linked: ${doc.title}`, {
    applicationId: input.applicationId,
    companyId: input.companyId,
  });
  return next;
}

export function companyName(hub: CareerHub, companyId?: string) {
  return hub.companies.find((c) => c.id === companyId)?.name ?? "Unknown company";
}

export function applicationsForCompany(hub: CareerHub, companyId: string) {
  return hub.applications.filter((a) => a.companyId === companyId);
}

export function filterApplications(
  hub: CareerHub,
  filters: {
    query?: string;
    stageId?: CareerStageId | "all";
    companyId?: string;
    priority?: ApplicationPriority | "all";
    workArrangement?: WorkArrangement | "all";
    followUp?: "all" | "due" | "overdue" | "none";
    sort?: "updated" | "applied" | "company" | "title" | "next_action";
  },
) {
  const q = filters.query?.trim().toLowerCase() ?? "";
  const today = nowIso().slice(0, 10);
  let list = [...hub.applications];
  if (q) {
    list = list.filter((a) => {
      const company = companyName(hub, a.companyId).toLowerCase();
      return (
        a.jobTitle.toLowerCase().includes(q) ||
        company.includes(q) ||
        (a.location || "").toLowerCase().includes(q) ||
        (a.notes || "").toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q)
      );
    });
  }
  if (filters.stageId && filters.stageId !== "all") {
    list = list.filter((a) => a.stageId === filters.stageId);
  }
  if (filters.companyId) list = list.filter((a) => a.companyId === filters.companyId);
  if (filters.priority && filters.priority !== "all") {
    list = list.filter((a) => (a.priority || "medium") === filters.priority);
  }
  if (filters.workArrangement && filters.workArrangement !== "all") {
    list = list.filter((a) => a.workArrangement === filters.workArrangement);
  }
  if (filters.followUp === "due") {
    list = list.filter((a) => a.nextActionDueAt && a.nextActionDueAt.slice(0, 10) >= today && !isTerminalStage(a.stageId));
  }
  if (filters.followUp === "overdue") {
    list = list.filter((a) => a.nextActionDueAt && a.nextActionDueAt.slice(0, 10) < today && !isTerminalStage(a.stageId));
  }
  if (filters.followUp === "none") {
    list = list.filter((a) => !a.nextActionDueAt);
  }

  const sort = filters.sort || "updated";
  list.sort((a, b) => {
    if (sort === "applied") return (b.appliedAt || "").localeCompare(a.appliedAt || "");
    if (sort === "company") return companyName(hub, a.companyId).localeCompare(companyName(hub, b.companyId));
    if (sort === "title") return a.jobTitle.localeCompare(b.jobTitle);
    if (sort === "next_action") return (a.nextActionDueAt || "9999").localeCompare(b.nextActionDueAt || "9999");
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  return list;
}

export function dashboardMetrics(hub: CareerHub) {
  const today = nowIso().slice(0, 10);
  const active = hub.applications.filter((a) => !isTerminalStage(a.stageId));
  const awaiting = active.filter((a) =>
    ["applied", "assessment", "recruiter_screening", "hiring_manager", "technical", "final"].includes(a.stageId),
  );
  const upcomingInterviews = hub.interviews.filter(
    (i) =>
      typeof i.startsAt === "string" &&
      i.startsAt.slice(0, 10) >= today &&
      (i.outcome === "pending" || !i.outcome),
  );
  const offers = hub.applications.filter((a) => a.stageId === "offer" || a.outcome === "offer");
  const rejections = hub.applications.filter((a) => a.stageId === "rejected" || a.outcome === "rejected");
  const followUpsDue = [
    ...hub.applications.filter(
      (a) => a.nextActionDueAt && a.nextActionDueAt.slice(0, 10) <= today && !isTerminalStage(a.stageId),
    ),
    ...hub.tasks.filter((t) => !t.completedAt && t.dueAt && t.dueAt.slice(0, 10) <= today),
  ];
  const overdueFollowUps = hub.applications.filter(
    (a) => a.nextActionDueAt && a.nextActionDueAt.slice(0, 10) < today && !isTerminalStage(a.stageId),
  );
  const needsAttention = active.filter(
    (a) =>
      (a.nextActionDueAt && a.nextActionDueAt.slice(0, 10) <= today) ||
      a.stageId === "offer" ||
      (!a.nextAction && a.stageId === "applied"),
  );
  return {
    total: hub.applications.length,
    active: active.length,
    awaiting: awaiting.length,
    upcomingInterviews: upcomingInterviews.length,
    offers: offers.length,
    rejections: rejections.length,
    followUpsDue: followUpsDue.length,
    overdueFollowUps,
    needsAttention,
    upcomingInterviewList: upcomingInterviews.sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 8),
    recentActivity: hub.activity.slice(0, 12),
    byStage: CAREER_STAGES.map((stage) => ({
      ...stage,
      count: hub.applications.filter((a) => a.stageId === stage.id).length,
    })),
  };
}

export type CareerAnalytics = {
  applicationsOverTime: { month: string; count: number }[];
  byStage: { stageId: CareerStageId; name: string; count: number }[];
  bySource: { source: string; count: number }[];
  /** Submitted apps with any employer response signal / submitted apps */
  responseRate: number | null;
  interviewConversionRate: number | null;
  offerConversionRate: number | null;
  averageDaysToFirstResponse: number | null;
  averageDaysInCurrentStage: number | null;
  rejectionCount: number;
  submittedCount: number;
  definitions: Record<string, string>;
};

export function computeCareerAnalytics(hub: CareerHub, now = new Date()): CareerAnalytics {
  const submitted = hub.applications.filter((a) => a.stageId !== "saved" || Boolean(a.appliedAt));
  const submittedCount = submitted.length;

  const responseStages: CareerStageId[] = [
    "assessment",
    "recruiter_screening",
    "hiring_manager",
    "technical",
    "final",
    "offer",
    "accepted",
    "rejected",
  ];
  const responded = submitted.filter((a) => responseStages.includes(a.stageId) || a.lastContactAt);
  const interviewed = submitted.filter((a) =>
    ["hiring_manager", "technical", "final", "offer", "accepted"].includes(a.stageId) ||
    hub.interviews.some((i) => i.applicationId === a.id),
  );
  const offers = submitted.filter((a) => ["offer", "accepted"].includes(a.stageId) || a.outcome === "offer" || a.outcome === "accepted");

  const monthMap = new Map<string, number>();
  for (const app of hub.applications) {
    const key = (app.appliedAt || app.createdAt).slice(0, 7);
    monthMap.set(key, (monthMap.get(key) || 0) + 1);
  }
  const applicationsOverTime = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  const sourceMap = new Map<string, number>();
  for (const app of hub.applications) {
    const source = (app.source || "Unknown").trim() || "Unknown";
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  }

  const firstResponseDays: number[] = [];
  for (const app of submitted) {
    const history = hub.stageHistory
      .filter((h) => h.applicationId === app.id)
      .sort((a, b) => a.changedAt.localeCompare(b.changedAt));
    const appliedAt = app.appliedAt || history.find((h) => h.newStageId === "applied")?.changedAt || app.createdAt;
    const firstResponse = history.find(
      (h) => h.newStageId !== "saved" && h.newStageId !== "applied" && h.previousStageId,
    );
    if (appliedAt && firstResponse) {
      const days =
        (Date.parse(firstResponse.changedAt) - Date.parse(appliedAt)) / (1000 * 60 * 60 * 24);
      if (Number.isFinite(days) && days >= 0) firstResponseDays.push(days);
    }
  }

  const stageDurations: number[] = [];
  for (const app of hub.applications) {
    const last = hub.stageHistory
      .filter((h) => h.applicationId === app.id)
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt))[0];
    const since = last?.changedAt || app.updatedAt;
    const days = (now.getTime() - Date.parse(since)) / (1000 * 60 * 60 * 24);
    if (Number.isFinite(days) && days >= 0) stageDurations.push(days);
  }

  const avg = (values: number[]) =>
    values.length ? Math.round((values.reduce((s, n) => s + n, 0) / values.length) * 10) / 10 : null;

  return {
    applicationsOverTime,
    byStage: CAREER_STAGES.map((s) => ({
      stageId: s.id,
      name: s.name,
      count: hub.applications.filter((a) => a.stageId === s.id).length,
    })),
    bySource: [...sourceMap.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
    responseRate: submittedCount ? responded.length / submittedCount : null,
    interviewConversionRate: submittedCount ? interviewed.length / submittedCount : null,
    offerConversionRate: submittedCount ? offers.length / submittedCount : null,
    averageDaysToFirstResponse: avg(firstResponseDays),
    averageDaysInCurrentStage: avg(stageDurations),
    rejectionCount: hub.applications.filter((a) => a.stageId === "rejected").length,
    submittedCount,
    definitions: {
      responseRate:
        "Applications with a recorded employer response (stage past Applied, or last contact) / applications submitted (excludes Saved-only).",
      interviewConversionRate: "Applications with an interview stage or interview record / submitted applications.",
      offerConversionRate: "Applications in Offer/Accepted / submitted applications.",
      averageDaysToFirstResponse:
        "Mean days from applied date to first recorded stage change beyond Applied, when history exists.",
      averageDaysInCurrentStage: "Mean days since each application's latest stage change.",
    },
  };
}

export function exportApplicationsCsv(hub: CareerHub): string {
  const headers = [
    "job_title",
    "company",
    "stage",
    "applied_at",
    "location",
    "work_arrangement",
    "employment_type",
    "source",
    "priority",
    "salary_min",
    "salary_max",
    "salary_currency",
    "job_url",
    "next_action",
    "next_action_due_at",
    "outcome",
    "notes",
  ];
  const escape = (value: string | number | undefined) => {
    const text = value === undefined || value === null ? "" : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const rows = hub.applications.map((a) =>
    [
      a.jobTitle,
      companyName(hub, a.companyId),
      a.stageId,
      a.appliedAt?.slice(0, 10) || "",
      a.location || "",
      a.workArrangement || "",
      a.employmentType || "",
      a.source || "",
      a.priority || "",
      a.salaryMin ?? "",
      a.salaryMax ?? "",
      a.salaryCurrency || "",
      a.jobUrl || "",
      a.nextAction || "",
      a.nextActionDueAt?.slice(0, 10) || "",
      a.outcome || "",
      a.notes || "",
    ]
      .map(escape)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

export function parseApplicationsCsv(text: string): {
  rows: CreateApplicationInput[];
  errors: string[];
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ["CSV needs a header row and at least one data row."] };

  const parseLine = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else current += ch;
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const idx = (name: string) => headers.indexOf(name);
  const errors: string[] = [];
  const rows: CreateApplicationInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const get = (name: string) => {
      const at = idx(name);
      return at >= 0 ? cells[at] || "" : "";
    };
    const jobTitle = get("job_title") || get("title") || get("role");
    const companyNameValue = get("company") || get("company_name");
    if (!jobTitle || !companyNameValue) {
      errors.push(`Row ${i + 1}: job title and company are required.`);
      continue;
    }
    const stageRaw = (get("stage") || "saved").toLowerCase().replace(/\s+/g, "_");
    const stageId = (CAREER_STAGES.find((s) => s.id === stageRaw || s.name.toLowerCase().replace(/\s+/g, "_") === stageRaw)
      ?.id || "saved") as CareerStageId;
    rows.push({
      jobTitle,
      companyName: companyNameValue,
      stageId,
      appliedAt: get("applied_at") || undefined,
      location: get("location") || undefined,
      workArrangement: (get("work_arrangement") as WorkArrangement) || undefined,
      source: get("source") || undefined,
      priority: (get("priority") as ApplicationPriority) || undefined,
      salaryMin: get("salary_min") ? Number(get("salary_min")) : undefined,
      salaryMax: get("salary_max") ? Number(get("salary_max")) : undefined,
      salaryCurrency: get("salary_currency") || undefined,
      jobUrl: get("job_url") || undefined,
      nextAction: get("next_action") || undefined,
      nextActionDueAt: get("next_action_due_at") || undefined,
      notes: get("notes") || undefined,
    });
  }
  return { rows, errors };
}

export function importApplications(hub: CareerHub, rows: CreateApplicationInput[]): {
  hub: CareerHub;
  imported: number;
  skipped: number;
} {
  let next = hub;
  let imported = 0;
  let skipped = 0;
  for (const row of rows) {
    const duplicate = next.applications.some(
      (a) =>
        a.jobTitle.trim().toLowerCase() === row.jobTitle.trim().toLowerCase() &&
        companyName(next, a.companyId).trim().toLowerCase() === row.companyName.trim().toLowerCase(),
    );
    if (duplicate) {
      skipped++;
      continue;
    }
    const result = createApplication(next, row);
    if ("error" in result) {
      skipped++;
      continue;
    }
    next = result;
    imported++;
  }
  return { hub: next, imported, skipped };
}

export function interviewIcs(interview: CareerInterview, app?: CareerApplication, company?: CareerCompany) {
  const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = interview.endsAt || new Date(Date.parse(interview.startsAt) + 60 * 60 * 1000).toISOString();
  const summary = interview.title.replace(/\n/g, " ");
  const description = [
    app ? `${app.jobTitle} at ${company?.name || "company"}` : "",
    interview.meetingUrl || "",
    interview.preparationNotes || "",
  ]
    .filter(Boolean)
    .join("\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LifeOS Career//EN",
    "BEGIN:VEVENT",
    `UID:${interview.id}@lifeos.career`,
    `DTSTAMP:${stamp(nowIso())}`,
    `DTSTART:${stamp(interview.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    interview.location ? `LOCATION:${interview.location}` : "",
    interview.meetingUrl ? `URL:${interview.meetingUrl}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}
