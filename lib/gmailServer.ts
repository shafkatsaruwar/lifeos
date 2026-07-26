import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";

type GmailTokens = { access_token: string; refresh_token?: string; expiry_date: number };
export type GoogleCalendarChoice = { id: string; name: string; color?: string; primary?: boolean };
type StoredGmailConnection = {
  encrypted: string;
  connectedAt: string;
  email?: string;
  googleCalendars?: GoogleCalendarChoice[];
  selectedGoogleCalendarIds?: string[];
};

const required = (name: "GOOGLE_GMAIL_CLIENT_ID" | "GOOGLE_GMAIL_CLIENT_SECRET") => {
  const value = process.env[name];
  if (!value) throw new Error(`Gmail is not configured yet. Add ${name} in Vercel, then redeploy.`);
  return value;
};

const secretKey = (purpose: string) => createHash("sha256").update(`${required("GOOGLE_GMAIL_CLIENT_SECRET")}:${purpose}`).digest();
const base64url = (value: Buffer) => value.toString("base64url");
const fromBase64url = (value: string) => Buffer.from(value, "base64url");

export const gmailConfigured = () => Boolean(process.env.GOOGLE_GMAIL_CLIENT_ID && process.env.GOOGLE_GMAIL_CLIENT_SECRET);

export function createSignedState(payload: Record<string, unknown>) {
  const body = base64url(Buffer.from(JSON.stringify(payload)));
  const signature = createHmac("sha256", secretKey("oauth-state")).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readSignedState<T>(state: string): T | null {
  const [body, signature] = state.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", secretKey("oauth-state")).update(body).digest();
  const actual = fromBase64url(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try { return JSON.parse(fromBase64url(body).toString("utf8")) as T; } catch { return null; }
}

export function encryptTokens(tokens: GmailTokens) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey("gmail-tokens"), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(tokens), "utf8"), cipher.final()]);
  return [base64url(iv), base64url(cipher.getAuthTag()), base64url(ciphertext)].join(".");
}

export function decryptTokens(value: string): GmailTokens {
  const [ivValue, tagValue, ciphertextValue] = value.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Saved Gmail connection is invalid. Reconnect Gmail.");
  const decipher = createDecipheriv("aes-256-gcm", secretKey("gmail-tokens"), fromBase64url(ivValue));
  decipher.setAuthTag(fromBase64url(tagValue));
  return JSON.parse(Buffer.concat([decipher.update(fromBase64url(ciphertextValue)), decipher.final()]).toString("utf8")) as GmailTokens;
}

export async function verifyFirebaseToken(idToken: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Firebase is not configured.");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken }), cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  const uid = body?.users?.[0]?.localId;
  if (!response.ok || !uid) throw new Error("Your LifeOS session expired. Sign in again, then reconnect Gmail.");
  return { uid: String(uid), email: typeof body.users[0].email === "string" ? body.users[0].email : undefined };
}

const databaseUrl = () => (process.env.NEXT_PUBLIC_FIREBASE_DB_URL || "").replace(/\/$/, "");
const connectionUrl = (uid: string, idToken: string) => {
  const base = databaseUrl();
  if (!base) throw new Error("Firebase database is not configured.");
  return `${base}/users/${encodeURIComponent(uid)}/gmail.json?auth=${encodeURIComponent(idToken)}`;
};

export async function getConnection(uid: string, idToken: string) {
  const response = await fetch(connectionUrl(uid, idToken), { cache: "no-store" });
  if (!response.ok) throw new Error("Could not read your Gmail connection.");
  const value = (await response.json()) as StoredGmailConnection | null;
  if (!value?.encrypted) return null;
  return {
    ...value,
    googleCalendars: Array.isArray(value.googleCalendars)
      ? value.googleCalendars.filter((calendar): calendar is GoogleCalendarChoice => Boolean(calendar && typeof calendar.id === "string" && typeof calendar.name === "string"))
      : [],
    selectedGoogleCalendarIds: Array.isArray(value.selectedGoogleCalendarIds)
      ? value.selectedGoogleCalendarIds.filter((id): id is string => typeof id === "string")
      : [],
  };
}

export async function saveConnection(uid: string, idToken: string, connection: StoredGmailConnection | null) {
  const response = await fetch(connectionUrl(uid, idToken), {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(connection), cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not save your Gmail connection. Check your Firebase Database rules, then try again.");
}

export async function refreshIfNeeded(tokens: GmailTokens) {
  if (tokens.expiry_date > Date.now() + 60_000) return tokens;
  if (!tokens.refresh_token) throw new Error("Your Gmail connection expired. Reconnect Gmail.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: required("GOOGLE_GMAIL_CLIENT_ID"), client_secret: required("GOOGLE_GMAIL_CLIENT_SECRET"), refresh_token: tokens.refresh_token, grant_type: "refresh_token" }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.access_token) throw new Error("Your Gmail connection expired. Reconnect Gmail.");
  return { access_token: body.access_token, refresh_token: body.refresh_token || tokens.refresh_token, expiry_date: Date.now() + Number(body.expires_in || 3600) * 1000 };
}

export const gmailClientId = () => required("GOOGLE_GMAIL_CLIENT_ID");
export type { GmailTokens, StoredGmailConnection };
