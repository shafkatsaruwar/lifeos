"use client";

import { useCallback } from "react";
import type { CoachRecommendation } from "@/lib/focusFlow/types";
import { TalkToPlanPanel } from "./TalkToPlanPanel";
import { FocusSessionPanel } from "./FocusSessionPanel";
import { DailyCoachPanel } from "./DailyCoachPanel";
import { PlanStrengthPanel } from "./PlanStrengthPanel";

export type FlowScreen = "talk" | "focus" | "coach" | "strength";

type Task = {
  id: number;
  title: string;
  project: string;
  color: string;
  due: string;
  priority: "High" | "Medium" | "Low";
  focusMinutes: number;
  energy: "Low" | "Medium" | "High";
  done?: boolean;
  canceled?: boolean;
  notes?: string;
  handoffNote?: string;
  checklist?: string[];
  checklistProgress?: boolean[];
  focusRemainingSeconds?: number;
  focusSessionStarted?: boolean;
  focusSessionRunning?: boolean;
  focusUpdatedAt?: string;
  completedAt?: string;
};

type CalendarEvent = { id: string; title: string; start: string; end?: string; source: "LifeOS" | "iCal" | "Google" | "Outlook" | "Work" | "Synapse"; color: string; notes?: string };
type WeeklyPlan = { [dayOfWeek: number]: { id: string; text: string }[] };

const SCREEN_LABELS: Record<FlowScreen, string> = {
  talk: "Talk → plan",
  focus: "Focus",
  coach: "Daily coach",
  strength: "Plan strength",
};

export function FocusFlowView({
  screen,
  onScreenChange,
  tasks,
  projects,
  events,
  weeklyPlan,
  momentumLog,
  nowTaskId,
  today,
  onFocus,
  onChoose,
  onComplete,
  onAddTask,
  onAddProject,
  onUpdateTask,
  onAddCalendarEvent,
  onSetWeeklyPlan,
  onOpenCalendar,
  flash,
}: {
  screen: FlowScreen;
  onScreenChange: (screen: FlowScreen) => void;
  tasks: Task[];
  projects: string[];
  events: CalendarEvent[];
  weeklyPlan: WeeklyPlan;
  momentumLog: { id: string; at: string; type: "done" | "focus" | "capture"; title: string }[];
  nowTaskId: number | null;
  today: string;
  onFocus: (id: number) => void;
  onChoose: (id: number | null) => void;
  onComplete: (id: number) => void;
  onAddTask: (title: string, options?: { energy?: Task["energy"]; priority?: Task["priority"]; focusMinutes?: number; flashLabel?: string }, projectName?: string) => number;
  onAddProject: (name: string) => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onAddCalendarEvent: (event: CalendarEvent) => void;
  onSetWeeklyPlan: (plan: WeeklyPlan) => void;
  onOpenCalendar: () => void;
  flash: (message: string) => void;
}) {
  const activeTasks = tasks.filter(task => !task.done && !task.canceled);
  const current = activeTasks.find(task => task.id === nowTaskId) ?? activeTasks[0];

  const applyRecommendation = useCallback((rec: CoachRecommendation) => {
    if (rec.action === "focus_task" && rec.taskId) {
      onChoose(rec.taskId);
      onFocus(rec.taskId);
      flash("Focus started");
      return;
    }
    if (rec.action === "choose_task" && rec.taskId) {
      onChoose(rec.taskId);
      flash("Set as current task");
      return;
    }
    if (rec.action === "rename_task" && rec.taskId && rec.newTitle) {
      onUpdateTask(rec.taskId, { title: rec.newTitle });
      flash("Task updated");
      return;
    }
    if (rec.action === "add_event" && rec.eventTitle && rec.eventStart) {
      onAddCalendarEvent({
        id: `lifeos-flow-${Date.now()}`,
        title: rec.eventTitle,
        start: rec.eventStart,
        end: rec.eventEnd,
        source: "LifeOS",
        color: "#665df6",
      });
      flash("Calendar block added");
      return;
    }
    if (rec.action === "weekly_plan" && typeof rec.weeklyDay === "number" && rec.weeklyText) {
      const day = rec.weeklyDay;
      onSetWeeklyPlan({
        ...weeklyPlan,
        [day]: [...(weeklyPlan[day] ?? []), { id: `flow-${Date.now()}`, text: rec.weeklyText }],
      });
      flash("Added to week plan");
    }
  }, [flash, onAddCalendarEvent, onChoose, onFocus, onSetWeeklyPlan, onUpdateTask, weeklyPlan]);

  return (
    <div className="focus-flow-page">
      <div className="page-title">
        <div>
          <p className="eyebrow">Focus flow</p>
          <h1>Talk · Focus · Coach · Strength</h1>
          <p>Capture a goal, run a session, tune your day, and see an honest read on progress.</p>
        </div>
      </div>

      <div className="focus-flow-tabs" role="tablist" aria-label="Focus flow steps">
        {(Object.keys(SCREEN_LABELS) as FlowScreen[]).map(key => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={screen === key}
            className={screen === key ? "selected" : ""}
            onClick={() => onScreenChange(key)}
          >
            {SCREEN_LABELS[key]}
          </button>
        ))}
      </div>

      {screen === "talk" ? (
        <TalkToPlanPanel
          projects={projects}
          onCommit={(plan) => {
            if (plan.projectName && plan.projectName !== "Inbox" && !projects.includes(plan.projectName)) {
              onAddProject(plan.projectName);
            }
            const ids = plan.tasks.map(task =>
              onAddTask(task.title, {
                energy: task.energy,
                priority: task.priority,
                focusMinutes: task.focusMinutes,
              }, plan.projectName),
            ).filter(Boolean);
            const nextTask = ids[0];
            if (nextTask) {
              onChoose(nextTask);
              onScreenChange("focus");
              flash(`Plan created · ${plan.tasks.length} tasks`);
            }
          }}
        />
      ) : null}

      {screen === "focus" ? (
        <FocusSessionPanel
          task={current}
          onFocus={() => current && onFocus(current.id)}
          onUpdateNotes={(notes) => current && onUpdateTask(current.id, { notes })}
          onToggleChecklist={(index) => {
            if (!current?.checklist?.length) return;
            const progress = current.checklistProgress?.length === current.checklist.length
              ? [...current.checklistProgress]
              : current.checklist.map(() => false);
            progress[index] = !progress[index];
            onUpdateTask(current.id, { checklistProgress: progress });
          }}
        />
      ) : null}

      {screen === "coach" ? (
        <DailyCoachPanel
          today={today}
          tasks={activeTasks}
          events={events}
          currentTaskId={current?.id ?? null}
          onApply={applyRecommendation}
          onOpenCalendar={onOpenCalendar}
        />
      ) : null}

      {screen === "strength" ? (
        <PlanStrengthPanel
          today={today}
          tasks={tasks}
          momentumLog={momentumLog}
          weeklyPlan={weeklyPlan}
          onApply={applyRecommendation}
        />
      ) : null}
    </div>
  );
}
