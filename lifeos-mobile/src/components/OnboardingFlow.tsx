import Feather from "@expo/vector-icons/Feather";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLifeOS } from "../lib/LifeOSContext";
import { createNotebook, createPage } from "../lib/notebooks";
import type { OnboardingDestination, Task } from "../types";

type Interest = "life" | "school" | "work" | "notes" | "today";

type Props = {
  onFinished: (destination?: OnboardingDestination) => void;
};

const INTERESTS: {
  id: Interest;
  label: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { id: "life", label: "HomeOS", desc: "Personal home base — habits, day log, projects", icon: "home" },
  { id: "school", label: "School", desc: "Classes & academics", icon: "award" },
  { id: "work", label: "Work", desc: "Professional projects & deliverables", icon: "briefcase" },
  { id: "notes", label: "Notes", desc: "Handwriting & library", icon: "edit-3" },
  { id: "today", label: "Just today", desc: "Priorities on Now", icon: "zap" },
];

const MOVES: {
  id: "thought" | "priority" | "note" | "explore";
  label: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { id: "thought", label: "Capture a thought", desc: "Drop something into MindDump", icon: "cloud" },
  { id: "priority", label: "Add a priority", desc: "Create your first task", icon: "check-circle" },
  { id: "note", label: "Start a note", desc: "Open a blank page to write", icon: "book-open" },
  { id: "explore", label: "Explore on my own", desc: "Jump straight into Now", icon: "compass" },
];

/**
 * First-run onboarding: welcome → name → interests → first move → done.
 * Skippable; persists env flags + onboardingCompletedAt via parent.
 */
export function OnboardingFlow({ onFinished }: Props) {
  const { theme, workspace, updateSettings, updateBrain, updateTasks, updateNotebookHub, upsertNotebookPage } =
    useLifeOS();
  const insets = useSafeAreaInsets();
  const reduceMotion = Boolean(workspace.settings.reduceMotion);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(workspace.settings.preferredName ?? "");
  const [interests, setInterests] = useState<Set<Interest>>(() => {
    const next = new Set<Interest>();
    if (workspace.settings.enableLifeOS !== false) next.add("life");
    if (workspace.settings.enableSchoolOS !== false) next.add("school");
    if (workspace.settings.enableWorkOS !== false) next.add("work");
    return next.size ? next : new Set<Interest>(["life", "today"]);
  });
  const [busy, setBusy] = useState(false);
  const [pendingDest, setPendingDest] = useState<OnboardingDestination>({ tab: "NowTab" });
  const [pendingExtra, setPendingExtra] = useState<Partial<typeof workspace.settings>>({});

  const totalSteps = 5;
  const progress = useMemo(() => Array.from({ length: totalSteps }, (_, i) => i <= step), [step]);

  // Claim the flow immediately so saving a name mid-onboarding cannot trigger
  // the legacy "existing user" auto-complete in RootNavigator.
  useEffect(() => {
    if (workspace.settings.onboardingVersion != null) return;
    void updateSettings({ ...workspace.settings, onboardingVersion: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per flow
  }, []);

  const finish = async (destination?: OnboardingDestination, extra?: Partial<typeof workspace.settings>) => {
    setBusy(true);
    try {
      // Tell the parent the destination before flipping onboardingCompletedAt
      // so navigation can run as soon as tabs mount.
      onFinished(destination);
      await updateSettings({
        ...workspace.settings,
        ...extra,
        onboardingCompletedAt: new Date().toISOString(),
        onboardingVersion: 1,
      });
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    void finish({ tab: "NowTab" });
  };

  const arriveAtDone = (destination: OnboardingDestination, extra: Partial<typeof workspace.settings>) => {
    setPendingDest(destination);
    setPendingExtra(extra);
    setStep(4);
  };

  const toggleInterest = (id: Interest) => {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const interestsToSettings = () => ({
    preferredName: name.trim() || workspace.settings.preferredName,
    enableLifeOS: interests.has("life"),
    enableSchoolOS: interests.has("school"),
    enableWorkOS: interests.has("work"),
  });

  const goNextFromInterests = () => {
    if (interests.size === 0) {
      Alert.alert("Pick at least one", "Tell LifeOS what you’re here for — you can change this later in Settings.");
      return;
    }
    setStep(3);
  };

  const runFirstMove = (id: (typeof MOVES)[number]["id"]) => {
    const env = interestsToSettings();
    if (id === "explore") {
      arriveAtDone({ tab: "NowTab" }, env);
      return;
    }
    if (id === "thought") {
      const prompt = (text: string | undefined) => {
        const clean = (text ?? "").trim();
        const go = () => arriveAtDone({ tab: "LibraryTab", screen: "Brain" }, env);
        if (!clean) {
          go();
          return;
        }
        void updateBrain([clean, ...workspace.brain]).then(go);
      };
      if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
        Alert.prompt("Capture a thought", "What’s on your mind?", [
          { text: "Skip", style: "cancel", onPress: () => prompt(undefined) },
          { text: "Save", onPress: prompt },
        ]);
        return;
      }
      prompt("Welcome to LifeOS");
      return;
    }
    if (id === "priority") {
      const add = (title: string | undefined) => {
        const clean = (title ?? "").trim() || "My first priority";
        const task: Task = {
          id: Date.now(),
          title: clean,
          priority: "Medium",
          energy: workspace.settings.defaultEnergy ?? "Medium",
          focusMinutes: workspace.settings.defaultFocusMinutes ?? 45,
          status: "Not started",
        };
        void updateTasks([task, ...workspace.tasks]).then(() => arriveAtDone({ tab: "TasksTab" }, env));
      };
      if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
        Alert.prompt("Add a priority", "What should you focus on?", [
          { text: "Cancel", style: "cancel", onPress: () => arriveAtDone({ tab: "TasksTab" }, env) },
          { text: "Add", onPress: add },
        ]);
        return;
      }
      add("My first priority");
      return;
    }
    if (id === "note") {
      setBusy(true);
      void (async () => {
        try {
          const notebook = createNotebook("Untitled note", {
            context: { type: "personal", label: "Personal" },
          });
          const page = createPage(notebook.id, 0, "ruled");
          const hub = workspace.notebookHub;
          await updateNotebookHub({
            ...hub,
            notebooks: [notebook, ...hub.notebooks],
          });
          await upsertNotebookPage(page);
          arriveAtDone(
            { tab: "LibraryTab", screen: "PageCanvas", params: { notebookId: notebook.id, pageId: page.id } },
            env,
          );
        } finally {
          setBusy(false);
        }
      })();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <View style={styles.dots}>
          {progress.map((on, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: on ? theme.accent : theme.border },
                on && styles.dotOn,
              ]}
            />
          ))}
        </View>
        {step < 4 ? (
          <Pressable accessibilityLabel="Skip onboarding" onPress={skip} hitSlop={12} disabled={busy}>
            <Text style={{ color: theme.muted, fontWeight: "700", fontSize: 14 }}>Skip</Text>
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 ? (
          <View style={styles.hero}>
            <Image source={require("../../assets/icon.png")} style={styles.logo} accessibilityLabel="LifeOS" />
            <Text style={[styles.title, { color: theme.text }]}>Welcome to LifeOS</Text>
            <Text style={[styles.copy, { color: theme.muted }]}>
              LifeOS is where today, life, school, work, and notes stay in one place.
            </Text>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.hero}>
            <View style={[styles.iconBox, { backgroundColor: theme.soft }]}>
              <Feather name="smile" size={22} color={theme.accent} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>What should we call you?</Text>
            <Text style={[styles.copy, { color: theme.muted }]}>
              LifeOS will use this in your greeting. You can change it anytime.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus={!reduceMotion}
              placeholder="Your name"
              placeholderTextColor={theme.muted}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (name.trim()) setStep(2);
              }}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.hero}>
            <Text style={[styles.title, { color: theme.text }]}>What are you here for?</Text>
            <Text style={[styles.copy, { color: theme.muted }]}>
              Pick everything that fits — we’ll show the right spaces. You can change this later.
            </Text>
            <View style={styles.choiceList}>
              {INTERESTS.map((item) => {
                const on = interests.has(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleInterest(item.id)}
                    style={[
                      styles.choice,
                      {
                        borderColor: on ? theme.accent : theme.border,
                        backgroundColor: on ? theme.soft : theme.surface,
                      },
                    ]}
                  >
                    <View style={[styles.choiceIcon, { backgroundColor: on ? theme.accent : theme.bg }]}>
                      <Feather name={item.icon} size={16} color={on ? "#fff" : theme.muted} />
                    </View>
                    <View style={styles.choiceCopy}>
                      <Text style={{ color: theme.text, fontWeight: "800", fontSize: 16 }}>{item.label}</Text>
                      <Text style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>{item.desc}</Text>
                    </View>
                    {on ? <Feather name="check" size={18} color={theme.accent} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.hero}>
            <Text style={[styles.title, { color: theme.text }]}>Your first move</Text>
            <Text style={[styles.copy, { color: theme.muted }]}>
              Start with something real — or explore on your own.
            </Text>
            <View style={styles.choiceList}>
              {MOVES.map((item) => (
                <Pressable
                  key={item.id}
                  disabled={busy}
                  onPress={() => runFirstMove(item.id)}
                  style={[styles.choice, { borderColor: theme.border, backgroundColor: theme.surface }]}
                >
                  <View style={[styles.choiceIcon, { backgroundColor: theme.soft }]}>
                    <Feather name={item.icon} size={16} color={theme.accent} />
                  </View>
                  <View style={styles.choiceCopy}>
                    <Text style={{ color: theme.text, fontWeight: "800", fontSize: 16 }}>{item.label}</Text>
                    <Text style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>{item.desc}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.hero}>
            <View style={[styles.iconBox, { backgroundColor: theme.soft }]}>
              <Feather name="check-circle" size={22} color={theme.accent} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>You’re in</Text>
            <Text style={[styles.copy, { color: theme.muted }]}>
              Start from Now — everything else is a tab away.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        {step === 0 ? (
          <PrimaryButton label="Get started" theme={theme} disabled={busy} onPress={() => setStep(1)} />
        ) : null}
        {step === 1 ? (
          <PrimaryButton
            label="Continue"
            theme={theme}
            disabled={busy || !name.trim()}
            onPress={() => {
              void updateSettings({
                ...workspace.settings,
                preferredName: name.trim(),
                onboardingVersion: 1,
              });
              setStep(2);
            }}
          />
        ) : null}
        {step === 2 ? (
          <PrimaryButton label="Continue" theme={theme} disabled={busy} onPress={goNextFromInterests} />
        ) : null}
        {step === 4 ? (
          <PrimaryButton
            label="Open LifeOS"
            theme={theme}
            disabled={busy}
            onPress={() => void finish(pendingDest, pendingExtra)}
          />
        ) : null}
        {step === 3 ? (
          <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center", fontWeight: "600" }}>
            Or skip anytime from the top
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  theme,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  theme: { text: string; surface: string; muted: string };
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: theme.text, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.primaryText, { color: theme.surface }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOn: { width: 18 },
  body: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24, justifyContent: "center" },
  hero: { gap: 12, maxWidth: 480, width: "100%", alignSelf: "center" },
  logo: { width: 64, height: 64, borderRadius: 18, marginBottom: 4 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.6, lineHeight: 36 },
  copy: { fontSize: 16, lineHeight: 24, fontWeight: "500", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: "600",
    marginTop: 4,
  },
  choiceList: { gap: 10, marginTop: 4 },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  choiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceCopy: { flex: 1, minWidth: 0 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  primary: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontSize: 16, fontWeight: "800" },
});
