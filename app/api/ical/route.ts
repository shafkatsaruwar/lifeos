import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_CALENDAR_SIZE = 2_000_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  const parts = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  return Boolean(parts && Number(parts[1]) === 172 && Number(parts[2]) >= 16 && Number(parts[2]) <= 31);
}

function normalizeCalendarUrl(value: string) {
  const candidate = value.trim().replace(/^webcals?:\/\//i, "https://");
  const parsed = new URL(candidate);
  if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || isPrivateHost(parsed.hostname)) {
    throw new Error("Use a public webcal://, https://, or http:// calendar subscription link.");
  }
  return parsed.toString();
}

async function fetchCalendar(url: string) {
  let nextUrl = normalizeCalendarUrl(url);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(nextUrl, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: {
        accept: "text/calendar, text/plain;q=0.9, */*;q=0.1",
        "user-agent": "LifeOS Calendar Import/1.0",
      },
    });
    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("This calendar link redirected without a destination.");
      nextUrl = normalizeCalendarUrl(new URL(location, nextUrl).toString());
      continue;
    }
    if (!response.ok) throw new Error("The calendar provider did not allow LifeOS to read that subscription.");
    const declaredSize = Number(response.headers.get("content-length") || "0");
    if (declaredSize > MAX_CALENDAR_SIZE) throw new Error("That calendar is too large to import at once.");
    const ics = await response.text();
    if (ics.length > MAX_CALENDAR_SIZE) throw new Error("That calendar is too large to import at once.");
    if (!/BEGIN:(?:VCALENDAR|VEVENT)/i.test(ics)) throw new Error("That link did not return an iCalendar (.ics) feed.");
    return ics;
  }
  throw new Error("That calendar redirected too many times.");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body?.url !== "string" || !body.url.trim() || body.url.length > 4096) {
      return NextResponse.json({ error: "Paste a calendar subscription link first." }, { status: 400 });
    }
    const ics = await fetchCalendar(body.url);
    return NextResponse.json({ ics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LifeOS could not import that calendar link.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
