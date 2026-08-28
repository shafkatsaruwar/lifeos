// Thin client for the deployed LifeOS Next.js backend. All requests hit the
// live production deployment directly — there is no mobile-specific backend.
// Contracts here mirror exactly what app/page.tsx + lib/useNLTaskCreation.ts
// send on web (see app/api/ai/route.ts and app/api/ical/route.ts).
//
// Auth note: /api/ai and /api/ical do NOT check a Firebase ID token or userId
// on the web client either (see route source) — they are stateless AI/proxy
// endpoints gated only by the server's own ANTHROPIC_API_KEY. So the mobile
// client replicates the same anonymous POST body shape; no Authorization
// header is sent, matching web behavior exactly.

export const API_BASE = "https://lifeos-mu-three.vercel.app";

export type AiParsedTask = {
  title: string;
  space: string;
  due: string;
  priority: "High" | "Medium" | "Low";
  focusMinutes: number;
  energy: "Low" | "Medium" | "High";
  notes: string;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((data && data.error) || "The request failed. Try again in a moment.");
  }
  return data as T;
}

// Turn a free-form brain dump into a structured task. Mirrors the exact
// request shape used by lib/useNLTaskCreation.ts -> POST /api/ai.
export async function parseTaskFromText(input: string, spaces: string[]): Promise<AiParsedTask> {
  const data = await postJson<{ task: AiParsedTask }>("/api/ai", {
    action: "parse-task",
    input,
    spaces,
  });
  return data.task;
}

// Break one task into concrete next-actions. Mirrors action: "breakdown".
export async function breakdownTask(task: { title: string; notes?: string; focusMinutes?: number; energy?: string }): Promise<string[]> {
  const data = await postJson<{ steps: string[] }>("/api/ai", {
    action: "breakdown",
    task,
  });
  return data.steps;
}

// LifeOS Copilot question-answering. Mirrors action: "copilot".
export async function askCopilot(question: string, context: unknown): Promise<{ answer: string; suggestedTaskId: number | null; suggestedAction: string }> {
  return postJson("/api/ai", { action: "copilot", question, context });
}

// Focus Flow: goal → structured plan. Mirrors action: "parse-goal".
export async function parseGoalPlan(input: string, spaces: string[]) {
  const data = await postJson<{ plan: import("./focusFlow/shared").ParsedGoalPlan }>("/api/ai", {
    action: "parse-goal",
    input,
    spaces,
  });
  return data.plan;
}

// Focus Flow: daily coach. Mirrors action: "coach-day".
export async function coachDay(body: { today: string; context: unknown }) {
  const data = await postJson<{ coach: import("./focusFlow/shared").CoachDayPlan }>("/api/ai", {
    action: "coach-day",
    ...body,
  });
  return data.coach;
}

// Generic iCal URL import — fetch + parse a public calendar subscription link.
// Mirrors POST /api/ical { url } -> { ics }. The ICS text parsing itself is
// done client-side (parseIcsEvents below), matching web's app/page.tsx logic.
export async function fetchIcsFromUrl(url: string): Promise<string> {
  const data = await postJson<{ ics: string }>("/api/ical", { url });
  return data.ics;
}

// --- ICS parsing, ported verbatim from app/page.tsx so mobile produces
// identical CalendarEvent objects from the same feed. ---
import type { CalendarEvent } from "../types";

const unfoldIcs = (text: string) => text.replace(/\r?\n[ \t]/g, "");
const cleanIcsText = (value = "") => value.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").trim();
const getIcsValue = (block: string, field: string) => {
  const match = block.match(new RegExp(`^${field}(?:;[^:]*)?:(.*)$`, "m"));
  return match ? cleanIcsText(match[1]) : "";
};
const parseIcsDate = (value: string) => {
  if (!value) return "";
  const raw = value.trim();
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T09:00`;
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?/);
  if (!match) return "";
  const [, year, month, day, hour = "09", minute = "00"] = match;
  const suffix = raw.endsWith("Z") ? "Z" : "";
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:00${suffix}`);
  if (Number.isNaN(parsed.getTime())) return `${year}-${month}-${day}T${hour}:${minute}`;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

export function parseIcsEvents(ics: string): CalendarEvent[] {
  const text = unfoldIcs(ics);
  const blocks = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  return blocks
    .map((block, index) => {
      const start = parseIcsDate(getIcsValue(block, "DTSTART"));
      if (!start) return null;
      const uidValue = getIcsValue(block, "UID") || `${getIcsValue(block, "SUMMARY")}-${start}-${index}`;
      return {
        id: `ical-${uidValue}`,
        title: getIcsValue(block, "SUMMARY") || "Untitled calendar event",
        start,
        end: parseIcsDate(getIcsValue(block, "DTEND")) || undefined,
        source: "iCal" as const,
        color: "#47a47b",
        notes: getIcsValue(block, "LOCATION") || getIcsValue(block, "DESCRIPTION"),
      };
    })
    .filter(Boolean) as CalendarEvent[];
}

export function mergeCalendarEvents(existing: CalendarEvent[], incoming: CalendarEvent[]): CalendarEvent[] {
  const byId = new Map<string, CalendarEvent>();
  for (const event of existing) byId.set(event.id, event);
  for (const event of incoming) byId.set(event.id, event);
  return Array.from(byId.values());
}

export type FocusEnforcerVerifyRequest = {
  taskTitle: string;
  phase: "start" | "check" | "complete";
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  imageBase64: string;
};

export type FocusEnforcerVerifyResponse = {
  match: boolean;
  confidence: number;
  reason: string;
};

/**
 * Focus Enforcer live-photo verify. Soft-fails; never logs imageBase64.
 */
export async function verifyFocusEnforcerProof(
  input: FocusEnforcerVerifyRequest,
): Promise<FocusEnforcerVerifyResponse> {
  const softFail = (reason: string): FocusEnforcerVerifyResponse => ({
    match: false,
    confidence: 0,
    reason,
  });

  try {
    const response = await fetch(`${API_BASE}/api/ai`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "focus-enforcer-verify",
        taskTitle: input.taskTitle,
        phase: input.phase,
        mimeType: input.mimeType,
        imageBase64: input.imageBase64,
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | (FocusEnforcerVerifyResponse & { error?: string })
      | null;

    if (!response.ok || !data) {
      return softFail(
        (data && typeof data.error === "string" && data.error) ||
          "Could not verify the photo. Try again or use manual override.",
      );
    }

    return {
      match: Boolean(data.match),
      confidence:
        typeof data.confidence === "number" ? Math.max(0, Math.min(1, data.confidence)) : 0,
      reason:
        typeof data.reason === "string" && data.reason.trim()
          ? data.reason.trim().slice(0, 280)
          : data.match
            ? "Looks like you're on task."
            : "Could not confirm you're on the task.",
    };
  } catch {
    return softFail("Could not verify the photo. Try again or use manual override.");
  }
}
