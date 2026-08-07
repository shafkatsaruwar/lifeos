import Feather from "@expo/vector-icons/Feather";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { HandwritingCanvas, isPencilKitAvailable, type PencilKitViewRef } from "../components/HandwritingCanvas";
import { PaperBackground } from "../components/PaperBackground";
import { Page } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { PAPER_OPTIONS } from "../lib/notebooks";
import type { NoteInk, PaperStyle } from "../types";

/**
 * Full-bleed writing surface. Paper is the product — chrome stays quiet.
 * Ink autosaves per page via upsertNotebookPage (single RTDB path).
 */
export function PageCanvasScreen() {
  const { theme, workspace, upsertNotebookPage, updateNotebookHub } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const notebookId = route.params?.notebookId as string;
  const pageId = route.params?.pageId as string;
  const hub = workspace.notebookHub;
  const notebook = hub.notebooks.find((n) => n.id === notebookId);
  const page = workspace.notebookPages[pageId];
  const pencilRef = useRef<PencilKitViewRef | null>(null);
  const [paperOpen, setPaperOpen] = useState(false);
  const pencilReady = isPencilKitAvailable();

  if (!page || !notebook) {
    return (
      <Page edges={["top", "bottom"]}>
        <View style={styles.missing}>
          <Text style={{ color: theme.muted }}>Page not found.</Text>
        </View>
      </Page>
    );
  }

  const onInkChange = (ink: NoteInk) => {
    const latest = workspace.notebookPages[pageId] ?? page;
    void upsertNotebookPage({
      ...latest,
      ink,
      updatedAt: new Date().toISOString(),
    });
    void updateNotebookHub({
      ...hub,
      notebooks: hub.notebooks.map((n) =>
        n.id === notebookId ? { ...n, updatedAt: new Date().toISOString() } : n,
      ),
    });
  };

  const setPaper = (paper: PaperStyle) => {
    setPaperOpen(false);
    const latest = workspace.notebookPages[pageId] ?? page;
    void upsertNotebookPage({
      ...latest,
      paper,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <Page edges={["top", "bottom"]}>
      <View style={styles.chrome}>
        <Pressable
          accessibilityLabel="Back to pages"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.chromeBtn, pressed && { opacity: 0.55 }]}
        >
          <Feather name="chevron-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.chromeMid}>
          <Text style={[styles.notebookName, { color: theme.text }]} numberOfLines={1}>
            {notebook.name}
          </Text>
          <Text style={[styles.pageName, { color: theme.muted }]}>Page {page.index + 1}</Text>
        </View>
        {pencilReady ? (
          <>
            <Pressable accessibilityLabel="Undo" onPress={() => void pencilRef.current?.undo()} style={styles.chromeBtn}>
              <Feather name="rotate-ccw" size={17} color={theme.text} />
            </Pressable>
            <Pressable accessibilityLabel="Redo" onPress={() => void pencilRef.current?.redo()} style={styles.chromeBtn}>
              <Feather name="rotate-cw" size={17} color={theme.text} />
            </Pressable>
          </>
        ) : null}
        <Pressable accessibilityLabel="Paper style" onPress={() => setPaperOpen((v) => !v)} style={styles.chromeBtn}>
          <Feather name="layout" size={17} color={theme.text} />
        </Pressable>
      </View>

      {paperOpen ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paperRow}
          style={styles.paperBar}
        >
          {PAPER_OPTIONS.map((opt) => {
            const active = page.paper === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setPaper(opt.key)}
                style={[
                  styles.paperChip,
                  {
                    borderColor: active ? theme.accent : theme.border,
                    backgroundColor: active ? theme.soft : theme.surface,
                  },
                ]}
              >
                <Text style={{ color: active ? theme.accent : theme.text, fontWeight: "700", fontSize: 12 }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.stage}>
        <View style={styles.sheet}>
          <HandwritingCanvas ref={pencilRef} ink={page.ink} onChange={onInkChange} backgroundColor="#FFFEFA" />
          {page.paper !== "blank" ? <PaperBackground paper={page.paper} overlay /> : null}
        </View>
        <Text style={[styles.hint, { color: theme.muted }]}>
          {pencilReady ? "Apple PencilKit · autosaves quietly" : "Apple PencilKit needs a LifeOS native build (not Expo Go)."}
        </Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
  chrome: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 6,
    gap: 2,
  },
  chromeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  chromeMid: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  notebookName: { fontSize: 15, fontWeight: "800" },
  pageName: { fontSize: 11, fontWeight: "700", marginTop: 1 },
  paperBar: { maxHeight: 48, marginBottom: 4 },
  paperRow: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  paperChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stage: { flex: 1, paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  sheet: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.1)",
    backgroundColor: "#FFFEFA",
  },
  hint: { fontSize: 11, fontWeight: "600", textAlign: "center" },
});
