import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  // @ts-expect-error -- RN-only export; present when Metro resolves the RN auth build
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { get, getDatabase, ref, remove, set } from "firebase/database";
import type { NotebookHub, NotebookPage, Workspace } from "../types";
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

function createAuth(firebaseApp: FirebaseApp): Auth {
  try {
    if (typeof getReactNativePersistence !== "function") {
      console.warn(
        "Firebase Auth: getReactNativePersistence unavailable. Check metro.config.js (unstable_enablePackageExports = false) and restart with -c.",
      );
      return getAuth(firebaseApp);
    }
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    // initializeAuth throws if auth was already initialized (fast refresh).
    if (error?.code === "auth/already-initialized") {
      return getAuth(firebaseApp);
    }
    console.warn("Firebase Auth persistence init failed; falling back to getAuth.", error?.message || error);
    return getAuth(firebaseApp);
  }
}

export const auth = createAuth(app);
export const database = getDatabase(app);

export const emptyWorkspace: Workspace = {
  tasks: [],
  projects: [],
  calendar: [],
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

/** Per-page write so stroke autosave does not rewrite the whole library. */
export async function saveNotebookPage(userId: string, page: NotebookPage) {
  const serializable = JSON.parse(JSON.stringify(page)) as NotebookPage;
  await set(ref(database, `users/${userId}/notebookPages/${page.id}`), serializable);
}

export async function deleteNotebookPageRemote(userId: string, pageId: string) {
  await remove(ref(database, `users/${userId}/notebookPages/${pageId}`));
}
