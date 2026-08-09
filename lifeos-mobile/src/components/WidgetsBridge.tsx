import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import { writeWidgetSnapshot } from "../lib/widgets/snapshot";

/** Keeps WidgetKit snapshot fresh when workspace changes or app becomes active. */
export function WidgetsBridge() {
  const { workspace } = useLifeOS();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void writeWidgetSnapshot(workspace);
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [workspace]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "active") void writeWidgetSnapshot(workspace);
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [workspace]);

  return null;
}
