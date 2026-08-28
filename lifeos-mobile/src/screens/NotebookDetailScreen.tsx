import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
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
import { useNavigation, useRoute } from "@react-navigation/native";
import { Empty, Page } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { PaperThumb } from "../components/PaperBackground";
import { useLifeOS } from "../lib/LifeOSContext";
import { useLayout } from "../lib/layout";
import {
  cloneNotebookPage,
  createPage,
  movePageInList,
  pagesForNotebook,
  primaryPageForNotebook,
  reindexPages,
  setNotebookFolder,
} from "../lib/notebooks";
import type { NotebookContextLink } from "../types";

export function NotebookDetailScreen() {
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const { theme, workspace, updateNotebookHub, upsertNotebookPage, deleteNotebookPage } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isTablet, isWide } = useLayout();
  const notebookId = route.params?.notebookId as string;
  const organizeOnly = Boolean(route.params?.organizeOnly);
  const hub = workspace.notebookHub;
  const notebook = hub.notebooks.find((n) => n.id === notebookId);
  const pages = pagesForNotebook(workspace.notebookPages, notebookId);
  const columns = isWide ? 4 : isTablet ? 3 : 2;
  const [organizeOpen, setOrganizeOpen] = useState(false);

  // Opening a note should land on the writing surface — not a thumbnail picker.
  useEffect(() => {
    if (organizeOnly || !notebookId) return;
    const page = primaryPageForNotebook(workspace.notebookPages, notebookId);
    if (!page) return;
    navigation.replace("PageCanvas", { notebookId, pageId: page.id });
  }, [organizeOnly, notebookId, navigation, workspace.notebookPages]);

  if (!organizeOnly) {
    return (
      <Page>
        <View style={styles.missing}>
          <Text style={{ color: theme.muted }}>Opening note…</Text>
        </View>
      </Page>
    );
  }

  if (!notebook) {
    return (
      <Page>
        <View style={styles.missing}>
          <Text style={{ color: theme.muted }}>Note not found.</Text>
        </View>
      </Page>
    );
  }

  const touchNotebook = async (patch?: Partial<typeof notebook>, pageCount?: number) => {
    await updateNotebookHub({
      ...hub,
      notebooks: hub.notebooks.map((n) =>
        n.id === notebookId
          ? {
              ...n,
              ...patch,
              pageCount: pageCount ?? pages.length,
              updatedAt: new Date().toISOString(),
            }
          : n,
      ),
    });
  };

  const rename = (value: string) => {
    void touchNotebook({ name: value });
  };

  const setContext = (context?: NotebookContextLink) => {
    void touchNotebook({ context });
  };

  const moveToFolder = async (folderId: string | undefined) => {
    await updateNotebookHub(setNotebookFolder(hub, notebookId, folderId));
  };

  const addPage = async () => {
    const page = createPage(notebookId, pages.length, pages[pages.length - 1]?.paper ?? "ruled");
    await upsertNotebookPage(page);
    await touchNotebook(undefined, pages.length + 1);
    navigation.navigate("PageCanvas", { notebookId, pageId: page.id });
  };

  const duplicatePage = async (pageId: string) => {
    const source = workspace.notebookPages[pageId];
    if (!source) return;
    const copy = cloneNotebookPage(source, pages.length);
    await upsertNotebookPage(copy);
    await touchNotebook(undefined, pages.length + 1);
  };

  const movePage = async (pageId: string, direction: -1 | 1) => {
    const next = movePageInList(pages, pageId, direction);
    if (!next) return;
    await Promise.all(next.map((p) => upsertNotebookPage(p)));
    await touchNotebook();
  };

  const removePage = (pageId: string) => {
    if (pages.length <= 1) {
      Alert.alert("Keep at least one page", "A note needs a page to write on.");
      return;
    }
    Alert.alert("Delete page?", "Handwriting and overlays on this page will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteNotebookPage(pageId);
          const remaining = reindexPages(pages.filter((p) => p.id !== pageId));
          await Promise.all(remaining.map((p) => upsertNotebookPage(p)));
          await touchNotebook(undefined, remaining.length);
        },
      },
    ]);
  };

  const folder = hub.folders.find((f) => f.id === notebook.folderId);

  return (
    <Page edges={["top", "bottom"]}>
      <View style={styles.headRow}>
        <Pressable
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.55 }]}
        >
          <Feather name="chevron-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.heading}>
          <TextInput
            value={notebook.name}
            onChangeText={rename}
            style={[styles.titleInput, { color: theme.text }]}
            placeholder="Untitled note"
            placeholderTextColor={theme.muted}
          />
          <Pressable onPress={() => setOrganizeOpen(true)}>
            <Text style={[styles.meta, { color: theme.muted }]}>
              {folder ? `${folder.name} · ` : "Unfiled · "}
              {notebook.context?.label || "Personal"}
              {" · "}
              {pages.length} {pages.length === 1 ? "page" : "pages"}
              {"  "}
              <Text style={{ color: theme.accent }}>Organize</Text>
            </Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityLabel="Add page"
          onPress={() => void addPage()}
          style={[styles.iconButton, { backgroundColor: theme.text, borderRadius: 12 }]}
        >
          <Feather name="plus" size={18} color={theme.surface} />
        </Pressable>
      </View>

      <FlatList
        data={pages}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        key={`page-cols-${columns}`}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={[styles.list, isWide && styles.listWide, { paddingBottom: tabBarPad }]}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate("PageCanvas", { notebookId, pageId: item.id })}
            onLongPress={() => {
              Alert.alert(item.title?.trim() || `Page ${item.index + 1}`, undefined, [
                { text: "Open", onPress: () => navigation.navigate("PageCanvas", { notebookId, pageId: item.id }) },
                { text: "Move earlier", onPress: () => void movePage(item.id, -1) },
                { text: "Move later", onPress: () => void movePage(item.id, 1) },
                { text: "Duplicate", onPress: () => void duplicatePage(item.id) },
                { text: "Delete", style: "destructive", onPress: () => removePage(item.id) },
                { text: "Cancel", style: "cancel" },
              ]);
            }}
            style={styles.pageCard}
          >
            <PaperThumb paper={item.paper} color={notebook.color} />
            <Text style={[styles.pageLabel, { color: theme.text }]} numberOfLines={1}>
              {item.title?.trim() || `Page ${item.index + 1}`}
            </Text>
            <Text style={[styles.pageMeta, { color: theme.muted }]}>
              {new Date(item.updatedAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {(item.textElements?.length || item.imageElements?.length)
                ? ` · ${(item.textElements?.length ?? 0) + (item.imageElements?.length ?? 0)} items`
                : ""}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Empty title="No pages." body="Add a page to start writing." />}
      />

      <Modal visible={organizeOpen} transparent animationType="fade" onRequestClose={() => setOrganizeOpen(false)}>
        <Pressable style={styles.modalDim} onPress={() => setOrganizeOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Organize</Text>
            <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "800" }}>FOLDER</Text>
            <View style={styles.chipWrap}>
              <ContextChip
                label="No folder"
                active={!notebook.folderId}
                onPress={() => void moveToFolder(undefined)}
              />
              {hub.folders.map((item) => (
                <ContextChip
                  key={item.id}
                  label={item.name}
                  active={notebook.folderId === item.id}
                  onPress={() => void moveToFolder(item.id)}
                />
              ))}
            </View>
            {hub.folders.length === 0 ? (
              <Text style={{ color: theme.muted, fontSize: 13, fontWeight: "600" }}>
                Create a folder from Library → Notes first, then move this note into it.
              </Text>
            ) : null}
            <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "800", marginTop: 4 }}>LIFEOS CONTEXT</Text>
            <Text style={{ color: theme.muted, fontSize: 13, fontWeight: "600" }}>
              Optional. Notes can stay personal.
            </Text>
            <View style={styles.chipWrap}>
              <ContextChip
                label="Personal"
                active={!notebook.context || notebook.context.type === "personal"}
                onPress={() => setContext({ type: "personal", label: "Personal" })}
              />
              {workspace.classes.map((cls) => (
                <ContextChip
                  key={cls.id}
                  label={cls.code}
                  active={notebook.context?.classId === cls.id}
                  onPress={() => setContext({ type: "class", classId: cls.id, label: cls.code })}
                />
              ))}
              {workspace.projects.map((project) => (
                <ContextChip
                  key={project.name}
                  label={project.name}
                  active={notebook.context?.projectName === project.name}
                  onPress={() =>
                    setContext({ type: "project", projectName: project.name, label: project.name })
                  }
                />
              ))}
            </View>
            <Pressable
              onPress={() => setOrganizeOpen(false)}
              style={[styles.doneBtn, { backgroundColor: theme.text }]}
            >
              <Text style={{ color: theme.surface, fontWeight: "800" }}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Page>
  );
}

function ContextChip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const { theme } = useLifeOS();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? theme.accent : theme.border,
          backgroundColor: active ? theme.soft : theme.bg,
        },
      ]}
    >
      <Text style={{ color: active ? theme.accent : theme.text, fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
  headRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 8, gap: 8 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  heading: { flex: 1, minWidth: 0 },
  titleInput: { fontSize: 22, fontWeight: "800", paddingVertical: 0 },
  meta: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  listWide: { paddingHorizontal: 24, maxWidth: 980, alignSelf: "center", width: "100%" },
  gridRow: { gap: 12 },
  pageCard: { flex: 1, marginBottom: 16, gap: 6, maxWidth: "100%" },
  pageLabel: { fontSize: 14, fontWeight: "800" },
  pageMeta: { fontSize: 11, fontWeight: "600" },
  modalDim: { flex: 1, backgroundColor: "rgba(15,23,42,0.35)", justifyContent: "center", padding: 24 },
  modalCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  doneBtn: { minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
});
