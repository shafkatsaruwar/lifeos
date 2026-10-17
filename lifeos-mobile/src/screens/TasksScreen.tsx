import Feather from "@expo/vector-icons/Feather";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
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
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

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

  const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);
  const visibleSelected = selected.filter((id) => taskIds.includes(id));
  const allSelected = tasks.length > 0 && visibleSelected.length === tasks.length;

  useEffect(() => {
    setSelected((current) => {
      const next = current.filter((id) => taskIds.includes(id));
      return next.length === current.length ? current : next;
    });
  }, [taskIds]);

  useEffect(() => {
    setSelecting(false);
    setSelected([]);
  }, [filter]);

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

  const enterSelect = () => {
    setSelecting(true);
    setSelected([]);
  };

  const exitSelect = () => {
    setSelecting(false);
    setSelected([]);
  };

  const toggleOne = (id: number) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleAll = () => {
    setSelected(allSelected ? [] : taskIds);
  };

  const deleteSelected = () => {
    if (!visibleSelected.length) return;
    const count = visibleSelected.length;
    Alert.alert(
      `Delete ${count} task${count === 1 ? "" : "s"}?`,
      "This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const doomed = new Set(visibleSelected);
            void updateTasks(workspace.tasks.filter((task) => !doomed.has(task.id)));
            exitSelect();
          },
        },
      ],
    );
  };

  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Eyebrow>MAKE IT HAPPEN</Eyebrow>
          <Title>Tasks</Title>
          <Subtitle>
            {selecting
              ? visibleSelected.length
                ? `${visibleSelected.length} selected`
                : "Tap tasks to select them."
              : "A clear list of what needs your attention."}
          </Subtitle>
        </View>
        {selecting ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Done selecting"
            onPress={exitSelect}
            style={[styles.headerChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.headerChipLabel, { color: theme.text }]}>Done</Text>
          </Pressable>
        ) : (
          <>
            {tasks.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select tasks"
                onPress={enterSelect}
                style={[styles.headerChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Text style={[styles.headerChipLabel, { color: theme.text }]}>Select</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New task"
              onPress={() => setCaptureOpen(true)}
              style={[styles.addButton, { backgroundColor: theme.text }]}
            >
              <Feather name="plus" size={18} color={theme.surface} />
            </Pressable>
          </>
        )}
      </View>

      {selecting && tasks.length > 0 ? (
        <View style={styles.batchBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={allSelected ? "Deselect all tasks" : "Select all tasks"}
            onPress={toggleAll}
            style={({ pressed }) => [
              styles.batchChip,
              { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Feather name={allSelected ? "check-square" : "square"} size={15} color={theme.text} />
            <Text style={[styles.batchChipLabel, { color: theme.text }]}>
              {allSelected ? "Deselect all" : "Select all"}
            </Text>
          </Pressable>
          {visibleSelected.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${visibleSelected.length} selected tasks`}
              onPress={deleteSelected}
              style={({ pressed }) => [
                styles.deleteChip,
                { backgroundColor: `${theme.danger}18`, borderColor: `${theme.danger}55`, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Feather name="trash-2" size={15} color={theme.danger} />
              <Text style={[styles.deleteChipLabel, { color: theme.danger }]}>
                Delete {visibleSelected.length}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.controlsRow}>
        <View style={styles.filterGrow}>
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[{ key: "Open", label: "Open" }, { key: "Done", label: "Done" }]}
          />
        </View>
        {filter !== "Done" && !selecting ? (
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
            selectionMode={selecting}
            selected={visibleSelected.includes(item.id)}
            onToggleSelect={() => toggleOne(item.id)}
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
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  grow: { flex: 1 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerChipLabel: { fontSize: 14, fontWeight: "700" },
  batchBar: {
    paddingHorizontal: 20,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  batchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  batchChipLabel: { fontSize: 13, fontWeight: "700" },
  deleteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  deleteChipLabel: { fontSize: 13, fontWeight: "800" },
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
