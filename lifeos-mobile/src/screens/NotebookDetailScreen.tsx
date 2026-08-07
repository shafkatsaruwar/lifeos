import Feather from "@expo/vector-icons/Feather";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Empty, Page } from "../components/UI";
import { PaperThumb } from "../components/PaperBackground";
import { useLifeOS } from "../lib/LifeOSContext";
import { createPage, pagesForNotebook, reindexPages } from "../lib/notebooks";
import { useLayout } from "../lib/layout";

export function NotebookDetailScreen() {
  const { theme, workspace, updateNotebookHub, upsertNotebookPage, deleteNotebookPage } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isTablet } = useLayout();
  const notebookId = route.params?.notebookId as string;
  const hub = workspace.notebookHub;
  const notebook = hub.notebooks.find((n) => n.id === notebookId);
  const pages = pagesForNotebook(workspace.notebookPages, notebookId);
  const columns = isTablet ? 3 : 2;

  if (!notebook) {
    return (
      <Page>
        <View style={styles.missing}>
          <Text style={{ color: theme.muted }}>Notebook not found.</Text>
        </View>
      </Page>
    );
  }

  const touchNotebook = async (pageCount?: number) => {
    await updateNotebookHub({
      ...hub,
      notebooks: hub.notebooks.map((n) =>
        n.id === notebookId
          ? {
              ...n,
              pageCount: pageCount ?? pages.length,
              updatedAt: new Date().toISOString(),
            }
          : n,
      ),
    });
  };

  const rename = (value: string) => {
    void updateNotebookHub({
      ...hub,
      notebooks: hub.notebooks.map((n) =>
        n.id === notebookId ? { ...n, name: value, updatedAt: new Date().toISOString() } : n,
      ),
    });
  };

  const addPage = async () => {
    const page = createPage(notebookId, pages.length, pages[pages.length - 1]?.paper ?? "ruled");
    await upsertNotebookPage(page);
    await touchNotebook(pages.length + 1);
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
    await touchNotebook(pages.length + 1);
  };

  const removePage = (pageId: string) => {
    if (pages.length <= 1) {
      Alert.alert("Keep at least one page", "A notebook needs a page to write on.");
      return;
    }
    Alert.alert("Delete page?", "Handwriting on this page will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteNotebookPage(pageId);
          const remaining = reindexPages(pages.filter((p) => p.id !== pageId));
          await Promise.all(remaining.map((p) => upsertNotebookPage(p)));
          await touchNotebook(remaining.length);
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
          <Text style={[styles.meta, { color: theme.muted }]}>
            {folder ? `${folder.name} · ` : ""}
            {pages.length} {pages.length === 1 ? "page" : "pages"}
            {notebook.context?.label ? ` · ${notebook.context.label}` : ""}
          </Text>
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
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate("PageCanvas", { notebookId, pageId: item.id })}
            onLongPress={() => {
              Alert.alert(`Page ${item.index + 1}`, undefined, [
                { text: "Open", onPress: () => navigation.navigate("PageCanvas", { notebookId, pageId: item.id }) },
                { text: "Duplicate", onPress: () => void duplicatePage(item.id) },
                { text: "Delete", style: "destructive", onPress: () => removePage(item.id) },
                { text: "Cancel", style: "cancel" },
              ]);
            }}
            style={styles.pageCard}
          >
            <PaperThumb paper={item.paper} color={notebook.color} />
            <Text style={[styles.pageLabel, { color: theme.text }]}>Page {item.index + 1}</Text>
            <Text style={[styles.pageMeta, { color: theme.muted }]}>
              {new Date(item.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Empty title="No pages." body="Add a page to start writing." />}
      />
    </Page>
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
  gridRow: { gap: 12 },
  pageCard: { flex: 1, marginBottom: 16, gap: 6 },
  pageLabel: { fontSize: 14, fontWeight: "800" },
  pageMeta: { fontSize: 11, fontWeight: "600" },
});
