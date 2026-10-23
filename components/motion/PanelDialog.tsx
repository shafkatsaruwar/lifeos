"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { transitionFor } from "@/lib/motion";

type Props = {
  open: boolean;
  onClose: () => void;
  reduceMotion?: boolean;
  children: ReactNode;
  labelledBy?: string;
  className?: string;
  panelClassName?: string;
};

/**
 * Overlay + panel enter/exit — opacity scrim, slight scale/Y on panel.
 * Transform/opacity only; no layout thrash.
 */
export function PanelDialog({
  open,
  onClose,
  reduceMotion = false,
  children,
  labelledBy,
  className = "motion-lab-modal-layer",
  panelClassName = "motion-lab-panel",
}: Props) {
  const scrim = transitionFor("fade", reduceMotion);
  const panel = transitionFor("panel", reduceMotion);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={className}
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={scrim}
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            className={panelClassName}
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 10, scale: 0.985 }
            }
            animate={
              reduceMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 8, scale: 0.99 }
            }
            transition={panel}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
