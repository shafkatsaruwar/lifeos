import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Empty, Eyebrow, Page, SegmentedControl, Subtitle, Title } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { TaskRow } from "../components/TaskRow";
import { TaskCaptureModal } from "../components/TaskCaptureModal";
import { useLifeOS } from "../lib/LifeOSContext";
import { PRIORITY_RANK, dueRank, taskIsOpen, taskIsRecentlyDone } from "../lib/helpers";
import type { Task } from "../types";

type Filter = "Open" | "Done";
type Sort = "Due" | "Priority" | "Space";

const SORT_OPTIONS: { key: Sort; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "Due", label: "Due", icon: "calendar" },
  { key: "Priority", label: "Priority", icon: "flag" },
  { key: "Space", label: "Space", icon: "folder" },
];

export function TasksScreen() {
  const { workspace, theme, updateTasks } = useLifeOS();
  const navigation = useNavigation<any>();
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const [filter, setFilter] = useState<Filter>("Open");
  const [sort, setSort] = useState<Sort>("Due");
  const [captureOpen, setCaptureOpen] = useState(false);

  const tasks = useMemo(() => {
    if (filter === "Done") {
      return workspace.tasks
        .filter((task) => taskIsRecentlyDone(task, 10))
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    }
    const sorted = workspace.tasks.filter(taskIsOpen);
    if (sort === "Due") sorted.sort((a, b) => dueRank(a.due) - dueRank(b.due));
    if (sort === "Priority") sorted.sort((a, b) => PRIORITY_RANK[a.priority ?? "Medium"] - PRIORITY_RANK[b.priority ?? "Medium"]);
    if (sort === "Space") sorted.sort((a, b) => (a.project ?? "").localeCompare(b.project ?? ""));
    return sorted;
  }, [workspace.tasks, filter, sort]);

  const activeSort = SORT_OPTIONS.find((option) => option.key === sort) ?? SORT_OPTIONS[0];

  const cycleSort = () => {
    const index = SORT_OPTIONS.findIndex((option) => option.key === sort);
    setSort(SORT_OPTIONS[(index + 1) % SORT_OPTIONS.length].key);
  };

  const toggleDone = (id: number) => {
    updateTasks(
      workspace.tasks.map((task) =>
        task.id === id
          ? { ...task, done: !task.done, status: !task.done ? "Done" : "Not started", completedAt: !task.done ? new Date().toISOString() : undefined }
          : task
      )
    );
  };

  const restoreTask = (id: number) => {
    updateTasks(
      workspace.tasks.map((task) =>
        task.id === id
          ? { ...task, done: false, canceled: false, status: "Not started", completedAt: undefined }
          : task
      )
    );
  };

  const createTask = (patch: Partial<Task> & { title: string }, openEditor = false) => {
    const id = Date.now();
    const task: Task = {
      id,
      project: "Inbox",
      priority: "Medium",
      focusMinutes: workspace.settings.defaultFocusMinutes ?? 30,
      energy: workspace.settings.defaultEnergy ?? "Medium",
      status: "Not started",
      checklist: [],
      checklistProgress: [],
      ...patch,
      title: patch.title.trim() || "New task",
    };
    void updateTasks([...workspace.tasks, task]);
    if (openEditor) navigation.navigate("TaskDetail", { taskId: id });
  };

  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Eyebrow>MAKE IT HAPPEN</Eyebrow>
          <Title>Tasks</Title>
          <Subtitle>A clear list of what needs your attention.</Subtitle>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New task"
          onPress={() => setCaptureOpen(true)}
          style={[styles.addButton, { backgroundColor: theme.text }]}
        >
          <Feather name="plus" size={18} color={theme.surface} />
        </Pressable>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.filterGrow}>
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[{ key: "Open", label: "Open" }, { key: "Done", label: "Done" }]}
          />
        </View>
        {filter !== "Done" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${activeSort.label}. Tap to change.`}
            onPress={cycleSort}
            style={({ pressed }) => [
              styles.sortChip,
              { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Feather name={activeSort.icon} size={14} color={theme.text} />
            <Text style={[styles.sortLabel, { color: theme.text }]}>{activeSort.label}</Text>
            <Feather name="chevron-down" size={14} color={theme.muted} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarPad }]}
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            onPress={() => navigation.navigate("TaskDetail", { taskId: item.id })}
            onToggleDone={() => toggleDone(item.id)}
            onRestore={filter === "Done" ? () => restoreTask(item.id) : undefined}
            onDelete={() => updateTasks(workspace.tasks.filter((t) => t.id !== item.id))}
          />
        )}
        ListEmptyComponent={
          filter === "Done" ? (
            <Empty
              title="Nothing finished in the last 10 days."
              body="Completed tasks land here for ten days. Restore one if you need to follow up."
            />
          ) : (
            <Empty title="Nothing here." body="Tasks you create or capture will show up in this list." />
          )
        }
      />
      <TaskCaptureModal
        visible={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onCreate={(title, options) =>
          createTask(
            options?.minor
              ? { title, priority: "Low", energy: "Low", focusMinutes: 5 }
              : { title },
            Boolean(options?.openEditor),
          )
        }
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  grow: { flex: 1 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  controlsRow: { paddingHorizontal: 20, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  filterGrow: { flex: 1, minWidth: 0 },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 42,
  },
  sortLabel: { fontSize: 13, fontWeight: "700" },
  list: { padding: 20, paddingTop: 14, paddingBottom: 28, gap: 10 },
});
