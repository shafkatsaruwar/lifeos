import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { decryptTokens, encryptTokens, getConnection, refreshIfNeeded, saveConnection, verifyFirebaseToken } from "@/lib/gmailServer";

export const runtime = "nodejs";
const authToken = (request: NextRequest) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
const google = async (path: string, token: string) => {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/${path}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Google Calendar permission is missing. Reconnect your Google account and approve Calendar access." : body?.error?.message || "Google Calendar could not sync.");
  return body;
};
export async function POST(request: NextRequest) {
  try {
    const idToken = authToken(request); if (!idToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const { uid } = await verifyFirebaseToken(idToken); const connection = await getConnection(uid, idToken);
    if (!connection?.encrypted) return NextResponse.json({ error: "Connect your Google account first." }, { status: 400 });
    const original = decryptTokens(connection.encrypted); const tokens = await refreshIfNeeded(original);
    if (tokens.access_token !== original.access_token) await saveConnection(uid, idToken, { ...connection, encrypted: encryptTokens(tokens) });
    const selected = connection.selectedGoogleCalendarIds?.length ? connection.selectedGoogleCalendarIds : connection.googleCalendars?.map(calendar => calendar.id) || [];
    const from = new Date(); from.setMonth(from.getMonth() - 2); const until = new Date(); until.setMonth(until.getMonth() + 12);
    const events = (await Promise.all(selected.map(async calendarId => {
      const data = await google(`calendars/${encodeURIComponent(calendarId)}/events?${new URLSearchParams({ timeMin: from.toISOString(), timeMax: until.toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "250" })}`, tokens.access_token);
      const color = connection.googleCalendars?.find(calendar => calendar.id === calendarId)?.color || "#4285f4";
      return (data.items || []).filter((item: any) => item.status !== "cancelled" && (item.start?.dateTime || item.start?.date)).map((item: any) => ({ id: "google-" + createHash("sha1").update(calendarId + ":" + item.id).digest("hex"), title: item.summary || "Untitled event", start: item.start.dateTime || `${item.start.date}T00:00:00`, end: item.end?.dateTime || (item.end?.date ? `${item.end.date}T00:00:00` : undefined), source: "Google" as const, color, notes: item.description || undefined }));
    }))).flat();
    return NextResponse.json({ events });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not sync Google Calendar." }, { status: 500 }); }
}
