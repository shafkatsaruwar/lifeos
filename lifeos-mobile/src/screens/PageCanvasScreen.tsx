import Feather from "@expo/vector-icons/Feather";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { HandwritingCanvas, isPencilKitAvailable, type PencilKitViewRef } from "../components/HandwritingCanvas";
import { PageElementsLayer } from "../components/PageElementsLayer";
import { PaperBackground } from "../components/PaperBackground";
import { Page } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { useLayout } from "../lib/layout";
import { buildPageAiContext, isNotebookAiAvailable, runNotebookAi } from "../lib/notebookAi";
import { isPdfPipelineAvailable } from "../lib/notebookPdf";
import {
  createImageElement,
  createTextElement,
  pagesForNotebook,
  PAPER_OPTIONS,
  TEXT_SIZES,
} from "../lib/notebooks";
import type { NoteInk, PageCanvasMode, PageImageElement, PageTextElement, PaperStyle } from "../types";

/**
 * Writing surface: ink (PencilKit) + typed text + images as overlays.
 * Compact chrome — paper stays the product.
 */
export function PageCanvasScreen() {
  const { theme, workspace, upsertNotebookPage, updateNotebookHub } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isTablet, isWide } = useLayout();
  const notebookId = route.params?.notebookId as string;
  const pageId = route.params?.pageId as string;
  const hub = workspace.notebookHub;
  const notebook = hub.notebooks.find((n) => n.id === notebookId);
  const page = workspace.notebookPages[pageId];
  const pages = useMemo(() => pagesForNotebook(workspace.notebookPages, notebookId), [workspace.notebookPages, notebookId]);
  const pageIndex = pages.findIndex((p) => p.id === pageId);

  const pencilRef = useRef<PencilKitViewRef | null>(null);
  const [mode, setMode] = useState<PageCanvasMode>("ink");
  const [paperOpen, setPaperOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toolPanel, setToolPanel] = useState<"none" | "text" | "paper">("none");
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

  const texts = page.textElements ?? [];
  const images = page.imageElements ?? [];
  const selectedText = texts.find((t) => t.id === selectedId);

  const persistPage = (patch: Partial<typeof page>) => {
    const latest = workspace.notebookPages[pageId] ?? page;
    void upsertNotebookPage({
      ...latest,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    void updateNotebookHub({
      ...hub,
      notebooks: hub.notebooks.map((n) =>
        n.id === notebookId ? { ...n, updatedAt: new Date().toISOString() } : n,
      ),
    });
  };

  const onInkChange = (ink: NoteInk) => persistPage({ ink });

  const setPaper = (paper: PaperStyle) => {
    setPaperOpen(false);
    setToolPanel("none");
    persistPage({ paper });
  };

  const goPage = (delta: number) => {
    const next = pages[pageIndex + delta];
    if (!next) return;
    setSelectedId(null);
    setMode("ink");
    navigation.setParams({ pageId: next.id });
  };

  const insertText = () => {
    const el = createTextElement({ y: 48 + texts.length * 24 });
    persistPage({ textElements: [...texts, el] });
    setMode("text");
    setSelectedId(el.id);
    setToolPanel("text");
  };

  const insertImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photos access needed", "Allow photo library access to place an image on the page.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const el = createImageElement(result.assets[0].uri, {
      width: isTablet ? 280 : 200,
      height: isTablet ? 210 : 150,
    });
    persistPage({ imageElements: [...images, el] });
    setMode("image");
    setSelectedId(el.id);
    setToolPanel("none");
  };

  const updateTexts = (next: PageTextElement[]) => persistPage({ textElements: next });
  const updateImages = (next: PageImageElement[]) => persistPage({ imageElements: next });

  const patchSelectedText = (patch: Partial<PageTextElement>) => {
    if (!selectedText) return;
    updateTexts(texts.map((t) => (t.id === selectedText.id ? { ...t, ...patch } : t)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    updateTexts(texts.filter((t) => t.id !== selectedId));
    updateImages(images.filter((i) => i.id !== selectedId));
    setSelectedId(null);
  };

  const openMore = () => {
    const actions = [
      "Rename page",
      ...(isNotebookAiAvailable() ? ["Ask AI about this page"] : ["AI (coming later)"]),
      ...(isPdfPipelineAvailable() ? ["Import PDF page"] : ["PDF import (architecture ready)"]),
      "Cancel",
    ];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: actions, cancelButtonIndex: actions.length - 1 },
        (index) => {
          if (index === 0) promptRename();
          else if (actions[index]?.startsWith("Ask AI")) void askAi();
          else if (actions[index]?.startsWith("AI")) {
            Alert.alert("AI stays quiet for now", "Write first. Notebook AI actions will plug into LifeOS later without interrupting the page.");
          } else if (actions[index]?.startsWith("PDF")) {
            Alert.alert("PDF pipeline", "Import/annotate/export hooks live in notebookPdf.ts — not faked in the UI yet.");
          }
        },
      );
    } else {
      Alert.alert("Page", undefined, [
        { text: "Rename page", onPress: promptRename },
        {
          text: "AI (coming later)",
          onPress: () =>
            Alert.alert("AI stays quiet for now", "Write first. Notebook AI actions will plug into LifeOS later."),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const promptRename = () => {
    if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
      Alert.prompt(
        "Page title",
        undefined,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (value?: string) => persistPage({ title: (value ?? "").trim() || undefined }),
          },
        ],
        "plain-text",
        page.title ?? "",
      );
      return;
    }
    const next = page.title?.trim() ? undefined : `Page ${page.index + 1}`;
    persistPage({ title: next });
  };

  const askAi = async () => {
    const result = await runNotebookAi({
      action: "summarize-page",
      notebookId,
      pageId,
      contextText: buildPageAiContext({
        title: page.title,
        textElements: texts,
        recognitionTranscript:
          page.recognition?.status === "ready" ? page.recognition.transcript : undefined,
      }),
      lifeOsContext: {
        classId: notebook.context?.classId,
        projectName: notebook.context?.projectName,
      },
    });
    if (!result.ok) Alert.alert("Not available yet", result.reason);
  };

  const inkInteractive = mode === "ink";
  const overlayInteractive = mode !== "ink";

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
          <Text style={[styles.pageName, { color: theme.muted }]} numberOfLines={1}>
            {page.title?.trim() || `Page ${page.index + 1}`}
            {pageIndex >= 0 ? ` · ${pageIndex + 1}/${pages.length}` : ""}
          </Text>
        </View>
        <Pressable accessibilityLabel="Previous page" disabled={pageIndex <= 0} onPress={() => goPage(-1)} style={[styles.chromeBtn, pageIndex <= 0 && { opacity: 0.3 }]}>
          <Feather name="chevron-up" size={18} color={theme.text} />
        </Pressable>
        <Pressable
          accessibilityLabel="Next page"
          disabled={pageIndex < 0 || pageIndex >= pages.length - 1}
          onPress={() => goPage(1)}
          style={[styles.chromeBtn, (pageIndex < 0 || pageIndex >= pages.length - 1) && { opacity: 0.3 }]}
        >
          <Feather name="chevron-down" size={18} color={theme.text} />
        </Pressable>
        <Pressable accessibilityLabel="More" onPress={openMore} style={styles.chromeBtn}>
          <Feather name="more-horizontal" size={18} color={theme.text} />
        </Pressable>
      </View>

      {/* Compact tool rail */}
      <View style={[styles.toolRail, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <ToolBtn
          icon="edit-3"
          label="Ink"
          active={mode === "ink"}
          onPress={() => {
            setMode("ink");
            setSelectedId(null);
            setToolPanel("none");
            setPaperOpen(false);
          }}
        />
        <ToolBtn
          icon="type"
          label="Text"
          active={mode === "text" || (mode === "select" && !!selectedText)}
          onPress={() => {
            setMode("text");
            setToolPanel("text");
            setPaperOpen(false);
            if (!selectedText) insertText();
          }}
        />
        <ToolBtn
          icon="image"
          label="Image"
          active={mode === "image"}
          onPress={() => {
            setMode("image");
            setToolPanel("none");
            setPaperOpen(false);
            void insertImage();
          }}
        />
        <ToolBtn
          icon="layout"
          label="Paper"
          active={paperOpen || toolPanel === "paper"}
          onPress={() => {
            setPaperOpen((v) => !v);
            setToolPanel((p) => (p === "paper" ? "none" : "paper"));
          }}
        />
        {pencilReady ? (
          <>
            <View style={[styles.toolDivider, { backgroundColor: theme.border }]} />
            <ToolBtn icon="rotate-ccw" label="Undo" onPress={() => void pencilRef.current?.undo()} />
            <ToolBtn icon="rotate-cw" label="Redo" onPress={() => void pencilRef.current?.redo()} />
          </>
        ) : null}
        {selectedId ? (
          <ToolBtn icon="trash-2" label="Delete" danger onPress={deleteSelected} />
        ) : null}
      </View>

      {(paperOpen || toolPanel === "paper") && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paperRow} style={styles.contextBar}>
          {PAPER_OPTIONS.map((opt) => {
            const active = page.paper === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setPaper(opt.key)}
                style={[
                  styles.chip,
                  { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? theme.soft : theme.bg },
                ]}
              >
                <Text style={{ color: active ? theme.accent : theme.text, fontWeight: "700", fontSize: 12 }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {toolPanel === "text" && selectedText ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paperRow} style={styles.contextBar}>
          {TEXT_SIZES.map((size) => (
            <Pressable
              key={size}
              onPress={() => patchSelectedText({ fontSize: size })}
              style={[
                styles.chip,
                {
                  borderColor: selectedText.fontSize === size ? theme.accent : theme.border,
                  backgroundColor: selectedText.fontSize === size ? theme.soft : theme.bg,
                },
              ]}
            >
              <Text style={{ color: theme.text, fontWeight: "800", fontSize: 12 }}>{size}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => patchSelectedText({ bold: !selectedText.bold })}
            style={[styles.chip, { borderColor: theme.border, backgroundColor: selectedText.bold ? theme.soft : theme.bg }]}
          >
            <Text style={{ color: theme.text, fontWeight: "900", fontSize: 12 }}>B</Text>
          </Pressable>
          <Pressable
            onPress={() => patchSelectedText({ italic: !selectedText.italic })}
            style={[styles.chip, { borderColor: theme.border, backgroundColor: selectedText.italic ? theme.soft : theme.bg }]}
          >
            <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12, fontStyle: "italic" }}>I</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              patchSelectedText({
                list: selectedText.list === "bullet" ? "none" : "bullet",
              })
            }
            style={[styles.chip, { borderColor: theme.border, backgroundColor: selectedText.list === "bullet" ? theme.soft : theme.bg }]}
          >
            <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>• List</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const opacity = selectedText.opacity === 0.5 ? 1 : 0.5;
              patchSelectedText({ opacity });
            }}
            style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.bg }]}
          >
            <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>Opacity</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      <View style={[styles.stage, isWide && styles.stageWide]}>
        {isWide ? (
          <ScrollView style={styles.pageStrip} contentContainerStyle={styles.pageStripInner}>
            {pages.map((p) => {
              const active = p.id === pageId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setSelectedId(null);
                    navigation.setParams({ pageId: p.id });
                  }}
                  style={[
                    styles.stripItem,
                    {
                      borderColor: active ? theme.accent : theme.border,
                      backgroundColor: active ? theme.soft : theme.surface,
                    },
                  ]}
                >
                  <Text style={{ color: active ? theme.accent : theme.text, fontWeight: "800", fontSize: 11 }}>
                    {p.index + 1}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.stageMain}>
          <View style={styles.sheet}>
            <View style={StyleSheet.absoluteFill} pointerEvents={inkInteractive ? "auto" : "none"}>
              <HandwritingCanvas ref={pencilRef} ink={page.ink} onChange={onInkChange} backgroundColor="#FFFEFA" />
            </View>
            {page.paper !== "blank" ? <PaperBackground paper={page.paper} overlay /> : null}
            <PageElementsLayer
              mode={mode}
              texts={texts}
              images={images}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                if (id && texts.some((t) => t.id === id)) {
                  setMode("text");
                  setToolPanel("text");
                } else if (id) {
                  setMode("select");
                  setToolPanel("none");
                }
              }}
              onChangeTexts={updateTexts}
              onChangeImages={updateImages}
              interactive={overlayInteractive}
            />
          </View>
          <Text style={[styles.hint, { color: theme.muted }]}>
            {mode === "ink"
              ? pencilReady
                ? "Apple PencilKit · ink autosaves"
                : "Native build required for PencilKit"
              : "Move · resize · edit overlays · switch to Ink to draw"}
          </Text>
        </View>
      </View>
    </Page>
  );
}

function ToolBtn({
  icon,
  label,
  active,
  onPress,
  danger,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
  danger?: boolean;
}) {
  const { theme } = useLifeOS();
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.toolBtn, active && { backgroundColor: theme.soft }]}
    >
      <Feather name={icon} size={16} color={danger ? theme.danger : active ? theme.accent : theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
  chrome: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 4, gap: 2 },
  chromeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  chromeMid: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  notebookName: { fontSize: 15, fontWeight: "800" },
  pageName: { fontSize: 11, fontWeight: "700", marginTop: 1 },
  toolRail: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 2,
  },
  toolBtn: { width: 40, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  toolDivider: { width: StyleSheet.hairlineWidth, height: 22, marginHorizontal: 4 },
  contextBar: { maxHeight: 46, marginBottom: 4 },
  paperRow: { paddingHorizontal: 12, gap: 8, alignItems: "center" },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  stage: { flex: 1, paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  stageWide: { flexDirection: "row", paddingHorizontal: 16 },
  pageStrip: { width: 56, marginRight: 10 },
  pageStripInner: { gap: 8, paddingBottom: 24 },
  stripItem: {
    width: 44,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stageMain: { flex: 1, gap: 8 },
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
