import { NextRequest, NextResponse } from "next/server";
import { decryptICloudCredentials, discoverICloudCalendars, encryptICloudCredentials, getICloudConnection, iCloudConfigured, saveICloudConnection } from "@/lib/icloudServer";
import { verifyFirebaseToken } from "@/lib/gmailServer";
export const runtime = "nodejs";
const authToken = (request: NextRequest) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";

export async function GET(request: NextRequest) {
  try {
    const idToken = authToken(request); if (!idToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const { uid } = await verifyFirebaseToken(idToken); const connection = await getICloudConnection(uid, idToken);
    return NextResponse.json({ configured: iCloudConfigured(), connected: Boolean(connection?.encrypted), calendars: connection?.calendars || [], selectedCalendarUrls: connection?.selectedCalendarUrls || [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load iCloud Calendar." }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  try {
    if (!iCloudConfigured()) return NextResponse.json({ error: "iCloud sync needs ICLOUD_CONNECTION_SECRET in Vercel first." }, { status: 503 });
    const idToken = authToken(request); if (!idToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const body = await request.json();
    const { uid } = await verifyFirebaseToken(idToken);
    if (body.action === "refresh") {
      const connection = await getICloudConnection(uid, idToken);
      if (!connection?.encrypted) return NextResponse.json({ error: "Connect iCloud Calendar first." }, { status: 400 });
      const calendars = await discoverICloudCalendars(decryptICloudCredentials(connection.encrypted));
      const availableUrls = calendars.map(calendar => calendar.url);
      const selectedCalendarUrls = Array.isArray(connection.selectedCalendarUrls)
        ? connection.selectedCalendarUrls.filter(url => availableUrls.includes(url))
        : availableUrls;
      await saveICloudConnection(uid, idToken, { ...connection, calendars, selectedCalendarUrls });
      return NextResponse.json({ connected: true, calendars, selectedCalendarUrls });
    }
    const appleId = typeof body.appleId === "string" ? body.appleId.trim() : ""; const appPassword = typeof body.appPassword === "string" ? body.appPassword.replace(/\s/g, "") : "";
    if (!appleId || !appPassword) return NextResponse.json({ error: "Enter your Apple ID and an app-specific password." }, { status: 400 });
    const credentials = { appleId, appPassword }; const calendars = await discoverICloudCalendars(credentials);
    await saveICloudConnection(uid, idToken, { encrypted: encryptICloudCredentials(credentials), connectedAt: new Date().toISOString(), calendars, selectedCalendarUrls: calendars.map(calendar => calendar.url) });
    return NextResponse.json({ connected: true, calendars, selectedCalendarUrls: calendars.map(calendar => calendar.url) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not connect iCloud Calendar." }, { status: 400 }); }
}
export async function PUT(request: NextRequest) {
  try {
    const idToken = authToken(request); if (!idToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const body = await request.json(); if (!Array.isArray(body.selectedCalendarUrls)) return NextResponse.json({ error: "Choose at least one calendar." }, { status: 400 });
    const { uid } = await verifyFirebaseToken(idToken); const connection = await getICloudConnection(uid, idToken);
    if (!connection) return NextResponse.json({ error: "Connect iCloud Calendar first." }, { status: 400 });
    await saveICloudConnection(uid, idToken, { ...connection, selectedCalendarUrls: body.selectedCalendarUrls.filter((url: unknown): url is string => typeof url === "string") });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save calendar choices." }, { status: 500 }); }
}
export async function DELETE(request: NextRequest) {
  try { const idToken = authToken(request); if (!idToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 }); const { uid } = await verifyFirebaseToken(idToken); await saveICloudConnection(uid, idToken, null); return NextResponse.json({ connected: false }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not disconnect iCloud Calendar." }, { status: 500 }); }
}
