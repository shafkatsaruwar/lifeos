import { useEffect, useRef } from "react";
import { Alert, Linking } from "react-native";
import { mergeSynapseCalendarEvents, parseSynapseDayPlan } from "../lib/synapseImport";
import { useLifeOS } from "../lib/LifeOSContext";

function isSynapseImportUrl(url: string | null) {
  if (!url) return false;
  return url.startsWith("lifeos://import/synapse") || url.includes("import/synapse");
}

/** Listens for lifeos://import/synapse deep links and merges Synapse day-plan events. */
export function SynapseImportBridge() {
  const { workspace, updateCalendar } = useLifeOS();
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;

  useEffect(() => {
    const applyUrl = (url: string | null) => {
      if (!isSynapseImportUrl(url) || !url) return;
      try {
        const events = parseSynapseDayPlan(url);
        if (!events.length) {
          Alert.alert(
            "Synapse import",
            "Opened from Synapse, but no events were in the link. Paste the day-plan JSON in Settings → Synapse.",
          );
          return;
        }
        const merged = mergeSynapseCalendarEvents(workspaceRef.current.calendar, events);
        void updateCalendar(merged as typeof workspaceRef.current.calendar);
        Alert.alert(
          "Synapse day plan imported",
          `${events.length} health event${events.length === 1 ? "" : "s"} added to your calendar. Prior Synapse events were replaced.`,
        );
      } catch (error) {
        Alert.alert(
          "Synapse import",
          error instanceof Error
            ? error.message
            : "Could not read that Synapse day plan. Paste the JSON in Settings → Synapse.",
        );
      }
    };

    void Linking.getInitialURL().then(applyUrl);
    const sub = Linking.addEventListener("url", ({ url }) => applyUrl(url));
    return () => sub.remove();
  }, [updateCalendar]);

  return null;
}
