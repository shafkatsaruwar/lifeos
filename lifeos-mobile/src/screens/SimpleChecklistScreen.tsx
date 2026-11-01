import Feather from "@expo/vector-icons/Feather";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Page } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";

/**
 * Apple Notes–style checklist: circular checkboxes + one line per item.
 * Backed by an existing Task's checklist / checklistProgress (same Firebase sync).
 */
export function SimpleChecklistScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const { workspace, theme, updateTasks } = useLifeOS();
  const taskId = Number(route.params?.taskId);
  const task = useMemo(() => workspace.tasks.find((t) => t.id === taskId), [workspace.tasks, taskId]);
  const titleRef = useRef<TextInput>(null);
  const lastInputRef = useRef<TextInput>(null);

  const items = task?.checklist ?? [];
  const progress = task?.checklistProgress ?? [];

  const persist = (patch: Partial<typeof task>) => {
    if (!task) return;
    void updateTasks(workspace.tasks.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
  };

  // Keep a blank trailing row so typing feels like Notes.
  useEffect(() => {
    if (!task) return;
    const list = task.checklist ?? [];
    const done = task.checklistProgress ?? [];
    if (list.length === 0 || (list[list.length - 1] ?? "").trim() !== "") {
      const nextProgress = [...done.slice(0, list.length), false];
      persist({
        checklist: [...list, ""],
        checklistProgress: nextProgress,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when list shape needs a trailing blank
  }, [task?.id, items.length, items[items.length - 1]]);

  if (!task) {
    return (
      <Page>
        <View style={styles.missing}>
          <Text style={{ color: theme.muted }}>This list is gone.</Text>
          <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.accent, fontWeight: "700" }}>Back</Text>
          </Pressable>
        </View>
      </Page>
    );
  }

  const setTitle = (title: string) => persist({ title });

  const toggle = (index: number) => {
    const next = items.map((_, i) => progress[i] ?? false);
    next[index] = !next[index];
    persist({ checklistProgress: next });
  };

  const setItem = (index: number, value: string) => {
    const next = items.map((c, i) => (i === index ? value : c));
    const nextProgress = items.map((_, i) => progress[i] ?? false);
    // Growing the last blank into text → append a new blank.
    if (index === items.length - 1 && value.trim() !== "" && (items[items.length - 1] ?? "") === "") {
      next.push("");
      nextProgress.push(false);
    }
    persist({ checklist: next, checklistProgress: nextProgress });
  };

  const removeEmptyOnBlur = (index: number) => {
    // Don't remove the trailing blank; drop mid-list empties.
    if (index >= items.length - 1) return;
    if ((items[index] ?? "").trim() !== "") return;
    persist({
      checklist: items.filter((_, i) => i !== index),
      checklistProgress: progress.filter((_, i) => i !== index),
    });
  };

  return (
    <Page edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <View style={styles.headRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
          >
            <Feather name="chevron-left" size={26} color={theme.text} />
          </Pressable>
          <View style={styles.headSpacer} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open full task"
            onPress={() => navigation.replace("TaskDetail", { taskId: task.id })}
            style={styles.iconBtn}
          >
            <Feather name="more-horizontal" size={22} color={theme.muted} />
          </Pressable>
        </View>

        <TextInput
          ref={titleRef}
          value={task.title === "Checklist" ? "" : task.title}
          onChangeText={(v) => setTitle(v.trim() ? v : "Checklist")}
          placeholder="Title"
          placeholderTextColor={theme.muted}
          style={[styles.title, { color: theme.text }]}
        />

        <FlatList
          data={items}
          keyExtractor={(_, index) => `c-${task.id}-${index}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, { paddingBottom: tabBarPad + 24 }]}
          renderItem={({ item, index }) => {
            const checked = Boolean(progress[index]);
            const isTrailing = index === items.length - 1 && item.trim() === "";
            return (
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={checked ? "Mark incomplete" : "Mark complete"}
                  onPress={() => {
                    if (isTrailing) {
                      lastInputRef.current?.focus();
                      return;
                    }
                    toggle(index);
                  }}
                  style={[
                    styles.circle,
                    { borderColor: checked ? theme.accent : theme.border },
                    checked && { backgroundColor: theme.accent },
                  ]}
                >
                  {checked ? <Feather name="check" size={14} color={theme.surface} /> : null}
                </Pressable>
                <TextInput
                  ref={isTrailing ? lastInputRef : undefined}
                  value={item}
                  onChangeText={(v) => setItem(index, v)}
                  onBlur={() => removeEmptyOnBlur(index)}
                  onSubmitEditing={() => {
                    // Focus next / trailing row
                    if (index < items.length - 1) return;
                    lastInputRef.current?.focus();
                  }}
                  style={[
                    styles.line,
                    {
                      color: theme.text,
                      textDecorationLine: checked && !isTrailing ? "line-through" : "none",
                      opacity: checked && !isTrailing ? 0.45 : 1,
                    },
                  ]}
                  placeholder="List item"
                  placeholderTextColor={theme.muted}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
            );
          }}
          ListEmptyComponent={null}
        />
      </KeyboardAvoidingView>
    </Page>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    minHeight: 44,
  },
  headSpacer: { flex: 1 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
    paddingVertical: 4,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    paddingVertical: 8,
  },
});
