import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ActionButton, Card, Empty, Eyebrow, IconButton, Page, Subtitle, Title } from "../components/UI";
import { QuickCaptureModal } from "../components/QuickCaptureModal";
import { AiTaskModal } from "../components/AiTaskModal";
import { AmbientStartModal, AmbientWrapupModal, BreakModal } from "../components/AmbientModals";
import { SearchModal } from "../components/SearchModal";
import { PlanTomorrowModal } from "../components/PlanTomorrowModal";
import { SwipeDeleteRow } from "../components/SwipeDeleteRow";
import { useLifeOS } from "../lib/LifeOSContext";
import { formatAmbientDuration, formatDueDate, getGreeting, taskIsOpen } from "../lib/helpers";
import { PRIORITY_RANK } from "../lib/helpers";
import { FocusModal } from "../components/FocusModal";

export function NowScreen() {
  const { workspace, theme, updateSettings, updateTasks } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [focusOpen, setFocusOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [ambientStartOpen, setAmbientStartOpen] = useState(false);
  const [ambientWrapupOpen, setAmbientWrapupOpen] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [planTomorrowOpen, setPlanTomorrowOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Deep link / notification: open Focus for running or paused session.
  useEffect(() => {
    if (!route.params?.openFocus) return;
    const focusTask =
      workspace.tasks.find((t) => t.focusSessionRunning && taskIsOpen(t)) ||
      workspace.tasks.find((t) => t.focusSessionStarted && taskIsOpen(t) && (t.focusRemainingSeconds ?? 0) > 0);
    if (focusTask) {
      if (workspace.settings.nowTaskId !== focusTask.id) {
        void updateSettings({ ...workspace.settings, nowTaskId: focusTask.id });
      }
      setFocusOpen(true);
    }
    navigation.setParams?.({ openFocus: undefined });
  }, [route.params?.openFocus, workspace.tasks]);

  const current = workspace.tasks.find((task) => task.id === workspace.settings.nowTaskId && taskIsOpen(task));
  const focusTask =
    current ||
    workspace.tasks.find((t) => t.focusSessionRunning && taskIsOpen(t)) ||
    workspace.tasks.find((t) => t.focusSessionStarted && taskIsOpen(t) && (t.focusRemainingSeconds ?? 0) > 0);
  const suggestions = workspace.tasks
    .filter(taskIsOpen)
    .filter((task) => task.id !== current?.id)
    .sort((a, b) => {
      const priority = PRIORITY_RANK;
      return (priority[a.priority ?? "Medium"] - priority[b.priority ?? "Medium"]) || String(a.due ?? "9999").localeCompare(String(b.due ?? "9999"));
    })
    .slice(0, 4);
  const greeting = getGreeting(new Date(), workspace.settings.preferredName || "there");
  const ambient = workspace.settings.ambientActivity;

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.headerRow}>
          <View style={styles.grow}>
            <Eyebrow>ONE THING, ON PURPOSE</Eyebrow>
            <Title>{greeting}</Title>
          </View>
          <IconButton icon="search" label="Search LifeOS" onPress={() => setSearchOpen(true)} />
          <IconButton icon="settings" label="Settings" onPress={() => navigation.navigate("Settings")} />
        </View>
        <Subtitle>LifeOS can suggest the next move. You still choose what gets your attention.</Subtitle>

        <Pressable
          onPress={() => setPlanTomorrowOpen(true)}
          style={[styles.planCard, { backgroundColor: theme.soft, borderColor: theme.accent }]}
        >
          <Feather name="sun" size={18} color={theme.accent} />
          <View style={styles.grow}>
            <Text style={[styles.planTitle, { color: theme.text }]}>Wanna plan for tomorrow?</Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>Pick up to three things for tomorrow.</Text>
          </View>
          <Feather name="chevron-right" size={18} color={theme.accent} />
        </Pressable>

        <View style={styles.quickRow}>
          <Pressable onPress={() => setCaptureOpen(true)} style={[styles.quickAction, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name="zap" size={15} color={theme.accent} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>Quick capture</Text>
          </Pressable>
          <Pressable onPress={() => setAiOpen(true)} style={[styles.quickAction, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name="star" size={15} color={theme.accent} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>AI task</Text>
          </Pressable>
          <Pressable onPress={() => (ambient ? setAmbientWrapupOpen(true) : setAmbientStartOpen(true))} style={[styles.quickAction, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name="clock" size={15} color={theme.accent} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>{ambient ? "Doing something" : "I'm doing something"}</Text>
          </Pressable>
          <Pressable onPress={() => setBreakOpen(true)} style={[styles.quickAction, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name="coffee" size={15} color={theme.accent} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>Need a break</Text>
          </Pressable>
        </View>

        {ambient ? (
          <Pressable onPress={() => setAmbientWrapupOpen(true)} style={[styles.ambientStrip, { backgroundColor: theme.soft, borderColor: theme.accent }]}>
            <Feather name="clock" size={16} color={theme.accent} />
            <View style={styles.grow}>
              <Text style={[styles.ambientLabel, { color: theme.accent }]}>YOU'RE ALREADY DOING IT</Text>
              <Text style={[styles.ambientTitle, { color: theme.text }]}>{ambient.title}</Text>
              <Text style={[styles.ambientMeta, { color: theme.muted }]}>{formatAmbientDuration(now - new Date(ambient.startedAt).getTime())} so far · no planning required</Text>
            </View>
            <Feather name="arrow-right" size={16} color={theme.accent} />
          </Pressable>
        ) : null}

        <Card>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardLabel, { color: theme.text }]}>Now</Text>
            {current ? (
              <Pressable onPress={() => updateSettings({ ...workspace.settings, nowTaskId: null })}>
                <Text style={[styles.link, { color: theme.accent }]}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
          {current ? (
            <>
              <Text style={[styles.taskTitle, { color: theme.text }]}>{current.title}</Text>
              <Text style={[styles.taskMeta, { color: theme.muted }]}>
                {current.project || "Personal"} · {current.focusMinutes ?? 25} min · {current.energy ?? "Medium"} energy
              </Text>
              <View style={styles.row}>
                <ActionButton label="Focus" icon="target" onPress={() => setFocusOpen(true)} />
                <ActionButton
                  label="Open"
                  icon="external-link"
                  quiet
                  onPress={() => navigation.navigate("TaskDetail", { taskId: current.id })}
                />
                <ActionButton
                  label="Done"
                  icon="check"
                  quiet
                  onPress={() => {
                    updateTasks(
                      workspace.tasks.map((task) =>
                        task.id === current.id
                          ? { ...task, done: true, completedAt: new Date().toISOString(), status: "Done" }
                          : task,
                      ),
                    );
                    updateSettings({ ...workspace.settings, nowTaskId: null });
                  }}
                />
              </View>
            </>
          ) : (
            <Empty title="Nothing is claiming your attention." body="Pick a good next choice when you're ready." />
          )}
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Good next choices</Text>
        {suggestions.length ? (
          suggestions.map((task) => (
            <SwipeDeleteRow
              key={task.id}
              label={task.title}
              confirmTitle="Delete task"
              onDelete={() => updateTasks(workspace.tasks.filter((t) => t.id !== task.id))}
            >
              <Pressable
                onPress={() => updateSettings({ ...workspace.settings, nowTaskId: task.id })}
                style={({ pressed }) => [
                  styles.choice,
                  { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: task.color || theme.accent }]} />
                <View style={styles.grow}>
                  <Text style={[styles.choiceTitle, { color: theme.text }]}>{task.title}</Text>
                  <Text style={[styles.choiceMeta, { color: theme.muted }]}>
                    {task.project || "Personal"} · Due {formatDueDate(task.due)} · {task.focusMinutes ?? 25} min
                  </Text>
                </View>
                <Feather name="arrow-up-right" size={18} color={theme.muted} />
              </Pressable>
            </SwipeDeleteRow>
          ))
        ) : (
          <Card>
            <Empty title="You're clear." body="Add a task on the web or capture a thought when something new arrives." />
          </Card>
        )}
      </ScrollView>

      {focusTask ? <FocusModal visible={focusOpen} task={focusTask} onClose={() => setFocusOpen(false)} /> : null}
      <QuickCaptureModal visible={captureOpen} onClose={() => setCaptureOpen(false)} />
      <AiTaskModal visible={aiOpen} onClose={() => setAiOpen(false)} />
      <AmbientStartModal visible={ambientStartOpen} onClose={() => setAmbientStartOpen(false)} />
      <AmbientWrapupModal visible={ambientWrapupOpen} activity={ambient ?? null} onClose={() => setAmbientWrapupOpen(false)} />
      <BreakModal visible={breakOpen} onClose={() => setBreakOpen(false)} />
      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
      <PlanTomorrowModal visible={planTomorrowOpen} onClose={() => setPlanTomorrowOpen(false)} />
    </Page>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  screen: { padding: 20, paddingBottom: 28, gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickAction: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  quickActionText: { fontSize: 12, fontWeight: "700" },
  ambientStrip: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 16, padding: 14 },
  ambientLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  ambientTitle: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  ambientMeta: { fontSize: 12, marginTop: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { fontSize: 16, fontWeight: "800" },
  taskTitle: { fontSize: 26, fontWeight: "700", lineHeight: 32 },
  taskMeta: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  link: { fontWeight: "800", fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginTop: 8 },
  choice: { minHeight: 74, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  choiceTitle: { fontSize: 15, fontWeight: "800", lineHeight: 20 },
  choiceMeta: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
  },
  planTitle: { fontSize: 16, fontWeight: "800" },
});
