import { useEffect, useRef } from "react";
import { Alert, AppState, Linking, type AppStateStatus } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  drainPendingKeptCommands,
  isKeptUrl,
  parseKeptUrl,
  type PendingKeptCommand,
} from "../lib/siri/kept";
import { executeKeptCommand, emptyKeptHub, type KeptHub } from "../lib/kept/shared";
import { loadKeptHub, saveKeptHub } from "../lib/kept/store";
import { navigationRef } from "../navigation/navigationRef";

/** Handles Siri Remember/Find Kept intents via App Group + deep links. */
export function SiriKeptBridge() {
  const { user } = useLifeOS();
  const busyRef = useRef(false);

  useEffect(() => {
    const apply = async (command: PendingKeptCommand) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        let hub: KeptHub = emptyKeptHub();
        try {
          hub = await loadKeptHub(user.uid);
        } catch {
          hub = emptyKeptHub();
        }
        const result = executeKeptCommand(
          hub,
          command.kind === "SAVE"
            ? { kind: "SAVE", name: command.name, location: command.location }
            : { kind: "FIND", query: command.query },
          { includePrivate: true },
        );
        if (result.ok && (command.kind === "SAVE")) {
          await saveKeptHub(user.uid, result.hub);
        }
        Alert.alert("Kept", result.message);
        const tryNav = (attempt: number) => {
          if (navigationRef.isReady()) {
            navigationRef.navigate("KeptTab" as never);
            return;
          }
          if (attempt >= 15) return;
          setTimeout(() => tryNav(attempt + 1), 100);
        };
        tryNav(0);
      } catch (error) {
        console.warn("[siri-kept] apply failed", error);
      } finally {
        busyRef.current = false;
      }
    };

    const applyUrl = (url: string | null) => {
      if (!url || !isKeptUrl(url)) return;
      const command = parseKeptUrl(url);
      if (command) void apply(command);
    };

    const drain = async () => {
      const pending = await drainPendingKeptCommands();
      for (const command of pending) await apply(command);
    };

    void Linking.getInitialURL().then(applyUrl);
    void drain();

    const linkSub = Linking.addEventListener("url", ({ url }) => applyUrl(url));
    const appSub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") void drain();
    });

    return () => {
      linkSub.remove();
      appSub.remove();
    };
  }, [user.uid]);

  return null;
}
