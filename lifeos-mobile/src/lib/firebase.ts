import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  // @ts-ignore -- getReactNativePersistence exists at runtime on the RN build
  // of the firebase/auth entry point but is missing from the published
  // TypeScript types in some firebase versions.
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { get, getDatabase, ref, set } from "firebase/database";
import type { Workspace } from "../types";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.databaseURL && firebaseConfig.projectId,
);

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Without an explicit persistence layer, Firebase Auth on React Native falls
// back to in-memory-only storage (there is no window.localStorage), so users
// were being signed out every time the app was closed and reopened. Backing
// auth state with AsyncStorage keeps the session across app restarts, just
// like the web app's default browser persistence.
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
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
};

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
