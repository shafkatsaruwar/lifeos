import { FIREBASE_PATHS } from "../constants";
import {
  invalidateFirebaseAuthCache,
  resolveFirebaseCredential,
  type FirebaseCredential,
} from "./firebaseAuth";
import type { StoreConfig } from "./store";
import { discoverDataFiles, isFirebaseReady } from "./store";
import { homedir } from "os";

/**
 * Thrown when a write must not be retried: bad input, export-file mode, or a
 * collection we are not allowed to touch.
 */
export class WriteRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WriteRejected";
  }
}

/** Connection blobs. Never read, written, or returned. */
export const SENSITIVE_KEYS = new Set(["gmail", "outlook", "icloud"]);

/** Collections a write tool may replace. Classes are read for task colors only. */
const WRITABLE_KEYS = new Set(["tasks", "projects", "calendar", "notes", "settings", "career"]);

const READABLE_KEYS = new Set([...WRITABLE_KEYS, "classes"]);

export function assertWritesAllowed(config: StoreConfig): void {
  if (config.allowWrites !== true) {
    throw new WriteRejected(
      "Writes are turned off. Set LIFEOS_ALLOW_WRITES=1 in the MCP server environment and restart the server. Until then this connector will not create, update, or delete LifeOS data.",
    );
  }
  if (config.dataPath) {
    throw new WriteRejected(
      `Refusing to write: this MCP process is in export-file mode (${config.dataPath}). Writes only go to live Firebase Realtime Database under users/{uid}. Export files are never modified. Unset LIFEOS_DATA_PATH and configure LIFEOS_USER_ID, LIFEOS_FIREBASE_DB_URL, and a Firebase auth method.`,
    );
  }
  if (!isFirebaseReady(config)) {
    const discovered = discoverDataFiles(config.cwd ?? process.cwd(), config.home ?? homedir());
    if (discovered[0]) {
      throw new WriteRejected(
        `Refusing to write: this MCP process is reading a snapshot file (${discovered[0]}). Writes only go to live Firebase Realtime Database under users/{uid}. Export files are never modified. Complete Firebase env (LIFEOS_USER_ID, LIFEOS_FIREBASE_DB_URL, and an auth method) to write.`,
      );
    }
    throw new WriteRejected(
      "Refusing to write: no live Firebase store is configured. Writes only go to Firebase Realtime Database at users/{uid}/{tasks,projects,calendar,notes,career}. Set LIFEOS_USER_ID, LIFEOS_FIREBASE_DB_URL, and a Firebase auth method. Export files are never modified.",
    );
  }
}

/** Same cleaner the web app uses before `set()` (`lib/dataSync.ts`). */
export function cleanUndefined(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map((item) => cleanUndefined(item));
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, cleanUndefined(value)]),
    );
  }
  return obj;
}

export function stripSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stripSensitive(item));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SENSITIVE_KEYS.has(key) && key !== "encrypted")
        .map(([key, child]) => [key, stripSensitive(child)]),
    );
  }
  return value;
}

function assertKey(key: string, writing: boolean): void {
  if (SENSITIVE_KEYS.has(key)) {
    throw new WriteRejected(`Refusing to touch Firebase key "${key}". Connection blobs are never read or written.`);
  }
  if (writing && !WRITABLE_KEYS.has(key)) {
    throw new WriteRejected(`Refusing to write Firebase key "${key}".`);
  }
  if (!writing && !READABLE_KEYS.has(key)) {
    throw new WriteRejected(`Refusing to read Firebase key "${key}" during a write.`);
  }
}

function collectionUrl(config: StoreConfig, key: string, credential: FirebaseCredential): string {
  const dbUrl = config.firebaseDbUrl!.replace(/\/$/, "");
  const userId = config.userId!;
  const pathFn = FIREBASE_PATHS[key as keyof typeof FIREBASE_PATHS];
  if (typeof pathFn !== "function") {
    throw new WriteRejected(`Refusing to write Firebase key "${key}".`);
  }
  const path = pathFn(userId);
  if (path === `users/${userId}` || path.split("/").length < 3) {
    throw new WriteRejected("Refusing to write the Firebase user root.");
  }
  return `${dbUrl}/${path}.json?${credential.queryParam}=${encodeURIComponent(credential.token)}`;
}

type RestResult = { ok: boolean; status: number; body: unknown; etag?: string };

function resolveFetch(config: StoreConfig): typeof fetch {
  if (config.fetchImpl) return config.fetchImpl;
  if (typeof fetch === "function") return fetch;
  throw new WriteRejected("fetch is not available in this runtime.");
}

function headerGet(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object" || !("get" in headers)) return undefined;
  const get = (headers as { get?: (n: string) => string | null }).get;
  if (typeof get !== "function") return undefined;
  return get.call(headers, name) || undefined;
}

async function rest(
  config: StoreConfig,
  key: string,
  credential: FirebaseCredential,
  init: { method?: string; body?: string; etag?: string },
): Promise<RestResult> {
  const fetchImpl = resolveFetch(config);
  const headers: Record<string, string> = {};
  if (!init.method || init.method === "GET") headers["X-Firebase-ETag"] = "true";
  if (init.body != null) headers["content-type"] = "application/json";
  if (init.etag) headers["if-match"] = init.etag;
  const response = await fetchImpl(collectionUrl(config, key, credential), {
    method: init.method || "GET",
    headers,
    body: init.body,
    cache: "no-store",
  });
  const status = typeof response.status === "number" ? response.status : response.ok ? 200 : 500;
  const body = await response.json().catch(() => null);
  return { ok: response.ok && status < 400, status, body, etag: headerGet(response.headers, "etag") };
}

function firebaseFailure(op: "read" | "write", key: string, status: number, body: unknown): WriteRejected {
  const detail =
    body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : "";
  if (status === 401 || status === 403 || /permission/i.test(detail)) {
    return new WriteRejected(
      `Firebase ${op} of users/{uid}/${key} was denied (${status}${detail ? `: ${detail}` : ""}). No new credential is required: the same login that reads this user can write it. In Firebase Realtime Database rules, users/$uid needs ".read" and ".write" of "auth != null && auth.uid == $uid" (this repo's database.rules.json already says that). User ID tokens, refresh tokens, and email/password satisfy that rule. A service account bypasses rules. If the live console rules were changed to read-only, restore the owner write rule and publish them.`,
    );
  }
  return new WriteRejected(
    `Firebase ${op} of users/{uid}/${key} failed (${status}${detail ? `: ${detail}` : ""}).`,
  );
}

export type CollectionMutation<T> = {
  /** Keys to PUT. Omit a key to leave it untouched. Empty means the mutation was a no-op. */
  writes: Record<string, unknown>;
  result: T;
};

/**
 * Read one or more collections under users/{uid}, mutate in memory, and PUT
 * only those collections back. Uses Firebase REST ETags so a concurrent write
 * retries instead of blindly replacing the list. Never targets the user root
 * or gmail/outlook/icloud.
 */
export async function mutateCollections<T>(
  config: StoreConfig,
  keys: string[],
  mutator: (current: Record<string, unknown>) => CollectionMutation<T>,
): Promise<T> {
  for (const key of keys) assertKey(key, false);
  if (!config.firebaseDbUrl || !config.userId) {
    throw new WriteRejected("Live Firebase is not configured.");
  }

  let credential = await resolveFirebaseCredential(config);
  if (!credential) {
    throw new WriteRejected("Firebase env looks complete but no credential could be minted.");
  }

  let refreshed = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    const current: Record<string, unknown> = {};
    const etags: Record<string, string | undefined> = {};
    let authFailed = false;
    for (const key of keys) {
      const read = await rest(config, key, credential, {});
      if (read.status === 401 && !refreshed) {
        authFailed = true;
        break;
      }
      if (!read.ok) throw firebaseFailure("read", key, read.status, read.body);
      current[key] = read.body;
      etags[key] = read.etag;
    }
    if (authFailed) {
      credential = await refreshCredential(config, credential);
      refreshed = true;
      continue;
    }

    const mutation = mutator(current);
    const writeEntries = Object.entries(mutation.writes);
    if (writeEntries.length === 0) return mutation.result;

    let conflict = false;
    let writeAuth = false;
    for (const [key, value] of writeEntries) {
      if (!keys.includes(key)) {
        throw new WriteRejected(`Refusing to write unexpected collection "${key}".`);
      }
      assertKey(key, true);
      const write = await rest(config, key, credential, {
        method: "PUT",
        body: JSON.stringify(cleanUndefined(stripSensitive(value))),
        etag: etags[key],
      });
      if (write.status === 412) {
        conflict = true;
        break;
      }
      if (write.status === 401 && !refreshed) {
        writeAuth = true;
        break;
      }
      if (!write.ok) throw firebaseFailure("write", key, write.status, write.body);
    }
    if (writeAuth) {
      credential = await refreshCredential(config, credential);
      refreshed = true;
      continue;
    }
    if (conflict) continue;
    return mutation.result;
  }

  throw new WriteRejected("Firebase write conflicted with another update. Try again.");
}

async function refreshCredential(config: StoreConfig, previous: FirebaseCredential): Promise<FirebaseCredential> {
  invalidateFirebaseAuthCache(config);
  const retry = await resolveFirebaseCredential(config, {
    forceRefresh: true,
    skipIdToken: previous.method === "idToken",
  });
  if (!retry) {
    throw new WriteRejected("Firebase rejected the credential and it could not be refreshed.");
  }
  return retry;
}
