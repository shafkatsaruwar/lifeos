import { NextRequest, NextResponse } from "next/server";
import { decryptTokens, encryptTokens, getConnection, GoogleCalendarChoice, refreshIfNeeded, saveConnection, verifyFirebaseToken } from "@/lib/gmailServer";

export const runtime = "nodejs";
const authToken = (request: NextRequest) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";

async function tokenFor(idToken: string) {
  const { uid } = await verifyFirebaseToken(idToken);
  const connection = await getConnection(uid, idToken);
  if (!connection?.encrypted) throw new Error("Connect your Google account first.");
  const before = decryptTokens(connection.encrypted);
  const tokens = await refreshIfNeeded(before);
  if (tokens.access_token !== before.access_token) await saveConnection(uid, idToken, { ...connection, encrypted: encryptTokens(tokens) });
  return { uid, connection, accessToken: tokens.access_token };
}

const calendarApi = async (path: string, accessToken: string) => {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/${path}`, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.message || "Google Calendar could not be reached.";
    if (response.status === 401 || response.status === 403) throw new Error("Google Calendar permission is missing. Reconnect your Google account and approve Calendar access.");
    throw new Error(message);
  }
  return body;
};

export async function GET(request: NextRequest) {
  try {
    const idToken = authToken(request); if (!idToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const { connection, accessToken } = await tokenFor(idToken);
    let calendars = connection.googleCalendars || [];
    try {
      const list = await calendarApi("users/me/calendarList?minAccessRole=reader", accessToken);
      calendars = (list.items || []).map((item: any): GoogleCalendarChoice => ({ id: String(item.id), name: String(item.summaryOverride || item.summary || "Google calendar"), color: typeof item.backgroundColor === "string" ? item.backgroundColor : undefined, primary: Boolean(item.primary) }));
      const selectedGoogleCalendarIds = (connection.selectedGoogleCalendarIds?.length ? connection.selectedGoogleCalendarIds : calendars.map(calendar => calendar.id)).filter(id => calendars.some(calendar => calendar.id === id));
      await saveConnection((await verifyFirebaseToken(idToken)).uid, idToken, { ...connection, googleCalendars: calendars, selectedGoogleCalendarIds });
      return NextResponse.json({ connected: true, calendars, selectedGoogleCalendarIds, needsReconnect: false });
    } catch (error) {
      return NextResponse.json({ connected: true, calendars, selectedGoogleCalendarIds: connection.selectedGoogleCalendarIds || [], needsReconnect: true, error: error instanceof Error ? error.message : "Google Calendar needs permission." });
    }
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load Google Calendar." }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  try {
    const idToken = authToken(request); if (!idToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const body = await request.json(); if (!Array.isArray(body.selectedGoogleCalendarIds)) return NextResponse.json({ error: "Choose at least one calendar." }, { status: 400 });
    const { uid, connection } = await tokenFor(idToken);
    await saveConnection(uid, idToken, { ...connection, selectedGoogleCalendarIds: body.selectedGoogleCalendarIds.filter((id: unknown): id is string => typeof id === "string") });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save Google Calendar choices." }, { status: 500 }); }
}
