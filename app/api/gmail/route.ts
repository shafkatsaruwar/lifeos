import { NextRequest, NextResponse } from "next/server";
import { decryptTokens, encryptTokens, getConnection, refreshIfNeeded, saveConnection, verifyFirebaseToken } from "@/lib/gmailServer";

export const runtime = "nodejs";
const authToken = (request: NextRequest) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
const google = async (path: string, token: string) => {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || "Gmail could not load your inbox.");
  return body;
};

export async function GET(request: NextRequest) {
  try {
    const idToken = authToken(request); if (!idToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const { uid } = await verifyFirebaseToken(idToken);
    const connection = await getConnection(uid, idToken);
    if (!connection?.encrypted) return NextResponse.json({ connected: false, messages: [] });
    const tokens = await refreshIfNeeded(decryptTokens(connection.encrypted));
    if (tokens.access_token !== decryptTokens(connection.encrypted).access_token) await saveConnection(uid, idToken, { ...connection, encrypted: encryptTokens(tokens) });
    const list = await google(`messages?${new URLSearchParams({ labelIds: "INBOX", q: "category:primary -category:promotions -category:social", maxResults: "8" })}`, tokens.access_token);
    const messages = await Promise.all((list.messages || []).map(async (item: { id: string }) => {
      const message = await google(`messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, tokens.access_token);
      const headers = Object.fromEntries((message.payload?.headers || []).map((header: { name: string; value: string }) => [header.name.toLowerCase(), header.value]));
      return { id: item.id, subject: headers.subject || "No subject", from: headers.from || "Unknown sender", date: headers.date || "", snippet: message.snippet || "" };
    }));
    return NextResponse.json({ connected: true, messages, connectedAt: connection.connectedAt });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load Gmail." }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  try { const idToken = authToken(request); if (!idToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 }); const { uid } = await verifyFirebaseToken(idToken); await saveConnection(uid, idToken, null); return NextResponse.json({ connected: false }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not disconnect Gmail." }, { status: 500 }); }
}
