/** Adult, professional tone — never childish, guilty, or patronizing. */
import type { GuidanceMode, SalahId } from "./types";
import { salahLabel } from "./salah";

export function modeLabel(mode: GuidanceMode): string {
  if (mode === "executive") return "Executive";
  if (mode === "transition") return "Transition";
  return "Guided";
}

export function modeBlurb(mode: GuidanceMode): string {
  if (mode === "executive") {
    return "Concise prompts. You confirm what’s done — nothing is assumed.";
  }
  if (mode === "transition") {
    return "Help switching activities. Short follow-ups if you need more time.";
  }
  return "Structured steps with prerequisites. Progress only moves on your confirmation.";
}

export const COPY = {
  pendingRoutine: (name: string) => `${name} is pending. Ready to begin?`,
  plannedStart: (name: string) => `You planned to start ${name} now.`,
  stillOpen: (name: string) => `${name} is still open. Have you finished?`,
  previousOpen: (name: string) => `${name} is still open. Resume?`,
  postponedSwitch: (name: string, minutes: number) =>
    `You planned to begin ${name} ${minutes} minutes ago. Ready to switch over now?`,
  troubleSwitching: "Having trouble switching activities?",
  eveningRetainers: "Retainers are due before bed.",
  salahReady: (id: SalahId) => `${salahLabel(id)} window is active. Ready to prepare?`,
  salahFollowUp: (id: SalahId) => `You planned to begin preparing for ${salahLabel(id)} now.`,
  wuduCheck: "Do you have wudu?",
  prioritiesLeft: (n: number) =>
    n === 1 ? "You have 1 priority remaining today." : `You have ${n} priorities remaining today.`,
  patternLateEvening:
    "You tend to postpone your evening routine when it’s scheduled late. Move it earlier?",
  declineAck: "Understood. No further prompts for this run.",
  paused: "Paused. Your place is saved.",
  waiting: "Still here when you are — resume whenever you’re ready.",
  neverAssumed: "Nothing is marked complete until you confirm.",
} as const;

export function snoozeOptions(defaultMinutes: number): number[] {
  const base = [defaultMinutes, 5, 10, 15].filter((v, i, a) => a.indexOf(v) === i && v > 0);
  return base.sort((a, b) => a - b);
}
