import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CreateNoteModal } from "../components/CreateNoteModal";
import { NotebookCoverFace } from "../components/NotebookCoverFace";
import { Empty, Page } from "../components/UI";
import { LibrarySubNav } from "../components/LibrarySubNav";
import { useLifeOS } from "../lib/LifeOSContext";
import { uid } from "../lib/helpers";
import { useLayout } from "../lib/layout";
import {
  createFolder,
  createNotebook,
  emptyNotebookHub,
  NOTEBOOK_COLORS,
  pageFromTemplate,
  pagesForNotebook,
  primaryPageForNotebook,
  restoreNotebook,
  setNotebookFolder,
  setNotebookStarred,
  trashNotebook,
} from "../lib/notebooks";
import type { Notebook, NotebookFolder } from "../types";

type BrowseFilter = "all" | "starred" | "unfiled" | "trash" | string;

type NoteRow =
  | { kind: "pages"; id: string; updatedAt: string; notebook: Notebook }
  | { kind: "new"; id: "new" };

const SIDEBAR_W = 232;
const QUICK_BG = {
  all: { light: "#E8E9ED", dark: "#2A2C31" },
  starred: { light: "#F5E7DF", dark: "#3A2E28" },
  unfiled: { light: "#E4EEF8", dark: "#243040" },
  trash: { light: "#EEEFF2", dark: "#2C2D32" },
  templates: { light: "#EEF6E8", dark: "#273328" },
} as const;

export function NotebooksScreen() {
  const { theme, dark, workspace, updateNotebookHub, upsertNotebookPage, deleteNotebookPage } =
    useLifeOS();
  const navigation = useNavigation<any>();
  const { isTablet, isWide } = useLayout();
  const { width: windowW } = useWindowDimensions();
  const hub = workspace.notebookHub ?? emptyNotebookHub();

  const [filter, setFilter] = useState<BrowseFilter>("all");
  const [composer, setComposer] = useState<null | "notebook" | "folder">(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [movingNotebookId, setMovingNotebookId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(NOTEBOOK_COLORS[0]);
  const [createFolderId, setCreateFolderId] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const activeFolder =
    filter !== "all" && filter !== "starred" && filter !== "unfiled" && filter !== "trash"
      ? hub.folders.find((f) => f.id === filter)
      : undefined;

  const columns = isWide ? 4 : isTablet ? 3 : 2;
  const mainPad = 20;
  const gutter = 14;
  const mainWidth = Math.max(
    280,
    (isTablet ? windowW - SIDEBAR_W : windowW) - mainPad * 2,
  );
  const coverW = (mainWidth - gutter * (columns - 1)) / columns;
  const coverH = coverW * 1.28;

  const noteRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let pagesNotes = hub.notebooks.filter((n) => {
      if (filter === "trash") return Boolean(n.trashedAt);
      if (n.trashedAt) return false;
      if (filter === "starred") return Boolean(n.starred);
      if (filter === "unfiled") return !n.folderId;
      if (activeFolder) return n.folderId === activeFolder.id;
      return true; // all
    });

    if (q) {
      pagesNotes = pagesNotes.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          (n.coverSubtitle || "").toLowerCase().includes(q),
      );
    }

    const rows: NoteRow[] = pagesNotes.map((notebook) => ({
      kind: "pages" as const,
      id: notebook.id,
      updatedAt: notebook.updatedAt,
      notebook,
    }));

    // Legacy typed notes are migrated into notebooks on load — library is one model.

    rows.sort((a, b) => {
      if (a.kind === "new" || b.kind === "new") return 0;
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });

    // “New” tile at the front — except in Trash.
    if (filter !== "trash") {
      return [{ kind: "new" as const, id: "new" as const }, ...rows];
    }
    return rows;
  }, [hub.notebooks, filter, workspace.notes, activeFolder, query]);

  const headerTitle = useMemo(() => {
    if (activeFolder) return activeFolder.name;
    if (filter === "starred") return "Starred";
    if (filter === "unfiled") return "Unfiled";
    if (filter === "trash") return "Trash";
    return "All Notes";
  }, [activeFolder, filter]);

  const openCreateNotebook = (inFolderId?: string) => {
    setEditingFolderId(null);
    setCreateFolderId(inFolderId || activeFolder?.id);
    setComposer("notebook");
  };

  const openCreateMenu = (inFolderId?: string) => {
    openCreateNotebook(inFolderId);
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

  const submitFolder = async () => {
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
    setFilter(folder.id);
  };

  const openNote = (notebookId: string) => {
    const page = primaryPageForNotebook(workspace.notebookPages, notebookId);
    if (!page) {
      navigation.navigate("NotebookDetail", { notebookId });
      return;
    }
    navigation.navigate("PageCanvas", { notebookId, pageId: page.id });
  };

  const purgeNotebook = async (notebookId: string) => {
    const pages = pagesForNotebook(workspace.notebookPages, notebookId);
    await updateNotebookHub({
      ...hub,
      notebooks: hub.notebooks.filter((n) => n.id !== notebookId),
    });
    await Promise.all(pages.map((p) => deleteNotebookPage(p.id)));
  };

  const moveToTrash = (notebook: Notebook) => {
    Alert.alert("Move to Trash?", `"${notebook.name}" can be restored later.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Move to Trash",
        style: "destructive",
        onPress: () => void updateNotebookHub(trashNotebook(hub, notebook.id)),
      },
    ]);
  };

  const confirmPurge = (notebook: Notebook) => {
    Alert.alert("Delete forever?", `"${notebook.name}" and all its pages will be removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void purgeNotebook(notebook.id) },
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
    if (filter === folder.id) setFilter("all");
  };

  const confirmFolderActions = (folder: NotebookFolder) => {
    const count = hub.notebooks.filter((n) => n.folderId === folder.id && !n.trashedAt).length;
    Alert.alert(folder.name, count ? `${count} note${count === 1 ? "" : "s"} inside` : "Empty folder", [
      { text: "Open", onPress: () => setFilter(folder.id) },
      { text: "Edit", onPress: () => openEditFolder(folder) },
      {
        text: "Delete folder",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete folder?",
            count ? "Notes inside stay, but become unfiled." : "This folder will be removed.",
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
    if (notebook.trashedAt) {
      Alert.alert(notebook.name, undefined, [
        {
          text: "Restore",
          onPress: () => void updateNotebookHub(restoreNotebook(hub, notebook.id)),
        },
        { text: "Delete forever", style: "destructive", onPress: () => confirmPurge(notebook) },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    Alert.alert(notebook.name, undefined, [
      { text: "Open", onPress: () => openNote(notebook.id) },
      {
        text: notebook.starred ? "Remove star" : "Star",
        onPress: () => void updateNotebookHub(setNotebookStarred(hub, notebook.id, !notebook.starred)),
      },
      {
        text: "Organize…",
        onPress: () => navigation.navigate("NotebookDetail", { notebookId: notebook.id, organizeOnly: true }),
      },
      { text: "Move to folder…", onPress: () => setMovingNotebookId(notebook.id) },
      { text: "Move to Trash", style: "destructive", onPress: () => moveToTrash(notebook) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const quickTile = (
    key: keyof typeof QUICK_BG,
    label: string,
    icon: keyof typeof Feather.glyphMap,
    target: BrowseFilter,
    iconColor?: string,
  ) => {
    const active = filter === target;
    const bg = dark ? QUICK_BG[key].dark : QUICK_BG[key].light;
    return (
      <Pressable
        key={key}
        onPress={() => setFilter(target)}
        style={[
          styles.quickTile,
          !isTablet && styles.quickTilePhone,
          {
            backgroundColor: bg,
            borderColor: active ? theme.accent : "transparent",
            borderWidth: active ? 1.5 : 0,
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
      >
        <Feather name={icon} size={isTablet ? 18 : 16} color={iconColor || theme.text} />
        <Text style={[styles.quickLabel, !isTablet && styles.quickLabelPhone, { color: theme.text }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const foldersBlock = (horizontal: boolean) => {
    if (horizontal) {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderChips}>
          {hub.folders.map((folder) => {
            const active = filter === folder.id;
            return (
              <Pressable
                key={folder.id}
                onPress={() => setFilter(folder.id)}
                onLongPress={() => confirmFolderActions(folder)}
                delayLongPress={280}
                style={[
                  styles.folderChip,
                  {
                    backgroundColor: active ? theme.soft : theme.surface,
                    borderColor: active ? theme.accent : theme.border,
                  },
                ]}
              >
                <View style={[styles.folderDot, { backgroundColor: folder.color || theme.accent }]} />
                <Text style={{ color: active ? theme.accent : theme.text, fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
                  {folder.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={openCreateFolder}
            style={[styles.folderChip, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <Feather name="plus" size={14} color={theme.accent} />
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: "700" }}>Folder</Text>
          </Pressable>
        </ScrollView>
      );
    }
    return (
      <View style={styles.folderList}>
        {hub.folders.map((folder) => {
          const active = filter === folder.id;
          const count = hub.notebooks.filter((n) => n.folderId === folder.id && !n.trashedAt).length;
          return (
            <Pressable
              key={folder.id}
              onPress={() => setFilter(folder.id)}
              onLongPress={() => confirmFolderActions(folder)}
              delayLongPress={280}
              style={[styles.folderRow, active && { backgroundColor: theme.soft }]}
            >
              <View style={[styles.folderDot, { backgroundColor: folder.color || theme.accent }]} />
              <Text style={[styles.folderName, { color: theme.text }]} numberOfLines={1}>
                {folder.name}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "600" }}>{count || ""}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={openCreateFolder} style={styles.folderRow}>
          <Feather name="plus-circle" size={16} color={theme.accent} />
          <Text style={[styles.folderName, { color: theme.accent }]}>New Folder</Text>
        </Pressable>
      </View>
    );
  };

  const browseChrome = (
    <>
      <View style={styles.quickGrid}>
        {quickTile("all", "All", "home", "all")}
        {quickTile("starred", "Starred", "star", "starred", theme.warning)}
        {quickTile("unfiled", "Unfiled", "inbox", "unfiled", theme.blue)}
        {quickTile("trash", "Trash", "trash-2", "trash", theme.muted)}
      </View>

      <Pressable
        onPress={() => openCreateNotebook(activeFolder?.id)}
        style={[
          styles.templatesTile,
          {
            backgroundColor: dark ? QUICK_BG.templates.dark : QUICK_BG.templates.light,
            borderColor: theme.border,
          },
        ]}
      >
        <Feather name="layout" size={16} color={theme.success} />
        <Text style={[styles.quickLabel, { color: theme.text, flex: 1 }]}>New from template</Text>
        <Feather name="plus" size={15} color={theme.muted} />
      </Pressable>

      <Text style={[styles.sectionLabel, { color: theme.muted }]}>Folders</Text>
      {foldersBlock(!isTablet)}
    </>
  );

  const sidebar = (
    <ScrollView
      style={[styles.sidebar, { width: SIDEBAR_W, borderRightColor: theme.border }]}
      contentContainerStyle={styles.sidebarInner}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.brand, { color: theme.text }]}>Library</Text>
      <LibrarySubNav active="notes" compact />
      {browseChrome}
    </ScrollView>
  );

  const renderCoverFace = (opts: {
    color: string;
    cover?: Notebook["cover"];
    starred?: boolean;
  }) => (
    <View style={{ width: coverW }}>
      <NotebookCoverFace
        color={opts.color}
        cover={opts.cover}
        width={coverW}
        height={coverH}
        borderColor={theme.border}
      />
      {opts.starred ? (
        <View style={styles.starBadge}>
          <Feather name="star" size={12} color={theme.warning} />
        </View>
      ) : null}
    </View>
  );

  const renderItem = ({ item }: { item: NoteRow }) => {
    if (item.kind === "new") {
      return (
        <Pressable
          onPress={() => openCreateMenu(activeFolder?.id)}
          style={{ width: coverW }}
          accessibilityLabel="New note"
        >
          <View
            style={[
              styles.newTile,
              {
                width: coverW,
                height: coverH,
                borderColor: theme.border,
                backgroundColor: dark ? theme.surface : "#F0F1F4",
              },
            ]}
          >
            <Feather name="plus" size={28} color={theme.accent} />
          </View>
          <Text style={[styles.metaTitle, { color: theme.text }]}>New…</Text>
        </Pressable>
      );
    }

    const notebook = item.notebook;
    return (
      <Pressable
        onPress={() => (notebook.trashedAt ? confirmNotebookActions(notebook) : openNote(notebook.id))}
        onLongPress={() => confirmNotebookActions(notebook)}
        delayLongPress={280}
        style={{ width: coverW, marginBottom: 4 }}
      >
        {renderCoverFace({
          color: notebook.color || theme.accent,
          cover: notebook.cover,
          kind: "pages",
          starred: notebook.starred,
        })}
        <Text style={[styles.metaTitle, { color: theme.text }]} numberOfLines={1}>
          {notebook.name}
        </Text>
        <Text style={[styles.metaDate, { color: theme.muted }]}>{formatEdited(notebook.updatedAt)}</Text>
      </Pressable>
    );
  };

  const sectionHeader = (
    <View
      style={[
        styles.mainHeader,
        !isTablet && styles.mainHeaderPhone,
        !isTablet && { borderTopColor: theme.border },
      ]}
    >
      <Text
        style={[
          styles.mainTitle,
          !isTablet && styles.mainTitlePhone,
          {
            color: theme.text,
            fontFamily: Platform.OS === "ios" ? "Georgia" : undefined,
          },
        ]}
        numberOfLines={1}
      >
        {headerTitle}
      </Text>
      <View style={styles.mainActions}>
        <Pressable
          onPress={() => setSearchOpen((v) => !v)}
          style={[styles.iconBtn, { backgroundColor: theme.soft }]}
          accessibilityLabel="Search notes"
        >
          <Feather name="search" size={17} color={theme.accent} />
        </Pressable>
        <Pressable
          onPress={() => openCreateMenu(activeFolder?.id)}
          style={[styles.iconBtn, { backgroundColor: theme.text }]}
          accessibilityLabel="New note"
        >
          <Feather name="plus" size={17} color={theme.surface} />
        </Pressable>
      </View>
    </View>
  );

  const searchField = searchOpen ? (
    <TextInput
      value={query}
      onChangeText={setQuery}
      placeholder="Search notes"
      placeholderTextColor={theme.muted}
      autoFocus
      style={[
        styles.searchInput,
        isTablet && { marginHorizontal: 20 },
        { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
      ]}
    />
  ) : null;

  const empty = (
    filter === "trash" ? (
      <Empty title="Trash is empty." body="Deleted notes land here until you remove them for good." />
    ) : filter === "starred" ? (
      <Empty title="No starred notes." body="Long-press a note and choose Star to pin it here." />
    ) : activeFolder ? (
      <Empty
        title={`Nothing in ${activeFolder.name} yet.`}
        body="Create a note here, or long-press a note and move it into this folder."
      />
    ) : (
      <Empty title="No notes yet." body="Tap New to start a handwritten or text note." />
    )
  );

  return (
    <Page fullBleed>
      <View style={[styles.shell, !isTablet && styles.shellPhone]}>
        {isTablet ? sidebar : null}

        <View style={styles.main}>
          {isTablet ? (
            <>
              {sectionHeader}
              {searchField}
              <FlatList
                data={noteRows}
                key={`grid-${columns}-${filter}`}
                keyExtractor={(item) => `${item.kind}-${item.id}`}
                numColumns={columns}
                columnWrapperStyle={columns > 1 ? { gap: gutter } : undefined}
                contentContainerStyle={[styles.grid, { paddingHorizontal: mainPad, gap: gutter }]}
                renderItem={renderItem}
                ListEmptyComponent={empty}
              />
            </>
          ) : (
            <FlatList
              data={noteRows}
              key={`phone-grid-${columns}-${filter}`}
              keyExtractor={(item) => `${item.kind}-${item.id}`}
              numColumns={columns}
              columnWrapperStyle={columns > 1 ? { gap: gutter } : undefined}
              stickyHeaderIndices={[]}
              ListHeaderComponent={
                <View style={styles.phoneHeader}>
                  <Text style={[styles.brand, { color: theme.text }]}>Library</Text>
                  <LibrarySubNav active="notes" compact />
                  {browseChrome}
                  {sectionHeader}
                  {searchField}
                </View>
              }
              contentContainerStyle={[styles.grid, { paddingHorizontal: mainPad, gap: gutter }]}
              renderItem={renderItem}
              ListEmptyComponent={empty}
            />
          )}
        </View>
      </View>

      <CreateNoteModal
        visible={composer === "notebook"}
        onClose={() => setComposer(null)}
        onCreate={(result) => {
          void (async () => {
            const notebook = createNotebook(result.name, {
              folderId: createFolderId,
              color: result.color,
              cover: result.cover,
              context: { type: "personal", label: "Personal" },
            });
            const page = pageFromTemplate(notebook.id, 0, result.template);
            await updateNotebookHub({ ...hub, notebooks: [notebook, ...hub.notebooks] });
            await upsertNotebookPage(page);
            setComposer(null);
            navigation.navigate("PageCanvas", { notebookId: notebook.id, pageId: page.id });
          })();
        }}
      />

      <Modal
        visible={composer === "folder"}
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
              {editingFolderId ? "Edit folder" : "New folder"}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="School, Personal…"
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
              <Pressable
                onPress={() => void submitFolder()}
                style={[styles.modalBtn, { backgroundColor: theme.text, borderColor: theme.text }]}
              >
                <Text style={{ color: theme.surface, fontWeight: "700" }}>
                  {editingFolderId ? "Save" : "Create"}
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

function formatEdited(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
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
  shell: { flex: 1, flexDirection: "row" },
  shellPhone: { flexDirection: "column" },
  sidebar: { borderRightWidth: StyleSheet.hairlineWidth },
  sidebarInner: { paddingTop: 8, paddingBottom: 28, paddingHorizontal: 14, gap: 12 },
  brand: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Georgia" : undefined,
    marginTop: 2,
    marginBottom: 2,
  },
  phoneHeader: { gap: 12, paddingBottom: 10 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickTile: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 8,
    minHeight: 70,
    justifyContent: "center",
  },
  quickTilePhone: {
    minHeight: 58,
    paddingVertical: 10,
    gap: 6,
  },
  quickLabel: { fontSize: 13, fontWeight: "700" },
  quickLabelPhone: { fontSize: 12 },
  templatesTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  folderList: { gap: 2 },
  folderChips: { gap: 8, paddingVertical: 2 },
  folderChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 34,
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  folderDot: { width: 9, height: 9, borderRadius: 3 },
  folderName: { flex: 1, fontSize: 14, fontWeight: "600" },
  main: { flex: 1, minWidth: 0 },
  mainHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 12,
  },
  mainHeaderPhone: {
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 4,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mainTitle: { flex: 1, fontSize: 32, fontWeight: "600", letterSpacing: -0.4 },
  mainTitlePhone: { fontSize: 24 },
  mainActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "600",
  },
  grid: { paddingBottom: 48 },
  textCover: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  spine: { position: "absolute", left: 0, top: 0, bottom: 0, width: 7 },
  starBadge: { position: "absolute", top: 8, right: 8 },
  newTile: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  metaTitle: { marginTop: 8, fontSize: 13, fontWeight: "700" },
  metaDate: { marginTop: 2, fontSize: 11, fontWeight: "600" },
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
