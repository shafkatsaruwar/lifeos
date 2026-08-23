import type { FocusEscalationLevel } from "./types";

export function startNotificationCopy(
  taskTitle: string,
  preferredName?: string,
): { title: string; body: string } {
  const name = preferredName?.trim() || "Hey";
  return {
    title: "Focus Enforcer",
    body: `${name}. ${taskTitle}. Start now.`,
  };
}

export function escalationCopy(
  level: FocusEscalationLevel,
  taskTitle: string,
  preferredName?: string,
): { title: string; body: string } {
  const name = preferredName?.trim() || "Hey";
  if (level === "gentle") {
    return { title: "Still waiting", body: `${name}, you haven't started: ${taskTitle}` };
  }
  if (level === "firm") {
    return {
      title: "This is the delay moment",
      body: `Open the first step for "${taskTitle}". Don't negotiate.`,
    };
  }
  return {
    title: "Start the task",
    body: `Stop negotiating with yourself. Start: ${taskTitle}`,
  };
}

export function checkNotificationCopy(
  kind: "ack" | "photo",
  taskTitle: string,
): { title: string; body: string } {
  if (kind === "photo") {
    return { title: "Focus check", body: `Show me you're still on: ${taskTitle}` };
  }
  return { title: "Still working?", body: `Quick check — still on "${taskTitle}"?` };
}

export const ESCALATION_LEVELS: FocusEscalationLevel[] = ["gentle", "firm", "severe"];
