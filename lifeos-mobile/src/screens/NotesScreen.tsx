import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Empty, Page } from "../components/UI";
import { LibraryChrome } from "../components/LibraryChrome";
import { useLifeOS } from "../lib/LifeOSContext";
import { htmlToPlainText, uid } from "../lib/helpers";
import type { Note } from "../types";

/**
 * Typed / rich-text notes shared with the web Library → Notes panel.
 * Separate from Handwritten (PencilKit notebooks) so each format stays clear.
 */
export function NotesScreen() {
  const { theme, workspace, updateNotes } = useLifeOS();
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const notes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...workspace.notes].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    if (!q) return list;
    return list.filter((note) => {
      const hay = `${note.title} ${htmlToPlainText(note.body)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [workspace.notes, query]);

  const spaceLabel = (note: Note) => {
    if (note.classId) {
      const cls = workspace.classes.find((c) => c.id === note.classId);
      return cls ? `${cls.code || cls.name}` : "Class";
    }
    if (note.projectName) return note.projectName;
    return "Personal";
  };

  const createNote = () => {
    const note: Note = {
      id: uid(),
      title: "Untitled note",
      body: "",
      template: "blank",
      updatedAt: new Date().toISOString(),
    };
    void updateNotes([note, ...workspace.notes]);
    navigation.navigate("NoteEditor", { noteId: note.id });
  };

  return (
    <Page>
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <LibraryChrome active="text" />
            <View style={styles.sectionRow}>
              <View style={styles.grow}>
                <Text style={[styles.sectionEyebrow, { color: theme.muted }]}>TYPE IT OUT</Text>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Text notes</Text>
                <Text style={[styles.sectionBody, { color: theme.muted }]}>
                  Same notes as web Library — good for tickets, lists, and typed detail.
                </Text>
              </View>
              <Pressable
                onPress={() => setSearchOpen((v) => !v)}
                style={[styles.iconBtn, { backgroundColor: theme.soft }]}
                accessibilityLabel="Search text notes"
              >
                <Feather name="search" size={17} color={theme.accent} />
              </Pressable>
              <Pressable
                onPress={createNote}
                style={[styles.iconBtn, { backgroundColor: theme.text }]}
                accessibilityLabel="New text note"
              >
                <Feather name="plus" size={17} color={theme.surface} />
              </Pressable>
            </View>
            {searchOpen ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Find text notes…"
                placeholderTextColor={theme.muted}
                autoFocus
                style={[styles.search, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const snippet = htmlToPlainText(item.body).slice(0, 120);
          return (
            <Pressable
              onPress={() => navigation.navigate("NoteEditor", { noteId: item.id })}
              style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: theme.soft }]}>
                <Feather name="type" size={16} color={theme.accent} />
              </View>
              <View style={styles.grow}>
                <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.title?.trim() || "Untitled note"}
                </Text>
                <Text style={[styles.rowMeta, { color: theme.muted }]} numberOfLines={1}>
                  {spaceLabel(item)}
                  {item.updatedAt
                    ? ` · ${new Date(item.updatedAt).toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" })}`
                    : ""}
                </Text>
                {snippet ? (
                  <Text style={[styles.rowSnippet, { color: theme.muted }]} numberOfLines={2}>
                    {snippet}
                  </Text>
                ) : null}
              </View>
              <Feather name="chevron-right" size={17} color={theme.muted} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Empty
            title="No text notes yet."
            body="Create one here, or write on the web — they sync to this list."
          />
        }
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 120, gap: 10 },
  headerBlock: { gap: 14, paddingBottom: 8 },
  sectionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 20 },
  grow: { flex: 1, minWidth: 0 },
  sectionEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  sectionTitle: { fontSize: 22, fontWeight: "800", marginTop: 2 },
  sectionBody: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  search: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    fontSize: 15,
  },
  row: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 16, fontWeight: "700" },
  rowMeta: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  rowSnippet: { fontSize: 13, lineHeight: 18, marginTop: 6 },
});
