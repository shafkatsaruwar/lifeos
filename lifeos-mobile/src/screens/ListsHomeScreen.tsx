import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Empty, Eyebrow, Page, Title } from "../components/UI";
import { SwipeDeleteRow } from "../components/SwipeDeleteRow";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import {
  blocksHaveContent,
  listItemProgress,
  resolveChecklistBlocks,
} from "../lib/checklistBlocks";
import { useLifeOS } from "../lib/LifeOSContext";
import type { Task } from "../types";

function isListTask(task: Task): boolean {
  if (task.project === "Lists") return true;
  if (blocksHaveContent(task.checklistBlocks)) return true;
  const steps = task.checklist ?? [];
  return steps.some((step) => step.trim().length > 0);
}

function listProgress(task: Task): { done: number; total: number } {
  const blocks = resolveChecklistBlocks({
    checklistBlocks: task.checklistBlocks,
    checklist: task.checklist,
    checklistProgress: task.checklistProgress,
    taskId: task.id,
  });
  return listItemProgress(blocks);
}

/**
 * Home for the To-do tab — Apple Notes–style lists backed by task checklists.
 */
export function ListsHomeScreen() {
  const navigation = useNavigation<any>();
  const { workspace, theme, updateTasks } = useLifeOS();
  const tabBarPad = useFloatingTabBarContentPadding(28);

  const lists = useMemo(
    () =>
      workspace.tasks
        .filter((task) => !task.done && !task.canceled && isListTask(task))
        .sort((a, b) => b.id - a.id),
    [workspace.tasks],
  );

  const createList = () => {
    const id = Date.now();
    const task: Task = {
      id,
      title: "Checklist",
      project: "Lists",
      priority: "Medium",
      focusMinutes: workspace.settings.defaultFocusMinutes ?? 30,
      energy: workspace.settings.defaultEnergy ?? "Medium",
      status: "Not started",
      checklist: [""],
      checklistProgress: [false],
      checklistBlocks: [{ id: `new-${id}`, type: "item", text: "", done: false }],
    };
    void updateTasks([...workspace.tasks, task]);
    navigation.navigate("SimpleChecklist", { taskId: id });
  };

  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Eyebrow>QUICK CAPTURE</Eyebrow>
          <Title>To-do</Title>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New to-do list"
          onPress={createList}
          style={[styles.addButton, { backgroundColor: theme.text }]}
        >
          <Feather name="plus" size={18} color={theme.surface} />
        </Pressable>
      </View>

      <FlatList
        data={lists}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarPad }]}
        renderItem={({ item }) => {
          const { done, total } = listProgress(item);
          const title = item.title?.trim() || "Checklist";
          return (
            <SwipeDeleteRow
              label={title}
              confirmTitle="Delete list"
              confirmBody={`Delete "${title}"? This can't be undone.`}
              onDelete={() => {
                void updateTasks(workspace.tasks.filter((task) => task.id !== item.id));
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={title}
                onPress={() => navigation.navigate("SimpleChecklist", { taskId: item.id })}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: theme.soft }]}>
                  <Feather name="check-circle" size={18} color={theme.accent} />
                </View>
                <View style={styles.grow}>
                  <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={[styles.rowMeta, { color: theme.muted }]}>
                    {total === 0 ? "Empty list" : `${done} of ${total} done`}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.muted} />
              </Pressable>
            </SwipeDeleteRow>
          );
        }}
        ListEmptyComponent={
          <Empty
            title="No lists yet."
            body="Tap + to start a simple checklist — circular boxes, one line per item."
          />
        }
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  grow: { flex: 1 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 20, paddingTop: 16, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 64,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 16, fontWeight: "700" },
  rowMeta: { fontSize: 12, marginTop: 2, fontWeight: "600" },
});
