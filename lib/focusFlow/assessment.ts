import type { PlanStrengthAssessment, PlanStrengthLevel } from "./types";

type MomentumEntry = { at: string; type: "done" | "focus" | "capture"; title: string };
type TaskLike = { id: number; title: string; done?: boolean; canceled?: boolean; completedAt?: string; focusMinutes?: number; focusSessionStarted?: boolean };
type WeeklyPlan = { [dayOfWeek: number]: { id: string; text: string }[] };

function isSameDay(iso: string, dayKey: string) {
  return iso.slice(0, 10) === dayKey;
}

function levelFromScore(score: number): PlanStrengthLevel {
  if (score >= 70) return "Strong";
  if (score >= 45) return "Steady";
  return "Drifting";
}

function headlineFor(level: PlanStrengthLevel) {
  if (level === "Strong") return "Making good progress";
  if (level === "Steady") return "Solid day — room to tighten";
  return "Plan slipped — small fixes help";
}

/** Local plan-strength score from today's momentum + task completion. */
export function assessPlanStrength(input: {
  today: string;
  tasks: TaskLike[];
  momentumLog: MomentumEntry[];
  weeklyPlan: WeeklyPlan;
}): PlanStrengthAssessment {
  const todayLog = (input.momentumLog ?? []).filter(entry => isSameDay(entry.at, input.today));
  const focusStarts = todayLog.filter(entry => entry.type === "focus").length;
  const captures = todayLog.filter(entry => entry.type === "capture").length;
  const completedToday = input.tasks.filter(task =>
    !task.canceled && task.done && task.completedAt && isSameDay(task.completedAt, input.today),
  );
  const dayOfWeek = new Date(`${input.today}T12:00:00`).getDay();
  const plannedItems = input.weeklyPlan[dayOfWeek] ?? [];
  const plannedDone = plannedItems.filter(item =>
    completedToday.some(task => task.title.toLowerCase().includes(item.text.toLowerCase().slice(0, 12))),
  ).length;
  const alignmentPercent = plannedItems.length
    ? Math.round((plannedDone / plannedItems.length) * 100)
    : completedToday.length ? 72 : 40;

  let score = 20;
  score += Math.min(30, completedToday.length * 12);
  score += Math.min(24, focusStarts * 8);
  score += Math.min(16, alignmentPercent / 6);
  if (captures >= 2) score += 4;
  score = Math.min(100, Math.round(score));

  const level = levelFromScore(score);
  const looksGood: string[] = [];
  if (focusStarts > 0) looksGood.push("Protected at least one focus block");
  if (completedToday.length > 0) looksGood.push(`Finished ${completedToday.length} task${completedToday.length === 1 ? "" : "s"}`);
  if (alignmentPercent >= 60 && plannedItems.length) looksGood.push("Week plan stayed on track");

  const recommendations: PlanStrengthAssessment["recommendations"] = [];
  if (focusStarts === 0) {
    recommendations.push({
      id: "focus-next",
      text: "Start a 25-minute focus block on your current task",
      action: "focus_task",
    });
  }
  if (completedToday.length === 0 && input.tasks.some(task => !task.done && !task.canceled)) {
    const next = input.tasks.find(task => !task.done && !task.canceled);
    if (next) {
      recommendations.push({
        id: "choose-next",
        text: `Make “${next.title}” your current task and do one tiny step`,
        action: "choose_task",
        taskId: next.id,
      });
    }
  }
  if (plannedItems.length && alignmentPercent < 60) {
    recommendations.push({
      id: "weekly-gap",
      text: `Add a short block for “${plannedItems[0]?.text ?? "your top weekly item"}” tomorrow morning`,
      action: "weekly_plan",
      weeklyDay: (dayOfWeek + 1) % 7,
      weeklyText: plannedItems[0]?.text ?? "Top priority",
    });
  }

  const summaryParts: string[] = [];
  if (completedToday.length) summaryParts.push(`You finished ${completedToday.length} priority task${completedToday.length === 1 ? "" : "s"}`);
  if (focusStarts) summaryParts.push(`started ${focusStarts} focus session${focusStarts === 1 ? "" : "s"}`);
  if (!completedToday.length && !focusStarts) summaryParts.push("Deep work and completions were light today");
  if (level === "Drifting") summaryParts.push("Coach has a few specific fixes below");

  return {
    level,
    headline: headlineFor(level),
    summary: summaryParts.join(". ") + (summaryParts.length ? "." : "Capture one small win tomorrow."),
    alignmentPercent,
    recommendations: recommendations.slice(0, 3),
    looksGood,
  };
}
