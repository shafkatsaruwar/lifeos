import { get, onValue, ref, remove, set, update, type Unsubscribe } from "firebase/database";
import { database } from "../firebase";
import {
  DEFAULT_FOCUS_ENFORCER_PREFS,
  type FocusEnforcerPrefs,
  type FocusEnforcerSession,
} from "./shared";

const rootPath = (userId: string) => `users/${userId}/focusEnforcer`;

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function loadFocusEnforcerPrefs(userId: string): Promise<FocusEnforcerPrefs> {
  const snapshot = await get(ref(database, `${rootPath(userId)}/prefs`));
  if (!snapshot.exists()) return { ...DEFAULT_FOCUS_ENFORCER_PREFS };
  const raw = snapshot.val() as Partial<FocusEnforcerPrefs>;
  const offsets = Array.isArray(raw.escalateOffsetsMin)
    ? raw.escalateOffsetsMin
    : DEFAULT_FOCUS_ENFORCER_PREFS.escalateOffsetsMin;
  return {
    enabled: raw.enabled !== false,
    escalateOffsetsMin: [
      Number(offsets[0]) || DEFAULT_FOCUS_ENFORCER_PREFS.escalateOffsetsMin[0],
      Number(offsets[1]) || DEFAULT_FOCUS_ENFORCER_PREFS.escalateOffsetsMin[1],
      Number(offsets[2]) || DEFAULT_FOCUS_ENFORCER_PREFS.escalateOffsetsMin[2],
    ],
    photoCheckChance:
      typeof raw.photoCheckChance === "number"
        ? Math.max(0, Math.min(1, raw.photoCheckChance))
        : DEFAULT_FOCUS_ENFORCER_PREFS.photoCheckChance,
  };
}

export async function saveFocusEnforcerPrefs(userId: string, prefs: FocusEnforcerPrefs) {
  await set(ref(database, `${rootPath(userId)}/prefs`), serialize(prefs));
}

export async function loadFocusEnforcerSession(
  userId: string,
  sessionId: string,
): Promise<FocusEnforcerSession | null> {
  const snapshot = await get(ref(database, `${rootPath(userId)}/sessions/${sessionId}`));
  if (!snapshot.exists()) return null;
  return normalizeSession(snapshot.val(), sessionId);
}

export async function loadAllFocusEnforcerSessions(userId: string): Promise<FocusEnforcerSession[]> {
  const snapshot = await get(ref(database, `${rootPath(userId)}/sessions`));
  if (!snapshot.exists()) return [];
  const map = snapshot.val() as Record<string, unknown>;
  return Object.entries(map)
    .map(([id, value]) => normalizeSession(value, id))
    .filter((s): s is FocusEnforcerSession => Boolean(s));
}

export async function loadLiveFocusEnforcerSessions(userId: string): Promise<FocusEnforcerSession[]> {
  const all = await loadAllFocusEnforcerSessions(userId);
  return all.filter((s) => s.status === "scheduled" || s.status === "escalating" || s.status === "active");
}

export async function saveFocusEnforcerSession(userId: string, session: FocusEnforcerSession) {
  const next = { ...session, updatedAt: new Date().toISOString() };
  await set(ref(database, `${rootPath(userId)}/sessions/${session.id}`), serialize(next));
  return next;
}

export async function patchFocusEnforcerSession(
  userId: string,
  sessionId: string,
  patch: Partial<FocusEnforcerSession>,
) {
  const updates = serialize({ ...patch, updatedAt: new Date().toISOString() });
  await update(ref(database, `${rootPath(userId)}/sessions/${sessionId}`), updates);
}

export async function deleteFocusEnforcerSession(userId: string, sessionId: string) {
  await remove(ref(database, `${rootPath(userId)}/sessions/${sessionId}`));
}

export function subscribeFocusEnforcerSession(
  userId: string,
  sessionId: string,
  onData: (session: FocusEnforcerSession | null) => void,
): Unsubscribe {
  return onValue(ref(database, `${rootPath(userId)}/sessions/${sessionId}`), (snapshot) => {
    if (!snapshot.exists()) {
      onData(null);
      return;
    }
    onData(normalizeSession(snapshot.val(), sessionId));
  });
}

export function subscribeFocusEnforcerSessions(
  userId: string,
  onData: (sessions: FocusEnforcerSession[]) => void,
): Unsubscribe {
  return onValue(ref(database, `${rootPath(userId)}/sessions`), (snapshot) => {
    if (!snapshot.exists()) {
      onData([]);
      return;
    }
    const map = snapshot.val() as Record<string, unknown>;
    onData(
      Object.entries(map)
        .map(([id, value]) => normalizeSession(value, id))
        .filter((s): s is FocusEnforcerSession => Boolean(s)),
    );
  });
}

export function newFocusEnforcerSessionId() {
  return `fe_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

function normalizeSession(value: unknown, fallbackId: string): FocusEnforcerSession | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<FocusEnforcerSession>;
  if (!raw.taskTitle || !raw.scheduledStartAt) return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : fallbackId,
    taskId: Number(raw.taskId) || 0,
    taskTitle: String(raw.taskTitle),
    scheduledStartAt: String(raw.scheduledStartAt),
    expectedDurationMin: Math.max(5, Math.min(240, Number(raw.expectedDurationMin) || 60)),
    proofRequired: Boolean(raw.proofRequired),
    status: (raw.status as FocusEnforcerSession["status"]) || "scheduled",
    escalationLevel: raw.escalationLevel ?? null,
    actualStartAt: raw.actualStartAt,
    completedAt: raw.completedAt,
    startDelayMin: raw.startDelayMin,
    startProof: raw.startProof,
    completionProof: raw.completionProof,
    checks: Array.isArray(raw.checks) ? raw.checks : [],
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}
