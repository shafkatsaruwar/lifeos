export type FlowTaskBadge = "First milestone" | "Next task" | "This week" | "For later";

export type ParsedGoalPlan = {
  goal: string;
  summary: string;
  projectName: string;
  tasks: {
    title: string;
    badge: FlowTaskBadge;
    focusMinutes: number;
    priority: "High" | "Medium" | "Low";
    energy: "Low" | "Medium" | "High";
  }[];
};

export type CoachRecommendation = {
  id: string;
  text: string;
  action: "rename_task" | "add_event" | "weekly_plan" | "choose_task" | "focus_task";
  taskId?: number;
  newTitle?: string;
  eventTitle?: string;
  eventStart?: string;
  eventEnd?: string;
  weeklyDay?: number;
  weeklyText?: string;
};

export type CoachDayPlan = {
  headline: string;
  summary: string;
  recommendations: CoachRecommendation[];
  looksGood: string[];
  needsWork: string[];
};

export type PlanStrengthLevel = "Strong" | "Steady" | "Drifting";

export type PlanStrengthAssessment = {
  level: PlanStrengthLevel;
  headline: string;
  summary: string;
  alignmentPercent: number;
  recommendations: CoachRecommendation[];
  looksGood: string[];
};
