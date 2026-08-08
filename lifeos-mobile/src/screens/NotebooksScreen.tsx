import Feather from "@expo/vector-icons/Feather";
import { useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import { Empty, Eyebrow, Page, Subtitle, Title } from "../components/UI";
import { LibrarySubNav } from "../components/LibrarySubNav";
import { useLifeOS } from "../lib/LifeOSContext";
import { uid } from "../lib/helpers";
import {
  createFolder,
  createNotebook,
  createPage,
  emptyNotebookHub,
  NOTEBOOK_COLORS,
  pagesForNotebook,
  primaryPageForNotebook,
  setNotebookFolder,
} from "../lib/notebooks";
import type { Note, Notebook, NotebookContextLink, NotebookFolder } from "../types";

type FolderFilter = string | "all" | "unfiled";
type NoteRow =
  | { kind: "pages"; id: string; updatedAt: string; notebook: Notebook }
  | { kind: "text"; id: string; updatedAt: string; note: Note };

export function NotebooksScreen() {
  const { theme, workspace, updateNotebookHub, upsertNotebookPage, deleteNotebookPage, updateNotes } = useLifeOS();
  const navigation = useNavigation<any>();
  const hub = workspace.notebookHub ?? emptyNotebookHub();
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [composer, setComposer] = useState<null | "notebook" | "folder">(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [movingNotebookId, setMovingNotebookId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(NOTEBOOK_COLORS[0]);
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [contextKey, setContextKey] = useState<string>("personal");
  const openSwipeable = useRef<Swipeable | null>(null);

  const activeFolder = folderFilter !== "all" && folderFilter !== "unfiled"
    ? hub.folders.find((f) => f.id === folderFilter)
    : undefined;

  /** Page notes (handwritten / multipage) + typed notes in one list. */
  const noteRows = useMemo(() => {
    let pagesNotes = [...hub.notebooks];
    if (folderFilter === "all" || folderFilter === "unfiled") {
      // Home / Unfiled: only loose notes — filed ones live inside their folder.
      pagesNotes = pagesNotes.filter((n) => !n.folderId);
    } else {
      pagesNotes = pagesNotes.filter((n) => n.folderId === folderFilter);
    }

    const rows: NoteRow[] = pagesNotes.map((notebook) => ({
      kind: "pages" as const,
      id: notebook.id,
      updatedAt: notebook.updatedAt,
      notebook,
    }));

    // Typed notes have no folders yet — show them in All and Unfiled.
    if (folderFilter === "all" || folderFilter === "unfiled") {
      for (const note of workspace.notes) {
        rows.push({ kind: "text", id: note.id, updatedAt: note.updatedAt, note });
      }
    }

    return rows.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }, [hub.notebooks, folderFilter, workspace.notes]);

  const openCreateNotebook = (inFolderId?: string) => {
    setEditingFolderId(null);
    setComposer("notebook");
    setName("");
    setColor(NOTEBOOK_COLORS[0]);
    setFolderId(inFolderId);
    setContextKey("personal");
  };

  const createTextNote = () => {
    const id = uid();
    void updateNotes([
      { id, title: "", body: "", template: "blank", updatedAt: new Date().toISOString() },
      ...workspace.notes,
    ]);
    navigation.navigate("NoteEditor", { noteId: id });
  };

  const openCreateMenu = (inFolderId?: string) => {
    const createPages = () => openCreateNotebook(inFolderId);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "New note", "New text note"],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) createPages();
          if (index === 2) createTextNote();
        },
      );
      return;
    }
    Alert.alert("New note", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "New note", onPress: createPages },
      { text: "New text note", onPress: createTextNote },
    ]);
  };

  const openCreateFolder = () => {
    setEditingFolderId(null);
    setComposer("folder");
    setName("");
    setColor(NOTEBOOK_COLORS[1]);
  };

  const openEditFolder = (folder: NotebookFolder) => {
    setEditingFolderId(folder.id);
    setComposer("folder");
    setName(folder.name);
    setColor(folder.color || NOTEBOOK_COLORS[1]);
  };

  const resolveContext = (): NotebookContextLink | undefined => {
    if (contextKey === "personal") return { type: "personal", label: "Personal" };
    if (contextKey.startsWith("class:")) {
      const classId = contextKey.slice(6);
      const cls = workspace.classes.find((c) => c.id === classId);
      if (!cls) return undefined;
      return { type: "class", classId, label: cls.code };
    }
    if (contextKey.startsWith("project:")) {
      const projectName = contextKey.slice(8);
      return { type: "project", projectName, label: projectName };
    }
    return undefined;
  };

  const submit = async () => {
    if (composer === "folder") {
      if (editingFolderId) {
        await updateNotebookHub({
          ...hub,
          folders: hub.folders.map((folder) =>
            folder.id === editingFolderId
              ? {
                  ...folder,
                  name: name.trim() || folder.name,
                  color,
                  updatedAt: new Date().toISOString(),
                }
              : folder,
          ),
        });
        setComposer(null);
        setEditingFolderId(null);
        return;
      }
      const folder = createFolder(name, color);
      await updateNotebookHub({ ...hub, folders: [folder, ...hub.folders] });
      setComposer(null);
      setFolderFilter(folder.id);
      return;
    }
    if (composer === "notebook") {
      const notebook = createNotebook(name, {
        folderId: folderId || activeFolder?.id,
        color,
        context: resolveContext(),
      });
      const page = createPage(notebook.id, 0, "ruled");
      await updateNotebookHub({ ...hub, notebooks: [notebook, ...hub.notebooks] });
      await upsertNotebookPage(page);
      setComposer(null);
      navigation.navigate("PageCanvas", { notebookId: notebook.id, pageId: page.id });
    }
  };

  const openNote = (notebookId: string) => {
    const page = primaryPageForNotebook(workspace.notebookPages, notebookId);
    if (!page) {
      navigation.navigate("NotebookDetail", { notebookId });
      return;
    }
    navigation.navigate("PageCanvas", { notebookId, pageId: page.id });
  };

  const deleteNotebook = async (notebookId: string) => {
    const pages = pagesForNotebook(workspace.notebookPages, notebookId);
    await updateNotebookHub({
      ...hub,
      notebooks: hub.notebooks.filter((n) => n.id !== notebookId),
    });
    await Promise.all(pages.map((p) => deleteNotebookPage(p.id)));
  };

  const confirmDeleteNotebook = (notebook: Notebook) => {
    Alert.alert("Delete note?", `"${notebook.name}" and all its pages will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void deleteNotebook(notebook.id),
      },
    ]);
  };

  const confirmDeleteTextNote = (note: Note) => {
    Alert.alert("Delete note?", `"${note.title || "Untitled note"}" will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void updateNotes(workspace.notes.filter((n) => n.id !== note.id)),
      },
    ]);
  };

  const deleteFolder = async (folder: NotebookFolder) => {
    await updateNotebookHub({
      ...hub,
      folders: hub.folders.filter((f) => f.id !== folder.id),
      notebooks: hub.notebooks.map((notebook) => {
        if (notebook.folderId !== folder.id) return notebook;
        const next = { ...notebook, updatedAt: new Date().toISOString() };
        delete next.folderId;
        return next;
      }),
    });
    if (folderFilter === folder.id) setFolderFilter("all");
  };

  const confirmFolderActions = (folder: NotebookFolder) => {
    const count = hub.notebooks.filter((n) => n.folderId === folder.id).length;
    Alert.alert(folder.name, count ? `${count} note${count === 1 ? "" : "s"} inside` : "Empty folder", [
      { text: "Open", onPress: () => setFolderFilter(folder.id) },
      { text: "Edit", onPress: () => openEditFolder(folder) },
      {
        text: "Delete folder",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete folder?",
            count
              ? `Notes inside will stay, but become unfiled.`
              : "This folder will be removed.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => void deleteFolder(folder) },
            ],
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const moveNotebook = async (notebookId: string, nextFolderId: string | undefined) => {
    await updateNotebookHub(setNotebookFolder(hub, notebookId, nextFolderId));
    setMovingNotebookId(null);
  };

  const confirmNotebookActions = (notebook: Notebook) => {
    Alert.alert(notebook.name, undefined, [
      { text: "Open", onPress: () => openNote(notebook.id) },
      {
        text: "Organize…",
        onPress: () => navigation.navigate("NotebookDetail", { notebookId: notebook.id, organizeOnly: true }),
      },
      { text: "Move to folder…", onPress: () => setMovingNotebookId(notebook.id) },
      { text: "Delete", style: "destructive", onPress: () => confirmDeleteNotebook(notebook) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const insideFolder = Boolean(activeFolder);
  const headerTitle = activeFolder?.name ?? (folderFilter === "unfiled" ? "Unfiled" : "Notes");
  const headerSubtitle = activeFolder
    ? "Handwritten or typed — they all live here."
    : folderFilter === "unfiled"
      ? "Notes that are not in a folder yet."
      : "Open a folder for filed notes, or keep loose notes here.";

  const renderDeleteAction = (label: string, onDelete: () => void) => (
    <Pressable
      onPress={onDelete}
      style={[styles.swipeDelete, { backgroundColor: theme.danger }]}
      accessibilityLabel={`Delete ${label}`}
    >
      <Feather name="trash-2" size={20} color="#FFF" />
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </Pressable>
  );

  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.grow}>
          {insideFolder || folderFilter === "unfiled" ? (
            <Pressable
              onPress={() => setFolderFilter("all")}
              style={styles.backRow}
              accessibilityLabel="Back to all notes"
            >
              <Feather name="chevron-left" size={18} color={theme.accent} />
              <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 13 }}>All notes</Text>
            </Pressable>
          ) : (
            <Eyebrow>LIBRARY</Eyebrow>
          )}
          <Title>{headerTitle}</Title>
          <Subtitle>{headerSubtitle}</Subtitle>
        </View>
        <View style={styles.headerActions}>
          {!insideFolder ? (
            <Pressable
              onPress={openCreateFolder}
              style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
              accessibilityLabel="New folder"
            >
              <Feather name="folder-plus" size={18} color={theme.text} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => openCreateMenu(activeFolder?.id)}
            style={[styles.addButton, { backgroundColor: theme.text }]}
            accessibilityLabel={activeFolder ? `New note in ${activeFolder.name}` : "New note"}
          >
            <Feather name="plus" size={18} color={theme.surface} />
          </Pressable>
        </View>
      </View>

      <LibrarySubNav active="notes" />

      {!insideFolder ? (
        <View style={styles.folderRow}>
          <Chip label="All" active={folderFilter === "all"} onPress={() => setFolderFilter("all")} />
          <Chip label="Unfiled" active={folderFilter === "unfiled"} onPress={() => setFolderFilter("unfiled")} />
        </View>
      ) : null}

      <FlatList
        data={noteRows}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        contentContainerStyle={styles.list}
        onScrollBeginDrag={() => openSwipeable.current?.close()}
        ListHeaderComponent={
          <>
            {folderFilter === "all" && hub.folders.length > 0 ? (
              <View style={styles.folderCards}>
                {hub.folders.map((folder) => {
                  const count = hub.notebooks.filter((n) => n.folderId === folder.id).length;
                  return (
                    <Pressable
                      key={folder.id}
                      onPress={() => setFolderFilter(folder.id)}
                      onLongPress={() => confirmFolderActions(folder)}
                      delayLongPress={280}
                      style={[styles.folderCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    >
                      <View style={[styles.folderIcon, { backgroundColor: `${folder.color || theme.accent}22` }]}>
                        <Feather name="folder" size={18} color={folder.color || theme.accent} />
                      </View>
                      <View style={styles.grow}>
                        <Text style={[styles.folderCardTitle, { color: theme.text }]} numberOfLines={1}>
                          {folder.name}
                        </Text>
                        <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "600" }}>
                          {count} {count === 1 ? "note" : "notes"} · hold to edit
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={18} color={theme.muted} />
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {activeFolder ? (
              <Pressable
                onPress={() => openCreateMenu(activeFolder.id)}
                style={[styles.inFolderCta, { borderColor: theme.border, backgroundColor: theme.soft }]}
              >
                <Feather name="plus" size={16} color={theme.accent} />
                <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 13 }}>
                  New note in {activeFolder.name}
                </Text>
              </Pressable>
            ) : null}
          </>
        }
        renderItem={({ item }) => {
          if (item.kind === "text") {
            const note = item.note;
            return (
              <Swipeable
                overshootRight={false}
                onSwipeableOpen={(_, swipeable) => {
                  if (openSwipeable.current && openSwipeable.current !== swipeable) {
                    openSwipeable.current.close();
                  }
                  openSwipeable.current = swipeable;
                }}
                renderRightActions={() =>
                  renderDeleteAction(note.title || "Untitled note", () => confirmDeleteTextNote(note))
                }
              >
                <Pressable
                  onPress={() => navigation.navigate("NoteEditor", { noteId: note.id })}
                  style={[styles.cover, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={[styles.coverBand, { backgroundColor: theme.accent }]} />
                  <View style={styles.coverBody}>
                    <Text style={[styles.coverTitle, { color: theme.text }]} numberOfLines={2}>
                      {note.title || "Untitled note"}
                    </Text>
                    <Text style={[styles.coverMeta, { color: theme.muted }]} numberOfLines={3}>
                      {[note.projectName || note.classId ? "Linked" : "Text", note.body?.trim() ? "Typed" : "Empty"]
                        .filter(Boolean)
                        .join(" · ")}
                      {"\n"}
                      Edited {new Date(note.updatedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </Pressable>
              </Swipeable>
            );
          }

          const notebook = item.notebook;
          const folder = hub.folders.find((f) => f.id === notebook.folderId);
          const pageCount =
            pagesForNotebook(workspace.notebookPages, notebook.id).length || notebook.pageCount || 0;
          return (
            <Swipeable
              overshootRight={false}
              onSwipeableOpen={(_, swipeable) => {
                if (openSwipeable.current && openSwipeable.current !== swipeable) {
                  openSwipeable.current.close();
                }
                openSwipeable.current = swipeable;
              }}
              renderRightActions={() =>
                renderDeleteAction(notebook.name, () => confirmDeleteNotebook(notebook))
              }
            >
              <Pressable
                onPress={() => openNote(notebook.id)}
                onLongPress={() => confirmNotebookActions(notebook)}
                style={[styles.cover, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={[styles.coverBand, { backgroundColor: notebook.color || theme.accent }]} />
                <View style={styles.coverBody}>
                  <Text style={[styles.coverTitle, { color: theme.text }]} numberOfLines={2}>
                    {notebook.name}
                  </Text>
                  <Text style={[styles.coverMeta, { color: theme.muted }]} numberOfLines={3}>
                    {[
                      !activeFolder ? folder?.name : null,
                      notebook.context?.label,
                      `${pageCount} ${pageCount === 1 ? "page" : "pages"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {"\n"}
                    Edited {new Date(notebook.updatedAt).toLocaleDateString()}
                  </Text>
                </View>
              </Pressable>
            </Swipeable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          activeFolder ? (
            <Empty
              title={`Nothing in ${activeFolder.name} yet.`}
              body="Create a note in this folder, or long-press a note elsewhere and choose Move to folder."
            />
          ) : folderFilter === "all" && hub.folders.length > 0 ? (
            <Empty title="No loose notes." body="Everything is in a folder above — open one, or create a new note here." />
          ) : (
            <Empty title="No notes yet." body="Start a handwritten note or a text note — both live here." />
          )
        }
      />

      <Modal
        visible={composer != null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setComposer(null);
          setEditingFolderId(null);
        }}
      >
        <Pressable
          style={styles.modalDim}
          onPress={() => {
            setComposer(null);
            setEditingFolderId(null);
          }}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {}}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {composer === "folder"
                ? editingFolderId
                  ? "Edit folder"
                  : "New folder"
                : activeFolder
                  ? `New note in ${activeFolder.name}`
                  : "New note"}
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
                <Text style={{ width: "100%", color: theme.muted, fontSize: 11, fontWeight: "800" }}>FOLDER</Text>
                <Chip label="No folder" active={!folderId} onPress={() => setFolderId(undefined)} />
                {hub.folders.map((f) => (
                  <Chip key={f.id} label={f.name} color={f.color} active={folderId === f.id} onPress={() => setFolderId(f.id)} />
                ))}
              </View>
            ) : null}
            {composer === "notebook" ? (
              <View style={styles.folderPick}>
                <Text style={{ width: "100%", color: theme.muted, fontSize: 11, fontWeight: "800" }}>
                  LIFEOS CONTEXT (OPTIONAL)
                </Text>
                <Chip label="Personal" active={contextKey === "personal"} onPress={() => setContextKey("personal")} />
                {workspace.classes.slice(0, 8).map((cls) => (
                  <Chip
                    key={cls.id}
                    label={cls.code}
                    active={contextKey === `class:${cls.id}`}
                    onPress={() => setContextKey(`class:${cls.id}`)}
                  />
                ))}
                {workspace.projects.slice(0, 8).map((project) => (
                  <Chip
                    key={project.name}
                    label={project.name}
                    active={contextKey === `project:${project.name}`}
                    onPress={() => setContextKey(`project:${project.name}`)}
                  />
                ))}
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setComposer(null);
                  setEditingFolderId(null);
                }}
                style={[styles.modalBtn, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontWeight: "700" }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void submit()} style={[styles.modalBtn, { backgroundColor: theme.text, borderColor: theme.text }]}>
                <Text style={{ color: theme.surface, fontWeight: "700" }}>
                  {composer === "folder" && editingFolderId ? "Save" : "Create"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={movingNotebookId != null} transparent animationType="fade" onRequestClose={() => setMovingNotebookId(null)}>
        <Pressable style={styles.modalDim} onPress={() => setMovingNotebookId(null)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {}}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Move to folder</Text>
            <Text style={{ color: theme.muted, fontSize: 13, fontWeight: "600" }}>
              Choose where this note should live.
            </Text>
            {hub.folders.length === 0 ? (
              <Text style={{ color: theme.muted, fontSize: 13 }}>
                Create a folder first, then you can move notes into it.
              </Text>
            ) : (
              <View style={styles.folderPick}>
                <Chip
                  label="No folder"
                  active={hub.notebooks.find((n) => n.id === movingNotebookId)?.folderId == null}
                  onPress={() => movingNotebookId && void moveNotebook(movingNotebookId, undefined)}
                />
                {hub.folders.map((f) => (
                  <Chip
                    key={f.id}
                    label={f.name}
                    color={f.color}
                    active={hub.notebooks.find((n) => n.id === movingNotebookId)?.folderId === f.id}
                    onPress={() => movingNotebookId && void moveNotebook(movingNotebookId, f.id)}
                  />
                ))}
              </View>
            )}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setMovingNotebookId(null)} style={[styles.modalBtn, { borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>Close</Text>
              </Pressable>
              {hub.folders.length === 0 ? (
                <Pressable
                  onPress={() => {
                    setMovingNotebookId(null);
                    openCreateFolder();
                  }}
                  style={[styles.modalBtn, { backgroundColor: theme.text, borderColor: theme.text }]}
                >
                  <Text style={{ color: theme.surface, fontWeight: "700" }}>New folder</Text>
                </Pressable>
              ) : null}
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
  backRow: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: -4, marginBottom: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  secondaryButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  folderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, marginTop: 14 },
  folderCards: { gap: 8, marginBottom: 16 },
  folderCard: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  folderIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  folderCardTitle: { fontSize: 15, fontWeight: "800" },
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
  list: { padding: 20, paddingBottom: 40 },
  cover: { borderWidth: 1, borderRadius: 16, overflow: "hidden", minHeight: 120 },
  coverBand: { height: 10, width: "100%" },
  coverBody: { padding: 14, gap: 8 },
  coverTitle: { fontSize: 16, fontWeight: "800", lineHeight: 21 },
  coverMeta: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
  swipeDelete: {
    width: 88,
    marginLeft: 10,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  swipeDeleteText: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  inFolderCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    marginBottom: 14,
  },
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
