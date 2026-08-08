import * as WebBrowser from "expo-web-browser";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { auth, deleteNotebookPageRemote, loadWorkspace, saveNotebookPage, saveWorkspacePart } from "./src/lib/firebase";
import type { NotebookPage, Workspace } from "./src/types";
import { LifeOSContext, type AppState } from "./src/lib/LifeOSContext";
import { LIGHT, DARK } from "./src/lib/theme";
import { SignIn } from "./src/components/Auth";
import { RootNavigator } from "./src/navigation/RootNavigator";

// Required once at module load so the OAuth redirect from Google's web
// sign-in flow can close the in-app browser and return control to the app.
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const systemDark = useColorScheme() === "dark";
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const themeMode = workspace?.settings.themeMode ?? "system";
  const dark = themeMode === "system" ? systemDark : themeMode === "dark";
  const theme = dark ? DARK : LIGHT;

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

  const sync = useCallback(async () => {
    if (!user) return;
    setWorkspace(await loadWorkspace(user.uid));
  }, [user]);

  useEffect(() => {
    if (user) sync().catch((error) => Alert.alert("Could not load LifeOS", error.message));
  }, [user, sync]);

  // Optimistic-update + persist pattern: update local state immediately so
  // the UI feels instant, then write through to Firebase in the background.
  // Covers every top-level Workspace key, old and new (tasks, projects,
  // notes, settings, classes, calendar, brain, resources).
  const savePart = useCallback(
    async <K extends keyof Workspace>(key: K, value: Workspace[K]) => {
      if (!user || !workspace) return;
      setWorkspace((current) => (current ? { ...current, [key]: value } : current));
      try {
        await saveWorkspacePart(user.uid, key, value);
      } catch (error: any) {
        Alert.alert("Could not save", error.message);
      }
    },
    [user, workspace],
  );

  const upsertNotebookPage = useCallback(
    async (page: NotebookPage) => {
      if (!user) return;
      setWorkspace((current) =>
        current
          ? { ...current, notebookPages: { ...current.notebookPages, [page.id]: page } }
          : current,
      );
      try {
        await saveNotebookPage(user.uid, page);
      } catch (error: any) {
        Alert.alert("Could not save page", error.message);
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
      try {
        await deleteNotebookPageRemote(user.uid, pageId);
      } catch (error: any) {
        Alert.alert("Could not delete page", error.message);
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
