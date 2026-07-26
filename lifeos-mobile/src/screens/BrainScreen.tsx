import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Empty, Eyebrow, Page, Subtitle, Title } from "../components/UI";
import { QuickCaptureModal } from "../components/QuickCaptureModal";
import { useLifeOS } from "../lib/LifeOSContext";
import { uid } from "../lib/helpers";

// Mirrors web's BrainView: a plain feed of captured thought strings, newest
// first, with delete-by-index and convert-to-task/note actions.
export function BrainScreen() {
  const { theme, workspace, updateBrain, updateTasks, updateNotes } = useLifeOS();
  const navigation = useNavigation<any>();
  const [captureOpen, setCaptureOpen] = useState(false);

  const deleteAt = (index: number) => {
    Alert.alert("Delete this thought?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => updateBrain(workspace.brain.filter((_, i) => i !== index)) },
    ]);
  };

  const convertToTask = (index: number, text: string) => {
    updateTasks([
      ...workspace.tasks,
      { id: Date.now(), title: text, project: "Inbox", priority: "Medium", focusMinutes: 30, energy: "Medium", status: "Not started", checklist: [], checklistProgress: [] },
    ]);
    updateBrain(workspace.brain.filter((_, i) => i !== index));
  };

  const convertToNote = (index: number, text: string) => {
    const note = { id: uid(), title: text.slice(0, 60), body: text, template: "blank" as const, updatedAt: new Date().toISOString() };
    updateNotes([note, ...workspace.notes]);
    updateBrain(workspace.brain.filter((_, i) => i !== index));
    navigation.navigate("NoteEditor", { noteId: note.id });
  };

  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Eyebrow>NOTHING GETS LOST</Eyebrow>
          <Title>Brain</Title>
          <Subtitle>{workspace.brain.length ? `${workspace.brain.length} captured thought${workspace.brain.length === 1 ? "" : "s"}` : "Your inbox is empty."}</Subtitle>
        </View>
        <Pressable onPress={() => setCaptureOpen(true)} style={[styles.addButton, { backgroundColor: theme.text }]}>
          <Feather name="plus" size={18} color={theme.surface} />
        </Pressable>
      </View>

      <View style={styles.subNav}>
        <Pressable onPress={() => navigation.navigate("NotesList")} style={[styles.subNavPill, { borderColor: theme.border }]}>
          <Feather name="file-text" size={13} color={theme.muted} />
          <Text style={[styles.subNavText, { color: theme.text }]}>Notes</Text>
        </Pressable>
        <View style={[styles.subNavPill, { borderColor: theme.accent, backgroundColor: theme.soft, borderWidth: 1.5 }]}>
          <Feather name="zap" size={13} color={theme.accent} />
          <Text style={[styles.subNavText, { color: theme.accent }]}>Brain</Text>
        </View>
        <Pressable onPress={() => navigation.navigate("Resources")} style={[styles.subNavPill, { borderColor: theme.border }]}>
          <Feather name="paperclip" size={13} color={theme.muted} />
          <Text style={[styles.subNavText, { color: theme.text }]}>Resources</Text>
        </Pressable>
      </View>

      <FlatList
        data={workspace.brain}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.text, { color: theme.text }]}>{item}</Text>
            <View style={styles.actions}>
              <Pressable onPress={() => convertToTask(index, item)} style={[styles.iconButton, { backgroundColor: theme.soft }]}>
                <Feather name="check-square" size={14} color={theme.accent} />
              </Pressable>
              <Pressable onPress={() => convertToNote(index, item)} style={[styles.iconButton, { backgroundColor: theme.soft }]}>
                <Feather name="file-text" size={14} color={theme.accent} />
              </Pressable>
              <Pressable onPress={() => deleteAt(index)} style={[styles.iconButton, { backgroundColor: theme.soft }]}>
                <Feather name="trash-2" size={14} color={theme.danger} />
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={<Empty title="Inbox zero is not the goal." body="Capture the thought. Sort it out later, on your terms." />}
      />
      <QuickCaptureModal visible={captureOpen} onClose={() => setCaptureOpen(false)} />
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, gap: 12 },
  grow: { flex: 1 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  subNav: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginTop: 14 },
  subNavPill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  subNavText: { fontSize: 12, fontWeight: "800" },
  list: { padding: 20, paddingBottom: 110, gap: 10 },
  row: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  text: { fontSize: 15, lineHeight: 21 },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  iconButton: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});
