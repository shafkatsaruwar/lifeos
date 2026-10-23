"use client";

import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { duration, ease, transitionFor } from "@/lib/motion";

type Props = {
  viewKey: string;
  reduceMotion?: boolean;
  children: ReactNode;
  className?: string;
  mode?: "wait" | "sync" | "popLayout";
} & Omit<HTMLMotionProps<"div">, "children">;

/**
 * Page / content shell swap — short opacity + slight Y.
 * Under reduceMotion: opacity only (or instant).
 */
export function PageTransition({
  viewKey,
  reduceMotion = false,
  children,
  className,
  mode = "wait",
  ...rest
}: Props) {
  const transition = transitionFor("page", reduceMotion);
  const initial = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 6 };
  const animate = reduceMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0 };
  const exit = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: -4 };

  return (
    <AnimatePresence mode={mode}>
      <motion.div
        key={viewKey}
        className={className}
        initial={initial}
        animate={animate}
        exit={exit}
        transition={transition}
        {...rest}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Shared page enter config for one-off usage without AnimatePresence. */
export const pageEnter = (reduceMotion: boolean) => ({
  initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 },
  animate: reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
  transition: reduceMotion
    ? { duration: duration.instant }
    : { duration: duration.md, ease: ease.out },
});
