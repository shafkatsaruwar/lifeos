import { appendFileSync, mkdirSync } from "fs";
import { NextResponse } from "next/server";

const LOG_PATH = "/opt/cursor/logs/debug.log";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    mkdirSync("/opt/cursor/logs", { recursive: true });
    appendFileSync(
      LOG_PATH,
      JSON.stringify({ ...body, timestamp: body.timestamp ?? Date.now() }) + "\n",
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "write failed" },
      { status: 500 },
    );
  }
}
