import { createSign, createPrivateKey } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

export type FirebaseAuthMethod = "idToken" | "password" | "refreshToken" | "serviceAccount";

export type FirebaseCredential = {
  method: FirebaseAuthMethod;
  /** Query param for RTDB REST: `auth` (user ID token) or `access_token` (admin). */
  queryParam: "auth" | "access_token";
  token: string;
};

export type FirebaseAuthConfig = {
  firebaseAuth?: string;
  firebaseApiKey?: string;
  firebaseEmail?: string;
  firebasePassword?: string;
  firebaseRefreshToken?: string;
  serviceAccountJson?: string;
  googleApplicationCredentials?: string;
  fetchImpl?: typeof fetch;
};

type CacheEntry = {
  credential: FirebaseCredential;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const TOKEN_TTL_MS = 50 * 60 * 1000;

export function resetFirebaseAuthCache(): void {
  cache.clear();
}

function resolveFetch(config: FirebaseAuthConfig): typeof fetch {
  if (config.fetchImpl) return config.fetchImpl;
  if (typeof fetch === "function") return fetch;
  throw new Error("fetch is not available in this runtime. Pass fetchImpl or run on Node 18+.");
}

function cacheKey(config: FirebaseAuthConfig): string {
  return [
    config.firebaseAuth ? "id" : "",
    config.firebaseEmail ? "pw" : "",
    config.firebaseRefreshToken ? "rt" : "",
    config.serviceAccountJson ? "saj" : "",
    config.googleApplicationCredentials || "",
  ].join("|");
}

function remember(config: FirebaseAuthConfig, credential: FirebaseCredential, ttlMs = TOKEN_TTL_MS): FirebaseCredential {
  cache.set(cacheKey(config), { credential, expiresAt: Date.now() + ttlMs });
  return credential;
}

function cached(config: FirebaseAuthConfig): FirebaseCredential | undefined {
  const hit = cache.get(cacheKey(config));
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(cacheKey(config));
    return undefined;
  }
  return hit.credential;
}

export function invalidateFirebaseAuthCache(config: FirebaseAuthConfig): void {
  cache.delete(cacheKey(config));
}

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

function parseServiceAccountObject(value: unknown): ServiceAccount | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { client_email?: unknown; private_key?: unknown };
  if (typeof record.client_email !== "string" || !record.client_email.trim()) return null;
  if (typeof record.private_key !== "string" || !record.private_key.includes("PRIVATE KEY")) return null;
  return {
    client_email: record.client_email.trim(),
    private_key: record.private_key.replace(/\\n/g, "\n"),
  };
}

export function readServiceAccount(config: FirebaseAuthConfig): ServiceAccount | null {
  if (config.serviceAccountJson?.trim()) {
    try {
      return parseServiceAccountObject(JSON.parse(config.serviceAccountJson));
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
    }
  }
  const filePath = (config.googleApplicationCredentials || "").trim();
  if (!filePath) return null;
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS file does not exist.");
  }
  try {
    return parseServiceAccountObject(JSON.parse(readFileSync(resolved, "utf8")));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("GOOGLE_APPLICATION_CREDENTIALS")) throw error;
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not valid service-account JSON.");
  }
}

export function hasFirebaseAuthMethod(config: FirebaseAuthConfig): boolean {
  if (config.firebaseAuth?.trim()) return true;
  if (config.firebaseApiKey && config.firebaseEmail && config.firebasePassword) return true;
  if (config.firebaseApiKey && config.firebaseRefreshToken) return true;
  if (config.serviceAccountJson?.trim() || config.googleApplicationCredentials?.trim()) return true;
  return false;
}

export async function mintIdTokenFromPassword(
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

export async function mintIdTokenFromRefreshToken(
  apiKey: string,
  refreshToken: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const response = await fetchImpl(
    `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    },
  );
  const body = (await response.json().catch(() => null)) as {
    id_token?: string;
    idToken?: string;
    error?: { message?: string } | string;
  } | null;
  const idToken = body?.id_token || body?.idToken;
  if (!response.ok || !idToken) {
    const detail = typeof body?.error === "string" ? body.error : body?.error?.message;
    throw new Error(detail || "Firebase refresh-token exchange failed.");
  }
  return idToken;
}

export function signServiceAccountJwt(
  email: string,
  privateKeyPem: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: email,
      sub: email,
      aud: "https://oauth2.googleapis.com/token",
      iat: nowSeconds,
      exp: nowSeconds + 3600,
      scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
    }),
  ).toString("base64url");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  sign.end();
  const key = createPrivateKey(privateKeyPem);
  const signature = sign.sign(key, "base64url");
  return `${header}.${payload}.${signature}`;
}

export async function mintAccessTokenFromServiceAccount(
  account: ServiceAccount,
  fetchImpl: typeof fetch,
): Promise<string> {
  const assertion = signServiceAccountJwt(account.client_email, account.private_key);
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  const body = (await response.json().catch(() => null)) as { access_token?: string; error?: string } | null;
  if (!response.ok || !body?.access_token) {
    throw new Error(body?.error || "Service-account token exchange failed.");
  }
  return body.access_token;
}

export type ResolveAuthOptions = {
  forceRefresh?: boolean;
  /** Skip a stale ID token after a 401 so a refresh token or service account can take over. */
  skipIdToken?: boolean;
};

/**
 * First match wins: ID token → email/password → refresh token → service account.
 * Tokens are cached in memory. Secrets are never logged.
 */
export async function resolveFirebaseCredential(
  config: FirebaseAuthConfig,
  options: ResolveAuthOptions = {},
): Promise<FirebaseCredential | null> {
  if (!options.forceRefresh) {
    const hit = cached(config);
    if (hit && !(options.skipIdToken && hit.method === "idToken")) return hit;
  } else {
    invalidateFirebaseAuthCache(config);
  }

  const fetchImpl = resolveFetch(config);

  if (!options.skipIdToken && config.firebaseAuth?.trim()) {
    return remember(config, {
      method: "idToken",
      queryParam: "auth",
      token: config.firebaseAuth.trim(),
    });
  }

  if (config.firebaseApiKey && config.firebaseEmail && config.firebasePassword) {
    const token = await mintIdTokenFromPassword(
      config.firebaseApiKey,
      config.firebaseEmail,
      config.firebasePassword,
      fetchImpl,
    );
    return remember(config, { method: "password", queryParam: "auth", token });
  }

  if (config.firebaseApiKey && config.firebaseRefreshToken) {
    const token = await mintIdTokenFromRefreshToken(config.firebaseApiKey, config.firebaseRefreshToken, fetchImpl);
    return remember(config, { method: "refreshToken", queryParam: "auth", token });
  }

  const account = readServiceAccount(config);
  if (account) {
    const token = await mintAccessTokenFromServiceAccount(account, fetchImpl);
    return remember(config, { method: "serviceAccount", queryParam: "access_token", token });
  }

  return null;
}
