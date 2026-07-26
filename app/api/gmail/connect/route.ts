import { NextRequest, NextResponse } from "next/server";
import { createSignedState, gmailClientId, gmailConfigured, verifyFirebaseToken } from "@/lib/gmailServer";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    if (!gmailConfigured()) return NextResponse.json({ error: "Gmail is not configured in Vercel yet." }, { status: 503 });
    const idToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!idToken) return NextResponse.json({ error: "Sign in to LifeOS before connecting Gmail." }, { status: 401 });
    const { uid } = await verifyFirebaseToken(idToken);
    const redirectUri = new URL("/api/gmail/callback", request.url).toString();
    const state = createSignedState({ uid, idToken, expiresAt: Date.now() + 10 * 60 * 1000 });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: gmailClientId(), redirect_uri: redirectUri, response_type: "code", access_type: "offline", prompt: "consent", include_granted_scopes: "true", scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly" }).toString();
    const response = NextResponse.json({ url: url.toString() });
    response.cookies.set("lifeos_gmail_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/gmail", maxAge: 600 });
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start Gmail connection." }, { status: 400 }); }
}
