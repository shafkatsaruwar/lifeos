import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Empty, Eyebrow, Page, Subtitle, Title } from "../components/UI";
import { LibrarySubNav } from "../components/LibrarySubNav";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  createFolder,
  createNotebook,
  createPage,
  NOTEBOOK_COLORS,
  pagesForNotebook,
} from "../lib/notebooks";

export function NotebooksScreen() {
  const { theme, workspace, updateNotebookHub, upsertNotebookPage, deleteNotebookPage } = useLifeOS();
  const navigation = useNavigation<any>();
  const hub = workspace.notebookHub;
  const [folderFilter, setFolderFilter] = useState<string | "all" | "unfiled">("all");
  const [composer, setComposer] = useState<null | "notebook" | "folder">(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(NOTEBOOK_COLORS[0]);
  const [folderId, setFolderId] = useState<string | undefined>(undefined);

  const notebooks = useMemo(() => {
    let list = [...hub.notebooks];
    if (folderFilter === "unfiled") list = list.filter((n) => !n.folderId);
    else if (folderFilter !== "all") list = list.filter((n) => n.folderId === folderFilter);
    return list.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }, [hub.notebooks, folderFilter]);

  const openCreateNotebook = (inFolderId?: string) => {
    setComposer("notebook");
    setName("");
    setColor(NOTEBOOK_COLORS[0]);
    setFolderId(inFolderId);
  };

  const submit = async () => {
    if (composer === "folder") {
      const folder = createFolder(name, color);
      await updateNotebookHub({ ...hub, folders: [folder, ...hub.folders] });
      setComposer(null);
      setFolderFilter(folder.id);
      return;
    }
    if (composer === "notebook") {
      const notebook = createNotebook(name, { folderId, color });
      const page = createPage(notebook.id, 0, "ruled");
      await updateNotebookHub({ ...hub, notebooks: [notebook, ...hub.notebooks] });
      await upsertNotebookPage(page);
      setComposer(null);
      navigation.navigate("NotebookDetail", { notebookId: notebook.id });
    }
  };

  const confirmDeleteNotebook = (notebookId: string) => {
    Alert.alert("Delete notebook?", "All pages in this notebook will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const pages = pagesForNotebook(workspace.notebookPages, notebookId);
          await updateNotebookHub({
            ...hub,
            notebooks: hub.notebooks.filter((n) => n.id !== notebookId),
          });
          await Promise.all(pages.map((p) => deleteNotebookPage(p.id)));
        },
      },
    ]);
  };

  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Eyebrow>DIGITAL PAPER</Eyebrow>
          <Title>Notebooks</Title>
          <Subtitle>Open a notebook. Write. That is the whole point.</Subtitle>
        </View>
        <Pressable
          onPress={() =>
            openCreateNotebook(folderFilter !== "all" && folderFilter !== "unfiled" ? folderFilter : undefined)
          }
          style={[styles.addButton, { backgroundColor: theme.text }]}
          accessibilityLabel="New notebook"
        >
          <Feather name="plus" size={18} color={theme.surface} />
        </Pressable>
      </View>

      <LibrarySubNav active="notebooks" />

      <View style={styles.folderRow}>
        <Chip label="All" active={folderFilter === "all"} onPress={() => setFolderFilter("all")} />
        <Chip label="Unfiled" active={folderFilter === "unfiled"} onPress={() => setFolderFilter("unfiled")} />
        {hub.folders.map((f) => (
          <Chip
            key={f.id}
            label={f.name}
            color={f.color}
            active={folderFilter === f.id}
            onPress={() => setFolderFilter(f.id)}
          />
        ))}
        <Pressable
          onPress={() => {
            setComposer("folder");
            setName("");
            setColor(NOTEBOOK_COLORS[1]);
          }}
          style={styles.newFolder}
        >
          <Feather name="folder-plus" size={14} color={theme.muted} />
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>Folder</Text>
        </Pressable>
      </View>

      <FlatList
        data={notebooks}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const folder = hub.folders.find((f) => f.id === item.folderId);
          const pageCount = pagesForNotebook(workspace.notebookPages, item.id).length || item.pageCount || 0;
          return (
            <Pressable
              onPress={() => navigation.navigate("NotebookDetail", { notebookId: item.id })}
              onLongPress={() => confirmDeleteNotebook(item.id)}
              style={[styles.cover, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={[styles.coverBand, { backgroundColor: item.color || theme.accent }]} />
              <View style={styles.coverBody}>
                <Text style={[styles.coverTitle, { color: theme.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.coverMeta, { color: theme.muted }]} numberOfLines={3}>
                  {folder ? `${folder.name} · ` : ""}
                  {pageCount} {pageCount === 1 ? "page" : "pages"}
                  {"\n"}
                  Edited {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Empty title="No notebooks yet." body="Create one for a class, a trip, or nothing in particular." />
        }
      />

      <Modal visible={composer != null} transparent animationType="fade" onRequestClose={() => setComposer(null)}>
        <Pressable style={styles.modalDim} onPress={() => setComposer(null)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {}}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {composer === "folder" ? "New folder" : "New notebook"}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={composer === "folder" ? "School, Personal…" : "Lecture Notes, Ideas…"}
              placeholderTextColor={theme.muted}
              autoFocus
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
            />
            <View style={styles.colorRow}>
              {NOTEBOOK_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.swatch, { backgroundColor: c, borderColor: color === c ? theme.text : "transparent" }]}
                />
              ))}
            </View>
            {composer === "notebook" && hub.folders.length > 0 ? (
              <View style={styles.folderPick}>
                <Chip label="No folder" active={!folderId} onPress={() => setFolderId(undefined)} />
                {hub.folders.map((f) => (
                  <Chip key={f.id} label={f.name} active={folderId === f.id} onPress={() => setFolderId(f.id)} />
                ))}
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setComposer(null)} style={[styles.modalBtn, { borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void submit()} style={[styles.modalBtn, { backgroundColor: theme.text, borderColor: theme.text }]}>
                <Text style={{ color: theme.surface, fontWeight: "700" }}>Create</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Page>
  );
}

function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  color?: string;
}) {
  const { theme } = useLifeOS();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? theme.accent : theme.border,
          backgroundColor: active ? theme.soft : theme.surface,
        },
      ]}
    >
      {color ? <View style={[styles.chipDot, { backgroundColor: color }]} /> : null}
      <Text style={{ color: active ? theme.accent : theme.text, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, gap: 12 },
  grow: { flex: 1 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  folderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, marginTop: 14 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  newFolder: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 7 },
  list: { padding: 20, paddingBottom: 40 },
  gridRow: { gap: 12, marginBottom: 12 },
  cover: { flex: 1, borderWidth: 1, borderRadius: 16, overflow: "hidden", minHeight: 160 },
  coverBand: { height: 10, width: "100%" },
  coverBody: { padding: 14, gap: 8, flex: 1 },
  coverTitle: { fontSize: 16, fontWeight: "800", lineHeight: 21 },
  coverMeta: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
  modalDim: { flex: 1, backgroundColor: "rgba(15,23,42,0.35)", justifyContent: "center", padding: 24 },
  modalCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14 },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  colorRow: { flexDirection: "row", gap: 10 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  folderPick: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  modalBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
