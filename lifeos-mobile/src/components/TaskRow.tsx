import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import { PRIORITY_COLOR } from "../lib/theme";
import { formatDueDate, taskIsOpen } from "../lib/helpers";
import type { Task } from "../types";
import { SwipeDeleteRow } from "./SwipeDeleteRow";

export function TaskRow({
  task,
  onPress,
  onToggleDone,
  onDelete,
  onRestore,
}: {
  task: Task;
  onPress: () => void;
  onToggleDone: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
}) {
  const { theme } = useLifeOS();
  const open = taskIsOpen(task);
  const priorityColor = PRIORITY_COLOR[task.priority ?? "Medium"];
  const row = (
    <Pressable onPress={onPress} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable
        onPress={onToggleDone}
        hitSlop={10}
        style={[
          styles.check,
          {
            borderColor: open ? theme.border : theme.accent,
            backgroundColor: open ? "transparent" : theme.accent,
          },
        ]}
      >
        {!open ? <Feather name="check" size={13} color={theme.surface} /> : null}
      </Pressable>
      <View style={styles.grow}>
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            { color: theme.text, textDecorationLine: open ? "none" : "line-through" },
            !open && { color: theme.muted },
          ]}
        >
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          {task.project ? (
            <Text style={[styles.metaChip, { color: theme.muted }]} numberOfLines={1}>
              {task.project}
            </Text>
          ) : null}
          <Text style={[styles.metaDot, { color: theme.muted }]}>·</Text>
          <Text style={[styles.metaChip, { color: theme.muted }]}>{formatDueDate(task.due)}</Text>
          {task.focusMinutes ? (
            <>
              <Text style={[styles.metaDot, { color: theme.muted }]}>·</Text>
              <Text style={[styles.metaChip, { color: theme.muted }]}>{task.focusMinutes}m</Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
      {onRestore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Restore ${task.title}`}
          onPress={onRestore}
          hitSlop={6}
          style={({ pressed }) => [styles.restore, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="rotate-ccw" size={13} color={theme.accent} />
          <Text style={[styles.restoreLabel, { color: theme.accent }]}>Restore</Text>
        </Pressable>
      ) : (
        <Feather name="chevron-right" size={16} color={theme.muted} />
      )}
    </Pressable>
  );

  if (!onDelete) return row;

  return (
    <SwipeDeleteRow label={task.title || "task"} onDelete={onDelete} confirmTitle="Delete task">
      {row}
    </SwipeDeleteRow>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 13 },
  grow: { flex: 1, minWidth: 0 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3, flexWrap: "wrap" },
  metaChip: { fontSize: 12 },
  metaDot: { fontSize: 12 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  restore: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  restoreLabel: { fontSize: 12, fontWeight: "800" },
});
