import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
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

let authInstance: Auth;
try {
  authInstance = initializeAuth(app);
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const database = getDatabase(app);

const emptyWorkspace: Workspace = {
  tasks: [],
  projects: [],
  calendar: [],
  classes: [],
  notes: [],
  settings: {},
};

export async function loadWorkspace(userId: string): Promise<Workspace> {
  const keys = Object.keys(emptyWorkspace) as (keyof Workspace)[];
  const values = await Promise.all(
    keys.map(async (key) => {
      const snapshot = await get(ref(database, `users/${userId}/${key}`));
      return [key, snapshot.exists() ? snapshot.val() : emptyWorkspace[key]] as const;
    }),
  );

  return Object.fromEntries(values) as Workspace;
}

export async function saveWorkspacePart<K extends keyof Workspace>(
  userId: string,
  key: K,
  value: Workspace[K],
) {
  await set(ref(database, `users/${userId}/${key}`), value);
}
