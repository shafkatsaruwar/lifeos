import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { get, getDatabase, onValue, ref, remove, set, type Unsubscribe } from "firebase/database";
import type { NotebookHub, NotebookPage, Workspace } from "../types";
import { normalizeCalendars } from "./calendars";
import { emptyNotebookHub } from "./notebooks";

/**
 * Public Firebase web client config (same project as lifeos-mu-three.vercel.app).
 * These values are embedded in the web client bundle already — env vars override
 * when non-empty (blank .env entries fall back to defaults).
 */
const env = (value?: string) => value?.trim() || undefined;

const firebaseConfig = {
  apiKey: env(process.env.EXPO_PUBLIC_FIREBASE_API_KEY) || "AIzaSyAbMSSRscUp7CMbeCYuOp5SC6utZ3QPNNM",
  authDomain: env(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN) || "lifeos-45586.firebaseapp.com",
  databaseURL:
    env(process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL) || "https://lifeos-45586-default-rtdb.firebaseio.com/",
  projectId: env(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) || "lifeos-45586",
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.databaseURL && firebaseConfig.projectId,
);

function createApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp(firebaseConfig);
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
    // Re-throw other failures — silent getAuth() fallback would drop persistence.
    throw error;
  }
}

export const auth = createAuth(app);
export const database = getDatabase(app);

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
  return {
    ...emptyWorkspace,
    ...loaded,
    settings: { ...emptyWorkspace.settings, ...loaded.settings },
    life: { ...emptyWorkspace.life, ...loaded.life },
    school: {
      ...emptyWorkspace.school,
      ...loaded.school,
      profile: { ...emptyWorkspace.school.profile, ...loaded.school?.profile },
    },
    work: {
      projects: Array.isArray(loaded.work?.projects) ? loaded.work.projects : [],
      deliverables: Array.isArray(loaded.work?.deliverables) ? loaded.work.deliverables : [],
      tasks: Array.isArray(loaded.work?.tasks) ? loaded.work.tasks : [],
      meetings: Array.isArray(loaded.work?.meetings) ? loaded.work.meetings : [],
    },
    calendars: normalizeCalendars(loaded.calendars),
    calendar: Array.isArray(loaded.calendar) ? loaded.calendar : [],
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
