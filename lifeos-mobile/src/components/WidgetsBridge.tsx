import { useEffect, useRef } from "react";
import { AppState, Linking, type AppStateStatus } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import { navigateFromWidgetUrl } from "../lib/notifications/routing";
import { writeWidgetSnapshot } from "../lib/widgets/snapshot";

/** Keeps WidgetKit snapshot fresh and routes widget taps to the right tab/screen. */
export function WidgetsBridge() {
  const { workspace } = useLifeOS();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // Must .catch — writeWidgetSnapshot is async; try/catch around void cannot see rejections.
      void writeWidgetSnapshot(workspace).catch((error) => {
        console.warn("[LifeOS] widget snapshot failed", error);
      });
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [workspace]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state !== "active") return;
      void writeWidgetSnapshot(workspace).catch((error) => {
        console.warn("[LifeOS] widget snapshot failed", error);
      });
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [workspace]);

  useEffect(() => {
    const apply = (url: string | null) => {
      if (!url) return;
      // Retry briefly — NavigationContainer may not be ready on cold start.
      const tryNav = (attempt: number) => {
        if (navigateFromWidgetUrl(url)) return;
        if (attempt >= 10) return;
        setTimeout(() => tryNav(attempt + 1), 100);
      };
      tryNav(0);
    };
    void Linking.getInitialURL()
      .then(apply)
      .catch((error) => console.warn("[WidgetsBridge] getInitialURL failed", error));
    const sub = Linking.addEventListener("url", ({ url }) => apply(url));
    return () => sub.remove();
  }, []);

  return null;
}
