import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useLifeOS } from "../lib/LifeOSContext";
import { toDateKey } from "../lib/helpers";
import { buildTodayBrief, type BriefCard } from "../lib/todayBrief";
import { bumpHabit, habitKind, isHabitDone, toggleHabitCheck } from "../lib/habits";
import { RecordMemoryModal } from "./RecordMemoryModal";

function briefIcon(kind: BriefCard["kind"]): keyof typeof Feather.glyphMap {
  switch (kind) {
    case "overdue":
      return "alert-circle";
    case "due":
      return "calendar";
    case "event":
      return "clock";
    case "focus":
      return "target";
    case "habit":
      return "check-circle";
    case "memory":
      return "mic";
    default:
      return "chevron-right";
  }
}

export function TodayBriefSection({
  onOpenFocus,
  variant = "cards",
}: {
  onOpenFocus: () => void;
  /** `inset` = hairline rows for the conjoined Now card. */
  variant?: "cards" | "inset";
}) {
  const { workspace, theme, updateSettings, updateLife } = useLifeOS();
  const navigation = useNavigation<any>();
  const [memoryOpen, setMemoryOpen] = useState(false);

  const cards = useMemo(
    () =>
      buildTodayBrief({
        tasks: workspace.tasks,
        calendar: workspace.calendar,
        habits: workspace.life.habits,
        settings: workspace.settings,
        memories: workspace.settings.dayMemories,
      }),
    [
      workspace.tasks,
      workspace.calendar,
      workspace.life.habits,
      workspace.settings,
      workspace.settings.dayMemories,
    ],
  );

  const runAction = (card: BriefCard) => {
    if (card.kind === "memory") {
      setMemoryOpen(true);
      return;
    }
    if (card.kind === "event") {
      navigation.navigate("CalendarTab");
      return;
    }
    if (card.kind === "habit") {
      if (card.habitId) {
        const dayKey = toDateKey(new Date());
        updateLife({
          ...workspace.life,
          habits: workspace.life.habits.map((h) => {
            if (h.id !== card.habitId) return h;
            if (isHabitDone(h, dayKey)) return h;
            const kind = habitKind(h);
            if (kind === "check") return toggleHabitCheck(h, dayKey);
            return bumpHabit(h, dayKey, kind === "scale" ? 5 : 1);
          }),
        });
        return;
      }
      navigation.navigate("LifeTab", { screen: "HubCollection", params: { scope: "life", collection: "habits" } });
      return;
    }
    if (card.taskId != null) {
      void updateSettings({ ...workspace.settings, nowTaskId: card.taskId });
      if (card.kind === "focus" || card.actionLabel === "Focus") {
        onOpenFocus();
      }
    }
  };

  if (!cards.length) {
    return <RecordMemoryModal visible={memoryOpen} onClose={() => setMemoryOpen(false)} />;
  }

  if (variant === "inset") {
    return (
      <>
        {cards.map((card) => (
          <Pressable
            key={card.id}
            onPress={() => runAction(card)}
            style={({ pressed }) => [
              styles.row,
              {
                borderTopColor: theme.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.grow}>
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                {card.title}
              </Text>
              <Text style={[styles.cardBody, { color: theme.muted }]} numberOfLines={1}>
                {card.body}
              </Text>
            </View>
            <Text style={[styles.action, { color: theme.accent }]}>{card.actionLabel}</Text>
          </Pressable>
        ))}
        <RecordMemoryModal visible={memoryOpen} onClose={() => setMemoryOpen(false)} />
      </>
    );
  }

  return (
    <>
      <View style={styles.wrap}>
        <View style={styles.head}>
          <Text style={[styles.label, { color: theme.text }]}>Here’s what matters today</Text>
          <Pressable onPress={() => setMemoryOpen(true)} hitSlop={8} style={styles.memoryLink}>
            <Feather name="mic" size={14} color={theme.accent} />
            <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 12 }}>Memory</Text>
          </Pressable>
        </View>
        {cards.map((card) => (
          <Pressable
            key={card.id}
            onPress={() => runAction(card)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: card.kind === "overdue" ? theme.danger : theme.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor:
                    card.kind === "overdue" ? `${theme.danger}18` : `${theme.accent}14`,
                },
              ]}
            >
              <Feather
                name={briefIcon(card.kind)}
                size={16}
                color={card.kind === "overdue" ? theme.danger : theme.accent}
              />
            </View>
            <View style={styles.grow}>
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                {card.title}
              </Text>
              <Text style={[styles.cardBody, { color: theme.muted }]} numberOfLines={2}>
                {card.body}
              </Text>
            </View>
            <Text style={[styles.action, { color: theme.accent }]}>{card.actionLabel}</Text>
          </Pressable>
        ))}
      </View>
      <RecordMemoryModal visible={memoryOpen} onClose={() => setMemoryOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 18, fontWeight: "800" },
  memoryLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  grow: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "800", lineHeight: 20 },
  cardBody: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  action: { fontSize: 12, fontWeight: "800", maxWidth: 72, textAlign: "right" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
});
