import { NextRequest, NextResponse } from "next/server";
import { executeKeptCommand, searchKept } from "@/lib/kept/execute";
import { keptAiContext, mergeAiIntent, resolveKeptIntent, validateKeptCommand } from "@/lib/kept/intents";
import { normalizeKeptHub } from "@/lib/kept/normalize";
import { loadKeptHub, requireKeptAuth, saveKeptHub, serverTimestamp } from "@/lib/kept/server";
import type { KeptCommand, KeptHub } from "@/lib/kept/types";
import { emptyKeptHub } from "@/lib/kept/types";

const MAX_UTTERANCE = 500;

async function askKeptAi(system: string, prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 300,
      temperature: 0.1,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) return null;
  const message = await response.json();
  const text = message.content?.find((part: { type?: string }) => part.type === "text")?.text;
  if (!text || typeof text !== "string") return null;
  const candidate = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Kept request failed.";
  const status = typeof (error as { status?: number })?.status === "number"
    ? (error as { status: number }).status
    : message.includes("Sign in")
      ? 401
      : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const { uid, idToken } = await requireKeptAuth(request);
    const hub = await loadKeptHub(uid, idToken);
    const q = request.nextUrl.searchParams.get("q")?.trim() || "";
    const includePrivate = request.nextUrl.searchParams.get("private") !== "0";
    const items = q
      ? searchKept(hub, q, { includePrivate })
      : hub.items.filter((i) => !i.forgottenAt && !i.archived);
    return NextResponse.json({ hub, items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, idToken } = await requireKeptAuth(request);
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";
    const serverNow = serverTimestamp();
    let hub = await loadKeptHub(uid, idToken);

    if (action === "list") {
      return NextResponse.json({ hub });
    }

    if (action === "intent") {
      const utterance = typeof body.utterance === "string" ? body.utterance.trim().slice(0, MAX_UTTERANCE) : "";
      if (!utterance) return NextResponse.json({ error: "Say or type something first." }, { status: 400 });

      let intent = resolveKeptIntent(utterance, hub, { includePrivate: true });
      if (intent.confidence < 0.8 || intent.command.kind === "CLARIFY") {
        const ctx = keptAiContext(utterance, hub, true);
        const ai = await askKeptAi(
          'You are Kept, a memory tool for physical objects and locations only. Reply with ONLY JSON for one command: {"kind":"SAVE|FIND|UPDATE|LIST_BY_LOCATION|FORGET|CLARIFY", ...fields}. Never invent a location not in the utterance or candidates. Prefer candidate ids.',
          JSON.stringify(ctx),
        );
        if (ai) intent = mergeAiIntent(utterance, hub, ai, { includePrivate: true });
      }

      return NextResponse.json({ intent, serverNow });
    }

    if (action === "execute") {
      const command = validateKeptCommand(body.command);
      if (!command) return NextResponse.json({ error: "Invalid Kept command." }, { status: 400 });

      const result = executeKeptCommand(hub, command as KeptCommand, {
        serverNow,
        includePrivate: true,
      });

      if (result.ok && (command.kind === "SAVE" || command.kind === "UPDATE" || command.kind === "FORGET")) {
        await saveKeptHub(uid, idToken, result.hub);
        hub = result.hub;
      }

      return NextResponse.json({ ...result, hub, serverNow });
    }

    if (action === "upsert-hub") {
      // Client may sync a full hub after local edits; timestamps rewritten server-side.
      const incoming = normalizeKeptHub(body.hub ?? emptyKeptHub(), serverNow);
      const merged: KeptHub = {
        ...incoming,
        items: incoming.items.map((item) => {
          const prev = hub.items.find((i) => i.id === item.id);
          return {
            ...item,
            createdAt: prev?.createdAt || serverNow,
            updatedAt: serverNow,
          };
        }),
        updatedAt: serverNow,
      };
      await saveKeptHub(uid, idToken, merged);
      return NextResponse.json({ ok: true, hub: merged, serverNow });
    }

    return NextResponse.json({ error: "Unknown Kept action." }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}
