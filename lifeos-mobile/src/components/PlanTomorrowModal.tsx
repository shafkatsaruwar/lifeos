import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLifeOS } from "../lib/LifeOSContext";
import { taskIsOpen, toDateKey } from "../lib/helpers";
import { ActionButton } from "./UI";

function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateKey(d);
}

export function PlanTomorrowModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { workspace, theme, updateTasks } = useLifeOS();
  const [selected, setSelected] = useState<number[]>([]);
  const [quickTitle, setQuickTitle] = useState("");

  const candidates = useMemo(
    () =>
      workspace.tasks
        .filter(taskIsOpen)
        .sort((a, b) => String(a.due ?? "9999").localeCompare(String(b.due ?? "9999")))
        .slice(0, 12),
    [workspace.tasks],
  );

  const toggle = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const save = () => {
    const due = tomorrowKey();
    let next = workspace.tasks.map((t) => (selected.includes(t.id) ? { ...t, due } : t));
    const title = quickTitle.trim();
    if (title && selected.length < 3) {
      const id = Math.max(0, ...next.map((t) => t.id)) + 1;
      next = [
        ...next,
        {
          id,
          title,
          due,
          project: "Inbox",
          status: "Not started",
          priority: "Medium",
          energy: "Medium",
          focusMinutes: 25,
        },
      ];
    }
    void updateTasks(next);
    setSelected([]);
    setQuickTitle("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Wanna plan for tomorrow?</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color={theme.muted} />
          </Pressable>
        </View>
        <Text style={[styles.sub, { color: theme.muted }]}>
          Pick up to three things. We&apos;ll set them due tomorrow — keep it light.
        </Text>
        <ScrollView contentContainerStyle={styles.list}>
          {candidates.map((task) => {
            const on = selected.includes(task.id);
            return (
              <Pressable
                key={task.id}
                onPress={() => toggle(task.id)}
                style={[
                  styles.row,
                  {
                    backgroundColor: theme.surface,
                    borderColor: on ? theme.accent : theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.check,
                    {
                      borderColor: on ? theme.accent : theme.border,
                      backgroundColor: on ? theme.accent : "transparent",
                    },
                  ]}
                >
                  {on ? <Feather name="check" size={14} color="#fff" /> : null}
                </View>
                <View style={styles.grow}>
                  <Text style={{ color: theme.text, fontWeight: "700" }} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>{task.project || "Personal"}</Text>
                </View>
              </Pressable>
            );
          })}
          <TextInput
            value={quickTitle}
            onChangeText={setQuickTitle}
            placeholder="Or quick-add something new…"
            placeholderTextColor={theme.muted}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
          />
        </ScrollView>
        <View style={styles.footer}>
          <ActionButton
            label={selected.length || quickTitle.trim() ? `Plan ${Math.min(3, selected.length + (quickTitle.trim() ? 1 : 0))}` : "Skip"}
            icon="sun"
            onPress={save}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: "800", flex: 1, paddingRight: 12 },
  sub: { fontSize: 14, lineHeight: 20, paddingHorizontal: 20, marginTop: 8, marginBottom: 12 },
  list: { paddingHorizontal: 20, gap: 10, paddingBottom: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 14, padding: 14 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1, minWidth: 0 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 48, fontSize: 15, marginTop: 4 },
  footer: { padding: 20, paddingTop: 8 },
});
