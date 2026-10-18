"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { DragControls } from "framer-motion";
import { ArrowDown, ArrowUp, Check, Focus, GripVertical, X } from "lucide-react";
import {
  CardLift,
  FocusIslandCapsule,
  ListReorderHint,
  NavContentSwap,
  PageTransition,
  PanelDialog,
  type FocusIslandSession,
} from "@/components/motion";
import { useReduceMotion } from "@/lib/motion";
import "./motion-lab.css";

type LabTask = {
  id: string;
  title: string;
  project: string;
  color: string;
  done: boolean;
  focusMinutes: number;
};

type LabView = "Now" | "Tasks";
type TaskFilter = "open" | "done";

function TaskCard({
  task,
  controls,
  reduceMotion,
  onComplete,
  onOpen,
  onFocus,
  onMove,
}: {
  task: LabTask;
  controls: DragControls;
  reduceMotion: boolean;
  onComplete: (id: string) => void;
  onOpen: (id: string) => void;
  onFocus: (task: LabTask) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  return (
    <CardLift
      reduceMotion={reduceMotion}
      settled={task.done}
      className={`motion-lab-task${task.done ? " done" : ""}`}
    >
      <button
        type="button"
        className={`check${task.done ? " on" : ""}`}
        aria-label={task.done ? "Completed" : `Complete ${task.title}`}
        onClick={() => onComplete(task.id)}
      >
        {task.done ? <Check size={12} /> : null}
      </button>
      <div>
        <strong>{task.title}</strong>
        <small>
          <i style={{ background: task.color, width: 6, height: 6, borderRadius: 99, display: "inline-block", marginRight: 6 }} />
          {task.project} · {task.focusMinutes}m focus
        </small>
      </div>
      <div className="motion-lab-task-actions">
        <button
          type="button"
          aria-label="Drag to reorder"
          onPointerDown={(e: ReactPointerEvent) => controls.start(e)}
          style={{ cursor: "grab" }}
        >
          <GripVertical size={14} />
        </button>
        <button type="button" aria-label="Move up" onClick={() => onMove(task.id, -1)}>
          <ArrowUp size={14} />
        </button>
        <button type="button" aria-label="Move down" onClick={() => onMove(task.id, 1)}>
          <ArrowDown size={14} />
        </button>
        <button type="button" onClick={() => onOpen(task.id)}>
          Open
        </button>
        {!task.done && (
          <button type="button" onClick={() => onFocus(task)}>
            <Focus size={13} /> Focus
          </button>
        )}
      </div>
    </CardLift>
  );
}

function TaskFilterSwap({
  tasks,
  reduceMotion,
  onComplete,
  onOpen,
  onFocus,
  onMove,
  onReorder,
  onStatus,
}: {
  tasks: LabTask[];
  reduceMotion: boolean;
  onComplete: (id: string) => void;
  onOpen: (id: string) => void;
  onFocus: (task: LabTask) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onReorder: (next: LabTask[]) => void;
  onStatus: (msg: string) => void;
}) {
  const [filter, setFilter] = useState<TaskFilter>("open");
  const visible = tasks.filter((t) => (filter === "open" ? !t.done : t.done));

  return (
    <>
      <div className="motion-lab-seg" role="tablist" aria-label="Task filter" style={{ marginBottom: 12 }}>
        {(["open", "done"] as TaskFilter[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={filter === key ? "selected" : ""}
            onClick={() => {
              setFilter(key);
              onStatus(`NavContentSwap → ${key} filter`);
            }}
          >
            {key === "open" ? "Open" : "Done"}
          </button>
        ))}
      </div>
      <NavContentSwap activeKey={filter} reduceMotion={reduceMotion}>
        <ListReorderHint
          items={visible}
          onReorder={(next) => {
            if (filter === "open") {
              const done = tasks.filter((t) => t.done);
              onReorder([...next, ...done]);
            } else {
              const open = tasks.filter((t) => !t.done);
              onReorder([...open, ...next]);
            }
            onStatus("Task reordered (drag) — ListReorderHint layout spring.");
          }}
          reduceMotion={reduceMotion}
          className="motion-lab-list"
          renderItem={(task, controls) => (
            <TaskCard
              task={task}
              controls={controls}
              reduceMotion={reduceMotion}
              onComplete={onComplete}
              onOpen={onOpen}
              onFocus={onFocus}
              onMove={onMove}
            />
          )}
        />
      </NavContentSwap>
    </>
  );
}

const SEED: LabTask[] = [
  { id: "t1", title: "Draft motion tokens write-up", project: "LifeOS 3", color: "#2563EB", done: false, focusMinutes: 25 },
  { id: "t2", title: "Review panel enter timing", project: "LifeOS 3", color: "#0D9488", done: false, focusMinutes: 15 },
  { id: "t3", title: "Keyboard reorder pass", project: "Accessibility", color: "#d99b38", done: false, focusMinutes: 20 },
];

/**
 * Contained Motion Lab — prototypes choreography with LifeOS-shaped patterns.
 * Does not remount the main app shell or replace production focus/notification timers.
 */
export default function MotionLabClient() {
  const [forceReduce, setForceReduce] = useState(false);
  const reduceMotion = useReduceMotion(forceReduce);

  const [view, setView] = useState<LabView>("Now");
  const [tasks, setTasks] = useState<LabTask[]>(SEED);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState("Prototype only — not wired into app navigation.");

  const [focusSession, setFocusSession] = useState<FocusIslandSession | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-personality", "atelier-light");
    document.documentElement.classList.toggle("reduce-motion", forceReduce);
    return () => {
      document.documentElement.classList.remove("reduce-motion");
    };
  }, [forceReduce]);

  // Single countdown owned here (lab sandbox) — same fields as production focus session.
  useEffect(() => {
    if (!focusSession?.isRunning) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = window.setInterval(() => {
      setFocusSession((prev) => {
        if (!prev) return prev;
        const next = Math.max(0, prev.remainingSeconds - 1);
        if (next <= 0) {
          setStatus("Focus session finished — reused session shape, no extra toast system.");
          return { ...prev, remainingSeconds: 0, isRunning: false, hasStarted: false };
        }
        return { ...prev, remainingSeconds: next };
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [focusSession?.isRunning]);

  const openTask = useMemo(
    () => tasks.find((t) => t.id === openTaskId) ?? null,
    [openTaskId, tasks],
  );

  const completeTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: true } : t)));
    setStatus("Task completed — settle animation via CardLift.");
    setOpenTaskId(null);
    setFocusSession((prev) =>
      prev && prev.title === tasks.find((t) => t.id === id)?.title
        ? { ...prev, hasStarted: false, isRunning: false, remainingSeconds: 0 }
        : prev,
    );
  }, [tasks]);

  const moveTask = useCallback((id: string, dir: -1 | 1) => {
    setTasks((prev) => {
      const index = prev.findIndex((t) => t.id === id);
      if (index < 0) return prev;
      const nextIndex = index + dir;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      setStatus("Task reordered (keyboard) — layout spring when motion is on.");
      return copy;
    });
  }, []);

  const startFocus = useCallback((task: LabTask) => {
    setFocusSession({
      title: task.title,
      remainingSeconds: task.focusMinutes * 60,
      isRunning: true,
      hasStarted: true,
    });
    setOpenTaskId(null);
    setStatus("Focus started — island uses the same session fields as FloatingFocusDock.");
  }, []);

  const nowTasks = tasks.filter((t) => !t.done).slice(0, 3);
  const listTasks = view === "Now" ? nowTasks : tasks;

  return (
    <div className="motion-lab">
      <header className="motion-lab-header">
        <div>
          <p className="eyebrow">LifeOS 3.0 · Motion Lab</p>
          <h1>Interaction choreography</h1>
          <p>
            Contained sandbox for page swaps, panels, card press/settle, list reorder, and a lab-only focus island.
            Atelier Light preserved. No app-wide wiring yet.
          </p>
        </div>
        <div className="motion-lab-controls">
          <button
            type="button"
            className={forceReduce ? "on" : ""}
            aria-pressed={forceReduce}
            onClick={() => setForceReduce((v) => !v)}
          >
            {forceReduce ? "reduceMotion on" : "reduceMotion off"}
          </button>
          <a href="/" style={{ fontSize: 11, color: "var(--muted)", textDecoration: "none" }}>
            ← Back to LifeOS
          </a>
        </div>
      </header>

      <section className="motion-lab-shell motion-lab-glass" aria-label="Motion lab shell">
        <div className="motion-lab-nav">
          <div className="motion-lab-seg" role="tablist" aria-label="Lab views">
            {(["Now", "Tasks"] as LabView[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                className={view === key ? "selected" : ""}
                onClick={() => {
                  setView(key);
                  setStatus(`Switched to ${key} — NavContentSwap + PageTransition tokens.`);
                }}
              >
                {key}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{status}</span>
        </div>

        <div className="motion-lab-body">
          <PageTransition viewKey={view} reduceMotion={reduceMotion}>
            <div className="motion-lab-view-title">
              <h2>{view === "Now" ? "What matters now" : "Task list"}</h2>
              <span>{listTasks.length} items · drag or ↑↓</span>
            </div>

            {view === "Tasks" && (
              <TaskFilterSwap
                tasks={tasks}
                reduceMotion={reduceMotion}
                onComplete={completeTask}
                onOpen={setOpenTaskId}
                onFocus={startFocus}
                onMove={moveTask}
                onReorder={setTasks}
                onStatus={setStatus}
              />
            )}

            {view === "Now" && (
              <ListReorderHint
                items={listTasks}
                onReorder={(next) => {
                  const done = tasks.filter((t) => t.done);
                  const rest = tasks.filter((t) => !t.done && !next.some((n) => n.id === t.id));
                  setTasks([...next, ...rest, ...done]);
                  setStatus("Task reordered (drag) — ListReorderHint layout spring.");
                }}
                reduceMotion={reduceMotion}
                className="motion-lab-list"
                renderItem={(task, controls) => (
                  <TaskCard
                    task={task}
                    controls={controls}
                    reduceMotion={reduceMotion}
                    onComplete={completeTask}
                    onOpen={setOpenTaskId}
                    onFocus={startFocus}
                    onMove={moveTask}
                  />
                )}
              />
            )}

            <p className="motion-lab-hint">
              Demo 1–5: switch views · open a task panel · reorder (drag / arrows) · complete (settle) · start focus (island).
              Glass depth is local to this lab shell only. Tasks view also demos NavContentSwap (Open / Done).
            </p>
          </PageTransition>
        </div>
      </section>

      <aside className="motion-lab-note motion-lab-glass">
        <strong>Motion choices (summary):</strong> tweens for page/nav/panel predictability; springs for card press,
        settle, and list layout. Prefer transform/opacity. reduceMotion → instant or fade-only. Focus island reuses
        session fields; no second notification toast layer.
      </aside>

      <PanelDialog
        open={Boolean(openTask)}
        onClose={() => setOpenTaskId(null)}
        reduceMotion={reduceMotion}
        labelledBy="motion-lab-task-title"
      >
        {openTask && (
          <>
            <h3 id="motion-lab-task-title">{openTask.title}</h3>
            <p>
              Existing task-pattern shell: open/close uses PanelDialog tokens (scrim fade + panel scale/Y). Closing
              does not remount the lab list.
            </p>
            <div className="motion-lab-panel-actions">
              <button type="button" onClick={() => setOpenTaskId(null)}>
                <X size={14} /> Close
              </button>
              <button type="button" className="primary" onClick={() => startFocus(openTask)}>
                <Focus size={14} /> Start focus
              </button>
              <button type="button" className="primary" onClick={() => completeTask(openTask.id)}>
                <Check size={14} /> Complete
              </button>
            </div>
          </>
        )}
      </PanelDialog>

      <FocusIslandCapsule
        session={focusSession}
        reduceMotion={reduceMotion}
        onOpen={() => {
          const match = tasks.find((t) => t.title === focusSession?.title);
          if (match) setOpenTaskId(match.id);
          setStatus("Opened task from focus island — same session, no duplicate timer.");
        }}
        onToggleRunning={() =>
          setFocusSession((prev) => (prev ? { ...prev, isRunning: !prev.isRunning } : prev))
        }
        onEnd={() => {
          setFocusSession(null);
          setStatus("Focus ended — island dismissed.");
        }}
      />
    </div>
  );
}
