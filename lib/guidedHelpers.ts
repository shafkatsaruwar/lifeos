import type { Observation } from "./lifeos-kernel";
import { BUILTIN_GUIDED_ROUTINES } from "./guidedTemplates";
import {
  DEFAULT_GUIDED_SETTINGS,
  type GuidedHub,
  type GuidedObservation,
  type GuidedObservationType,
  type GuidedRoutine,
  type GuidedRun,
  type GuidanceMode,
} from "./guidedTypes";

export function newGuidedId(prefix = "gd") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function emptyGuidedHub(): GuidedHub {
  return {
    version: 1,
    routines: BUILTIN_GUIDED_ROUTINES.map((r) => ({ ...r, steps: r.steps.map((s) => ({ ...s })) })),
    runs: [],
    observations: [],
    settings: { ...DEFAULT_GUIDED_SETTINGS },
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function normalizeRoutine(raw: unknown): GuidedRoutine | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<GuidedRoutine>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;
  if (!Array.isArray(r.steps) || !r.steps.length) return null;
  return {
    id: r.id,
    name: r.name,
    description: typeof r.description === "string" ? r.description : "",
    category: (r.category as GuidedRoutine["category"]) || "custom",
    defaultMode: (r.defaultMode as GuidanceMode) || "guided",
    steps: r.steps as GuidedRoutine["steps"],
    schedule: r.schedule,
    tags: asStringArray(r.tags),
    builtIn: Boolean(r.builtIn),
  };
}

function normalizeRun(raw: unknown): GuidedRun | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<GuidedRun>;
  if (typeof r.id !== "string" || typeof r.routineId !== "string") return null;
  return {
    id: r.id,
    routineId: r.routineId,
    mode: (r.mode as GuidanceMode) || "guided",
    status: (r.status as GuidedRun["status"]) || "active",
    currentStepId: typeof r.currentStepId === "string" ? r.currentStepId : null,
    completedStepIds: asStringArray(r.completedStepIds),
    answers: r.answers && typeof r.answers === "object" ? (r.answers as GuidedRun["answers"]) : {},
    insertedStepIds: asStringArray(r.insertedStepIds),
    startedAt: typeof r.startedAt === "string" ? r.startedAt : nowIso(),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : nowIso(),
    completedAt: typeof r.completedAt === "string" ? r.completedAt : undefined,
    lastPromptAt: typeof r.lastPromptAt === "string" ? r.lastPromptAt : undefined,
    lastResponseAt: typeof r.lastResponseAt === "string" ? r.lastResponseAt : undefined,
    followUpOfferedAt: typeof r.followUpOfferedAt === "string" ? r.followUpOfferedAt : undefined,
    linkedTaskId: typeof r.linkedTaskId === "number" ? r.linkedTaskId : undefined,
    pauseReason: typeof r.pauseReason === "string" ? r.pauseReason : undefined,
  };
}

/** Merge cloud/local hub with built-in templates (built-ins win on id collision for structure). */
export function normalizeGuidedHub(raw: unknown): GuidedHub {
  const empty = emptyGuidedHub();
  if (!raw || typeof raw !== "object") return empty;
  const data = raw as Partial<GuidedHub>;

  const custom = Array.isArray(data.routines)
    ? data.routines
        .map(normalizeRoutine)
        .filter((r): r is GuidedRoutine => Boolean(r))
        .filter((r) => !r.builtIn)
    : [];
  const builtinIds = new Set(BUILTIN_GUIDED_ROUTINES.map((r) => r.id));
  const routines = [
    ...BUILTIN_GUIDED_ROUTINES.map((r) => ({ ...r, steps: r.steps.map((s) => ({ ...s })) })),
    ...custom.filter((r) => !builtinIds.has(r.id)),
  ];

  const runs = Array.isArray(data.runs)
    ? data.runs.map(normalizeRun).filter((r): r is GuidedRun => Boolean(r))
    : [];

  const observations = Array.isArray(data.observations)
    ? (data.observations as GuidedObservation[]).filter((o) => o && typeof o.id === "string")
    : [];

  return {
    version: 1,
    routines,
    runs: runs.slice(0, 100),
    observations: observations.slice(0, 500),
    settings: {
      ...DEFAULT_GUIDED_SETTINGS,
      ...(data.settings && typeof data.settings === "object" ? data.settings : {}),
    },
  };
}

export function publishGuidedObservation(
  hub: GuidedHub,
  observation: Omit<GuidedObservation, "provenance" | "privacy"> &
    Partial<Pick<GuidedObservation, "provenance" | "privacy">>,
): GuidedHub {
  if (hub.observations.some((o) => o.id === observation.id)) return hub;
  const full: GuidedObservation = {
    id: observation.id,
    type: observation.type,
    entityId: observation.entityId,
    timestamp: observation.timestamp || nowIso(),
    payload: observation.payload || {},
    provenance: observation.provenance || "user_action",
    privacy: "private",
  };
  return { ...hub, observations: [full, ...hub.observations].slice(0, 500) };
}

function mapObservationKind(type: GuidedObservationType): Observation["type"] {
  if (type === "guided.run.completed") return "completion";
  if (type === "guided.followup.offered") return "queue";
  if (type === "guided.step.confirmed") return "activity";
  if (type === "guided.run.started") return "status";
  return "status";
}

function observationFact(obs: GuidedObservation): string {
  switch (obs.type) {
    case "guided.run.started":
      return `Started guided routine: ${obs.payload.routineName ?? "routine"} (${obs.payload.mode ?? "guided"})`;
    case "guided.step.confirmed":
      return `Confirmed step: ${obs.payload.stepTitle ?? obs.payload.stepId ?? "step"}`;
    case "guided.run.paused":
      return `Paused guided routine at ${obs.payload.currentStepId ?? "step"}`;
    case "guided.run.resumed":
      return `Resumed guided routine`;
    case "guided.run.completed":
      return `Completed guided routine: ${obs.payload.routineName ?? "routine"}`;
    case "guided.followup.offered":
      return String(obs.payload.message ?? "Gentle follow-up offered for a paused guided routine");
    default:
      return "Guided task update";
  }
}

function observationImportance(type: GuidedObservationType): Observation["importance"] {
  if (type === "guided.run.completed") return "high";
  if (type === "guided.followup.offered") return "normal";
  return "normal";
}

/** Map Guided observations into kernel Observation shape for Personal Context. */
export function guidedObservationsToKernel(hub: GuidedHub): Observation[] {
  return hub.observations.map((obs) => ({
    id: obs.id,
    module: "Guided",
    type: mapObservationKind(obs.type),
    fact: observationFact(obs),
    timestamp: new Date(obs.timestamp),
    metadata: { ...obs.payload, guidedType: obs.type, entityId: obs.entityId, privacy: obs.privacy },
    importance: observationImportance(obs.type),
  }));
}

export function modeLabel(mode: GuidanceMode): string {
  if (mode === "independent") return "Independent";
  if (mode === "unfreeze") return "Unfreeze";
  return "Guided";
}

export function modeBlurb(mode: GuidanceMode): string {
  if (mode === "independent") {
    return "You drive the checklist. LifeOS only records what you confirm.";
  }
  if (mode === "unfreeze") {
    return "One tiny action at a time. Nothing advances until you say it’s done.";
  }
  return "Step-by-step with context. Prerequisites and branches still require your OK.";
}
