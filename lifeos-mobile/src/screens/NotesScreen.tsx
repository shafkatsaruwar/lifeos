import Feather from "@expo/vector-icons/Feather";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Empty, Eyebrow, Page, Subtitle, Title } from "../components/UI";
import { LibrarySubNav } from "../components/LibrarySubNav";
import { useLifeOS } from "../lib/LifeOSContext";
import { uid } from "../lib/helpers";

const TEMPLATE_LABEL: Record<string, string> = {
  blank: "Blank",
  lined: "Lined",
  dotted: "Dotted",
  cornell: "Cornell",
  meeting: "Meeting",
};

export function NotesScreen() {
  const { theme, workspace, updateNotes } = useLifeOS();
  const navigation = useNavigation<any>();

  const createNote = () => {
    const id = uid();
    updateNotes([{ id, title: "", body: "", template: "blank", updatedAt: new Date().toISOString() }, ...workspace.notes]);
    navigation.navigate("NoteEditor", { noteId: id });
  };

  const sorted = [...workspace.notes].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Eyebrow>THINK ON PAPER</Eyebrow>
          <Title>Notes</Title>
          <Subtitle>Lecture notes, meeting minutes, and everything between.</Subtitle>
        </View>
        <Pressable onPress={createNote} style={[styles.addButton, { backgroundColor: theme.text }]}>
          <Feather name="plus" size={18} color={theme.surface} />
        </Pressable>
      </View>

      <LibrarySubNav active="notes" />

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("NoteEditor", { noteId: item.id })} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: theme.soft }]}>
              <Feather name="file-text" size={16} color={theme.accent} />
            </View>
            <View style={styles.grow}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.title || "Untitled note"}</Text>
              <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>
                {TEMPLATE_LABEL[item.template ?? "blank"]} · {item.projectName || "Unfiled"} · {new Date(item.updatedAt).toLocaleDateString()}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.muted} />
          </Pressable>
        )}
        ListEmptyComponent={<Empty title="No notes yet." body="Start one from a class, project, or just on its own." />}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, gap: 12 },
  grow: { flex: 1 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingBottom: 28, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 13 },
  iconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "800" },
  meta: { fontSize: 12, marginTop: 2 },
});
