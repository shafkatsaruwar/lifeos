import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Empty, Eyebrow, Page, SegmentedControl, Subtitle, Title } from "../components/UI";
import { TaskRow } from "../components/TaskRow";
import { useLifeOS } from "../lib/LifeOSContext";
import { PRIORITY_RANK, dueRank, taskIsOpen } from "../lib/helpers";

type Filter = "All" | "Open" | "Done";
type Sort = "Due" | "Priority" | "Space";

export function TasksScreen() {
  const { workspace, theme, updateTasks } = useLifeOS();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<Filter>("Open");
  const [sort, setSort] = useState<Sort>("Due");

  const tasks = useMemo(() => {
    let list = workspace.tasks;
    if (filter === "Open") list = list.filter(taskIsOpen);
    if (filter === "Done") list = list.filter((t) => !taskIsOpen(t));
    const sorted = [...list];
    if (sort === "Due") sorted.sort((a, b) => dueRank(a.due) - dueRank(b.due));
    if (sort === "Priority") sorted.sort((a, b) => PRIORITY_RANK[a.priority ?? "Medium"] - PRIORITY_RANK[b.priority ?? "Medium"]);
    if (sort === "Space") sorted.sort((a, b) => (a.project ?? "").localeCompare(b.project ?? ""));
    return sorted;
  }, [workspace.tasks, filter, sort]);

  const toggleDone = (id: number) => {
    updateTasks(
      workspace.tasks.map((task) =>
        task.id === id
          ? { ...task, done: !task.done, status: !task.done ? "Done" : "Not started", completedAt: !task.done ? new Date().toISOString() : undefined }
          : task
      )
    );
  };

  const createTask = () => {
    const id = Date.now();
    updateTasks([
      ...workspace.tasks,
      { id, title: "New task", project: "Inbox", priority: "Medium", focusMinutes: 30, energy: "Medium", status: "Not started", checklist: [], checklistProgress: [] },
    ]);
    navigation.navigate("TaskDetail", { taskId: id });
  };

  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Eyebrow>MAKE IT HAPPEN</Eyebrow>
          <Title>Tasks</Title>
          <Subtitle>A clear list of what needs your attention.</Subtitle>
        </View>
        <Pressable onPress={createTask} style={[styles.addButton, { backgroundColor: theme.text }]}>
          <Feather name="plus" size={18} color={theme.surface} />
        </Pressable>
      </View>

      <View style={styles.controlsRow}>
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[{ key: "Open", label: "Open" }, { key: "Done", label: "Done" }, { key: "All", label: "All" }]}
        />
      </View>
      <View style={styles.controlsRow}>
        <SegmentedControl
          value={sort}
          onChange={setSort}
          options={[{ key: "Due", label: "Due", icon: "calendar" }, { key: "Priority", label: "Priority", icon: "flag" }, { key: "Space", label: "Space", icon: "folder" }]}
        />
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TaskRow task={item} onPress={() => navigation.navigate("TaskDetail", { taskId: item.id })} onToggleDone={() => toggleDone(item.id)} />
        )}
        ListEmptyComponent={<Empty title="Nothing here." body="Tasks you create or capture will show up in this list." />}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  grow: { flex: 1 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  controlsRow: { paddingHorizontal: 20, marginTop: 10 },
  list: { padding: 20, paddingTop: 14, paddingBottom: 110, gap: 10 },
});
