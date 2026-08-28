"use client";

import { CheckCircle2, Focus, Pause } from "lucide-react";

type Task = {
  id: number;
  title: string;
  project: string;
  color: string;
  focusMinutes: number;
  notes?: string;
  checklist?: string[];
  checklistProgress?: boolean[];
  focusRemainingSeconds?: number;
  focusSessionStarted?: boolean;
  focusSessionRunning?: boolean;
  focusUpdatedAt?: string;
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function liveSeconds(task: Task) {
  const total = task.focusMinutes * 60;
  const stored = task.focusRemainingSeconds ?? total;
  if (!task.focusSessionRunning || !task.focusUpdatedAt) return stored;
  const elapsed = Math.floor((Date.now() - new Date(task.focusUpdatedAt).getTime()) / 1000);
  return Math.max(0, stored - elapsed);
}

export function FocusSessionPanel({
  task,
  onFocus,
  onUpdateNotes,
  onToggleChecklist,
}: {
  task?: Task;
  onFocus: () => void;
  onUpdateNotes: (notes: string) => void;
  onToggleChecklist: (index: number) => void;
}) {
  if (!task) {
    return (
      <div className="focus-flow-card focus-flow-empty-plan">
        <p>No active task. Use Talk → plan or pick a task on Now.</p>
      </div>
    );
  }

  const remaining = liveSeconds(task);
  const running = Boolean(task.focusSessionRunning);

  return (
    <div className="focus-flow-session">
      <div className="focus-flow-card">
        <div className="focus-flow-session-top">
          <div>
            <p className="eyebrow">Focused time</p>
            <strong className="focus-flow-timer">{formatTime(remaining)}</strong>
          </div>
          <div className="focus-flow-session-actions">
            <button type="button" className="ghost" disabled={!task.focusSessionStarted}>
              <Pause size={14} /> Pause
            </button>
            <button type="button" className="primary" onClick={onFocus}>
              <Focus size={14} /> {running ? "Open session" : "Start focus"}
            </button>
          </div>
        </div>

        <div className="focus-flow-session-task">
          <p className="eyebrow">Current task</p>
          <strong>{task.title}</strong>
          <div className="focus-flow-allowed">
            <span>Chrome</span>
            <span>Slack</span>
            <span className="active">Lofi beats</span>
          </div>
          <small>Enabled during focus · block everything else on mobile</small>
        </div>

        <div className="focus-flow-notes-block">
          <p className="eyebrow">Notes</p>
          <textarea
            value={task.notes ?? ""}
            onChange={event => onUpdateNotes(event.target.value)}
            placeholder="Handoff note, context, or what done looks like…"
          />
        </div>

        {(task.checklist ?? []).map((item, index) => {
          const done = task.checklistProgress?.[index];
          return (
            <button
              key={`${item}-${index}`}
              type="button"
              className={`focus-flow-check-row ${done ? "done" : ""}`}
              onClick={() => onToggleChecklist(index)}
            >
              <span className="focus-flow-check">{done ? <CheckCircle2 size={14} /> : null}</span>
              <span>{item}</span>
            </button>
          );
        })}
      </div>
      <p className="focus-flow-muted">Opens the full focus studio with timer, sounds, and task switching.</p>
    </div>
  );
}
