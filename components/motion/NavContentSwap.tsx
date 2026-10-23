"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { transitionFor } from "@/lib/motion";

type Props = {
  activeKey: string;
  reduceMotion?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Subtle nav content swap — opacity + tiny X travel (not a full page remount feel).
 * Shorter than PageTransition; intended for tab/segment switches inside a shell.
 */
export function NavContentSwap({
  activeKey,
  reduceMotion = false,
  children,
  className,
}: Props) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeKey}
        className={className}
        initial={
          reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, x: 6 }
        }
        animate={
          reduceMotion
            ? { opacity: 1 }
            : { opacity: 1, x: 0 }
        }
        exit={
          reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, x: -6 }
        }
        transition={transitionFor("nav", reduceMotion)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
