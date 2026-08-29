import { createSign } from "crypto";
import { existsSync, readFileSync } from "fs";

export type FirebaseAuthMode = "id-token" | "password" | "refresh-token" | "service-account";

export type FirebaseAuthConfig = {
  firebaseAuth?: string;
  firebaseApiKey?: string;
  firebaseEmail?: string;
  firebasePassword?: string;
  firebaseRefreshToken?: string;
  serviceAccountJson?: string;
  serviceAccountPath?: string;
  userId?: string;
};

export type ServiceAccount = {
  client_email: string;
  private_key: string;
};

export type ResolvedFirebaseAuth = {
  mode: FirebaseAuthMode;
  idToken?: string;
  accessToken?: string;
};

export class FirebaseReadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "FirebaseReadError";
  }
}

type TokenCache = {
  key: string;
  idToken?: string;
  accessToken?: string;
  expiresAt: number;
};

let cache: TokenCache | null = null;

export function resetFirebaseAuthCache(): void {
  cache = null;
}

export function loadServiceAccount(config: FirebaseAuthConfig): ServiceAccount | null {
  const tryParse = (raw: string): ServiceAccount | null => {
    try {
      const parsed = JSON.parse(raw) as { client_email?: unknown; private_key?: unknown };
      if (typeof parsed?.client_email === "string" && typeof parsed?.private_key === "string") {
        return { client_email: parsed.client_email, private_key: parsed.private_key };
      }
    } catch {
      return null;
    }
    return null;
  };

  if (config.serviceAccountJson?.trim()) {
    const parsed = tryParse(config.serviceAccountJson.trim());
    if (parsed) return parsed;
  }
  const path = config.serviceAccountPath?.trim();
  if (path) {
    try {
      if (!existsSync(path)) return null;
      return tryParse(readFileSync(path, "utf8"));
    } catch {
      return null;
    }
  }
  return null;
}

/** First configured method wins: ID token, email/password, refresh token, then service account. */
export function pickFirebaseAuthMode(config: FirebaseAuthConfig): FirebaseAuthMode | null {
  if (config.firebaseAuth) return "id-token";
  if (config.firebaseApiKey && config.firebaseEmail && config.firebasePassword) return "password";
  if (config.firebaseApiKey && config.firebaseRefreshToken) return "refresh-token";
  if (loadServiceAccount(config)) return "service-account";
  return null;
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
): Promise<{ idToken: string; expiresInMs: number }> {
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
    expires_in?: string | number;
    error?: { message?: string } | string;
  } | null;
  if (!response.ok || !body?.id_token) {
    const detail =
      typeof body?.error === "string"
        ? body.error
        : body?.error && typeof body.error === "object"
          ? body.error.message
          : undefined;
    throw new Error(detail || "Firebase refresh-token exchange failed.");
  }
  const seconds = Number(body.expires_in);
  const expiresInMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 50 * 60 * 1000;
  return { idToken: body.id_token, expiresInMs };
}

function signServiceAccountJwt(account: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: account.client_email,
      sub: account.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
    }),
  ).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  return `${header}.${claim}.${signer.sign(account.private_key, "base64url")}`;
}

export async function mintAccessTokenFromServiceAccount(
  account: ServiceAccount,
  fetchImpl: typeof fetch,
): Promise<{ accessToken: string; expiresInMs: number }> {
  const assertion = signServiceAccountJwt(account);
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  const body = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number | string;
    error?: string;
    error_description?: string;
  } | null;
  if (!response.ok || !body?.access_token) {
    throw new Error(body?.error_description || body?.error || "Service account token exchange failed.");
  }
  const seconds = Number(body.expires_in);
  const expiresInMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 50 * 60 * 1000;
  return { accessToken: body.access_token, expiresInMs };
}

function cacheKey(mode: FirebaseAuthMode, config: FirebaseAuthConfig): string {
  return `${mode}:${config.userId || ""}`;
}

export async function resolveFirebaseCredentials(
  config: FirebaseAuthConfig,
  fetchImpl: typeof fetch,
  options?: { forceRefresh?: boolean },
): Promise<ResolvedFirebaseAuth> {
  const mode = pickFirebaseAuthMode(config);
  if (!mode) {
    throw new Error("No Firebase auth method configured.");
  }

  const key = cacheKey(mode, config);
  if (!options?.forceRefresh && cache && cache.key === key && cache.expiresAt > Date.now() + 5000) {
    return { mode, idToken: cache.idToken, accessToken: cache.accessToken };
  }

  if (mode === "id-token") {
    cache = { key, idToken: config.firebaseAuth, expiresAt: Date.now() + 50 * 60 * 1000 };
    return { mode, idToken: config.firebaseAuth };
  }

  if (mode === "password") {
    const idToken = await mintIdTokenFromPassword(
      config.firebaseApiKey!,
      config.firebaseEmail!,
      config.firebasePassword!,
      fetchImpl,
    );
    cache = { key, idToken, expiresAt: Date.now() + 50 * 60 * 1000 };
    return { mode, idToken };
  }

  if (mode === "refresh-token") {
    const minted = await mintIdTokenFromRefreshToken(config.firebaseApiKey!, config.firebaseRefreshToken!, fetchImpl);
    cache = { key, idToken: minted.idToken, expiresAt: Date.now() + minted.expiresInMs };
    return { mode, idToken: minted.idToken };
  }

  const account = loadServiceAccount(config);
  if (!account) {
    throw new Error("Service account credentials are missing or invalid.");
  }
  const minted = await mintAccessTokenFromServiceAccount(account, fetchImpl);
  cache = { key, accessToken: minted.accessToken, expiresAt: Date.now() + minted.expiresInMs };
  return { mode, accessToken: minted.accessToken };
}

/** After a 401, drop a stale ID token so refresh-token / password / admin can remint. */
export function authConfigForRetry(config: FirebaseAuthConfig): FirebaseAuthConfig {
  return { ...config, firebaseAuth: undefined };
}

export function canRemint(config: FirebaseAuthConfig): boolean {
  return pickFirebaseAuthMode(authConfigForRetry(config)) != null;
}
