"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Circle, Focus, X } from "lucide-react";
import { formatFocusTime } from "@/lib/focusTime";
import { transitionFor } from "@/lib/motion";

export type FocusIslandSession = {
  title: string;
  remainingSeconds: number;
  isRunning: boolean;
  hasStarted: boolean;
};

type Props = {
  session: FocusIslandSession | null;
  reduceMotion?: boolean;
  onToggleRunning: () => void;
  onOpen: () => void;
  onEnd: () => void;
};

/**
 * Lab-only compact focus island — mirrors FloatingFocusDock session shape
 * (title / remaining / running) without inventing a second timer engine.
 * Parent owns the countdown tick (same pattern as FloatingFocusDock).
 */
export function FocusIslandCapsule({
  session,
  reduceMotion = false,
  onToggleRunning,
  onOpen,
  onEnd,
}: Props) {
  const show = Boolean(session?.hasStarted && (session?.remainingSeconds ?? 0) > 0);

  return (
    <AnimatePresence>
      {show && session && (
        <motion.aside
          className="motion-lab-focus-island"
          aria-label={session.isRunning ? "Focus session continues" : "Focus session paused"}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          transition={transitionFor("panel", reduceMotion)}
        >
          <span className="motion-lab-focus-orb" aria-hidden>
            <Focus size={15} />
          </span>
          <div className="motion-lab-focus-copy">
            <small>{session.isRunning ? "FOCUS CONTINUES" : "FOCUS PAUSED"}</small>
            <strong>{session.title}</strong>
            <span>{formatFocusTime(session.remainingSeconds)} left</span>
          </div>
          <button type="button" className="motion-lab-focus-resume" onClick={onOpen}>
            <Focus size={14} /> Open
          </button>
          <button
            type="button"
            className="motion-lab-focus-toggle"
            aria-label={session.isRunning ? "Pause focus session" : "Continue focus session"}
            onClick={onToggleRunning}
          >
            {session.isRunning ? <Circle size={14} fill="currentColor" /> : <Focus size={14} />}
          </button>
          <button type="button" className="motion-lab-focus-end" aria-label="End focus session" onClick={onEnd}>
            <X size={16} />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
