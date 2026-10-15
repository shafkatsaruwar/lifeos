"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  CirclePause,
  CirclePlay,
  Footprints,
  ListChecks,
  Snowflake,
  Sparkles,
} from "lucide-react";
import {
  abandonGuidedRun,
  activeGuidedRuns,
  confirmGuidedStep,
  findRoutine,
  isGuidedEngineError,
  pauseGuidedRun,
  resolveCurrentStep,
  resumeGuidedRun,
  startGuidedRun,
} from "@/lib/guidedEngine";
import { modeBlurb, modeLabel } from "@/lib/guidedHelpers";
import type { GuidanceMode, GuidedHub, GuidedRoutine, GuidedRun } from "@/lib/guidedTypes";

type Props = {
  hub: GuidedHub;
  onChange: (hub: GuidedHub) => void;
  flash?: (message: string) => void;
  compact?: boolean;
};

function apply(
  result: ReturnType<typeof startGuidedRun>,
  onChange: (hub: GuidedHub) => void,
  flash?: (message: string) => void,
  ok?: string,
) {
  if (isGuidedEngineError(result)) {
    flash?.(result.error);
    return;
  }
  onChange(result);
  if (ok) flash?.(ok);
}

export function GuidedTasksPanel({ hub, onChange, flash, compact }: Props) {
  const [modeOverride, setModeOverride] = useState<GuidanceMode | "auto">("auto");
  const actives = useMemo(() => activeGuidedRuns(hub), [hub]);
  const primary = actives[0] || null;
  const routine = primary ? findRoutine(hub, primary.routineId) : null;
  const step = primary && routine ? resolveCurrentStep(routine, primary) : null;

  const start = (routineId: string) => {
    const mode = modeOverride === "auto" ? undefined : modeOverride;
    apply(startGuidedRun(hub, routineId, mode), onChange, flash, "Guided run started — confirm each step.");
  };

  return (
    <div className={`guided-panel${compact ? " compact" : ""}`}>
      {!compact ? (
        <header className="guided-panel-head">
          <div>
            <p className="eyebrow">Guided Tasks</p>
            <h2>One confirmation at a time</h2>
            <p className="guided-lead">
              Independent, Guided, or Unfreeze — progress is saved, and nothing completes without your OK.
            </p>
          </div>
          <div className="guided-mode-pills" role="group" aria-label="Guidance mode">
            {(["auto", "independent", "guided", "unfreeze"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={modeOverride === m ? "selected" : ""}
                onClick={() => setModeOverride(m)}
              >
                {m === "auto" ? "Auto" : modeLabel(m)}
              </button>
            ))}
          </div>
        </header>
      ) : null}

      {primary && routine && step ? (
        <section className="guided-runner" data-mode={primary.mode}>
          <div className="guided-runner-meta">
            <span className="guided-mode-chip">
              {primary.mode === "unfreeze" ? <Snowflake size={12} /> : <ListChecks size={12} />}
              {modeLabel(primary.mode)}
            </span>
            <strong>{routine.name}</strong>
            <span>
              Step {Math.min(primary.completedStepIds.length + 1, routine.steps.length)} of {routine.steps.length}
            </span>
          </div>

          {primary.status === "waiting" ? (
            <p className="guided-followup">Still here when you are — resume whenever you’re ready. Nothing was marked done.</p>
          ) : null}
          {primary.status === "paused" ? (
            <p className="guided-followup">Paused. Your place is saved.</p>
          ) : null}

          <div className="guided-step-card">
            <p className="eyebrow">{step.title}</p>
            <h3>{primary.mode === "unfreeze" ? step.microAction || step.prompt : step.prompt}</h3>
            {primary.mode !== "unfreeze" && step.microAction ? (
              <p className="guided-micro">
                <Footprints size={14} /> {step.microAction}
              </p>
            ) : null}
            {primary.mode === "guided" ? <p className="guided-hint">{modeBlurb("guided")}</p> : null}
            {primary.mode === "independent" ? <p className="guided-hint">{modeBlurb("independent")}</p> : null}
            {primary.mode === "unfreeze" ? <p className="guided-hint">{modeBlurb("unfreeze")}</p> : null}

            <div className="guided-actions">
              {primary.status === "paused" || primary.status === "waiting" ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() => apply(resumeGuidedRun(hub, primary.id), onChange, flash, "Resumed")}
                >
                  <CirclePlay size={15} /> Resume
                </button>
              ) : (
                <>
                  {step.kind === "yes_no" ? (
                    <>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => apply(confirmGuidedStep(hub, primary.id, "yes"), onChange, flash)}
                      >
                        <CheckCircle2 size={15} /> Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => apply(confirmGuidedStep(hub, primary.id, "no"), onChange, flash)}
                      >
                        Not yet
                      </button>
                    </>
                  ) : step.kind === "choice" && step.choices?.length ? (
                    step.choices.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        className="primary"
                        onClick={() => apply(confirmGuidedStep(hub, primary.id, choice), onChange, flash)}
                      >
                        {choice}
                      </button>
                    ))
                  ) : (
                    <>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => apply(confirmGuidedStep(hub, primary.id, "done"), onChange, flash)}
                      >
                        <CheckCircle2 size={15} /> Done
                      </button>
                      <button
                        type="button"
                        onClick={() => apply(confirmGuidedStep(hub, primary.id, "not yet"), onChange, flash)}
                      >
                        Not yet
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => apply(pauseGuidedRun(hub, primary.id, "user_paused"), onChange, flash, "Paused — progress kept")}
                  >
                    <CirclePause size={15} /> Pause
                  </button>
                </>
              )}
            </div>
          </div>

          {!compact ? (
            <button
              type="button"
              className="guided-abandon"
              onClick={() => apply(abandonGuidedRun(hub, primary.id), onChange, flash, "Run abandoned (not completed)")}
            >
              Abandon run
            </button>
          ) : null}
        </section>
      ) : (
        <section className="guided-catalog">
          {(compact ? hub.routines.slice(0, 3) : hub.routines).map((item) => (
            <RoutineCard key={item.id} routine={item} onStart={() => start(item.id)} />
          ))}
        </section>
      )}

      {!compact && actives.length > 1 ? (
        <p className="guided-more">{actives.length - 1} other run(s) paused or waiting — finish this one first.</p>
      ) : null}
    </div>
  );
}

function RoutineCard({ routine, onStart }: { routine: GuidedRoutine; onStart: () => void }) {
  return (
    <article className="guided-routine-card">
      <div>
        <span className="guided-cat">{routine.category}</span>
        <strong>{routine.name}</strong>
        <p>{routine.description}</p>
        <small>
          {routine.steps.length} steps · default {modeLabel(routine.defaultMode)}
          {routine.schedule?.timeLocal ? ` · ~${routine.schedule.timeLocal}` : ""}
        </small>
      </div>
      <button type="button" className="primary" onClick={onStart}>
        <Sparkles size={14} /> Start
      </button>
    </article>
  );
}

export function GuidedActiveStrip({
  hub,
  onChange,
  flash,
  onOpen,
}: {
  hub: GuidedHub;
  onChange: (hub: GuidedHub) => void;
  flash?: (message: string) => void;
  onOpen?: () => void;
}) {
  const run = activeGuidedRuns(hub)[0];
  if (!run) return null;
  const routine = findRoutine(hub, run.routineId);
  const step = routine ? resolveCurrentStep(routine, run) : null;
  if (!routine || !step) return null;

  return (
    <div className="guided-strip">
      <div>
        <span className="guided-mode-chip">
          {run.mode === "unfreeze" ? <Snowflake size={12} /> : <ListChecks size={12} />}
          {modeLabel(run.mode)} · {routine.name}
        </span>
        <strong>{run.mode === "unfreeze" ? step.microAction || step.prompt : step.prompt}</strong>
      </div>
      <div className="guided-strip-actions">
        {run.status === "active" ? (
          <button
            type="button"
            className="primary"
            onClick={() =>
              apply(
                confirmGuidedStep(hub, run.id, step.kind === "yes_no" ? "yes" : "done"),
                onChange,
                flash,
              )
            }
          >
            {step.kind === "yes_no" ? "Yes" : "Done"}
          </button>
        ) : (
          <button type="button" className="primary" onClick={() => apply(resumeGuidedRun(hub, run.id), onChange, flash)}>
            Resume
          </button>
        )}
        {onOpen ? (
          <button type="button" onClick={onOpen}>
            Open
          </button>
        ) : null}
      </div>
    </div>
  );
}

export type { GuidedRun };
