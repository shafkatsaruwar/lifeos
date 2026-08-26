import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useLifeOS } from "../lib/LifeOSContext";
import { taskIsOpen } from "../lib/helpers";
import { pageSearchBlob, pagesForNotebook, primaryPageForNotebook } from "../lib/notebooks";

type Result = {
  key: string;
  kind: "Task" | "Project" | "Class" | "Text note" | "Handwritten" | "Page";
  title: string;
  subtitle: string;
  onSelect: () => void;
};

// Search across LifeOS + notebook metadata / typed page text.
// Handwriting OCR is only matched when recognition.status === "ready" (never faked).
export function SearchModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, workspace } = useLifeOS();
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState("");

  const go = (screen: string, params?: any) => {
    onClose();
    setQuery("");
    navigation.navigate(screen, params);
  };

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Result[] = [];

    workspace.tasks.forEach((task) => {
      if (task.title.toLowerCase().includes(q)) {
        out.push({
          key: `task-${task.id}`,
          kind: "Task",
          title: task.title,
          subtitle: `${task.project || "Inbox"} · ${taskIsOpen(task) ? "Open" : "Done"}`,
          onSelect: () => go("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } }),
        });
      }
    });

    workspace.projects.forEach((project) => {
      if (project.name.toLowerCase().includes(q)) {
        out.push({
          key: `project-${project.name}`,
          kind: "Project",
          title: project.name,
          subtitle: project.desc || "Space",
          onSelect: () => go("LifeTab", { screen: "ProjectDetail", params: { projectName: project.name } }),
        });
      }
    });

    workspace.classes.forEach((cls) => {
      if (`${cls.code} ${cls.name}`.toLowerCase().includes(q)) {
        out.push({
          key: `class-${cls.id}`,
          kind: "Class",
          title: `${cls.code} — ${cls.name}`,
          subtitle: cls.term || "Class",
          onSelect: () => go("SchoolTab", { screen: "ClassDetail", params: { classId: cls.id } }),
        });
      }
    });

    workspace.notes.forEach((note) => {
      if (`${note.title} ${note.body}`.toLowerCase().includes(q)) {
        out.push({
          key: `note-${note.id}`,
          kind: "Text note",
          title: note.title || "Untitled note",
          subtitle: note.body.replace(/<[^>]+>/g, " ").slice(0, 60) || "Empty note",
          onSelect: () => {
            go("LibraryTab", { screen: "NoteEditor", params: { noteId: note.id } });
          },
        });
      }
    });

    const hub = workspace.notebookHub;
    hub.notebooks.forEach((nb) => {
      if (nb.context?.legacyNoteId) return;
      const folder = hub.folders.find((f) => f.id === nb.folderId);
      const hay = `${nb.name} ${nb.context?.label ?? ""} ${folder?.name ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({
          key: `notebook-${nb.id}`,
          kind: "Handwritten",
          title: nb.name,
          subtitle: [folder?.name, nb.context?.label, "Pages"].filter(Boolean).join(" · "),
          onSelect: () => {
            const page = primaryPageForNotebook(workspace.notebookPages, nb.id);
            if (page) {
              go("LibraryTab", { screen: "PageCanvas", params: { notebookId: nb.id, pageId: page.id } });
            } else {
              go("LibraryTab", { screen: "NotebookDetail", params: { notebookId: nb.id } });
            }
          },
        });
      }

      pagesForNotebook(workspace.notebookPages, nb.id).forEach((page) => {
        if (!pageSearchBlob(page).includes(q)) return;
        out.push({
          key: `page-${page.id}`,
          kind: "Page",
          title: page.title?.trim() || `Page ${page.index + 1}`,
          subtitle: `${nb.name} · note page${page.recognition?.status === "ready" ? " · recognized ink" : ""}`,
          onSelect: () =>
            go("LibraryTab", {
              screen: "PageCanvas",
              params: { notebookId: nb.id, pageId: page.id },
            }),
        });
      });
    });

    return out.slice(0, 40);
  }, [query, workspace]);

  const iconFor = (kind: Result["kind"]): keyof typeof Feather.glyphMap => {
    if (kind === "Task") return "check-square";
    if (kind === "Project") return "folder";
    if (kind === "Class") return "book-open";
    if (kind === "Page") return "file";
    if (kind === "Text note") return "type";
    return "edit-3";
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Feather name="search" size={18} color={theme.muted} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Find anything in LifeOS…"
            placeholderTextColor={theme.muted}
            style={[styles.input, { color: theme.text }]}
          />
          <Pressable onPress={onClose}>
            <Text style={{ color: theme.accent, fontWeight: "800" }}>Cancel</Text>
          </Pressable>
        </View>
        <FlatList
          data={results}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <Pressable onPress={item.onSelect} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: theme.soft }]}>
                <Feather name={iconFor(item.kind)} size={16} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: "800", fontSize: 15 }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {item.kind} · {item.subtitle}
                </Text>
              </View>
              <Feather name="arrow-right" size={16} color={theme.muted} />
            </Pressable>
          )}
          ListEmptyComponent={
            query.trim() ? (
              <Text style={{ color: theme.muted, textAlign: "center", marginTop: 40 }}>No matches for “{query}”.</Text>
            ) : (
              <Text style={{ color: theme.muted, textAlign: "center", marginTop: 40 }}>
                Search tasks, notes, pages, spaces, and more.
              </Text>
            )
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  input: { flex: 1, fontSize: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
