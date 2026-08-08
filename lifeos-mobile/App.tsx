import * as WebBrowser from "expo-web-browser";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState as RNAppState, StyleSheet, Text, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { auth, deleteNotebookPageRemote, loadWorkspace, saveNotebookPage, saveWorkspacePart } from "./src/lib/firebase";
import { clearCachedPageInk } from "./src/lib/inkCache";
import type { NotebookPage, Workspace } from "./src/types";
import { LifeOSContext, type AppState } from "./src/lib/LifeOSContext";
import { applyOtaUpdateIfAvailable } from "./src/lib/ota";
import { resolveTheme } from "./src/lib/theme";
import { SignIn } from "./src/components/Auth";
import { SynapseImportBridge } from "./src/components/SynapseImportBridge";
import { RootNavigator } from "./src/navigation/RootNavigator";

// Required once at module load so the OAuth redirect from Google's web
// sign-in flow can close the in-app browser and return control to the app.
WebBrowser.maybeCompleteAuthSession();

const SILENT_SYNC_MS = 60_000;

function inkHasData(ink: NotebookPage["ink"] | undefined): boolean {
  if (!ink) return false;
  if (typeof ink.data === "string" && ink.data.length > 0) return true;
  if (typeof ink.pencilKitData === "string" && ink.pencilKitData.length > 0) return true;
  return (ink.strokes?.length ?? 0) > 0;
}

export default function App() {
  const systemDark = useColorScheme() === "dark";
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingWrites = useRef(0);
  /** Wall-clock of last successful local write — silent sync must not apply a fetch that started earlier. */
  const lastWriteAt = useRef(0);
  const themeMode = workspace?.settings.themeMode ?? "system";
  const dark = themeMode === "system" ? systemDark : themeMode === "dark";
  const theme = resolveTheme(dark, workspace?.settings.accent);

  useEffect(() => {
    void applyOtaUpdateIfAvailable();
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Wait until AsyncStorage persistence has restored (or confirmed null)
    // before showing SignIn — avoids a false logged-out flash on cold start.
    void auth.authStateReady().then(() => {
      if (cancelled) return;
      setUser(auth.currentUser);
      setLoading(false);
      if (!auth.currentUser) setWorkspace(null);
    });
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      if (cancelled) return;
      setUser(nextUser);
      setLoading(false);
      if (!nextUser) setWorkspace(null);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  /** Prefer newer local notebook pages so a stale fetch can't wipe ink. */
  const mergeRemoteWorkspace = useCallback((local: Workspace, remote: Workspace): Workspace => {
    const mergedPages = { ...remote.notebookPages };
    for (const [id, localPage] of Object.entries(local.notebookPages)) {
      const remotePage = mergedPages[id];
      if (!remotePage) {
        mergedPages[id] = localPage;
        continue;
      }
      const localTs = localPage.updatedAt ?? "";
      const remoteTs = remotePage.updatedAt ?? "";
      // Never let a remote page without ink erase local strokes — sync races do this often.
      if (inkHasData(localPage.ink) && !inkHasData(remotePage.ink)) {
        mergedPages[id] = {
          ...remotePage,
          ...localPage,
          ink: localPage.ink,
          updatedAt: localTs > remoteTs ? localTs : remotePage.updatedAt,
        };
        continue;
      }
      if (localTs > remoteTs) {
        mergedPages[id] = localPage;
      }
    }
    return { ...remote, notebookPages: mergedPages };
  }, []);

  const sync = useCallback(async () => {
    if (!user) return;
    if (pendingWrites.current > 0) return;
    const startedAt = Date.now();
    const next = await loadWorkspace(user.uid);
    if (pendingWrites.current > 0 || lastWriteAt.current >= startedAt) return;
    setWorkspace((current) => (current ? mergeRemoteWorkspace(current, next) : next));
  }, [user, mergeRemoteWorkspace]);

  /** Pull latest Firebase data with no UI chrome — used by the 60s poll. */
  const silentSync = useCallback(async () => {
    if (!user || pendingWrites.current > 0) return;
    const startedAt = Date.now();
    try {
      const next = await loadWorkspace(user.uid);
      // A local write started or finished while we were fetching — keep optimistic state.
      if (pendingWrites.current > 0 || lastWriteAt.current >= startedAt) return;
      setWorkspace((current) => (current ? mergeRemoteWorkspace(current, next) : next));
    } catch {
      // Stay quiet; the next tick (or manual Sync) can retry.
    }
  }, [user, mergeRemoteWorkspace]);

  useEffect(() => {
    if (!user) return;
    // Initial load is a full replace (no local optimistic state yet).
    loadWorkspace(user.uid)
      .then((next) => setWorkspace(next))
      .catch((error) => Alert.alert("Could not load LifeOS", error.message));
  }, [user]);

  // Keep phone + web in step: refresh from Firebase every 60s while active,
  // and once immediately when returning from background. No toasts/alerts.
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        void silentSync();
      }, SILENT_SYNC_MS);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };
    if (RNAppState.currentState === "active") start();
    const sub = RNAppState.addEventListener("change", (state) => {
      if (state === "active") {
        void silentSync();
        start();
      } else {
        stop();
      }
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [user, silentSync]);

  // Optimistic-update + persist pattern: update local state immediately so
  // the UI feels instant, then write through to Firebase in the background.
  // Covers every top-level Workspace key, old and new (tasks, projects,
  // notes, settings, classes, calendar, brain, resources).
  const savePart = useCallback(
    async <K extends keyof Workspace>(key: K, value: Workspace[K]) => {
      if (!user || !workspace) return;
      setWorkspace((current) => (current ? { ...current, [key]: value } : current));
      pendingWrites.current += 1;
      try {
        await saveWorkspacePart(user.uid, key, value);
        lastWriteAt.current = Date.now();
      } catch (error: any) {
        Alert.alert("Could not save", error.message);
      } finally {
        pendingWrites.current -= 1;
      }
    },
    [user, workspace],
  );

  const upsertNotebookPage = useCallback(
    async (page: NotebookPage) => {
      if (!user) return;
      // Merge against latest local page so a stale caller can't drop ink/text.
      let toSave: NotebookPage = page;
      setWorkspace((current) => {
        if (!current) return current;
        const prev = current.notebookPages[page.id];
        toSave = prev ? { ...prev, ...page, id: page.id } : page;
        // Keep strokes unless the incoming page explicitly carries ink data.
        if (!inkHasData(toSave.ink) && inkHasData(prev?.ink)) {
          toSave = { ...toSave, ink: prev!.ink };
        }
        return {
          ...current,
          notebookPages: { ...current.notebookPages, [page.id]: toSave },
        };
      });
      pendingWrites.current += 1;
      try {
        await saveNotebookPage(user.uid, toSave);
        lastWriteAt.current = Date.now();
      } catch (error: any) {
        Alert.alert("Could not save page", error.message);
      } finally {
        pendingWrites.current -= 1;
      }
    },
    [user],
  );

  const deleteNotebookPage = useCallback(
    async (pageId: string) => {
      if (!user) return;
      setWorkspace((current) => {
        if (!current) return current;
        const next = { ...current.notebookPages };
        delete next[pageId];
        return { ...current, notebookPages: next };
      });
      pendingWrites.current += 1;
      try {
        await clearCachedPageInk(pageId);
        await deleteNotebookPageRemote(user.uid, pageId);
        lastWriteAt.current = Date.now();
      } catch (error: any) {
        Alert.alert("Could not delete page", error.message);
      } finally {
        pendingWrites.current -= 1;
      }
    },
    [user],
  );

  if (loading || (user && !workspace)) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <SafeAreaView style={[styles.loader, { backgroundColor: theme.bg }]}>
            <ActivityIndicator color={theme.accent} />
            <Text style={{ color: theme.muted, marginTop: 12, fontSize: 14 }}>Opening LifeOS…</Text>
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!user) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <SignIn />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  const state: AppState = {
    user,
    workspace: workspace!,
    theme,
    dark,
    sync,
    updateTasks: (value) => savePart("tasks", value),
    updateProjects: (value) => savePart("projects", value),
    updateNotes: (value) => savePart("notes", value),
    updateSettings: (value) => savePart("settings", value),
    updateClasses: (value) => savePart("classes", value),
    updateCalendar: (value) => savePart("calendar", value),
    updateBrain: (value) => savePart("brain", value),
    updateResources: (value) => savePart("resources", value),
    updateLife: (value) => savePart("life", value),
    updateSchool: (value) => savePart("school", value),
    updateNotebookHub: (value) => savePart("notebookHub", value),
    upsertNotebookPage,
    deleteNotebookPage,
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <LifeOSContext.Provider value={state}>
          <SynapseImportBridge />
          <RootNavigator />
        </LifeOSContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
});
