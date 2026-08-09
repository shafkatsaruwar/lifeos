import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Empty, Eyebrow, Page, Subtitle, Title } from "../components/UI";
import { LibrarySubNav } from "../components/LibrarySubNav";
import { QuickCaptureModal } from "../components/QuickCaptureModal";
import { SwipeDeleteRow } from "../components/SwipeDeleteRow";
import { useLifeOS } from "../lib/LifeOSContext";
import { createNotebookFromText } from "../lib/notebooks";

export function BrainScreen() {
  const { theme, workspace, updateBrain, updateTasks, updateNotebookHub, upsertNotebookPage } = useLifeOS();
  const navigation = useNavigation<any>();
  const [captureOpen, setCaptureOpen] = useState(false);

  const deleteAt = (index: number) => {
    Alert.alert("Delete this thought?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => updateBrain(workspace.brain.filter((_, i) => i !== index)),
      },
    ]);
  };

  const convertToTask = (index: number, text: string) => {
    updateTasks([
      ...workspace.tasks,
      {
        id: Date.now(),
        title: text,
        project: "Inbox",
        priority: "Medium",
        focusMinutes: 30,
        energy: "Medium",
        status: "Not started",
        checklist: [],
        checklistProgress: [],
      },
    ]);
    updateBrain(workspace.brain.filter((_, i) => i !== index));
  };

  const convertToNote = async (index: number, text: string) => {
    const { notebook, page } = createNotebookFromText(text.slice(0, 60), text);
    await updateNotebookHub({
      ...workspace.notebookHub,
      notebooks: [notebook, ...workspace.notebookHub.notebooks],
    });
    await upsertNotebookPage(page);
    updateBrain(workspace.brain.filter((_, i) => i !== index));
    navigation.navigate("PageCanvas", { notebookId: notebook.id, pageId: page.id });
  };

  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Eyebrow>NOTHING GETS LOST</Eyebrow>
          <Title>Brain</Title>
          <Subtitle>
            {workspace.brain.length
              ? `${workspace.brain.length} captured thought${workspace.brain.length === 1 ? "" : "s"}`
              : "Your inbox is empty."}
          </Subtitle>
        </View>
        <Pressable onPress={() => setCaptureOpen(true)} style={[styles.addButton, { backgroundColor: theme.text }]}>
          <Feather name="plus" size={18} color={theme.surface} />
        </Pressable>
      </View>

      <LibrarySubNav active="brain" />

      <FlatList
        data={workspace.brain}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <SwipeDeleteRow
            label={item}
            onDelete={() => updateBrain(workspace.brain.filter((_, i) => i !== index))}
          >
            <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.text, { color: theme.text }]}>{item}</Text>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => convertToTask(index, item)}
                  style={[styles.iconButton, { backgroundColor: theme.soft }]}
                >
                  <Feather name="check-square" size={14} color={theme.accent} />
                </Pressable>
                <Pressable
                  onPress={() => void convertToNote(index, item)}
                  style={[styles.iconButton, { backgroundColor: theme.soft }]}
                >
                  <Feather name="file-text" size={14} color={theme.accent} />
                </Pressable>
                <Pressable onPress={() => deleteAt(index)} style={[styles.iconButton, { backgroundColor: theme.soft }]}>
                  <Feather name="trash-2" size={14} color={theme.danger} />
                </Pressable>
              </View>
            </View>
          </SwipeDeleteRow>
        )}
        ListEmptyComponent={
          <Empty title="Inbox zero is not the goal." body="Capture the thought. Sort it out later, on your terms." />
        }
      />
      <QuickCaptureModal visible={captureOpen} onClose={() => setCaptureOpen(false)} />
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, gap: 12 },
  grow: { flex: 1 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingBottom: 28, gap: 10 },
  row: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  text: { fontSize: 15, lineHeight: 21 },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  iconButton: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});
