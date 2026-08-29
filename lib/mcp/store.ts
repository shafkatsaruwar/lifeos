import { existsSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import { FIREBASE_PATHS } from "../constants";
import {
  FirebaseReadError,
  authConfigForRetry,
  canRemint,
  pickFirebaseAuthMode,
  resetFirebaseAuthCache,
  resolveFirebaseCredentials,
  type FirebaseAuthConfig,
  type ResolvedFirebaseAuth,
} from "./firebaseAuth";
import { emptyWorkspace, normalizeWorkspace } from "./workspace";
import type { LifeOSWorkspace, StoreSource } from "./types";

export type StoreConfig = FirebaseAuthConfig & {
  dataPath?: string;
  firebaseDbUrl?: string;
  cwd?: string;
  home?: string;
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
    firebaseRefreshToken: (env.LIFEOS_FIREBASE_REFRESH_TOKEN || "").trim() || undefined,
    serviceAccountJson: (env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim() || undefined,
    serviceAccountPath: (env.GOOGLE_APPLICATION_CREDENTIALS || "").trim() || undefined,
    userId: (env.LIFEOS_USER_ID || "").trim() || undefined,
    cwd,
  };
}

/** Live Firebase is ready when URL + uid + any auth method are set. A leftover export file does not count. */
export function isFirebaseConfigured(config: StoreConfig): boolean {
  return Boolean(config.firebaseDbUrl && config.userId && pickFirebaseAuthMode(config));
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

function resolveFetch(config: StoreConfig): typeof fetch {
  if (config.fetchImpl) return config.fetchImpl;
  if (typeof fetch === "function") return fetch;
  throw new Error("fetch is not available in this runtime. Pass fetchImpl or run on Node 18+.");
}

function firebaseReadUrl(dbUrl: string, userId: string, creds: ResolvedFirebaseAuth): string {
  const base = dbUrl.replace(/\/$/, "");
  const path = FIREBASE_PATHS.user(userId);
  if (creds.accessToken) {
    return `${base}/${path}.json?access_token=${encodeURIComponent(creds.accessToken)}`;
  }
  return `${base}/${path}.json?auth=${encodeURIComponent(creds.idToken || "")}`;
}

async function fetchFirebaseUser(
  config: Required<Pick<StoreConfig, "firebaseDbUrl" | "userId">> & { fetchImpl: typeof fetch },
  creds: ResolvedFirebaseAuth,
): Promise<unknown> {
  const url = firebaseReadUrl(config.firebaseDbUrl, config.userId, creds);
  const response = await config.fetchImpl(url, { cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : response.statusText;
    throw new FirebaseReadError(
      `Firebase read failed (${response.status}): ${detail}. Use a Firebase ID token, refresh token, or service account scoped to LIFEOS_USER_ID.`,
      response.status,
    );
  }
  return body;
}

async function loadFromFirebase(config: StoreConfig): Promise<LoadedStore> {
  const fetchImpl = resolveFetch(config);
  let creds = await resolveFirebaseCredentials(config, fetchImpl);
  let raw: unknown;
  try {
    raw = await fetchFirebaseUser(
      { firebaseDbUrl: config.firebaseDbUrl!, userId: config.userId!, fetchImpl },
      creds,
    );
  } catch (error) {
    if (error instanceof FirebaseReadError && error.status === 401 && canRemint(config)) {
      resetFirebaseAuthCache();
      creds = await resolveFirebaseCredentials(authConfigForRetry(config), fetchImpl, { forceRefresh: true });
      raw = await fetchFirebaseUser(
        { firebaseDbUrl: config.firebaseDbUrl!, userId: config.userId!, fetchImpl },
        creds,
      );
    } else {
      throw error;
    }
  }

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

/**
 * Store order:
 * 1. Explicit LIFEOS_DATA_PATH — always a file.
 * 2. Complete Firebase env — live RTDB, even if ~/.lifeos/export.json exists.
 * 3. Discovered export file — only when Firebase env is incomplete.
 */
export async function loadWorkspace(config: StoreConfig): Promise<LoadedStore> {
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

  if (isFirebaseConfigured(config)) {
    return loadFromFirebase(config);
  }

  const discovered = discoverDataFiles(cwd, config.home ?? homedir());
  if (discovered[0]) {
    return {
      workspace: normalizeWorkspace(parseJsonFile(discovered[0]), {
        source: "file",
        sourcePath: discovered[0],
        userId: config.userId,
      }),
      warning:
        `Using discovered snapshot ${discovered[0]}. Set LIFEOS_DATA_PATH to pin a file, or set Firebase env ` +
        `(LIFEOS_USER_ID + LIFEOS_FIREBASE_DB_URL + LIFEOS_FIREBASE_REFRESH_TOKEN) to use live data instead.`,
    };
  }

  const missing: string[] = [];
  if (!config.firebaseDbUrl) missing.push("LIFEOS_FIREBASE_DB_URL or NEXT_PUBLIC_FIREBASE_DB_URL");
  if (!pickFirebaseAuthMode(config)) {
    missing.push(
      "LIFEOS_FIREBASE_AUTH, or LIFEOS_FIREBASE_REFRESH_TOKEN + API key, or LIFEOS_FIREBASE_EMAIL + PASSWORD, or FIREBASE_SERVICE_ACCOUNT_JSON",
    );
  }
  if (!config.userId) missing.push("LIFEOS_USER_ID");

  return {
    workspace: emptyWorkspace({ source: "empty" }),
    warning:
      "No LifeOS store found. Set Firebase env vars for live data, or LIFEOS_DATA_PATH for an export. Missing: " +
      missing.join("; ") +
      ". Browser localStorage / mobile AsyncStorage are not readable from this process.",
  };
}

export function sourceLabel(source: StoreSource): string {
  if (source === "file") return "local export JSON";
  if (source === "firebase") return "Firebase Realtime Database";
  return "none";
}
