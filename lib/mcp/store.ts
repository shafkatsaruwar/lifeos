import { existsSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import { FIREBASE_PATHS } from "../constants";
import { emptyWorkspace, normalizeWorkspace } from "./workspace";
import type { LifeOSWorkspace, StoreSource } from "./types";

export type StoreConfig = {
  dataPath?: string;
  firebaseDbUrl?: string;
  firebaseAuth?: string;
  firebaseApiKey?: string;
  firebaseEmail?: string;
  firebasePassword?: string;
  userId?: string;
  cwd?: string;
  fetchImpl?: typeof fetch;
};

export type LoadedStore = {
  workspace: LifeOSWorkspace;
  warning?: string;
};

const DEFAULT_RELATIVE_FILES = ["lifeos-export.json", "data/lifeos.json"];
const DEFAULT_HOME_FILES = [".lifeos/export.json", ".lifeos/lifeos-export.json"];

export function readStoreConfig(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): StoreConfig {
  return {
    dataPath: (env.LIFEOS_DATA_PATH || "").trim() || undefined,
    firebaseDbUrl: (env.LIFEOS_FIREBASE_DB_URL || env.NEXT_PUBLIC_FIREBASE_DB_URL || "").trim() || undefined,
    firebaseAuth: (env.LIFEOS_FIREBASE_AUTH || "").trim() || undefined,
    firebaseApiKey: (env.LIFEOS_FIREBASE_API_KEY || env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim() || undefined,
    firebaseEmail: (env.LIFEOS_FIREBASE_EMAIL || "").trim() || undefined,
    firebasePassword: (env.LIFEOS_FIREBASE_PASSWORD || "").trim() || undefined,
    userId: (env.LIFEOS_USER_ID || "").trim() || undefined,
    cwd,
  };
}

export function discoverDataFiles(cwd: string, home = homedir()): string[] {
  const paths = [
    ...DEFAULT_RELATIVE_FILES.map((file) => join(cwd, file)),
    ...DEFAULT_HOME_FILES.map((file) => join(home, file)),
  ];
  return paths.filter((file) => {
    try {
      return existsSync(file) && statSync(file).isFile();
    } catch {
      return false;
    }
  });
}

function parseJsonFile(filePath: string): unknown {
  const text = readFileSync(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`LIFEOS_DATA_PATH is not valid JSON (${filePath}): ${message}`);
  }
}

async function signInWithPassword(
  apiKey: string,
  email: string,
  password: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const response = await fetchImpl(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = (await response.json().catch(() => null)) as { idToken?: string; error?: { message?: string } } | null;
  if (!response.ok || !body?.idToken) {
    throw new Error(body?.error?.message || "Firebase email/password sign-in failed.");
  }
  return body.idToken;
}

async function fetchFirebaseUser(
  config: Required<Pick<StoreConfig, "firebaseDbUrl" | "firebaseAuth" | "userId">> & { fetchImpl: typeof fetch },
): Promise<unknown> {
  const base = config.firebaseDbUrl.replace(/\/$/, "");
  const path = FIREBASE_PATHS.user(config.userId);
  const url = `${base}/${path}.json?auth=${encodeURIComponent(config.firebaseAuth)}`;
  const response = await config.fetchImpl(url, { cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : response.statusText;
    throw new Error(
      `Firebase read failed (${response.status}): ${detail}. Use a Firebase ID token for LIFEOS_FIREBASE_AUTH whose uid matches LIFEOS_USER_ID.`,
    );
  }
  return body;
}

export async function loadWorkspace(config: StoreConfig): Promise<LoadedStore> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const cwd = config.cwd ?? process.cwd();

  if (config.dataPath) {
    const filePath = resolve(cwd, config.dataPath);
    if (!existsSync(filePath)) {
      throw new Error(`LIFEOS_DATA_PATH does not exist: ${filePath}`);
    }
    return {
      workspace: normalizeWorkspace(parseJsonFile(filePath), {
        source: "file",
        sourcePath: filePath,
        userId: config.userId,
      }),
    };
  }

  const discovered = discoverDataFiles(cwd);
  if (discovered[0]) {
    return {
      workspace: normalizeWorkspace(parseJsonFile(discovered[0]), {
        source: "file",
        sourcePath: discovered[0],
        userId: config.userId,
      }),
      warning: `Using discovered snapshot ${discovered[0]}. Set LIFEOS_DATA_PATH to pin a file.`,
    };
  }

  let auth = config.firebaseAuth;
  if (!auth && config.firebaseApiKey && config.firebaseEmail && config.firebasePassword) {
    auth = await signInWithPassword(config.firebaseApiKey, config.firebaseEmail, config.firebasePassword, fetchImpl);
  }

  if (config.firebaseDbUrl && auth && config.userId) {
    const raw = await fetchFirebaseUser({
      firebaseDbUrl: config.firebaseDbUrl,
      firebaseAuth: auth,
      userId: config.userId,
      fetchImpl,
    });
    if (raw == null) {
      return {
        workspace: emptyWorkspace({ source: "firebase", userId: config.userId }),
        warning: `Firebase user ${config.userId} has no data yet.`,
      };
    }
    return {
      workspace: normalizeWorkspace(raw, { source: "firebase", userId: config.userId }),
    };
  }

  const missing: string[] = [];
  if (!config.dataPath) missing.push("LIFEOS_DATA_PATH (Settings → Export JSON)");
  if (!config.firebaseDbUrl) missing.push("LIFEOS_FIREBASE_DB_URL or NEXT_PUBLIC_FIREBASE_DB_URL");
  if (!auth) missing.push("LIFEOS_FIREBASE_AUTH (Firebase ID token) or LIFEOS_FIREBASE_EMAIL + LIFEOS_FIREBASE_PASSWORD");
  if (!config.userId) missing.push("LIFEOS_USER_ID");

  return {
    workspace: emptyWorkspace({ source: "empty" }),
    warning:
      "No LifeOS store found. Point LIFEOS_DATA_PATH at a Settings export, or set Firebase env vars. Missing: " +
      missing.join("; ") +
      ". Browser localStorage / mobile AsyncStorage are not readable from this process.",
  };
}

export function sourceLabel(source: StoreSource): string {
  if (source === "file") return "local export JSON";
  if (source === "firebase") return "Firebase Realtime Database";
  return "none";
}
