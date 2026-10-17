import { NextRequest, NextResponse } from "next/server";
import { getMarketingEmailIdentity } from "@/lib/email/marketingCompliance";

/**
 * Records a marketing-email unsubscribe.
 * Persistence: writes to Firebase when configured; otherwise acknowledges (dev / no-DB).
 * Always returns success for a well-formed email so CAN-SPAM one-click flows work.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; token?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const identity = getMarketingEmailIdentity();
  const at = new Date().toISOString();

  // Best-effort persist when admin DB is available; never block the user on storage failure.
  try {
    const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DB_URL?.trim();
    if (dbUrl) {
      const key = Buffer.from(email).toString("base64url");
      const path = `${dbUrl.replace(/\/$/, "")}/marketingUnsubscribes/${key}.json`;
      await fetch(path, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, at, token: body.token || null, source: "web" }),
      });
    }
  } catch {
    // acknowledge anyway
  }

  return NextResponse.json({
    ok: true,
    email,
    at,
    entity: identity.entityName,
    message: "Unsubscribed from LifeOS marketing emails.",
  });
}
