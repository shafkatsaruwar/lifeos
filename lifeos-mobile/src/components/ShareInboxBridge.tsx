import { useEffect, useRef } from "react";
import { Alert, AppState, Linking, type AppStateStatus } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { useLifeOS } from "../lib/LifeOSContext";
import { fetchIcsFromUrl, mergeCalendarEvents } from "../lib/api";
import { uid } from "../lib/helpers";
import { navigationRef } from "../navigation/navigationRef";
import {
  drainPendingShares,
  eventsFromShare,
  isShareUrl,
  looksLikeIcs,
  type SharePayload,
} from "../lib/shareInbox";

/** Share sheet + Open In → calendar (ICS) or MindDump (text/URL). */
export function ShareInboxBridge() {
  const { workspace, updateCalendar, updateBrain, updateSettings } = useLifeOS();
  const workspaceRef = useRef(workspace);
  const updateCalendarRef = useRef(updateCalendar);
  const updateBrainRef = useRef(updateBrain);
  const updateSettingsRef = useRef(updateSettings);

  useEffect(() => {
    workspaceRef.current = workspace;
    updateCalendarRef.current = updateCalendar;
    updateBrainRef.current = updateBrain;
    updateSettingsRef.current = updateSettings;
  }, [workspace, updateCalendar, updateBrain, updateSettings]);

  useEffect(() => {
    const apply = async (item: SharePayload) => {
      const text = (item.text ?? "").trim();
      if (!text && !item.filename) return;

      if (item.kind === "url" && text && /\.ics(\?|$)/i.test(text)) {
        try {
          const ics = await fetchIcsFromUrl(text);
          item = { ...item, kind: "ics", text: ics };
        } catch {
          /* fall through as dump */
        }
      }

      const events = eventsFromShare(item);
      if (events.length) {
        const next = mergeCalendarEvents(workspaceRef.current.calendar, events);
        await updateCalendarRef.current(next);
        const go = (attempt: number) => {
          if (navigationRef.isReady()) {
            navigationRef.navigate("CalendarTab" as never, { screen: "CalendarMain" } as never);
            return;
          }
          if (attempt < 12) setTimeout(() => go(attempt + 1), 80);
        };
        go(0);
        Alert.alert(
          "Calendar imported",
          `Added ${events.length} event${events.length === 1 ? "" : "s"} from the share.`,
        );
        return;
      }

      if (!text) return;
      const dump = item.filename ? `${item.filename}\n${text}` : text;
      await updateBrainRef.current([dump, ...workspaceRef.current.brain]);
      const momentumLog = [
        { id: uid(), at: new Date().toISOString(), type: "capture" as const, title: dump.slice(0, 80) },
        ...(workspaceRef.current.settings.momentumLog ?? []),
      ].slice(0, 50);
      await updateSettingsRef.current({ ...workspaceRef.current.settings, momentumLog });
      const go = (attempt: number) => {
        if (navigationRef.isReady()) {
          navigationRef.navigate("LibraryTab" as never, { screen: "Brain" } as never);
          return;
        }
        if (attempt < 12) setTimeout(() => go(attempt + 1), 80);
      };
      go(0);
    };

    const drain = async () => {
      const items = await drainPendingShares();
      for (const item of items) await apply(item);
    };

    const fromUrl = async (url: string | null) => {
      if (!url) return;
      if (url.startsWith("file://") && /\.ics$/i.test(url.split("?")[0] ?? "")) {
        try {
          const text = await FileSystem.readAsStringAsync(url);
          await apply({ kind: "ics", text, filename: url.split("/").pop() });
        } catch {
          /* ignore unreadable file */
        }
        return;
      }
      if (isShareUrl(url) || looksLikeIcs(url)) void drain();
    };

    void Linking.getInitialURL().then((url) => void fromUrl(url));
    void drain();
    const linkSub = Linking.addEventListener("url", ({ url }) => void fromUrl(url));
    const appSub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") void drain();
    });
    return () => {
      linkSub.remove();
      appSub.remove();
    };
  }, []);

  return null;
}
