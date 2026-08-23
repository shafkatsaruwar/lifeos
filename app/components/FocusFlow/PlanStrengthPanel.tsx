"use client";

import { useMemo } from "react";
import { assessPlanStrength } from "@/lib/focusFlow/assessment";
import type { CoachRecommendation } from "@/lib/focusFlow/types";

type Task = {
  id: number;
  title: string;
  done?: boolean;
  canceled?: boolean;
  completedAt?: string;
  focusSessionStarted?: boolean;
};

type WeeklyPlan = { [dayOfWeek: number]: { id: string; text: string }[] };

export function PlanStrengthPanel({
  today,
  tasks,
  momentumLog,
  weeklyPlan,
  onApply,
}: {
  today: string;
  tasks: Task[];
  momentumLog: { at: string; type: "done" | "focus" | "capture"; title: string }[];
  weeklyPlan: WeeklyPlan;
  onApply: (rec: CoachRecommendation) => void;
}) {
  const assessment = useMemo(
    () => assessPlanStrength({ today, tasks, momentumLog, weeklyPlan }),
    [momentumLog, tasks, today, weeklyPlan],
  );

  const tone = assessment.level === "Strong" ? "success" : assessment.level === "Steady" ? "steady" : "drifting";

  return (
    <div className="focus-flow-strength">
      <div className="focus-flow-card">
        <div className="focus-flow-strength-top">
          <div>
            <p className="eyebrow">Plan strength</p>
            <small>Assessed today</small>
          </div>
          <div className={`focus-flow-strength-badge tone-${tone}`}>{assessment.level}</div>
        </div>
        <strong className="focus-flow-strength-headline">{assessment.headline}</strong>
        <p className="focus-flow-muted">{assessment.summary}</p>

        <div className="focus-flow-alignment">
          <div className="focus-flow-alignment-label">
            <span>Week plan alignment</span>
            <span>{assessment.alignmentPercent}%</span>
          </div>
          <div className="focus-flow-alignment-bar">
            <i style={{ width: `${assessment.alignmentPercent}%` }} />
          </div>
        </div>

        {assessment.looksGood.length ? (
          <>
            <p className="eyebrow">What looks good already</p>
            {assessment.looksGood.map(item => <p key={item} className="focus-flow-muted">{item}</p>)}
          </>
        ) : null}

        <p className="eyebrow">Recommended for you</p>
        {assessment.recommendations.map(rec => (
          <div key={rec.id} className="focus-flow-rec-row">
            <span>{rec.text}</span>
            <button type="button" onClick={() => onApply(rec)}>Apply</button>
          </div>
        ))}
      </div>
    </div>
  );
}
