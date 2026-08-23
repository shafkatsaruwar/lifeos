import { NextRequest, NextResponse } from "next/server";

type Priority = "High" | "Medium" | "Low";
type Energy = "Low" | "Medium" | "High";

const MAX_INPUT_LENGTH = 4_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const asPriority = (value: unknown): Priority => value === "High" || value === "Low" ? value : "Medium";
const asEnergy = (value: unknown): Energy => value === "High" || value === "Low" ? value : "Medium";
const asDate = (value: unknown) => {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
};
const asTime = (value: unknown) => typeof value === "string" && TIME.test(value) ? value : undefined;
const shiftDate = (dateKey: string, days: number) => {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const dateFromText = (input: string, today: string) => {
  const lower = input.toLowerCase();
  const explicit = input.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (asDate(explicit)) return explicit!;
  if (lower.includes("day after tomorrow")) return shiftDate(today, 2);
  if (lower.includes("tomorrow")) return shiftDate(today, 1);
  if (lower.includes("today")) return today;

  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const weekday = lower.match(/\b(?:next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)?.[1];
  if (weekday) {
    const current = new Date(`${today}T12:00:00Z`).getUTCDay();
    let distance = (weekdays.indexOf(weekday) - current + 7) % 7;
    if (distance === 0) distance = 7;
    return shiftDate(today, distance);
  }

  const namedDate = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/);
  if (namedDate) {
    const month = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(namedDate[1]);
    let year = Number(namedDate[3]) || Number(today.slice(0, 4));
    let candidate = `${year}-${String(month + 1).padStart(2, "0")}-${String(Number(namedDate[2])).padStart(2, "0")}`;
    if (!namedDate[3] && candidate < today) {
      year += 1;
      candidate = `${year}-${candidate.slice(5)}`;
    }
    if (asDate(candidate)) return candidate;
  }

  return today;
};
const timeFromText = (input: string) => {
  const lower = input.toLowerCase();
  if (/\bnoon\b/.test(lower)) return "12:00";
  if (/\bmidnight\b/.test(lower)) return "00:00";
  const twelveHour = lower.match(/\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/);
  if (twelveHour) {
    let hours = Number(twelveHour[1]);
    if (hours < 1 || hours > 12) return undefined;
    if (twelveHour[3] === "pm" && hours !== 12) hours += 12;
    if (twelveHour[3] === "am" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${twelveHour[2] || "00"}`;
  }
  return lower.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/)?.[0];
};

function readJson(text: string) {
  const candidate = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(candidate);
}

async function askClaude(system: string, prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI is not configured yet. Add ANTHROPIC_API_KEY in Vercel, then redeploy.");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      // Keep this configurable: Haiku is the quick, low-cost option for these tiny actions.
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 450,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || "The AI request failed. Try again in a moment.");
  }
  const message = await response.json();
  const text = message.content?.find((part: { type?: string }) => part.type === "text")?.text;
  if (!text || typeof text !== "string") throw new Error("AI returned an empty response. Please try again.");
  return readJson(text);
}

const FOCUS_PROOF_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FOCUS_PROOF_BASE64 = 1_500_000;

type FocusVerifySoft = { match: boolean; confidence: number; reason: string };

function softFocusFail(reason: string): FocusVerifySoft {
  return { match: false, confidence: 0, reason };
}

/** Vision verify for Focus Enforcer. Never logs or echoes imageBase64. Does not store images. */
async function verifyFocusEnforcerProof(body: {
  taskTitle?: unknown;
  phase?: unknown;
  mimeType?: unknown;
  imageBase64?: unknown;
}): Promise<FocusVerifySoft> {
  try {
    const taskTitle =
      typeof body.taskTitle === "string" && body.taskTitle.trim()
        ? body.taskTitle.trim().slice(0, 180)
        : "";
    const phase =
      body.phase === "start" || body.phase === "check" || body.phase === "complete"
        ? body.phase
        : "check";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";

    if (!taskTitle) return softFocusFail("Missing task title.");
    if (!FOCUS_PROOF_MIME.has(mimeType)) {
      return softFocusFail("Unsupported image type. Use JPEG, PNG, or WebP.");
    }
    if (!imageBase64 || imageBase64.length > MAX_FOCUS_PROOF_BASE64) {
      return softFocusFail("Photo is too large or empty. Try again or use manual override.");
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return softFocusFail("AI is not configured yet. Try again later or use manual override.");
    }

    const promptText = `You verify a LIVE camera photo for Focus Enforcer (phase: ${phase}). Task: "${taskTitle}". Decide if the photo shows plausible evidence the person is working on that task (desk/laptop/materials/context). Reply with ONLY valid JSON: {"match":boolean,"confidence":number,"reason":"short string"}. confidence is 0 to 1. Be skeptical of blank walls, ceilings, unrelated scenes, or selfies with no work evidence.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 200,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
              { type: "text", text: promptText },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      return softFocusFail("Could not verify the photo. Try again or use manual override.");
    }

    const message = await response.json();
    const text = message.content?.find((part: { type?: string }) => part.type === "text")?.text;
    if (!text || typeof text !== "string") {
      return softFocusFail("Could not verify the photo. Try again or use manual override.");
    }

    const parsed = readJson(text) as { match?: unknown; confidence?: unknown; reason?: unknown };
    return {
      match: Boolean(parsed.match),
      confidence:
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0,
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? parsed.reason.trim().slice(0, 280)
          : parsed.match
            ? "Looks like you're on task."
            : "Could not confirm you're on the task.",
    };
  } catch {
    return softFocusFail("Could not verify the photo. Try again or use manual override.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "focus-enforcer-verify") {
      // Soft-fail path — never throw with image data in the message.
      const result = await verifyFocusEnforcerProof(body);
      return NextResponse.json(result);
    }

    if (action === "parse-task") {
      const input = typeof body.input === "string" ? body.input.trim().slice(0, MAX_INPUT_LENGTH) : "";
      const spaces = Array.isArray(body.spaces) ? body.spaces.filter((item: unknown) => typeof item === "string").slice(0, 50) : [];
      const today = asDate(body.today) || new Date().toISOString().slice(0, 10);
      const timeZone = typeof body.timeZone === "string" ? body.timeZone.slice(0, 100) : "UTC";
      if (!input) return NextResponse.json({ error: "Describe the task first." }, { status: 400 });

      const parsed = await askClaude(
        `You turn a short brain dump into one LifeOS task. Today is ${today} in ${timeZone}. Reply with ONLY valid JSON using exactly this shape: {"title":"string","space":"string","due":"YYYY-MM-DD","startTime":"HH:MM or null","priority":"High|Medium|Low","focusMinutes":number,"energy":"Low|Medium|High","notes":"string"}. Resolve relative dates from today. Use a listed space only when it is an obvious match; otherwise use "Inbox". Title must be concise. focusMinutes must be 5 to 240. Available spaces: ${spaces.join(", ") || "Inbox"}.`,
        input,
      );
      const requestedSpace = typeof parsed.space === "string" ? parsed.space.trim().slice(0, 100) : "";

      return NextResponse.json({
        task: {
          title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 180) : input.slice(0, 180),
          space: spaces.includes(requestedSpace) ? requestedSpace : "Inbox",
          due: asDate(parsed.due) || dateFromText(input, today),
          startTime: asTime(parsed.startTime) || timeFromText(input),
          priority: asPriority(parsed.priority),
          focusMinutes: Math.max(5, Math.min(240, Number(parsed.focusMinutes) || 45)),
          energy: asEnergy(parsed.energy),
          notes: typeof parsed.notes === "string" ? parsed.notes.trim().slice(0, 1_500) : "",
        },
      });
    }

    if (action === "breakdown") {
      const task = body.task;
      if (!task || typeof task.title !== "string" || !task.title.trim()) return NextResponse.json({ error: "Choose a task first." }, { status: 400 });
      const steps = await askClaude(
        "Break one task into 3 to 7 concrete, tiny, editable next actions. Reply with ONLY valid JSON: {\"steps\":[\"step\"]}. Avoid vague steps and do not include markdown.",
        JSON.stringify({ title: task.title.slice(0, 180), notes: typeof task.notes === "string" ? task.notes.slice(0, 1_500) : "", focusMinutes: task.focusMinutes, energy: task.energy }),
      );
      const cleanSteps = Array.isArray(steps.steps)
        ? steps.steps.filter((step: unknown) => typeof step === "string" && step.trim()).map((step: string) => step.trim().slice(0, 180)).slice(0, 7)
        : [];
      if (!cleanSteps.length) throw new Error("AI did not return usable steps. Please try again.");
      return NextResponse.json({ steps: cleanSteps });
    }

    if (action === "copilot") {
      const question = typeof body.question === "string" ? body.question.trim().slice(0, 1_000) : "";
      const context = body.context && typeof body.context === "object" ? body.context : {};
      if (!question) return NextResponse.json({ error: "Ask LifeOS something first." }, { status: 400 });
      const response = await askClaude(
        'You are LifeOS Copilot: a warm, low-pressure friend inside an ADHD-friendly personal OS. Talk like a helpful human — short, clear, no corporate pep talk. Use the supplied context only. Do not pretend to have completed work or accessed outside information. Give one clear recommendation, at most 60 words. When context.studyAbroad is present, you may reference study-abroad shortlist, deadlines, open tasks, and whatMattersNow — still recommend LifeOS task IDs from context.tasks when suggesting focus/choose/complete. Reply with ONLY valid JSON: {"answer":"string","suggestedTaskId":number|null,"suggestedAction":"focus|choose|plan|complete|none"}. Only use a task ID that exists in the context. Use "complete" ONLY when the user clearly says they finished, completed, or are done with a specific task. If they say "this task" or "it" is done, use currentTaskId. "focus" means starting a focus session, "choose" means making it the current task, "plan" means opening Today.',
        JSON.stringify({ question, context }),
      );
      const validActions = ["focus", "choose", "plan", "complete", "none"] as const;
      const suggestedAction = validActions.includes(response.suggestedAction) ? response.suggestedAction : "none";
      const taskId = Number(response.suggestedTaskId);
      const taskIds = Array.isArray(context.tasks) ? context.tasks.map((task: { id?: unknown }) => Number(task?.id)) : [];
      return NextResponse.json({
        answer: typeof response.answer === "string" ? response.answer.trim().slice(0, 600) : "I’m not sure yet—pick one small task and I’ll help you start.",
        suggestedTaskId: Number.isFinite(taskId) && taskIds.includes(taskId) ? taskId : null,
        suggestedAction,
      });
    }

    return NextResponse.json({ error: "Unknown AI action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong with AI.";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
