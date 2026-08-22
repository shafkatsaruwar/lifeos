import Feather from "@expo/vector-icons/Feather";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ActionButton, Eyebrow, IconButton, Page, Title } from "../components/UI";
import { SearchModal } from "../components/SearchModal";
import { useLifeOS } from "../lib/LifeOSContext";
import { formatAmbientDuration, getGreeting, taskIsOpen } from "../lib/helpers";
import { FocusModal } from "../components/FocusModal";
import { TodayBriefSection } from "../components/TodayBriefSection";
import { buildNowGlance } from "../lib/nowGlance";
import { AmbientWrapupModal } from "../components/AmbientModals";
import { RecordMemoryModal } from "../components/RecordMemoryModal";

export function NowScreen() {
  const { workspace, theme, updateSettings, updateTasks } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [focusOpen, setFocusOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [ambientWrapupOpen, setAmbientWrapupOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

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
  const greeting = getGreeting(new Date(), workspace.settings.preferredName || "there");
  const ambient = workspace.settings.ambientActivity;
  const glance = useMemo(
    () =>
      buildNowGlance({
        tasks: workspace.tasks,
        calendar: workspace.calendar,
        habits: workspace.life.habits,
        settings: workspace.settings,
        memories: workspace.settings.dayMemories,
      }),
    [workspace.tasks, workspace.calendar, workspace.life.habits, workspace.settings],
  );

  const shell = {
    backgroundColor: theme.surface,
    borderColor: theme.border,
  };

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
        <Text style={[styles.lede, { color: theme.muted }]}>
          One thing in front of you. The rest of the house is a glance away.
        </Text>

        {ambient ? (
          <Pressable
            onPress={() => setAmbientWrapupOpen(true)}
            style={[styles.ambientStrip, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Feather name="clock" size={16} color={theme.accent} />
            <View style={styles.grow}>
              <Text style={[styles.ambientTitle, { color: theme.text }]}>{ambient.title}</Text>
              <Text style={[styles.ambientMeta, { color: theme.muted }]}>
                {formatAmbientDuration(now - new Date(ambient.startedAt).getTime())} so far
              </Text>
            </View>
            <Feather name="arrow-right" size={16} color={theme.muted} />
          </Pressable>
        ) : null}

        <View style={[styles.block, shell]}>
          <View style={[styles.weekHead, { borderBottomColor: theme.border }]}>
            <View style={styles.grow}>
              <Text style={[styles.kicker, { color: theme.muted }]}>THIS WEEK · {glance.rangeLabel}</Text>
              <Text style={[styles.weekLine, { color: theme.text }]}>{glance.line}</Text>
            </View>
            <View style={styles.percentWrap}>
              <Text style={[styles.percent, { color: theme.text }]}>{glance.percent}%</Text>
              <Text style={[styles.percentHint, { color: theme.muted }]}>kept</Text>
            </View>
          </View>
          <View style={styles.grid}>
            <Tile
              title="Tasks"
              count={glance.tasksOpen === 1 ? "1 open" : `${glance.tasksOpen} open`}
              borderColor={theme.border}
              textColor={theme.text}
              mutedColor={theme.muted}
              onPress={() => navigation.navigate("TasksTab")}
            />
            <Tile
              title="Habits"
              count={
                glance.habitsTotal
                  ? `${glance.habitsKept} of ${glance.habitsTotal} kept`
                  : "none yet"
              }
              borderColor={theme.border}
              textColor={theme.text}
              mutedColor={theme.muted}
              lastCol
              onPress={() =>
                navigation.navigate("LifeTab", {
                  screen: "HubCollection",
                  params: { scope: "life", collection: "habits" },
                })
              }
            />
            <Tile
              title="Calendar"
              count={glance.nextEventLabel}
              borderColor={theme.border}
              textColor={theme.text}
              mutedColor={theme.muted}
              lastRow
              onPress={() => navigation.navigate("CalendarTab")}
            />
            <Tile
              title="Memories"
              count={
                glance.memoriesToday === 0
                  ? "none yet today"
                  : glance.memoriesToday === 1
                    ? "1 today"
                    : `${glance.memoriesToday} today`
              }
              borderColor={theme.border}
              textColor={theme.text}
              mutedColor={theme.muted}
              lastCol
              lastRow
              onPress={() => setMemoryOpen(true)}
            />
          </View>
        </View>

        <View style={[styles.block, shell]}>
          <View style={styles.nowHead}>
            <View style={styles.grow}>
              <Text style={[styles.kicker, { color: theme.muted }]}>NOW</Text>
              {current ? (
                <>
                  <Text style={[styles.nowTitle, { color: theme.text }]}>{current.title}</Text>
                  <Text style={[styles.nowMeta, { color: theme.muted }]}>
                    {current.project || "Personal"} · {current.focusMinutes ?? 25} min
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.nowTitle, { color: theme.text }]}>Nothing claiming you</Text>
                  <Text style={[styles.nowMeta, { color: theme.muted }]}>
                    Pick a next choice when you’re ready.
                  </Text>
                </>
              )}
            </View>
            {current ? (
              <Pressable onPress={() => updateSettings({ ...workspace.settings, nowTaskId: null })} hitSlop={8}>
                <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 12 }}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
          {current ? (
            <View style={[styles.nowActions, { borderTopColor: theme.border }]}>
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
          ) : null}
          <TodayBriefSection variant="inset" onOpenFocus={() => setFocusOpen(true)} />
        </View>
      </ScrollView>

      {focusTask ? <FocusModal visible={focusOpen} task={focusTask} onClose={() => setFocusOpen(false)} /> : null}
      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
      <RecordMemoryModal visible={memoryOpen} onClose={() => setMemoryOpen(false)} />
      <AmbientWrapupModal
        visible={ambientWrapupOpen}
        activity={ambient ?? null}
        onClose={() => setAmbientWrapupOpen(false)}
      />
    </Page>
  );
}

function Tile({
  title,
  count,
  onPress,
  borderColor,
  textColor,
  mutedColor,
  lastCol,
  lastRow,
}: {
  title: string;
  count: string;
  onPress: () => void;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  lastCol?: boolean;
  lastRow?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          borderRightColor: borderColor,
          borderBottomColor: borderColor,
          borderRightWidth: lastCol ? 0 : StyleSheet.hairlineWidth,
          borderBottomWidth: lastRow ? 0 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.65 : 1,
        },
      ]}
    >
      <Text style={[styles.tileTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.tileCount, { color: mutedColor }]} numberOfLines={2}>
        {count}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  screen: { padding: 20, paddingBottom: 36, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  lede: { fontSize: 13, lineHeight: 18, marginTop: -6 },
  block: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  weekHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kicker: { fontSize: 10, fontWeight: "800", letterSpacing: 0.7 },
  weekLine: { fontSize: 14, fontWeight: "600", marginTop: 5 },
  percentWrap: { alignItems: "flex-end" },
  percent: { fontSize: 22, fontWeight: "800", lineHeight: 24 },
  percentHint: { fontSize: 10, fontWeight: "700", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  tile: { width: "50%", paddingHorizontal: 14, paddingVertical: 12, minHeight: 72 },
  tileTitle: { fontSize: 13, fontWeight: "800" },
  tileCount: { fontSize: 12, marginTop: 3, lineHeight: 16 },
  nowHead: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  nowTitle: { fontSize: 20, fontWeight: "800", marginTop: 6, lineHeight: 24 },
  nowMeta: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  nowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  ambientStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  ambientTitle: { fontSize: 15, fontWeight: "800" },
  ambientMeta: { fontSize: 12, marginTop: 2 },
});
