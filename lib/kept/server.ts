import { verifyFirebaseToken } from "@/lib/gmailServer";
import { emptyKeptHub, type KeptHub } from "./types";
import { normalizeKeptHub } from "./normalize";

const databaseUrl = () => (process.env.NEXT_PUBLIC_FIREBASE_DB_URL || "").replace(/\/$/, "");

export async function requireKeptAuth(request: Request): Promise<{ uid: string; idToken: string }> {
  const header = request.headers.get("authorization") || "";
  const idToken = header.replace(/^Bearer\s+/i, "").trim();
  if (!idToken) {
    throw Object.assign(new Error("Sign in first."), { status: 401 });
  }
  const { uid } = await verifyFirebaseToken(idToken);
  return { uid, idToken };
}

function keptUrl(uid: string, idToken: string) {
  const base = databaseUrl();
  if (!base) throw Object.assign(new Error("Firebase database is not configured."), { status: 503 });
  return `${base}/users/${encodeURIComponent(uid)}/kept.json?auth=${encodeURIComponent(idToken)}`;
}

export async function loadKeptHub(uid: string, idToken: string): Promise<KeptHub> {
  const response = await fetch(keptUrl(uid, idToken), { cache: "no-store" });
  if (!response.ok) {
    throw Object.assign(new Error("Could not read Kept data."), { status: 502 });
  }
  const value = await response.json();
  return normalizeKeptHub(value ?? emptyKeptHub());
}

export async function saveKeptHub(uid: string, idToken: string, hub: KeptHub): Promise<void> {
  // Strip any client ownerId that might have snuck onto items.
  const sanitized = normalizeKeptHub({
    ...hub,
    items: hub.items.map((item) => {
      const { ...rest } = item as KeptHub["items"][number] & { ownerId?: string };
      delete (rest as { ownerId?: string }).ownerId;
      return rest;
    }),
  });

  const response = await fetch(keptUrl(uid, idToken), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sanitized),
    cache: "no-store",
  });
  if (!response.ok) {
    throw Object.assign(new Error("Could not save Kept data. Check Firebase rules."), { status: 502 });
  }
}

/** Server-authoritative clock for mutations (never trust client timestamps). */
export function serverTimestamp(): string {
  return new Date().toISOString();
}
