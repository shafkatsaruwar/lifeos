"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CirclePause, CirclePlay, ListChecks, Sparkles, Timer } from "lucide-react";
import {
  acknowledgeRun,
  activeRuns,
  confirmStep,
  findRoutine,
  isEngineError,
  pauseRun,
  resolveCurrentStep,
  resumeRun,
  scheduleOrPromptRun,
  statusChecklist,
  stillWorking,
} from "@/lib/executive/engine";
import { buildDailyBriefing } from "@/lib/executive/briefing";
import { COPY, modeBlurb, modeLabel, snoozeOptions } from "@/lib/executive/copy";
import { formatPrayerClock, nextPrayer, salahLabel } from "@/lib/executive/salah";
import type { ExecutiveHub, GuidanceMode } from "@/lib/executive/types";

type Props = {
  hub: ExecutiveHub;
  onChange: (hub: ExecutiveHub) => void;
  flash?: (message: string) => void;
  compact?: boolean;
  openPriorityCount?: number;
};

function apply(
  result: ReturnType<typeof scheduleOrPromptRun>,
  onChange: (hub: ExecutiveHub) => void,
  flash?: (message: string) => void,
  ok?: string,
) {
  if (isEngineError(result)) {
    flash?.(result.error);
    return;
  }
  onChange(result);
  if (ok) flash?.(ok);
}

export function ExecutivePanel({ hub, onChange, flash, compact, openPriorityCount = 0 }: Props) {
  const [modeOverride, setModeOverride] = useState<GuidanceMode | "auto">("auto");
  const actives = useMemo(() => activeRuns(hub), [hub]);
  const primary = actives[0] || null;
  const routine = primary ? findRoutine(hub, primary.routineId) : null;
  const step = primary && routine ? resolveCurrentStep(routine, primary) : null;
  const checklist = primary && routine ? statusChecklist(routine, primary) : [];
  const briefing = useMemo(
    () => buildDailyBriefing(hub, { openPriorityCount }),
    [hub, openPriorityCount],
  );
  const snoozes = snoozeOptions(hub.prefs.defaultSnoozeMinutes);
  const offerHelp = primary ? primary.postponementCount >= hub.prefs.snoozeLimit : false;

  const start = (routineId: string) => {
    const mode = modeOverride === "auto" ? undefined : modeOverride;
    const scheduled = scheduleOrPromptRun(hub, routineId, { mode });
    if (isEngineError(scheduled)) {
      flash?.(scheduled.error);
      return;
    }
    // Immediate start for explicit catalog action
    apply(acknowledgeRun(scheduled, scheduled.runs[0].id, "start"), onChange, flash);
  };

  return (
    <div className={`guided-panel executive-panel${compact ? " compact" : ""}`}>
      {!compact ? (
        <header className="guided-panel-head">
          <div>
            <p className="eyebrow">Executive Function</p>
            <h2>Commitments, not cheerleading</h2>
            <p className="guided-lead">
              Intention → prompt → acknowledgment → start → follow-up → confirmed completion. Nothing is assumed.
            </p>
          </div>
          <div className="guided-mode-pills" role="group" aria-label="Guidance mode">
            {(["auto", "executive", "guided", "transition"] as const).map((m) => (
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

      {!compact ? (
        <section className="executive-briefing">
          <p className="eyebrow">{briefing.title}</p>
          <p className="guided-lead">{briefing.summary}</p>
          {briefing.recommended ? (
            <p className="guided-hint">
              Recommended: <strong>{briefing.recommended.label}</strong>
              {briefing.recommended.detail ? ` — ${briefing.recommended.detail}` : ""}
            </p>
          ) : null}
          {hub.prefs.salah.enabled && nextPrayer(hub.prefs.salah) ? (
            <p className="guided-hint">
              {hub.prefs.salah.privacyLocked
                ? `Next commitment · ${formatPrayerClock(nextPrayer(hub.prefs.salah)!.at)}`
                : `${salahLabel(nextPrayer(hub.prefs.salah)!.id)} · ${formatPrayerClock(nextPrayer(hub.prefs.salah)!.at)}`}
            </p>
          ) : null}
        </section>
      ) : null}

      {primary && routine && primary.state !== "in_progress" && primary.state !== "paused" && !step ? (
        <section className="guided-runner" data-mode={primary.mode}>
          <div className="guided-runner-meta">
            <span className="guided-mode-chip">
              <ListChecks size={12} />
              {modeLabel(primary.mode)}
            </span>
            <strong>{routine.name}</strong>
            <span>{primary.state}</span>
          </div>
          <div className="guided-step-card">
            <h3>
              {routine.category === "hygiene"
                ? COPY.eveningRetainers
                : COPY.pendingRoutine(routine.name)}
            </h3>
            <p className="guided-hint">{COPY.neverAssumed}</p>
            {offerHelp ? (
              <p className="guided-followup">
                {COPY.troubleSwitching}
              </p>
            ) : null}
            <div className="guided-actions">
              <button
                type="button"
                className="primary"
                onClick={() => apply(acknowledgeRun(hub, primary.id, "start"), onChange, flash)}
              >
                {offerHelp ? "Help me transition" : "Starting now"}
              </button>
              {snoozes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    apply(acknowledgeRun(hub, primary.id, "snooze", m), onChange, flash, `Follow-up in ${m}m`)
                  }
                >
                  <Timer size={14} /> In {m}m
                </button>
              ))}
              <button
                type="button"
                onClick={() => apply(acknowledgeRun(hub, primary.id, "already_completed"), onChange, flash)}
              >
                Already completed
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() =>
                  apply(acknowledgeRun(hub, primary.id, "decline"), onChange, flash, COPY.declineAck)
                }
              >
                Dismiss
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {primary && routine && step && (primary.state === "in_progress" || primary.state === "paused") ? (
        <section className="guided-runner" data-mode={primary.mode}>
          <div className="guided-runner-meta">
            <span className="guided-mode-chip">
              <ListChecks size={12} />
              {modeLabel(primary.mode)} · {primary.state.replace("_", " ")}
            </span>
            <strong>{routine.name}</strong>
          </div>

          {primary.mode === "guided" ? (
            <ul className="executive-checklist">
              {checklist.map((item) => (
                <li key={item.id} className={item.done ? "done" : item.current ? "current" : ""}>
                  <span>{item.done ? "Completed" : item.current ? "Pending" : "Upcoming"}</span>
                  {item.title}
                </li>
              ))}
            </ul>
          ) : null}

          {primary.state === "paused" ? <p className="guided-followup">{COPY.paused}</p> : null}

          <div className="guided-step-card">
            <p className="eyebrow">{step.title}</p>
            <h3>{step.prompt}</h3>
            <p className="guided-hint">{modeBlurb(primary.mode)}</p>

            <div className="guided-actions">
              {primary.state === "paused" ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() => apply(resumeRun(hub, primary.id), onChange, flash)}
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
                        onClick={() => apply(confirmStep(hub, primary.id, "yes"), onChange, flash)}
                      >
                        <CheckCircle2 size={15} /> Yes
                      </button>
                      <button type="button" onClick={() => apply(confirmStep(hub, primary.id, "no"), onChange, flash)}>
                        Not yet
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => apply(confirmStep(hub, primary.id, "done"), onChange, flash)}
                      >
                        <CheckCircle2 size={15} /> Completed
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          apply(stillWorking(hub, primary.id), onChange, flash, `Follow-up in ${hub.prefs.defaultSnoozeMinutes}m`)
                        }
                      >
                        Still working
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => apply(pauseRun(hub, primary.id), onChange, flash, COPY.paused)}
                  >
                    <CirclePause size={15} /> Pause
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {!primary || (primary && !step && ["completed", "skipped", "expired"].includes(primary.state)) ? (
        <section className="guided-catalog">
          {(compact ? hub.routines.slice(0, 3) : hub.routines).map((item) => (
            <article key={item.id} className="guided-routine-card">
              <div>
                <span className="guided-cat">{item.category}</span>
                <strong>{item.name}</strong>
                <p>{item.description}</p>
                <small>
                  {item.steps.length} steps · {modeLabel(item.defaultMode)}
                  {item.schedule?.timeLocal ? ` · ${item.schedule.timeLocal}` : ""}
                  {item.schedule?.kind === "salah" ? " · calculated times" : ""}
                </small>
              </div>
              <button type="button" className="primary" onClick={() => start(item.id)}>
                <Sparkles size={14} /> Start
              </button>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export function ExecutiveActiveStrip({
  hub,
  onChange,
  flash,
  onOpen,
}: {
  hub: ExecutiveHub;
  onChange: (hub: ExecutiveHub) => void;
  flash?: (message: string) => void;
  onOpen?: () => void;
}) {
  const run = activeRuns(hub)[0];

  if (!run) {
    return (
      <div className="guided-strip">
        <div>
          <span className="guided-mode-chip">
            <ListChecks size={12} />
            Executive Function
          </span>
          <strong>Commitments — retainers, salah, follow-through</strong>
        </div>
        <div className="guided-strip-actions">
          <button type="button" className="primary" onClick={onOpen}>
            Open
          </button>
        </div>
      </div>
    );
  }

  const routine = findRoutine(hub, run.routineId);
  if (!routine) return null;
  const step = resolveCurrentStep(routine, run);
  const label =
    routine.sensitive && hub.prefs.salah.privacyLocked && routine.category === "salah"
      ? "Open commitment"
      : routine.name;

  return (
    <div className="guided-strip">
      <div>
        <span className="guided-mode-chip">
          <ListChecks size={12} />
          {modeLabel(run.mode)} · {label}
        </span>
        <strong>
          {run.state === "pending" || run.state === "scheduled" || run.state === "acknowledged"
            ? COPY.pendingRoutine(label)
            : step
              ? step.prompt
              : COPY.previousOpen(label)}
        </strong>
      </div>
      <div className="guided-strip-actions">
        {run.state === "in_progress" && step ? (
          <button
            type="button"
            className="primary"
            onClick={() =>
              apply(confirmStep(hub, run.id, step.kind === "yes_no" ? "yes" : "done"), onChange, flash)
            }
          >
            {step.kind === "yes_no" ? "Yes" : "Completed"}
          </button>
        ) : run.state === "paused" ? (
          <button type="button" className="primary" onClick={() => apply(resumeRun(hub, run.id), onChange, flash)}>
            Resume
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            onClick={() => apply(acknowledgeRun(hub, run.id, "start"), onChange, flash)}
          >
            Starting now
          </button>
        )}
        {onOpen ? (
          <button type="button" onClick={onOpen}>
            Open
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => apply(acknowledgeRun(hub, run.id, "decline"), onChange, flash, COPY.declineAck)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
