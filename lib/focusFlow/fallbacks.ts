import type { CoachDayPlan, CoachRecommendation, FlowTaskBadge, ParsedGoalPlan } from "./types";

const BADGES: FlowTaskBadge[] = ["First milestone", "Next task", "This week", "For later"];

function badgeForIndex(index: number): FlowTaskBadge {
  return BADGES[Math.min(index, BADGES.length - 1)];
}

/** Heuristic goal → plan when AI is unavailable. */
export function fallbackParseGoal(input: string, spaces: string[]): ParsedGoalPlan {
  const trimmed = input.trim();
  const sentences = trimmed.split(/[.!?]\s+/).filter(Boolean);
  const goal = sentences[0]?.slice(0, 120) || trimmed.slice(0, 120) || "New goal";
  const summary = sentences[1]?.slice(0, 220) || "Break this into steps you can start today.";
  const projectGuess = spaces.find(space => trimmed.toLowerCase().includes(space.toLowerCase())) ?? "Inbox";
  const chunks = trimmed
    .split(/\band\b|,|;|\n/gi)
    .map(part => part.trim())
    .filter(part => part.length > 8)
    .slice(0, 5);
  const tasks = (chunks.length ? chunks : [goal]).map((title, index) => ({
    title: title.slice(0, 120),
    badge: badgeForIndex(index),
    focusMinutes: index === 0 ? 45 : index === 1 ? 30 : 25,
    priority: index <= 1 ? "High" as const : "Medium" as const,
    energy: index <= 1 ? "High" as const : "Medium" as const,
  }));

  return { goal, summary, projectName: projectGuess, tasks };
}

type TaskLike = { id: number; title: string; due?: string; priority?: string; focusMinutes?: number };
type EventLike = { title: string; start: string };

export function fallbackCoachDay(input: {
  today: string;
  tasks: TaskLike[];
  events: EventLike[];
  currentTaskId?: number | null;
}): CoachDayPlan {
  const open = input.tasks.filter(task => task.title);
  const current = open.find(task => task.id === input.currentTaskId) ?? open[0];
  const overdue = open.filter(task => task.due && task.due < input.today).slice(0, 2);
  const recommendations: CoachRecommendation[] = [];

  if (current) {
    recommendations.push({
      id: "focus-current",
      text: `Start a focus block on “${current.title}”`,
      action: "focus_task",
      taskId: current.id,
    });
  }
  if (overdue[0]) {
    recommendations.push({
      id: "rename-overdue",
      text: `Rename “${overdue[0].title}” to a single next action you can finish today`,
      action: "rename_task",
      taskId: overdue[0].id,
      newTitle: `${overdue[0].title} — next step`,
    });
  }
  if (input.events.length < 2) {
    const start = `${input.today}T17:30`;
    recommendations.push({
      id: "add-wind-down",
      text: "Add a 20-min wind-down block after dinner",
      action: "add_event",
      eventTitle: "Wind-down review",
      eventStart: start,
      eventEnd: `${input.today}T17:50`,
    });
  }

  return {
    headline: input.events.length ? "Strong morning — tune the afternoon" : "Open calendar — protect your best hours",
    summary: current
      ? `Keep momentum on ${current.title}. One or two calendar tweaks can protect the rest of your day.`
      : "Pick one task as current, then add a time block so it actually happens.",
    recommendations: recommendations.slice(0, 3),
    looksGood: input.events.length ? ["Morning calendar has protected blocks"] : [],
    needsWork: overdue.length ? [`${overdue.length} overdue task${overdue.length === 1 ? "" : "s"} need a smaller next step`] : [],
  };
}
