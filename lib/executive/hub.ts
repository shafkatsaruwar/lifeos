import type { Observation } from "../lifeos-kernel";
import { BUILTIN_EXECUTIVE_ROUTINES } from "./routines";
import {
  DEFAULT_EXECUTIVE_PREFS,
  type ExecutiveHub,
  type ExecutiveObservation,
  type ExecutiveObservationType,
  type ExecutiveRoutine,
  type ExecutiveRun,
  type GuidanceMode,
} from "./types";

export function newExecId(prefix = "ex") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function emptyExecutiveHub(): ExecutiveHub {
  return {
    version: 2,
    routines: BUILTIN_EXECUTIVE_ROUTINES.map((r) => ({
      ...r,
      steps: r.steps.map((s) => ({ ...s })),
    })),
    runs: [],
    observations: [],
    prefs: {
      ...DEFAULT_EXECUTIVE_PREFS,
      salah: { ...DEFAULT_EXECUTIVE_PREFS.salah, prayers: [...DEFAULT_EXECUTIVE_PREFS.salah.prayers] },
    },
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function normalizeRoutine(raw: unknown): ExecutiveRoutine | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ExecutiveRoutine>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;
  if (!Array.isArray(r.steps) || !r.steps.length) return null;
  // Map legacy modes from earlier Guided Tasks naming
  let mode: string | undefined = r.defaultMode as string | undefined;
  if (mode === "independent") mode = "executive";
  if (mode === "unfreeze") mode = "transition";
  return {
    id: r.id,
    name: r.name,
    description: typeof r.description === "string" ? r.description : "",
    category: (r.category as ExecutiveRoutine["category"]) || "custom",
    defaultMode: (mode as GuidanceMode) || "executive",
    steps: r.steps as ExecutiveRoutine["steps"],
    schedule: r.schedule,
    tags: asStringArray(r.tags),
    builtIn: Boolean(r.builtIn),
    sensitive: Boolean(r.sensitive),
  };
}

function mapLegacyState(raw: Partial<ExecutiveRun> & { status?: string }): ExecutiveRun["state"] {
  if (raw.state) return raw.state;
  const status = raw.status;
  if (status === "active") return "in_progress";
  if (status === "waiting") return "pending";
  if (status === "paused") return "paused";
  if (status === "completed") return "completed";
  if (status === "abandoned") return "skipped";
  return "pending";
}

function normalizeRun(raw: unknown): ExecutiveRun | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ExecutiveRun> & { status?: string; mode?: string };
  if (typeof r.id !== "string" || typeof r.routineId !== "string") return null;
  let mode: string | undefined = r.mode;
  if (mode === "independent") mode = "executive";
  if (mode === "unfreeze") mode = "transition";
  return {
    id: r.id,
    routineId: r.routineId,
    mode: (mode as GuidanceMode) || "executive",
    state: mapLegacyState(r),
    currentStepId: typeof r.currentStepId === "string" ? r.currentStepId : null,
    completedStepIds: asStringArray(r.completedStepIds),
    answers: r.answers && typeof r.answers === "object" ? r.answers : {},
    insertedStepIds: asStringArray(r.insertedStepIds),
    scheduledFor: typeof r.scheduledFor === "string" ? r.scheduledFor : undefined,
    originalIntendedAt: typeof r.originalIntendedAt === "string" ? r.originalIntendedAt : undefined,
    acknowledgedAt: typeof r.acknowledgedAt === "string" ? r.acknowledgedAt : undefined,
    startedAt: typeof r.startedAt === "string" ? r.startedAt : typeof (r as { startedAt?: string }).startedAt === "string" ? (r as { startedAt?: string }).startedAt : undefined,
    completedAt: typeof r.completedAt === "string" ? r.completedAt : undefined,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : nowIso(),
    createdAt: typeof r.createdAt === "string" ? r.createdAt : typeof r.startedAt === "string" ? r.startedAt : nowIso(),
    lastPromptAt: typeof r.lastPromptAt === "string" ? r.lastPromptAt : undefined,
    lastResponseAt: typeof r.lastResponseAt === "string" ? r.lastResponseAt : undefined,
    nextFollowUpAt: typeof r.nextFollowUpAt === "string" ? r.nextFollowUpAt : undefined,
    snoozeHistory: Array.isArray(r.snoozeHistory) ? r.snoozeHistory : [],
    postponementCount: typeof r.postponementCount === "number" ? r.postponementCount : 0,
    followUpOfferedAt: typeof r.followUpOfferedAt === "string" ? r.followUpOfferedAt : undefined,
    pauseReason: typeof r.pauseReason === "string" ? r.pauseReason : undefined,
    linkedTaskId: typeof r.linkedTaskId === "number" ? r.linkedTaskId : undefined,
    contextLabel: typeof r.contextLabel === "string" ? r.contextLabel : undefined,
  };
}

/** Accepts v1 guided hubs and v2 executive hubs. */
export function normalizeExecutiveHub(raw: unknown): ExecutiveHub {
  const empty = emptyExecutiveHub();
  if (!raw || typeof raw !== "object") return empty;
  const data = raw as Partial<ExecutiveHub> & { settings?: Record<string, unknown> };

  const custom = Array.isArray(data.routines)
    ? data.routines
        .map(normalizeRoutine)
        .filter((r): r is ExecutiveRoutine => Boolean(r))
        .filter((r) => !r.builtIn)
    : [];
  const builtinIds = new Set(BUILTIN_EXECUTIVE_ROUTINES.map((r) => r.id));
  const routines = [
    ...BUILTIN_EXECUTIVE_ROUTINES.map((r) => ({ ...r, steps: r.steps.map((s) => ({ ...s })) })),
    ...custom.filter((r) => !builtinIds.has(r.id)),
  ];

  const runs = Array.isArray(data.runs)
    ? data.runs.map(normalizeRun).filter((r): r is ExecutiveRun => Boolean(r))
    : [];

  const observations = Array.isArray(data.observations)
    ? (data.observations as ExecutiveObservation[]).filter((o) => o && typeof o.id === "string")
    : [];

  const legacySettings = data.settings && typeof data.settings === "object" ? data.settings : {};
  const prefsIn = data.prefs && typeof data.prefs === "object" ? data.prefs : {};

  return {
    version: 2,
    routines,
    runs: runs.slice(0, 120),
    observations: observations.slice(0, 500),
    prefs: {
      ...DEFAULT_EXECUTIVE_PREFS,
      ...legacySettings,
      ...prefsIn,
      salah: {
        ...DEFAULT_EXECUTIVE_PREFS.salah,
        ...(typeof (prefsIn as { salah?: unknown }).salah === "object"
          ? (prefsIn as { salah: ExecutiveHub["prefs"]["salah"] }).salah
          : {}),
      },
    },
  };
}

export function publishExecutiveObservation(
  hub: ExecutiveHub,
  observation: Omit<ExecutiveObservation, "provenance" | "privacy"> &
    Partial<Pick<ExecutiveObservation, "provenance" | "privacy">>,
): ExecutiveHub {
  if (hub.observations.some((o) => o.id === observation.id)) return hub;
  const full: ExecutiveObservation = {
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

function mapKind(type: ExecutiveObservationType): Observation["type"] {
  if (type.includes("completed")) return "completion";
  if (type.includes("followup") || type.includes("snoozed")) return "queue";
  if (type.includes("step")) return "activity";
  return "status";
}

function fact(obs: ExecutiveObservation): string {
  switch (obs.type) {
    case "executive.run.started":
      return `Started: ${obs.payload.routineName ?? "routine"}`;
    case "executive.step.confirmed":
      return `Confirmed: ${obs.payload.stepTitle ?? "step"}`;
    case "executive.run.completed":
      return `Completed: ${obs.payload.routineName ?? "routine"}`;
    case "executive.run.snoozed":
      return `Snoozed ${obs.payload.minutes ?? "?"}m — ${obs.payload.routineName ?? "routine"}`;
    case "executive.followup.offered":
      return String(obs.payload.message ?? "Follow-up offered");
    default:
      return "Executive function update";
  }
}

/** Personal Context kernel mapping. */
export function executiveObservationsToKernel(hub: ExecutiveHub): Observation[] {
  return hub.observations
    .filter((o) => {
      // Respect salah privacy lock — omit sensitive facts from kernel export unless unlocked.
      if (hub.prefs.salah.privacyLocked && String(o.payload.category ?? "") === "salah") return false;
      return true;
    })
    .map((obs) => ({
      id: obs.id,
      module: "Executive",
      type: mapKind(obs.type),
      fact: fact(obs),
      timestamp: new Date(obs.timestamp),
      metadata: { ...obs.payload, executiveType: obs.type, entityId: obs.entityId },
      importance: obs.type.includes("completed") ? "high" : "normal",
    }));
}
