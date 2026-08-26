import Feather from "@expo/vector-icons/Feather";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ActionButton, Eyebrow, Page, Subtitle, Title } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { taskIsOpen, toDateKey } from "../lib/helpers";
import { parseGoalPlan, coachDay } from "../lib/api";
import {
  assessPlanStrength,
  fallbackCoachDay,
  fallbackParseGoal,
  type CoachDayPlan,
  type CoachRecommendation,
  type FlowScreen,
  type ParsedGoalPlan,
} from "../lib/focusFlow/shared";

const SCREENS: { key: FlowScreen; label: string }[] = [
  { key: "talk", label: "Talk → plan" },
  { key: "focus", label: "Focus" },
  { key: "coach", label: "Daily coach" },
  { key: "strength", label: "Plan strength" },
];

export function FocusFlowScreen() {
  const { workspace, theme, updateTasks, updateSettings, updateCalendar, updateProjects } = useLifeOS();
  const navigation = useNavigation<any>();
  const [screen, setScreen] = useState<FlowScreen>("talk");
  const [goalText, setGoalText] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<ParsedGoalPlan | null>(null);
  const [coach, setCoach] = useState<CoachDayPlan | null>(null);
  const [notice, setNotice] = useState("");

  const today = toDateKey(new Date());
  const openTasks = useMemo(() => workspace.tasks.filter(taskIsOpen), [workspace.tasks]);
  const current = openTasks.find((task) => task.id === workspace.settings.nowTaskId) ?? openTasks[0];
  const projectNames = useMemo(
    () => [
      ...workspace.projects.map((project) => project.name).filter(Boolean),
      ...workspace.classes.map((item) => item.code).filter(Boolean),
    ],
    [workspace.projects, workspace.classes],
  );

  const strength = useMemo(
    () =>
      assessPlanStrength({
        today,
        tasks: workspace.tasks,
        momentumLog: workspace.settings.momentumLog ?? [],
        weeklyPlan: workspace.settings.weeklyPlan ?? {},
      }),
    [today, workspace.tasks, workspace.settings.momentumLog, workspace.settings.weeklyPlan],
  );

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 2800);
  };

  const runParse = async () => {
    const trimmed = goalText.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const next = await parseGoalPlan(trimmed, projectNames);
      setPlan(next);
    } catch {
      setPlan(fallbackParseGoal(trimmed, projectNames));
      flash("Using local parsing while AI is unavailable.");
    } finally {
      setBusy(false);
    }
  };

  const commitPlan = async () => {
    if (!plan) return;
    if (plan.projectName && plan.projectName !== "Inbox" && !workspace.projects.some((p) => p.name === plan.projectName)) {
      await updateProjects([
        ...workspace.projects,
        {
          name: plan.projectName,
          desc: "Created from Focus Flow",
          color: "#665df6",
          iconName: "FolderKanban",
          kind: "finishable",
          progress: 0,
        },
      ]);
    }
    const created = plan.tasks.map((task) => ({
      id: Date.now() + Math.floor(Math.random() * 1000),
      title: task.title,
      project: plan.projectName || "Inbox",
      color: "#665df6",
      due: today,
      priority: task.priority,
      focusMinutes: task.focusMinutes,
      energy: task.energy,
      status: "Not started" as const,
    }));
    await updateTasks([...created, ...workspace.tasks]);
    if (created[0]) {
      await updateSettings({ ...workspace.settings, nowTaskId: created[0].id });
    }
    flash(`Plan created · ${created.length} tasks`);
    setScreen("focus");
  };

  const loadCoach = useCallback(async () => {
    setBusy(true);
    try {
      const next = await coachDay({
        today,
        context: {
          tasks: openTasks.slice(0, 20).map((task) => ({
            id: task.id,
            title: task.title,
            due: task.due,
            priority: task.priority,
            focusMinutes: task.focusMinutes,
          })),
          events: workspace.calendar.slice(0, 20).map((event) => ({
            title: event.title,
            start: event.start,
          })),
          currentTaskId: current?.id ?? null,
        },
      });
      setCoach(next);
    } catch {
      setCoach(
        fallbackCoachDay({
          today,
          tasks: openTasks,
          events: workspace.calendar,
          currentTaskId: current?.id ?? null,
        }),
      );
      flash("Using local coach while AI is unavailable.");
    } finally {
      setBusy(false);
    }
  }, [today, openTasks, workspace.calendar, current?.id]);

  const applyRecommendation = async (rec: CoachRecommendation) => {
    if (rec.action === "focus_task" && rec.taskId) {
      await updateSettings({ ...workspace.settings, nowTaskId: rec.taskId });
      navigation.navigate("Focus", { openFocus: true });
      return;
    }
    if (rec.action === "choose_task" && rec.taskId) {
      await updateSettings({ ...workspace.settings, nowTaskId: rec.taskId });
      flash("Current task updated");
      return;
    }
    if (rec.action === "rename_task" && rec.taskId && rec.newTitle) {
      await updateTasks(
        workspace.tasks.map((task) => (task.id === rec.taskId ? { ...task, title: rec.newTitle! } : task)),
      );
      flash("Task updated");
      return;
    }
    if (rec.action === "add_event" && rec.eventTitle && rec.eventStart) {
      await updateCalendar([
        {
          id: `lifeos-flow-${Date.now()}`,
          title: rec.eventTitle,
          start: rec.eventStart,
          end: rec.eventEnd,
          source: "LifeOS",
          color: "#665df6",
        },
        ...workspace.calendar,
      ]);
      flash("Calendar block added");
      return;
    }
    if (rec.action === "weekly_plan" && typeof rec.weeklyDay === "number" && rec.weeklyText) {
      const day = rec.weeklyDay;
      const weeklyPlan = { ...(workspace.settings.weeklyPlan ?? {}) };
      weeklyPlan[day] = [...(weeklyPlan[day] ?? []), { id: `flow-${Date.now()}`, text: rec.weeklyText }];
      await updateSettings({ ...workspace.settings, weeklyPlan });
      flash("Added to week plan");
    }
  };

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.screen}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={theme.text} />
        </Pressable>
        <Eyebrow>FOCUS FLOW</Eyebrow>
        <Title>Talk · Focus · Coach · Strength</Title>
        <Subtitle>Capture a goal, run a session, tune your day, and see an honest read on progress.</Subtitle>

        <View style={styles.tabs}>
          {SCREENS.map((item) => {
            const selected = screen === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  setScreen(item.key);
                  if (item.key === "coach" && !coach) void loadCoach();
                }}
                style={[
                  styles.tab,
                  {
                    backgroundColor: selected ? theme.text : theme.soft,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.tabLabel, { color: selected ? theme.surface : theme.text }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {notice ? <Text style={[styles.notice, { color: theme.accent }]}>{notice}</Text> : null}

        {screen === "talk" ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>What are you trying to get done?</Text>
            <TextInput
              value={goalText}
              onChangeText={setGoalText}
              placeholder="e.g. Finish Problem Set 1 and ship the portfolio revamp"
              placeholderTextColor={theme.muted}
              multiline
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.soft }]}
            />
            <ActionButton label={busy ? "Planning…" : "Turn into a plan"} onPress={() => void runParse()} />
            {busy ? <ActivityIndicator color={theme.accent} style={{ marginTop: 12 }} /> : null}
            {plan ? (
              <View style={styles.planBox}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{plan.goal}</Text>
                {plan.summary ? <Text style={[styles.meta, { color: theme.muted }]}>{plan.summary}</Text> : null}
                {plan.tasks.map((task, index) => (
                  <View key={`${task.title}-${index}`} style={[styles.planRow, { borderColor: theme.border }]}>
                    <Text style={[styles.badge, { color: theme.accent }]}>{task.badge}</Text>
                    <Text style={[styles.planTask, { color: theme.text }]}>{task.title}</Text>
                    <Text style={[styles.meta, { color: theme.muted }]}>
                      {task.focusMinutes} min · {task.priority} · {task.energy} energy
                    </Text>
                  </View>
                ))}
                <ActionButton label="Add these tasks" onPress={() => void commitPlan()} />
              </View>
            ) : null}
          </View>
        ) : null}

        {screen === "focus" ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {current ? current.title : "Pick a current task first"}
            </Text>
            {current ? (
              <>
                <Text style={[styles.meta, { color: theme.muted }]}>
                  {current.project || "Inbox"} · {current.focusMinutes ?? 45} min
                </Text>
                <ActionButton
                  label="Start focus session"
                  onPress={() => {
                    void updateSettings({ ...workspace.settings, nowTaskId: current.id });
                    navigation.navigate("Focus", { openFocus: true });
                  }}
                />
              </>
            ) : (
              <ActionButton label="Go to Tasks" onPress={() => navigation.navigate("TasksTab")} />
            )}
          </View>
        ) : null}

        {screen === "coach" ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{coach?.headline || "Daily coach"}</Text>
              <Pressable onPress={() => void loadCoach()}>
                <Text style={{ color: theme.accent, fontWeight: "700" }}>{busy ? "…" : "Refresh"}</Text>
              </Pressable>
            </View>
            {coach?.summary ? <Text style={[styles.meta, { color: theme.muted }]}>{coach.summary}</Text> : null}
            {(coach?.recommendations ?? []).map((rec) => (
              <View key={rec.id} style={[styles.planRow, { borderColor: theme.border }]}>
                <Text style={[styles.planTask, { color: theme.text }]}>{rec.text}</Text>
                <ActionButton label="Apply" onPress={() => void applyRecommendation(rec)} />
              </View>
            ))}
            {!coach && !busy ? <ActionButton label="Get today’s coaching" onPress={() => void loadCoach()} /> : null}
          </View>
        ) : null}

        {screen === "strength" ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.strengthLevel, { color: theme.text }]}>{strength.level}</Text>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{strength.headline}</Text>
            <Text style={[styles.meta, { color: theme.muted }]}>{strength.summary}</Text>
            <Text style={[styles.percent, { color: theme.accent }]}>{strength.alignmentPercent}% aligned</Text>
            {strength.looksGood.map((item) => (
              <Text key={item} style={[styles.meta, { color: theme.text }]}>
                ✓ {item}
              </Text>
            ))}
            {strength.recommendations.map((rec) => (
              <View key={rec.id} style={[styles.planRow, { borderColor: theme.border }]}>
                <Text style={[styles.planTask, { color: theme.text }]}>{rec.text}</Text>
                <ActionButton label="Apply" onPress={() => void applyRecommendation(rec)} />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 40, gap: 14 },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tab: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  tabLabel: { fontSize: 12, fontWeight: "800" },
  notice: { fontSize: 13, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  planBox: { gap: 10, marginTop: 4 },
  planRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 6 },
  planTask: { fontSize: 15, fontWeight: "700" },
  badge: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  meta: { fontSize: 13, lineHeight: 18 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  strengthLevel: { fontSize: 28, fontWeight: "900" },
  percent: { fontSize: 15, fontWeight: "800" },
});
