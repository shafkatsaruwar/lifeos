import * as FileSystem from "expo-file-system/legacy";
import type { DayMemory } from "../types";
import { toDateKey, uid } from "./helpers";

const MEMORIES_DIR = `${FileSystem.documentDirectory ?? ""}day-memories/`;

export function memoryTitleFromTranscript(transcript: string): string {
  const line = transcript.trim().split(/\n/)[0] ?? "";
  if (!line) return "Memory";
  return line.length > 56 ? `${line.slice(0, 53)}…` : line;
}

export function upsertDayMemory(list: DayMemory[] | undefined, memory: DayMemory): DayMemory[] {
  const prev = list ?? [];
  const idx = prev.findIndex((m) => m.id === memory.id);
  if (idx < 0) return [memory, ...prev];
  const next = [...prev];
  next[idx] = memory;
  return next;
}

export function removeDayMemory(list: DayMemory[] | undefined, id: string): DayMemory[] {
  return (list ?? []).filter((m) => m.id !== id);
}

export function createDayMemory(input: {
  transcript: string;
  dayKey?: string;
  localAudioUri?: string;
  durationMs?: number;
  at?: string;
}): DayMemory {
  const transcript = input.transcript.trim();
  const at = input.at ?? new Date().toISOString();
  return {
    id: uid(),
    dayKey: input.dayKey ?? toDateKey(new Date(at)),
    at,
    transcript,
    title: memoryTitleFromTranscript(transcript),
    localAudioUri: input.localAudioUri,
    durationMs: input.durationMs,
  };
}

/** Copy a recording into durable local storage. Returns null if copy fails. */
export async function persistMemoryAudio(tempUri: string, memoryId: string): Promise<string | null> {
  if (!FileSystem.documentDirectory) return null;
  try {
    await FileSystem.makeDirectoryAsync(MEMORIES_DIR, { intermediates: true }).catch(() => undefined);
    const dest = `${MEMORIES_DIR}${memoryId}.m4a`;
    await FileSystem.copyAsync({ from: tempUri, to: dest });
    return dest;
  } catch {
    return null;
  }
}

export async function deleteMemoryAudio(uri?: string) {
  if (!uri) return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* ignore */
  }
}

type AvModule = typeof import("expo-av");

let avCached: AvModule | null | undefined;

/** expo-av is only usable after a binary that includes it. */
export function getExpoAv(): AvModule | null {
  if (avCached !== undefined) return avCached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    avCached = require("expo-av") as AvModule;
    return avCached;
  } catch {
    avCached = null;
    return null;
  }
}

export function isAudioRecordingAvailable() {
  return getExpoAv() != null;
}
