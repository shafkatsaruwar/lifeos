import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { get, getDatabase, onValue, ref, remove, set, type Unsubscribe } from "firebase/database";
import type { NotebookHub, NotebookPage, Workspace } from "../types";
import { safeEmptyCareerHub, safeNormalizeCareerHub } from "./careerSafe";
import { emptyTimeTracking, normalizeTimeTracking } from "./timeTracking";
import { normalizeCalendars } from "./calendars";
import { emptyNotebookHub } from "./notebooks";

/**
 * Public Firebase web client config (same project as the LifeOS web app).
 * These values are public client identifiers (restricted by Firebase rules /
 * authorized domains). Env vars override when non-empty so local/.env and
 * EAS secrets can point at another project; blank OTA env must not wipe them.
 */
const env = (value?: string) => value?.trim() || undefined;

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAbMSSRscUp7CMbeCYuOp5SC6utZ3QPNNM", // pragma: allowlist secret
  authDomain: "lifeos-45586.firebaseapp.com",
  databaseURL: "https://lifeos-45586-default-rtdb.firebaseio.com/",
  projectId: "lifeos-45586",
};

const firebaseConfig = {
  apiKey: env(process.env.EXPO_PUBLIC_FIREBASE_API_KEY) || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: env(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN) || DEFAULT_FIREBASE_CONFIG.authDomain,
  databaseURL:
    env(process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL) || DEFAULT_FIREBASE_CONFIG.databaseURL,
  projectId: env(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) || DEFAULT_FIREBASE_CONFIG.projectId,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.databaseURL && firebaseConfig.projectId,
);

function createApp(): FirebaseApp | null {
  if (!firebaseConfigured) {
    console.warn(
      "[LifeOS] Firebase is not configured. Copy lifeos-mobile/.env.example to .env and set EXPO_PUBLIC_FIREBASE_*.",
    );
    return null;
  }
  try {
    if (getApps().length) return getApp();
    return initializeApp(firebaseConfig);
  } catch (error) {
    // Never throw at import — Expo Updates ErrorRecovery turns that into SIGABRT.
    console.warn("[LifeOS] Firebase app init failed at import", error);
    return null;
  }
}

const app = createApp();

/**
 * Load getReactNativePersistence from the RN build of @firebase/auth.
 *
 * `firebase/auth` often resolves to the browser/node build under Metro, where
 * getReactNativePersistence is missing — then Auth falls back to memory and
 * users are asked to sign in again after every app restart.
 */
function loadReactNativePersistence() {
  // Deep RN entry — metro.config.js also aliases @firebase/auth → this file.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rnAuth = require("@firebase/auth/dist/rn/index.js") as {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => Parameters<typeof initializeAuth>[1] extends {
      persistence?: infer P;
    }
      ? P
      : never;
  };
  if (typeof rnAuth.getReactNativePersistence !== "function") {
    throw new Error(
      "Firebase Auth RN persistence unavailable. Check metro.config.js aliases @firebase/auth → dist/rn.",
    );
  }
  return rnAuth.getReactNativePersistence;
}

function createAuth(firebaseApp: FirebaseApp): Auth {
  try {
    const getReactNativePersistence = loadReactNativePersistence();
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    // initializeAuth throws if auth was already initialized (fast refresh).
    if (error?.code === "auth/already-initialized") {
      return getAuth(firebaseApp);
    }
    // Never throw at module import — a boot-time throw becomes Expo Updates
    // ErrorRecovery.crash() (SIGABRT) on TestFlight. Prefer memory auth over kill.
    console.warn("[LifeOS] Auth RN persistence failed; using default Auth", error);
    return getAuth(firebaseApp);
  }
}

export const auth = (() => {
  if (!app) return null as unknown as Auth;
  try {
    return createAuth(app);
  } catch (error) {
    console.warn("[LifeOS] Auth init failed at import", error);
    try {
      return getAuth(app);
    } catch {
      return null as unknown as Auth;
    }
  }
})();
export const database = (() => {
  if (!app) return null as unknown as ReturnType<typeof getDatabase>;
  try {
    return getDatabase(app);
  } catch (error) {
    console.warn("[LifeOS] RTDB init failed at import", error);
    return null as unknown as ReturnType<typeof getDatabase>;
  }
})();

/** RTDB often stores lists as objects (sparse keys) — never assume Array.isArray. */
export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") return Object.values(value as Record<string, T>);
  return [];
}

export const emptyWorkspace: Workspace = {
  tasks: [],
  projects: [],
  calendar: [],
  calendars: [],
  classes: [],
  notes: [],
  settings: {},
  brain: [],
  resources: [],
  life: {
    habits: [],
    recipes: [],
    food: [],
    exercises: [],
    trainings: [],
    trips: [],
    media: [],
    tools: [],
    contacts: [],
    documents: [],
    vault: [],
    gallery: [],
    vision: [],
    archive: [],
  },
  school: {
    profile: {},
    topics: [],
    professors: [],
    goals: [],
  },
  work: { projects: [], deliverables: [], tasks: [], meetings: [] },
  career: safeEmptyCareerHub(),
  timeTracking: emptyTimeTracking(),
  notebookHub: emptyNotebookHub(),
  notebookPages: {},
};

function normalizeNotebookHub(value: unknown): NotebookHub {
  const hub = (value && typeof value === "object" ? value : {}) as Partial<NotebookHub>;
  return {
    folders: Array.isArray(hub.folders) ? hub.folders : [],
    notebooks: Array.isArray(hub.notebooks) ? hub.notebooks : [],
  };
}

function normalizeNotebookPages(value: unknown): Record<string, NotebookPage> {
  if (!value || typeof value !== "object") return {};
  // Legacy: if someone stored an array, re-key by id
  if (Array.isArray(value)) {
    const map: Record<string, NotebookPage> = {};
    for (const page of value) {
      if (page?.id) map[page.id] = page;
    }
    return map;
  }
  const map: Record<string, NotebookPage> = {};
  for (const [id, page] of Object.entries(value as Record<string, NotebookPage>)) {
    if (page && typeof page === "object") map[id] = { ...page, id: page.id || id };
  }
  return map;
}

export async function loadWorkspace(userId: string): Promise<Workspace> {
  const keys = Object.keys(emptyWorkspace) as (keyof Workspace)[];
  const values = await Promise.all(
    keys.map(async (key) => {
      const snapshot = await get(ref(database, `users/${userId}/${key}`));
      return [key, snapshot.exists() ? snapshot.val() : emptyWorkspace[key]] as const;
    }),
  );

  const loaded = Object.fromEntries(values) as Workspace;
  const lifeRaw = (loaded.life && typeof loaded.life === "object" ? loaded.life : {}) as Record<string, unknown>;
  const schoolRaw = (loaded.school && typeof loaded.school === "object" ? loaded.school : {}) as Record<
    string,
    unknown
  >;
  return {
    ...emptyWorkspace,
    ...loaded,
    tasks: asArray(loaded.tasks),
    projects: asArray(loaded.projects),
    notes: asArray(loaded.notes),
    classes: asArray(loaded.classes),
    brain: asArray(loaded.brain),
    resources: asArray(loaded.resources),
    settings: { ...emptyWorkspace.settings, ...loaded.settings },
    life: {
      ...emptyWorkspace.life,
      habits: asArray(lifeRaw.habits),
      recipes: asArray(lifeRaw.recipes),
      food: asArray(lifeRaw.food),
      exercises: asArray(lifeRaw.exercises),
      trainings: asArray(lifeRaw.trainings),
      trips: asArray(lifeRaw.trips),
      media: asArray(lifeRaw.media),
      tools: asArray(lifeRaw.tools),
      contacts: asArray(lifeRaw.contacts),
      documents: asArray(lifeRaw.documents),
      vault: asArray(lifeRaw.vault),
      gallery: asArray(lifeRaw.gallery),
      vision: asArray(lifeRaw.vision),
      archive: asArray(lifeRaw.archive),
    },
    school: {
      ...emptyWorkspace.school,
      profile: {
        ...emptyWorkspace.school.profile,
        ...((schoolRaw.profile && typeof schoolRaw.profile === "object" ? schoolRaw.profile : {}) as object),
      },
      topics: asArray(schoolRaw.topics),
      professors: asArray(schoolRaw.professors),
      goals: asArray(schoolRaw.goals),
    },
    work: {
      projects: asArray(loaded.work?.projects),
      deliverables: asArray(loaded.work?.deliverables),
      tasks: asArray(loaded.work?.tasks),
      meetings: asArray(loaded.work?.meetings),
    },
    career: safeNormalizeCareerHub(loaded.career),
    timeTracking: normalizeTimeTracking(loaded.timeTracking),
    calendars: normalizeCalendars(loaded.calendars),
    calendar: asArray(loaded.calendar),
    notebookHub: normalizeNotebookHub(loaded.notebookHub),
    notebookPages: normalizeNotebookPages(loaded.notebookPages),
  };
}

export async function saveWorkspacePart<K extends keyof Workspace>(
  userId: string,
  key: K,
  value: Workspace[K],
) {
  const serializable = JSON.parse(JSON.stringify(value)) as Workspace[K];
  await set(ref(database, `users/${userId}/${key}`), serializable);
}

export function subscribeWorkspacePart<K extends keyof Workspace>(
  userId: string,
  key: K,
  onData: (value: Workspace[K]) => void,
): Unsubscribe {
  return onValue(ref(database, `users/${userId}/${key}`), (snapshot) => {
    if (!snapshot.exists()) return;
    onData(snapshot.val() as Workspace[K]);
  });
}

/** Per-page write so stroke autosave does not rewrite the whole library. */
export async function saveNotebookPage(userId: string, page: NotebookPage) {
  const serializable = JSON.parse(JSON.stringify(page)) as NotebookPage;
  await set(ref(database, `users/${userId}/notebookPages/${page.id}`), serializable);
}

export async function deleteNotebookPageRemote(userId: string, pageId: string) {
  await remove(ref(database, `users/${userId}/notebookPages/${pageId}`));
}
