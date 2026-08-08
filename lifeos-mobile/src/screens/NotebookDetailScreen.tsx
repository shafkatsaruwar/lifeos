import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
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
import { PaperThumb } from "../components/PaperBackground";
import { useLifeOS } from "../lib/LifeOSContext";
import { useLayout } from "../lib/layout";
import { createPage, pagesForNotebook, reindexPages } from "../lib/notebooks";
import type { NotebookContextLink } from "../types";

export function NotebookDetailScreen() {
  const { theme, workspace, updateNotebookHub, upsertNotebookPage, deleteNotebookPage } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isTablet, isWide } = useLayout();
  const notebookId = route.params?.notebookId as string;
  const hub = workspace.notebookHub;
  const notebook = hub.notebooks.find((n) => n.id === notebookId);
  const pages = pagesForNotebook(workspace.notebookPages, notebookId);
  const columns = isWide ? 4 : isTablet ? 3 : 2;
  const [contextOpen, setContextOpen] = useState(false);

  if (!notebook) {
    return (
      <Page>
        <View style={styles.missing}>
          <Text style={{ color: theme.muted }}>Notebook not found.</Text>
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
    setContextOpen(false);
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
    const copy = {
      ...createPage(notebookId, pages.length, source.paper),
      ink: source.ink,
      title: source.title ? `${source.title} copy` : undefined,
      textElements: source.textElements,
      imageElements: source.imageElements,
    };
    await upsertNotebookPage(copy);
    await touchNotebook(undefined, pages.length + 1);
  };

  const movePage = async (pageId: string, direction: -1 | 1) => {
    const index = pages.findIndex((p) => p.id === pageId);
    const swap = index + direction;
    if (index < 0 || swap < 0 || swap >= pages.length) return;
    const next = [...pages];
    const tmp = next[index];
    next[index] = next[swap];
    next[swap] = tmp;
    await Promise.all(reindexPages(next).map((p) => upsertNotebookPage(p)));
    await touchNotebook();
  };

  const removePage = (pageId: string) => {
    if (pages.length <= 1) {
      Alert.alert("Keep at least one page", "A notebook needs a page to write on.");
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
            placeholder="Untitled notebook"
            placeholderTextColor={theme.muted}
          />
          <Pressable onPress={() => setContextOpen(true)}>
            <Text style={[styles.meta, { color: theme.muted }]}>
              {folder ? `${folder.name} · ` : ""}
              {notebook.context?.label || "Personal"}
              {" · "}
              {pages.length} {pages.length === 1 ? "page" : "pages"}
              {"  "}
              <Text style={{ color: theme.accent }}>Edit context</Text>
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
        contentContainerStyle={[styles.list, isWide && styles.listWide]}
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

      <Modal visible={contextOpen} transparent animationType="fade" onRequestClose={() => setContextOpen(false)}>
        <Pressable style={styles.modalDim} onPress={() => setContextOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>LifeOS context</Text>
            <Text style={{ color: theme.muted, fontSize: 13, fontWeight: "600" }}>
              Optional. Notebooks can stay personal.
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
});
