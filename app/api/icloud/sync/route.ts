import { NextRequest, NextResponse } from "next/server";
import { decryptICloudCredentials, getICloudConnection, readICloudEvents } from "@/lib/icloudServer";
import { verifyFirebaseToken } from "@/lib/gmailServer";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const idToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""); if (!idToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const { uid } = await verifyFirebaseToken(idToken); const connection = await getICloudConnection(uid, idToken);
    if (!connection?.encrypted) return NextResponse.json({ error: "Connect iCloud Calendar first." }, { status: 400 });
    const selected = (connection.calendars || []).filter(calendar => (connection.selectedCalendarUrls || []).includes(calendar.url));
    return NextResponse.json({ events: await readICloudEvents(decryptICloudCredentials(connection.encrypted), selected) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not sync iCloud Calendar." }, { status: 500 }); }
}
