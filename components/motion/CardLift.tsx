"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { spring, transitionFor } from "@/lib/motion";

type Props = {
  reduceMotion?: boolean;
  children: ReactNode;
  className?: string;
  /** When true, card is in a pressed / completing state */
  pressed?: boolean;
  /** Settle after complete — slight scale dip then rest */
  settled?: boolean;
} & Omit<HTMLMotionProps<"div">, "children">;

/**
 * Card lift / press — spring on hover & press; fade-only when reduceMotion.
 */
export function CardLift({
  reduceMotion = false,
  children,
  className,
  pressed = false,
  settled = false,
  ...rest
}: Props) {
  const hover = reduceMotion
    ? undefined
    : { y: -2, transition: spring.soft };
  const tap = reduceMotion
    ? undefined
    : { scale: 0.985, transition: spring.snappy };

  const animate = settled
    ? reduceMotion
      ? { opacity: 0.55 }
      : { opacity: 0.55, scale: 0.98, y: 0 }
    : pressed
      ? reduceMotion
        ? { opacity: 1 }
        : { scale: 0.98, y: 0 }
      : { opacity: 1, scale: 1, y: 0 };

  return (
    <motion.div
      className={className}
      whileHover={hover}
      whileTap={tap}
      animate={animate}
      transition={transitionFor(settled ? "settle" : "card", reduceMotion)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
