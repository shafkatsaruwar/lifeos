import { NextRequest, NextResponse } from "next/server";
import { encryptTokens, getConnection, gmailClientId, readSignedState, saveConnection } from "@/lib/gmailServer";

export const runtime = "nodejs";
type State = { uid: string; idToken: string; expiresAt: number };

export async function GET(request: NextRequest) {
  const finish = (status: "connected" | "error", message?: string) => NextResponse.redirect(new URL(`/?gmail=${status}${message ? `&gmailMessage=${encodeURIComponent(message)}` : ""}`, request.url));
  try {
    const error = request.nextUrl.searchParams.get("error");
    if (error) return finish("error", error === "access_denied" ? "Gmail access was not granted." : "Google could not connect Gmail.");
    const state = readSignedState<State>(request.cookies.get("lifeos_gmail_state")?.value || "");
    const code = request.nextUrl.searchParams.get("code");
    if (!state || !code || state.expiresAt < Date.now()) return finish("error", "That Gmail connection link expired. Try again.");
    const redirectUri = new URL("/api/gmail/callback", request.url).toString();
    const exchange = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: gmailClientId(), client_secret: process.env.GOOGLE_GMAIL_CLIENT_SECRET || "", redirect_uri: redirectUri, grant_type: "authorization_code" }) });
    const tokens = await exchange.json().catch(() => null);
    if (!exchange.ok || !tokens?.access_token) throw new Error(tokens?.error_description || "Google did not return Gmail access.");
    const existing = await getConnection(state.uid, state.idToken);
    await saveConnection(state.uid, state.idToken, { ...existing, encrypted: encryptTokens({ access_token: tokens.access_token, refresh_token: tokens.refresh_token, expiry_date: Date.now() + Number(tokens.expires_in || 3600) * 1000 }), connectedAt: new Date().toISOString() });
    const response = finish("connected");
    response.cookies.delete("lifeos_gmail_state");
    return response;
  } catch (error) { return finish("error", error instanceof Error ? error.message : "Could not finish Gmail connection."); }
}
