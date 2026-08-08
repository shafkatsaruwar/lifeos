import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ActionButton, Card, Page, SegmentedControl } from "../components/UI";
import { FocusModal } from "../components/FocusModal";
import { useLifeOS } from "../lib/LifeOSContext";
import { PRIORITY_COLOR } from "../lib/theme";
import type { EnergyLevel, Priority, Task, TaskStatus } from "../types";

const STATUS_OPTIONS: TaskStatus[] = ["Not started", "In progress", "Waiting", "Blocked", "Done", "Canceled"];
const PRIORITY_OPTIONS: Priority[] = ["High", "Medium", "Low"];
const ENERGY_OPTIONS: EnergyLevel[] = ["Low", "Medium", "High"];

type SpaceOption = {
  key: string;
  label: string;
  color: string;
  kind: "inbox" | "project" | "class";
  project: string;
  classId?: string;
};

function spaceKeyForTask(task: Task) {
  if (task.classId) return `class:${task.classId}`;
  if (!task.project || task.project === "Inbox") return "inbox";
  return `project:${task.project}`;
}

export function TaskDetailScreen() {
  const { workspace, theme, updateTasks, updateSettings } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const taskId = route.params?.taskId as number;
  const task = workspace.tasks.find((t) => t.id === taskId);
  const [focusOpen, setFocusOpen] = useState(false);

  const spaces = useMemo<SpaceOption[]>(() => {
    const projectSpaces = workspace.projects.map((project) => ({
      key: `project:${project.name}`,
      label: project.name,
      color: project.color || theme.accent,
      kind: "project" as const,
      project: project.name,
    }));
    const classSpaces = workspace.classes
      .filter((course) => !course.archived)
      .map((course) => ({
        key: `class:${course.id}`,
        label: course.code,
        color: course.color || theme.accent,
        kind: "class" as const,
        project: course.code,
        classId: course.id,
      }));
    return [
      { key: "inbox", label: "Inbox", color: theme.muted, kind: "inbox", project: "Inbox" },
      ...projectSpaces,
      ...classSpaces,
    ];
  }, [theme.accent, theme.muted, workspace.classes, workspace.projects]);

  if (!task) {
    return (
      <Page>
        <View style={styles.missing}><Text style={{ color: theme.muted }}>Task not found.</Text></View>
      </Page>
    );
  }

  const persist = (patch: Partial<typeof task>) => updateTasks(workspace.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  const activeSpaceKey = spaceKeyForTask(task);
  const spaceOptions =
    activeSpaceKey.startsWith("project:") && !spaces.some((space) => space.key === activeSpaceKey)
      ? [
          ...spaces,
          {
            key: activeSpaceKey,
            label: task.project || "Space",
            color: task.color || theme.accent,
            kind: "project" as const,
            project: task.project || "Inbox",
          },
        ]
      : spaces;
  const activeSpace = spaceOptions.find((space) => space.key === activeSpaceKey);
  const spaceLabel = activeSpace?.label ?? task.project ?? "Inbox";
  const spaceColor = activeSpace?.color ?? task.color ?? theme.accent;

  const routeToSpace = (space: SpaceOption) => {
    if (space.kind === "inbox") {
      persist({ project: "Inbox", classId: undefined, color: theme.accent });
      return;
    }
    if (space.kind === "project") {
      persist({ project: space.project, classId: undefined, color: space.color });
      return;
    }
    persist({ project: space.project, classId: space.classId, color: space.color });
  };

  const deleteTask = () => {
    Alert.alert("Delete task", `Delete "${task.title}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          updateTasks(workspace.tasks.filter((t) => t.id !== taskId));
          navigation.goBack();
        },
      },
    ]);
  };

  const toggleChecklistItem = (index: number) => {
    const progress = task.checklistProgress ?? (task.checklist ?? []).map(() => false);
    persist({ checklistProgress: progress.map((v, i) => (i === index ? !v : v)) });
  };

  return (
    <Page edges={["top", "bottom"]}>
      <View style={styles.headRow}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={22} color={theme.text} />
        </Pressable>
        <Pressable
          accessibilityLabel="Delete task"
          accessibilityRole="button"
          onPress={deleteTask}
          style={styles.backButton}
        >
          <Feather name="trash-2" size={19} color={theme.danger} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.screen}>
        <TextInput
          value={task.title}
          onChangeText={(v) => persist({ title: v })}
          style={[styles.titleInput, { color: theme.text }]}
          multiline
          placeholder="Task title"
          placeholderTextColor={theme.muted}
        />
        <View style={styles.spaceLabelRow}>
          <View style={[styles.spaceDot, { backgroundColor: spaceColor }]} />
          <Text style={[styles.spaceLabel, { color: theme.muted }]}>{spaceLabel}</Text>
        </View>

        <View style={styles.row}>
          <ActionButton label="Set as Now" icon="target" quiet onPress={() => updateSettings({ ...workspace.settings, nowTaskId: task.id })} />
          <ActionButton label="Focus" icon="play" onPress={() => setFocusOpen(true)} />
        </View>

        <Card>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Space</Text>
          <Text style={[styles.spaceHint, { color: theme.muted }]}>Route this task to a project or class.</Text>
          <View style={styles.chipWrap}>
            {spaceOptions.map((space) => {
              const active = space.key === activeSpaceKey;
              return (
                <Pressable
                  key={space.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Move to ${space.label}`}
                  onPress={() => routeToSpace(space)}
                  style={[
                    styles.chip,
                    styles.spaceChip,
                    {
                      borderColor: active ? space.color : theme.border,
                      backgroundColor: active ? `${space.color}22` : "transparent",
                    },
                  ]}
                >
                  <View style={[styles.spaceDot, { backgroundColor: space.color }]} />
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700" }}>{space.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Status</Text>
          <View style={styles.chipWrap}>
            {STATUS_OPTIONS.map((status) => (
              <Pressable
                key={status}
                onPress={() => persist({ status, done: status === "Done", canceled: status === "Canceled" })}
                style={[styles.chip, { borderColor: task.status === status ? theme.accent : theme.border, backgroundColor: task.status === status ? theme.soft : "transparent" }]}
              >
                <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700" }}>{status}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <View style={styles.priorityHeaderRow}>
            <Text style={[styles.cardLabel, { color: theme.text }]}>Priority</Text>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[task.priority ?? "Medium"] }]} />
          </View>
          <SegmentedControl value={task.priority ?? "Medium"} onChange={(v) => persist({ priority: v })} options={PRIORITY_OPTIONS.map((p) => ({ key: p, label: p }))} />
        </Card>

        <Card>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Energy</Text>
          <SegmentedControl value={task.energy ?? "Medium"} onChange={(v) => persist({ energy: v })} options={ENERGY_OPTIONS.map((e) => ({ key: e, label: e }))} />
        </Card>

        <Card>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Due date</Text>
          <TextInput
            value={task.due ?? ""}
            onChangeText={(v) => persist({ due: v })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
        </Card>

        <Card>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Start time</Text>
          <TextInput
            value={task.startTime ?? ""}
            onChangeText={(v) => persist({ startTime: v.trim() || undefined })}
            placeholder="HH:mm (optional)"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
        </Card>

        <Card>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Focus minutes</Text>
          <TextInput
            value={String(task.focusMinutes ?? 30)}
            onChangeText={(v) => persist({ focusMinutes: Number(v.replace(/\D/g, "")) || 0 })}
            keyboardType="number-pad"
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
        </Card>

        <Card>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Notes</Text>
          <TextInput
            value={task.notes ?? ""}
            onChangeText={(v) => persist({ notes: v })}
            multiline
            placeholder="Context, links, or a next action…"
            placeholderTextColor={theme.muted}
            style={[styles.textarea, { color: theme.text, borderColor: theme.border }]}
          />
        </Card>

        <Card>
          <View style={styles.cardHeadRow}>
            <Text style={[styles.cardLabel, { color: theme.text }]}>Checklist</Text>
            <Pressable onPress={() => persist({ checklist: [...(task.checklist ?? []), ""], checklistProgress: [...(task.checklistProgress ?? []), false] })}>
              <Feather name="plus" size={18} color={theme.accent} />
            </Pressable>
          </View>
          {(task.checklist ?? []).map((item, index) => (
            <View key={index} style={styles.checkRow}>
              <Pressable
                onPress={() => toggleChecklistItem(index)}
                style={[styles.checkBox, { borderColor: theme.border }, task.checklistProgress?.[index] && { backgroundColor: theme.accent, borderColor: theme.accent }]}
              >
                {task.checklistProgress?.[index] ? <Feather name="check" size={12} color={theme.surface} /> : null}
              </Pressable>
              <TextInput
                value={item}
                onChangeText={(v) => persist({ checklist: (task.checklist ?? []).map((c, i) => (i === index ? v : c)) })}
                style={[styles.checkInput, { color: theme.text }]}
                placeholder="Step"
                placeholderTextColor={theme.muted}
              />
            </View>
          ))}
        </Card>
      </ScrollView>
      <FocusModal visible={focusOpen} task={task} onClose={() => setFocusOpen(false)} />
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingTop: 4, paddingBottom: 28, gap: 14 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 2,
    minHeight: 44,
  },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  titleInput: { fontSize: 26, fontWeight: "700", lineHeight: 32 },
  spaceLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: -6 },
  spaceLabel: { fontSize: 13, fontWeight: "700" },
  spaceHint: { fontSize: 12, lineHeight: 17, marginBottom: 8, marginTop: -2 },
  spaceDot: { width: 8, height: 8, borderRadius: 4 },
  spaceChip: { flexDirection: "row", alignItems: "center", gap: 7 },
  row: { flexDirection: "row", gap: 10 },
  cardLabel: { fontSize: 13, fontWeight: "800", marginBottom: 4 },
  priorityHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  cardHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  textarea: { minHeight: 90, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, textAlignVertical: "top" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  checkBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  checkInput: { flex: 1, fontSize: 14, paddingVertical: 4 },
});
