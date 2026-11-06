import Feather from "@expo/vector-icons/Feather";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  Keyboard,
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
import { applyChecklistItemTextChange } from "../lib/checklistSmartPaste";
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
  const inputRefs = useRef<Map<number, TextInput>>(new Map());
  const selectionByIndex = useRef<Map<number, { start: number; end: number }>>(new Map());

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

  const focusRow = (index: number) => {
    requestAnimationFrame(() => {
      const node = inputRefs.current.get(index) ?? (index >= items.length - 1 ? lastInputRef.current : null);
      node?.focus();
    });
  };

  const setItem = (index: number, value: string) => {
    const previousText = items[index] ?? "";
    const sel = selectionByIndex.current.get(index) ?? {
      start: previousText.length,
      end: previousText.length,
    };
    const change = applyChecklistItemTextChange({
      items,
      progress: items.map((_, i) => progress[i] ?? false),
      index,
      previousText,
      nextText: value,
      selectionStart: sel.start,
      selectionEnd: sel.end,
    });

    if (change.kind === "split") {
      // One persist = one undoable checklist mutation where the host supports it.
      let checklist = change.checklist;
      let checklistProgress = change.checklistProgress;
      if (checklist.length === 0 || (checklist[checklist.length - 1] ?? "").trim() !== "") {
        checklist = [...checklist, ""];
        checklistProgress = [...checklistProgress, false];
      }
      persist({ checklist, checklistProgress });
      focusRow(change.focusIndex);
      return;
    }

    const next = items.map((c, i) => (i === index ? change.text : c));
    const nextProgress = items.map((_, i) => progress[i] ?? false);
    // Growing the last blank into text → append a new blank.
    if (index === items.length - 1 && change.text.trim() !== "" && (items[items.length - 1] ?? "") === "") {
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

  const onSubmitItem = (index: number) => {
    const text = items[index] ?? "";
    // Empty Return → dismiss editing (native Notes / Reminders feel).
    if (text.trim() === "") {
      Keyboard.dismiss();
      return;
    }

    const next = [...items];
    const nextProgress = items.map((_, i) => progress[i] ?? false);
    const nextIsEmpty = index < items.length - 1 && (items[index + 1] ?? "").trim() === "";
    if (!nextIsEmpty) {
      next.splice(index + 1, 0, "");
      nextProgress.splice(index + 1, 0, false);
    }
    // Ensure trailing blank still exists after a mid-list insert.
    if ((next[next.length - 1] ?? "").trim() !== "") {
      next.push("");
      nextProgress.push(false);
    }
    persist({ checklist: next, checklistProgress: nextProgress });
    focusRow(index + 1);
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
                  ref={(node) => {
                    if (node) inputRefs.current.set(index, node);
                    else inputRefs.current.delete(index);
                    if (isTrailing) lastInputRef.current = node;
                  }}
                  value={item}
                  onChangeText={(v) => setItem(index, v)}
                  onSelectionChange={(e) => {
                    const { start, end } = e.nativeEvent.selection;
                    selectionByIndex.current.set(index, { start, end });
                  }}
                  onBlur={() => removeEmptyOnBlur(index)}
                  onSubmitEditing={() => onSubmitItem(index)}
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
                  // multiline so iOS keeps newlines on paste; blurOnSubmit so Return
                  // creates the next item instead of inserting a newline while typing.
                  multiline
                  blurOnSubmit
                  scrollEnabled={false}
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
