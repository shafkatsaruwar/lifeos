import Feather from "@expo/vector-icons/Feather";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
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
import {
  blocksToLegacy,
  createHeadingBlock,
  createItemBlock,
  deleteHeadingKeepItems,
  ensureTrailingBlankItem,
  finalizeHeadingEdit,
  finalizeItemEdit,
  isTrailingBlankItem,
  moveHeadingAlone,
  moveSection,
  resolveChecklistBlocks,
  type ChecklistBlock,
} from "../lib/checklistBlocks";
import { applyChecklistBlockTextChange } from "../lib/checklistSmartPaste";
import { useLifeOS } from "../lib/LifeOSContext";
import type { Workspace } from "../types";

/**
 * Apple Notes–style checklist: circular checkboxes + section headings.
 * Backed by Task.checklistBlocks (with legacy checklist mirrors for sync).
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
  const inputRefs = useRef<Map<string, TextInput>>(new Map());
  const selectionById = useRef<Map<string, { start: number; end: number }>>(new Map());
  /** Latest draft text per block id — updated synchronously in onChangeText. */
  const draftById = useRef<Map<string, string>>(new Map());
  const blocksRef = useRef<ChecklistBlock[]>([]);
  const workspaceRef = useRef<Workspace>(workspace);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);

  workspaceRef.current = workspace;

  const blocks = useMemo(
    () =>
      task
        ? resolveChecklistBlocks({
            checklistBlocks: task.checklistBlocks,
            checklist: task.checklist,
            checklistProgress: task.checklistProgress,
            taskId: task.id,
          })
        : [],
    [task],
  );
  blocksRef.current = blocks;
  // Keep drafts aligned with committed blocks when not actively typing a field.
  for (const block of blocks) {
    if (!draftById.current.has(block.id)) {
      draftById.current.set(block.id, block.text);
    }
  }

  const persistBlocks = (nextBlocks: ChecklistBlock[]) => {
    const currentTask = workspaceRef.current.tasks.find((t) => t.id === taskId);
    if (!currentTask) return;
    const ensured = ensureTrailingBlankItem(nextBlocks);
    blocksRef.current = ensured;
    for (const block of ensured) {
      draftById.current.set(block.id, block.text);
    }
    const legacy = blocksToLegacy(ensured);
    void updateTasks(
      workspaceRef.current.tasks.map((t) =>
        t.id === currentTask.id
          ? {
              ...t,
              checklistBlocks: ensured,
              checklist: legacy.checklist,
              checklistProgress: legacy.checklistProgress,
            }
          : t,
      ),
    );
  };

  // Migrate legacy → blocks once, and keep a trailing blank item.
  useEffect(() => {
    if (!task) return;
    const resolved = resolveChecklistBlocks({
      checklistBlocks: task.checklistBlocks,
      checklist: task.checklist,
      checklistProgress: task.checklistProgress,
      taskId: task.id,
    });
    const ensured = ensureTrailingBlankItem(resolved);
    const needsMigrate = !coerceHasBlocks(task.checklistBlocks) && (task.checklist?.length ?? 0) > 0;
    const needsTrailing =
      ensured.length !== resolved.length ||
      ensured[ensured.length - 1]?.id !== resolved[resolved.length - 1]?.id;
    if (needsMigrate || needsTrailing) {
      persistBlocks(ensured);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shape-driven migrate / trailing blank
  }, [task?.id, blocks.length, blocks[blocks.length - 1]?.type, blocks[blocks.length - 1]?.text]);

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

  const setTitle = (title: string) => {
    void updateTasks(
      workspaceRef.current.tasks.map((t) => (t.id === task.id ? { ...t, title } : t)),
    );
  };

  const focusBlock = (id: string) => {
    requestAnimationFrame(() => {
      inputRefs.current.get(id)?.focus();
    });
  };

  const focusIndex = (index: number) => {
    const block = blocksRef.current[index];
    if (block) focusBlock(block.id);
  };

  const draftTextFor = (block: ChecklistBlock) =>
    draftById.current.has(block.id) ? (draftById.current.get(block.id) as string) : block.text;

  const toggleItem = (index: number) => {
    const current = blocksRef.current;
    const block = current[index];
    if (!block || block.type !== "item") return;
    if (isTrailingBlankItem(current, index)) {
      lastInputRef.current?.focus();
      return;
    }
    persistBlocks(
      current.map((b, i) => (i === index && b.type === "item" ? { ...b, done: !b.done } : b)),
    );
  };

  const setItemText = (index: number, value: string) => {
    const current = blocksRef.current;
    const block = current[index];
    if (!block || block.type !== "item") return;
    draftById.current.set(block.id, value);
    const previousText = block.text;
    const sel = selectionById.current.get(block.id) ?? {
      start: previousText.length,
      end: previousText.length,
    };
    const change = applyChecklistBlockTextChange({
      blocks: current,
      index,
      previousText,
      nextText: value,
      selectionStart: sel.start,
      selectionEnd: sel.end,
    });

    if (change.kind === "split") {
      persistBlocks(change.blocks);
      const focus = change.blocks[change.focusIndex];
      if (focus) focusBlock(focus.id);
      return;
    }

    persistBlocks(
      current.map((b, i) => (i === index && b.type === "item" ? { ...b, text: change.text } : b)),
    );
  };

  const setHeadingText = (index: number, value: string) => {
    const current = blocksRef.current;
    const block = current[index];
    if (!block || block.type !== "heading") return;
    draftById.current.set(block.id, value);
    // Optimistic ref update so blur/submit never see a stale empty heading.
    blocksRef.current = current.map((b, i) =>
      i === index && b.type === "heading" ? { ...b, text: value } : b,
    );
    persistBlocks(blocksRef.current);
  };

  const endEditAt = (index: number) => {
    const current = blocksRef.current;
    const block = current[index];
    if (!block) return;
    const draft = draftTextFor(block);
    const next =
      block.type === "heading"
        ? finalizeHeadingEdit(current, index, draft)
        : finalizeItemEdit(current, index, draft);
    if (next === current) return;
    persistBlocks(next);
  };

  const onSubmitItem = (index: number) => {
    const before = blocksRef.current[index];
    if (!before || before.type !== "item") return;
    const draft = draftTextFor(before);
    endEditAt(index);
    if (draft.trim() === "") {
      Keyboard.dismiss();
      return;
    }
    const current = blocksRef.current;
    const nextIsEmptyItem =
      index < current.length - 1 &&
      current[index + 1]?.type === "item" &&
      (current[index + 1] as { text: string }).text.trim() === "";
    if (!nextIsEmptyItem) {
      persistBlocks([
        ...current.slice(0, index + 1),
        createItemBlock(""),
        ...current.slice(index + 1),
      ]);
    }
    focusIndex(index + 1);
  };

  const onSubmitHeading = (index: number) => {
    const before = blocksRef.current[index];
    if (!before || before.type !== "heading") {
      Keyboard.dismiss();
      return;
    }
    const draft = draftTextFor(before);
    endEditAt(index);
    if (draft.trim() === "") {
      Keyboard.dismiss();
      return;
    }
    const current = blocksRef.current;
    const item = createItemBlock("");
    persistBlocks([...current.slice(0, index + 1), item, ...current.slice(index + 1)]);
    focusBlock(item.id);
  };

  const insertionAt = () => {
    const current = blocksRef.current;
    if (insertIndex != null && insertIndex >= 0 && insertIndex <= current.length) return insertIndex;
    if (current.length > 0 && isTrailingBlankItem(current, current.length - 1)) return current.length - 1;
    return current.length;
  };

  const insertChecklistItem = () => {
    const at = insertionAt();
    const item = createItemBlock("");
    const current = blocksRef.current;
    persistBlocks([...current.slice(0, at), item, ...current.slice(at)]);
    focusBlock(item.id);
  };

  const insertSectionHeading = () => {
    const at = insertionAt();
    const heading = createHeadingBlock("");
    draftById.current.set(heading.id, "");
    const current = blocksRef.current;
    persistBlocks([...current.slice(0, at), heading, ...current.slice(at)]);
    focusBlock(heading.id);
  };

  const openInsertMenu = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Checklist item", "Section heading", "Cancel"],
          cancelButtonIndex: 2,
          userInterfaceStyle: "light",
        },
        (buttonIndex) => {
          if (buttonIndex === 0) insertChecklistItem();
          if (buttonIndex === 1) insertSectionHeading();
        },
      );
      return;
    }
    Alert.alert("Insert", undefined, [
      { text: "Checklist item", onPress: insertChecklistItem },
      { text: "Section heading", onPress: insertSectionHeading },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openHeadingMenu = (index: number) => {
    const current = () => blocksRef.current;
    const deleteOnly = () => persistBlocks(deleteHeadingKeepItems(current(), index));
    const moveAlone = (dir: -1 | 1) => persistBlocks(moveHeadingAlone(current(), index, dir));
    const moveSect = (dir: -1 | 1) => persistBlocks(moveSection(current(), index, dir));

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            "Move heading up",
            "Move heading down",
            "Move section up",
            "Move section down",
            "Delete heading",
            "Cancel",
          ],
          destructiveButtonIndex: 4,
          cancelButtonIndex: 5,
          userInterfaceStyle: "light",
        },
        (buttonIndex) => {
          if (buttonIndex === 0) moveAlone(-1);
          if (buttonIndex === 1) moveAlone(1);
          if (buttonIndex === 2) moveSect(-1);
          if (buttonIndex === 3) moveSect(1);
          if (buttonIndex === 4) deleteOnly();
        },
      );
      return;
    }
    Alert.alert("Section heading", undefined, [
      { text: "Move heading up", onPress: () => moveAlone(-1) },
      { text: "Move heading down", onPress: () => moveAlone(1) },
      { text: "Move section up", onPress: () => moveSect(-1) },
      { text: "Move section down", onPress: () => moveSect(1) },
      { text: "Delete heading", style: "destructive", onPress: deleteOnly },
      { text: "Cancel", style: "cancel" },
    ]);
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
            accessibilityLabel="Insert"
            onPress={openInsertMenu}
            style={styles.iconBtn}
          >
            <Feather name="plus" size={22} color={theme.text} />
          </Pressable>
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
          data={blocks}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, { paddingBottom: tabBarPad + 24 }]}
          renderItem={({ item, index }) => {
            if (item.type === "heading") {
              return (
                <Pressable
                  onLongPress={() => openHeadingMenu(index)}
                  onPress={() => setInsertIndex(index)}
                  delayLongPress={350}
                  style={styles.headingWrap}
                >
                  <TextInput
                    ref={(node) => {
                      if (node) inputRefs.current.set(item.id, node);
                      else inputRefs.current.delete(item.id);
                    }}
                    value={item.text}
                    onChangeText={(v) => setHeadingText(index, v)}
                    onFocus={() => setInsertIndex(index)}
                    onBlur={() => endEditAt(index)}
                    onSubmitEditing={() => onSubmitHeading(index)}
                    style={[styles.heading, { color: theme.text }]}
                    placeholder="Section"
                    placeholderTextColor={theme.muted}
                    returnKeyType="next"
                    multiline
                    blurOnSubmit
                    scrollEnabled={false}
                  />
                </Pressable>
              );
            }

            const checked = Boolean(item.done);
            const isTrailing = isTrailingBlankItem(blocks, index);
            return (
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={checked ? "Mark incomplete" : "Mark complete"}
                  onPress={() => toggleItem(index)}
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
                    if (node) inputRefs.current.set(item.id, node);
                    else inputRefs.current.delete(item.id);
                    if (isTrailing) lastInputRef.current = node;
                  }}
                  value={item.text}
                  onChangeText={(v) => setItemText(index, v)}
                  onFocus={() => setInsertIndex(index)}
                  onSelectionChange={(e) => {
                    const { start, end } = e.nativeEvent.selection;
                    selectionById.current.set(item.id, { start, end });
                  }}
                  onBlur={() => endEditAt(index)}
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

function coerceHasBlocks(
  value: ChecklistBlock[] | Record<string, ChecklistBlock> | null | undefined,
): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return false;
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
  headingWrap: {
    marginTop: 18,
    marginBottom: 4,
    paddingVertical: 2,
  },
  heading: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.3,
    lineHeight: 26,
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
