import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Empty, Page } from "../components/UI";
import { LibraryChrome } from "../components/LibraryChrome";
import { QuickCaptureModal } from "../components/QuickCaptureModal";
import { SwipeDeleteRow } from "../components/SwipeDeleteRow";
import { useLifeOS } from "../lib/LifeOSContext";
import { createNotebookFromText } from "../lib/notebooks";

export function BrainScreen() {
  const { theme, workspace, updateBrain, updateTasks, updateNotebookHub, upsertNotebookPage } = useLifeOS();
  const navigation = useNavigation<any>();
  const [captureOpen, setCaptureOpen] = useState(false);

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
      <FlatList
        data={workspace.brain}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <LibraryChrome active="brain" />
            <View style={styles.sectionRow}>
              <View style={styles.grow}>
                <Text style={[styles.sectionEyebrow, { color: theme.muted }]}>DUMP IT. SORT LATER.</Text>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>MindDump</Text>
                <Text style={[styles.sectionBody, { color: theme.muted }]}>
                  {workspace.brain.length
                    ? `${workspace.brain.length} dumped thought${workspace.brain.length === 1 ? "" : "s"}`
                    : "Blab it, type it, get it out of your head."}
                </Text>
              </View>
              <Pressable onPress={() => setCaptureOpen(true)} style={[styles.addButton, { backgroundColor: theme.text }]}>
                <Feather name="plus" size={18} color={theme.surface} />
              </Pressable>
            </View>
          </View>
        }
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
                <Pressable
                  onPress={() =>
                    Alert.alert("Delete this thought?", undefined, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => updateBrain(workspace.brain.filter((_, i) => i !== index)),
                      },
                    ])
                  }
                  style={[styles.iconButton, { backgroundColor: theme.soft }]}
                >
                  <Feather name="trash-2" size={14} color={theme.danger} />
                </Pressable>
              </View>
            </View>
          </SwipeDeleteRow>
        )}
        ListEmptyComponent={<Empty title="Nothing dumped yet." body="Tap + and get it out of your head." />}
      />
      <QuickCaptureModal visible={captureOpen} onClose={() => setCaptureOpen(false)} />
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { padding: 0, paddingBottom: 120, gap: 10 },
  headerBlock: { gap: 14, paddingBottom: 8 },
  sectionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 20 },
  grow: { flex: 1, minWidth: 0 },
  sectionEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  sectionTitle: { fontSize: 22, fontWeight: "800", marginTop: 2 },
  sectionBody: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  row: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  text: { fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: "row", gap: 8 },
  iconButton: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
