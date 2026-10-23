"use client";

import { useEffect, useState } from "react";

/**
 * Resolve effective reduce-motion: settings override OR OS preference.
 * Does not own a second timer/toast system — read-only preference bridge.
 */
export function readReduceMotionPreference(settingsFlag?: boolean): boolean {
  if (settingsFlag === true) return true;
  if (typeof window === "undefined") return Boolean(settingsFlag);
  if (document.documentElement.classList.contains("reduce-motion")) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useReduceMotion(settingsFlag?: boolean): boolean {
  const [reduced, setReduced] = useState(() => readReduceMotionPreference(settingsFlag));

  useEffect(() => {
    setReduced(readReduceMotionPreference(settingsFlag));
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(readReduceMotionPreference(settingsFlag));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settingsFlag]);

  return reduced;
}

/** Fade-only variants when reduceMotion — no y/scale travel. */
export function fadeOnlyVariants(reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }
  return null;
}
