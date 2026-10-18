"use client";

import {
  ACTIVITY_RING_META,
  type ActivityRingsGoals,
  type ActivityRingsSnapshot,
  computeActivityRings,
  normalizeActivityRingsGoals,
  type RingTaskLike,
} from "@/lib/activityRings";

type Props = {
  tasks: RingTaskLike[];
  goals?: Partial<ActivityRingsGoals> | null;
  weekStartsMonday?: boolean;
  reduceMotion?: boolean;
  onOpenGoals?: () => void;
};

const RING_R = 36;
const RING_C = 2 * Math.PI * RING_R;

function RingSvg({
  percent,
  stroke,
  label,
  reduceMotion,
}: {
  percent: number;
  stroke: string;
  label: string;
  reduceMotion?: boolean;
}) {
  const dash = `${(percent / 100) * RING_C} ${RING_C}`;
  return (
    <svg className="activity-ring-svg" viewBox="0 0 88 88" aria-hidden>
      <circle className="activity-ring-track" cx="44" cy="44" r={RING_R} fill="none" strokeWidth="8" />
      <circle
        className={`activity-ring-progress${reduceMotion ? " no-motion" : ""}`}
        cx="44"
        cy="44"
        r={RING_R}
        fill="none"
        stroke={stroke}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={dash}
        transform="rotate(-90 44 44)"
        style={{ transition: reduceMotion ? "none" : undefined }}
      />
      <title>{label}</title>
    </svg>
  );
}

export default function ActivityRingsWidget({
  tasks,
  goals,
  weekStartsMonday = true,
  reduceMotion = false,
  onOpenGoals,
}: Props) {
  const normalized = normalizeActivityRingsGoals(goals);
  const snapshot: ActivityRingsSnapshot = computeActivityRings({
    tasks,
    goals: normalized,
    weekStartsMonday,
  });
  const allEmpty = snapshot.rings.every((r) => r.empty);

  return (
    <section
      className="card activity-rings-panel"
      aria-label={`Activity rings — ${snapshot.periodLabel}`}
      data-testid="activity-rings"
    >
      <div className="activity-rings-head">
        <div>
          <p className="eyebrow">Progress</p>
          <h2>Activity rings</h2>
          <p className="activity-rings-sub">
            {snapshot.periodLabel} · real completions and focus sessions only
          </p>
        </div>
        {onOpenGoals ? (
          <button type="button" className="ghost activity-rings-goals-btn" onClick={onOpenGoals}>
            Goals
          </button>
        ) : null}
      </div>

      <div className="activity-rings-row" role="list">
        {snapshot.rings.map((ring) => {
          const meta = ACTIVITY_RING_META[ring.id];
          const valueLabel =
            ring.unit === "minutes"
              ? `${ring.current} of ${ring.target} min`
              : `${ring.current} of ${ring.target} tasks`;
          const aria = `${ring.label}: ${valueLabel}, ${ring.percent}% of goal. ${ring.explanation}`;
          return (
            <div
              key={ring.id}
              className={`activity-ring-item${ring.empty ? " is-empty" : ""}`}
              role="listitem"
              aria-label={aria}
            >
              <div className="activity-ring-wrap">
                <RingSvg
                  percent={ring.percent}
                  stroke={meta.stroke}
                  label={aria}
                  reduceMotion={reduceMotion}
                />
                <div className="activity-ring-center">
                  <strong>{ring.percent}%</strong>
                  <span>{ring.label}</span>
                </div>
              </div>
              <p className="activity-ring-value">{valueLabel}</p>
              <p className="activity-ring-explain">{ring.explanation}</p>
            </div>
          );
        })}
      </div>

      {allEmpty ? (
        <div className="activity-rings-empty" data-testid="activity-rings-empty">
          <strong>Quiet day so far.</strong>
          <p>
            Finish a task or run a focus session and these rings fill from your real data — no streaks,
            no punishment.
          </p>
        </div>
      ) : null}

      <p className="activity-rings-footnote">
        Calendar attendance is not scored — showing up is not assumed from a block ending.
      </p>
    </section>
  );
}
