import { existsSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import { FIREBASE_PATHS } from "../constants";
import {
  hasFirebaseAuthMethod,
  invalidateFirebaseAuthCache,
  resolveFirebaseCredential,
  type FirebaseAuthConfig,
  type FirebaseCredential,
} from "./firebaseAuth";
import { emptyWorkspace, normalizeWorkspace } from "./workspace";
import type { LifeOSWorkspace, StoreSource } from "./types";

export type StoreConfig = FirebaseAuthConfig & {
  dataPath?: string;
  firebaseDbUrl?: string;
  userId?: string;
  cwd?: string;
  home?: string;
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
    googleApplicationCredentials: (env.GOOGLE_APPLICATION_CREDENTIALS || "").trim() || undefined,
    userId: (env.LIFEOS_USER_ID || "").trim() || undefined,
    cwd,
  };
}

/**
 * Firebase is "complete" when we have a DB URL, a uid, and any durable auth method.
 * A leftover ~/.lifeos/export.json must not win over this.
 */
export function isFirebaseReady(config: StoreConfig): boolean {
  return Boolean(config.firebaseDbUrl && config.userId && hasFirebaseAuthMethod(config));
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

function userNodeUrl(dbUrl: string, userId: string, credential: FirebaseCredential): string {
  const base = dbUrl.replace(/\/$/, "");
  const path = FIREBASE_PATHS.user(userId);
  return `${base}/${path}.json?${credential.queryParam}=${encodeURIComponent(credential.token)}`;
}

async function fetchFirebaseUser(
  config: Required<Pick<StoreConfig, "firebaseDbUrl" | "userId">> & { fetchImpl: typeof fetch },
  credential: FirebaseCredential,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = userNodeUrl(config.firebaseDbUrl, config.userId, credential);
  const response = await config.fetchImpl(url, { cache: "no-store" });
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

function firebaseReadError(status: number, body: unknown): Error {
  const detail = body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : "";
  return new Error(
    `Firebase read failed (${status})${detail ? `: ${detail}` : ""}. Use a live ID token, LIFEOS_FIREBASE_REFRESH_TOKEN + API key, email/password, or a service account scoped to LIFEOS_USER_ID.`,
  );
}

async function loadFirebaseWorkspace(config: StoreConfig, discoveredPath?: string): Promise<LoadedStore> {
  const fetchImpl = resolveFetch(config);
  const userId = config.userId!;
  const firebaseDbUrl = config.firebaseDbUrl!;

  let credential = await resolveFirebaseCredential(config);
  if (!credential) {
    throw new Error("Firebase env looks complete but no credential could be minted.");
  }

  let result = await fetchFirebaseUser({ firebaseDbUrl, userId, fetchImpl }, credential);
  if (result.status === 401) {
    invalidateFirebaseAuthCache(config);
    const retry = await resolveFirebaseCredential(config, {
      forceRefresh: true,
      skipIdToken: credential.method === "idToken",
    });
    if (retry) {
      credential = retry;
      result = await fetchFirebaseUser({ firebaseDbUrl, userId, fetchImpl }, credential);
    }
  }

  if (!result.ok) {
    throw firebaseReadError(result.status, result.body);
  }

  const warning = discoveredPath
    ? `Ignoring discovered snapshot ${discoveredPath} because Firebase is configured.`
    : undefined;

  if (result.body == null) {
    return {
      workspace: emptyWorkspace({ source: "firebase", userId }),
      warning: warning || `Firebase user ${userId} has no data yet.`,
    };
  }
  return {
    workspace: normalizeWorkspace(result.body, { source: "firebase", userId }),
    warning,
  };
}

export async function loadWorkspace(config: StoreConfig): Promise<LoadedStore> {
  const cwd = config.cwd ?? process.cwd();
  const home = config.home ?? homedir();

  // Explicit file pin always wins. Discovered leftovers do not.
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

  const discovered = discoverDataFiles(cwd, home);

  if (isFirebaseReady(config)) {
    return loadFirebaseWorkspace(config, discovered[0]);
  }

  if (discovered[0]) {
    return {
      workspace: normalizeWorkspace(parseJsonFile(discovered[0]), {
        source: "file",
        sourcePath: discovered[0],
        userId: config.userId,
      }),
      warning: `Using discovered snapshot ${discovered[0]}. Set LIFEOS_DATA_PATH to pin a file, or complete Firebase env to stay live.`,
    };
  }

  const missing: string[] = [];
  if (!config.dataPath) missing.push("LIFEOS_DATA_PATH (optional frozen export)");
  if (!config.firebaseDbUrl) missing.push("LIFEOS_FIREBASE_DB_URL or NEXT_PUBLIC_FIREBASE_DB_URL");
  if (!hasFirebaseAuthMethod(config)) {
    missing.push(
      "LIFEOS_FIREBASE_AUTH, or LIFEOS_FIREBASE_EMAIL + LIFEOS_FIREBASE_PASSWORD, or LIFEOS_FIREBASE_REFRESH_TOKEN + API key, or FIREBASE_SERVICE_ACCOUNT_JSON / GOOGLE_APPLICATION_CREDENTIALS",
    );
  }
  if (!config.userId) missing.push("LIFEOS_USER_ID");

  return {
    workspace: emptyWorkspace({ source: "empty" }),
    warning:
      "No LifeOS store found. Complete Firebase env for live reads, or point LIFEOS_DATA_PATH at a Settings export. Missing: " +
      missing.join("; ") +
      ". Browser localStorage / mobile AsyncStorage are not readable from this process.",
  };
}

export function sourceLabel(source: StoreSource): string {
  if (source === "file") return "local export JSON";
  if (source === "firebase") return "Firebase Realtime Database";
  return "none";
}
