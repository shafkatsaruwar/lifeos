import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { DashboardRow, ModuleEmpty } from "../components/HubDashboard";
import { RecordMemoryModal } from "../components/RecordMemoryModal";
import { Eyebrow, IconButton, Page } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { deleteMemoryAudio, getExpoAv, removeDayMemory } from "../lib/dayMemories";
import { useLifeOS } from "../lib/LifeOSContext";
import { toDateKey } from "../lib/helpers";
import { bumpHabit, habitKind, habitProgressLabel, isHabitDone, toggleHabitCheck } from "../lib/habits";
import {
  LIFE_SIGNAL_LEGEND,
  collectLifeDaySignals,
  countSignalsByKind,
  daySignalKinds,
  lifeSignalColor,
  signalsForDay,
  type LifeSignal,
  type LifeSignalKind,
} from "../lib/lifeDaySignals";

function dateFromDayKey(day: string) {
  const match = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
}

function formatDayHeading(day: string) {
  const date = dateFromDayKey(day);
  const today = toDateKey(new Date());
  const label = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  if (day === today) return `Today · ${label}`;
  return label;
}

function signalIcon(kind: LifeSignalKind): keyof typeof Feather.glyphMap {
  switch (kind) {
    case "habit":
      return "check-circle";
    case "focus":
      return "zap";
    case "done":
      return "check";
    case "capture":
      return "edit-3";
    case "memory":
      return "mic";
    case "photo":
      return "camera";
    case "body":
      return "activity";
    case "food":
      return "coffee";
    case "trip":
      return "map";
    default:
      return "circle";
  }
}

export function LifeDayScreen() {
  const { theme, workspace, updateLife, updateSettings } = useLifeOS();
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const navigation = useNavigation<any>();
  const todayKey = toDateKey(new Date());
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(todayKey);
  const [memoryOpen, setMemoryOpen] = useState(false);

  const signals = useMemo(
    () =>
      collectLifeDaySignals({
        life: workspace.life,
        tasks: workspace.tasks,
        momentumLog: workspace.settings.momentumLog,
        dayMemories: workspace.settings.dayMemories,
      }),
    [workspace.life, workspace.tasks, workspace.settings.momentumLog, workspace.settings.dayMemories],
  );

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const firstDayOffset = monthStart.getDay();
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstDayOffset);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const selectedSignals = useMemo(() => signalsForDay(signals, selected), [signals, selected]);
  const selectedCounts = useMemo(() => countSignalsByKind(signals, selected), [signals, selected]);
  const legendKinds = useMemo(() => {
    const present = new Set(Object.keys(selectedCounts) as LifeSignalKind[]);
    // Always show the core set so the legend teaches the language of dots.
    const core: LifeSignalKind[] = ["habit", "focus", "done", "memory", "photo", "body"];
    const extras = LIFE_SIGNAL_LEGEND.map((l) => l.kind).filter((k) => present.has(k) && !core.includes(k));
    return [...core, ...extras];
  }, [selectedCounts]);

  const summaryCards = useMemo(() => {
    const cards: { kind: LifeSignalKind; label: string; count: number }[] = [];
    for (const kind of legendKinds) {
      const count = selectedCounts[kind] ?? 0;
      if (count > 0) {
        cards.push({
          kind,
          label: LIFE_SIGNAL_LEGEND.find((l) => l.kind === kind)?.label ?? kind,
          count,
        });
      }
    }
    return cards.slice(0, 4);
  }, [legendKinds, selectedCounts]);

  const shiftMonth = (delta: number) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const toggleHabitOnSelected = (habitId: string) => {
    updateLife({
      ...workspace.life,
      habits: workspace.life.habits.map((habit) => {
        if (habit.id !== habitId) return habit;
        const kind = habitKind(habit);
        if (kind === "check") return toggleHabitCheck(habit, selected);
        return bumpHabit(habit, selected, kind === "scale" ? 5 : 1);
      }),
    });
  };

  const onSignalPress = (signal: LifeSignal) => {
    if (signal.memoryId) {
      const memory = workspace.settings.dayMemories?.find((m) => m.id === signal.memoryId);
      if (!memory) return;
      const buttons: {
        text: string;
        style?: "cancel" | "destructive" | "default";
        onPress?: () => void;
      }[] = [{ text: "Close", style: "cancel" }];
      if (memory.localAudioUri) {
        buttons.unshift({
          text: "Play",
          onPress: () => {
            void (async () => {
              const av = getExpoAv();
              if (!av) {
                Alert.alert("Playback needs a rebuild", "The transcript is still saved on this day.");
                return;
              }
              try {
                const { sound } = await av.Audio.Sound.createAsync({ uri: memory.localAudioUri! });
                await sound.playAsync();
              } catch {
                Alert.alert("Couldn’t play", "Audio may only exist on the device that recorded it.");
              }
            })();
          },
        });
      }
      buttons.push({
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await deleteMemoryAudio(memory.localAudioUri);
            await updateSettings({
              ...workspace.settings,
              dayMemories: removeDayMemory(workspace.settings.dayMemories, memory.id),
            });
          })();
        },
      });
      Alert.alert(memory.title || "Memory", memory.transcript || "Voice note", buttons);
      return;
    }
    if (signal.habitId) {
      toggleHabitOnSelected(signal.habitId);
      return;
    }
    if (signal.taskId != null) {
      navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: signal.taskId } });
      return;
    }
    if (signal.collection) {
      navigation.navigate("HubCollection", { scope: "life", collection: signal.collection });
    }
  };

  const openCollection = (collection: string) =>
    navigation.navigate("HubCollection", { scope: "life", collection });

  return (
    <Page>
      <ScrollView contentContainerStyle={[styles.screen, { paddingBottom: tabBarPad }]}>
        <View style={styles.header}>
          <IconButton icon="chevron-left" label="Back" onPress={() => navigation.goBack()} />
          <View style={styles.grow}>
            <Eyebrow>HOME LOG</Eyebrow>
            <Text style={[styles.title, { color: theme.text }]}>Day signals</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Dots mark days something was logged. Tap a day for the detail.
            </Text>
          </View>
        </View>

        <View style={styles.monthToolbar}>
          <IconButton icon="chevron-left" label="Previous month" onPress={() => shiftMonth(-1)} />
          <Text style={[styles.monthLabel, { color: theme.text }]}>
            {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Text>
          <IconButton icon="chevron-right" label="Next month" onPress={() => shiftMonth(1)} />
        </View>

        <View style={styles.weekRow}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <Text key={`${d}-${i}`} style={[styles.weekDay, { color: theme.muted }]}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {days.map((dayCell) => {
            const key = toDateKey(dayCell);
            const muted = dayCell.getMonth() !== cursor.getMonth();
            const isSelected = key === selected;
            const isToday = key === todayKey;
            const kinds = daySignalKinds(signals, key, 4);
            return (
              <Pressable
                key={key}
                onPress={() => setSelected(key)}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: theme.soft, borderRadius: 12 },
                  isToday && !isSelected && { borderWidth: 1, borderColor: theme.border, borderRadius: 12 },
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: muted ? theme.muted : theme.text,
                      opacity: muted ? 0.4 : 1,
                      fontWeight: isToday || isSelected ? "800" : "600",
                    },
                  ]}
                >
                  {dayCell.getDate()}
                </Text>
                <View style={styles.dayDots}>
                  {kinds.map((kind) => (
                    <View
                      key={kind}
                      style={[styles.miniDot, { backgroundColor: lifeSignalColor(kind, theme) }]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legendRow}>
          {legendKinds.slice(0, 5).map((kind) => (
            <View key={kind} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: lifeSignalColor(kind, theme) }]} />
              <Text style={[styles.legendText, { color: theme.muted }]}>
                {LIFE_SIGNAL_LEGEND.find((l) => l.kind === kind)?.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.dayPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.dayPanelHead}>
            <View style={styles.grow}>
              <Text style={[styles.dayHeading, { color: theme.text }]}>{formatDayHeading(selected)}</Text>
              <Text style={[styles.dayCount, { color: theme.muted }]}>
                {selectedSignals.length
                  ? `${selectedSignals.length} logged signal${selectedSignals.length === 1 ? "" : "s"}`
                  : "Nothing logged this day yet"}
              </Text>
            </View>
            {selected !== todayKey ? (
              <Pressable onPress={() => setSelected(todayKey)} hitSlop={8}>
                <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 12 }}>Today</Text>
              </Pressable>
            ) : null}
          </View>

          {summaryCards.length ? (
            <View style={styles.summaryRow}>
              {summaryCards.map((card) => (
                <View
                  key={card.kind}
                  style={[styles.summaryCard, { backgroundColor: theme.bg, borderColor: theme.border }]}
                >
                  <View style={[styles.summaryIcon, { backgroundColor: `${lifeSignalColor(card.kind, theme)}22` }]}>
                    <Feather name={signalIcon(card.kind)} size={14} color={lifeSignalColor(card.kind, theme)} />
                  </View>
                  <Text style={[styles.summaryCount, { color: theme.text }]}>{card.count}</Text>
                  <Text style={[styles.summaryLabel, { color: theme.muted }]}>{card.label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.signalList}>
            {selectedSignals.length ? (
              selectedSignals.map((signal) => {
                const habit =
                  signal.habitId != null
                    ? workspace.life.habits.find((h) => h.id === signal.habitId)
                    : undefined;
                return (
                  <DashboardRow
                    key={signal.id}
                    icon={signalIcon(signal.kind)}
                    title={signal.title}
                    meta={
                      habit ? habitProgressLabel(habit, selected) : signal.meta
                    }
                    color={lifeSignalColor(signal.kind, theme)}
                    onPress={() => onSignalPress(signal)}
                    trailing={
                      habit && habitKind(habit) !== "check" ? (
                        <Pressable
                          accessibilityLabel={`Add progress to ${habit.title}`}
                          hitSlop={8}
                          onPress={() =>
                            updateLife({
                              ...workspace.life,
                              habits: workspace.life.habits.map((h) =>
                                h.id === habit.id
                                  ? bumpHabit(h, selected, habitKind(h) === "scale" ? 5 : 1)
                                  : h,
                              ),
                            })
                          }
                          style={[styles.habitPlus, { borderColor: theme.border, backgroundColor: theme.bg }]}
                        >
                          <Feather name="plus" size={14} color={theme.accent} />
                        </Pressable>
                      ) : undefined
                    }
                  />
                );
              })
            ) : (
              <ModuleEmpty text="Complete a habit, record a memory, finish a focus session, or add a gallery/trip entry dated here." />
            )}
          </View>

          <View style={styles.quickLog}>
            <Text style={[styles.quickLogLabel, { color: theme.muted }]}>Log into this day</Text>
            <View style={styles.quickLogRow}>
              <Pressable
                onPress={() => setMemoryOpen(true)}
                style={[styles.quickChip, { borderColor: theme.border }]}
              >
                <Feather name="mic" size={14} color={lifeSignalColor("memory", theme)} />
                <Text style={[styles.quickChipText, { color: theme.text }]}>Memory</Text>
              </Pressable>
              <Pressable
                onPress={() => openCollection("habits")}
                style={[styles.quickChip, { borderColor: theme.border }]}
              >
                <Feather name="check-circle" size={14} color={theme.accent} />
                <Text style={[styles.quickChipText, { color: theme.text }]}>Habits</Text>
              </Pressable>
              <Pressable
                onPress={() => openCollection("trainings")}
                style={[styles.quickChip, { borderColor: theme.border }]}
              >
                <Feather name="activity" size={14} color={lifeSignalColor("body", theme)} />
                <Text style={[styles.quickChipText, { color: theme.text }]}>Trainings</Text>
              </Pressable>
              <Pressable
                onPress={() => openCollection("gallery")}
                style={[styles.quickChip, { borderColor: theme.border }]}
              >
                <Feather name="camera" size={14} color={lifeSignalColor("photo", theme)} />
                <Text style={[styles.quickChipText, { color: theme.text }]}>Gallery</Text>
              </Pressable>
              <Pressable
                onPress={() => openCollection("food")}
                style={[styles.quickChip, { borderColor: theme.border }]}
              >
                <Feather name="coffee" size={14} color={lifeSignalColor("food", theme)} />
                <Text style={[styles.quickChipText, { color: theme.text }]}>Food</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
      <RecordMemoryModal
        visible={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        dayKey={selected}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 40, gap: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  grow: { flex: 1 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.4, marginTop: 2 },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  monthToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  monthLabel: { fontSize: 17, fontWeight: "800" },
  weekRow: { flexDirection: "row" },
  weekDay: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  dayNum: { fontSize: 14 },
  dayDots: { flexDirection: "row", gap: 2, marginTop: 3, minHeight: 4 },
  miniDot: { width: 4, height: 4, borderRadius: 2 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 11, fontWeight: "600" },
  dayPanel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    marginTop: 4,
  },
  dayPanelHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dayHeading: { fontSize: 17, fontWeight: "800" },
  dayCount: { fontSize: 12, marginTop: 2, fontWeight: "600" },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryCard: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 72,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 4,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCount: { fontSize: 18, fontWeight: "800" },
  summaryLabel: { fontSize: 11, fontWeight: "700" },
  signalList: { gap: 2 },
  quickLog: { gap: 8, marginTop: 4 },
  quickLogLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  quickLogRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickChipText: { fontSize: 12, fontWeight: "700" },
  habitPlus: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
