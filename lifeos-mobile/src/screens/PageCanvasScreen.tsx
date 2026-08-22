import Feather from "@expo/vector-icons/Feather";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  FlatList,
  LayoutAnimation,
  type LayoutRectangle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AnchoredPopover } from "../components/AnchoredPopover";
import { DocumentZoom } from "../components/DocumentZoom";
import {
  isPencilKitAvailable,
  preferredDrawingPolicy,
  type HandwritingCanvasRef,
  type InkToolKind,
} from "../components/HandwritingCanvas";
import { InkToolTray, type DrawingTip } from "../components/InkToolTray";
import { PaperBackground } from "../components/PaperBackground";
import { PageSheet } from "../components/PageSheet";
import { TemplatePicker } from "../components/TemplatePicker";
import { Page } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { useLayout } from "../lib/layout";
import { buildPageAiContext, isNotebookAiAvailable, runNotebookAi } from "../lib/notebookAi";
import {
  isPdfPipelineAvailable,
  notebookPagesForExport,
  pagesFromPdfImport,
  planPdfExport,
  planPdfImport,
  sharePdf,
} from "../lib/notebookPdf";
import {
  cloneNotebookPage,
  createImageElement,
  createPage,
  createTextElement,
  movePageInList,
  PAGE_GAP,
  PAGE_TEMPLATES,
  pageFromTemplate,
  pageSizeForWidth,
  pagesForNotebook,
  reindexPages,
  TEXT_SIZES,
  trashNotebook,
  type PageTemplate,
} from "../lib/notebooks";
import type {
  NoteInk,
  NotebookPage,
  NotebookPageView,
  PageCanvasMode,
  PageImageElement,
  PageTextElement,
} from "../types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animatePageChange() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

/**
 * Writing surface: ink (PencilKit) + typed text + images as overlays.
 * Seamless = continuous vertical pages; Single = one page at a time.
 * Compact chrome — paper stays the product.
 */
export function PageCanvasScreen() {
  const { theme, workspace, upsertNotebookPage, deleteNotebookPage, updateNotebookHub, updateSettings } =
    useLifeOS();
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

  const pencilRef = useRef<HandwritingCanvasRef | null>(null);
  const listRef = useRef<FlatList<NotebookPage>>(null);
  const stageWidthRef = useRef(0);
  const scrollingRef = useRef(false);
  /** When true, next pageId change came from list scroll — don't force scrollToIndex. */
  const ignoreScrollSyncRef = useRef(false);
  const pagesByIdRef = useRef(workspace.notebookPages);
  pagesByIdRef.current = workspace.notebookPages;
  const hubRef = useRef(hub);
  hubRef.current = hub;
  /** In-flight page saves so back navigation can wait for Firebase. */
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pageIdRef = useRef(pageId);
  pageIdRef.current = pageId;
  const modeRef = useRef<PageCanvasMode>("ink");
  const drawingPolicy = preferredDrawingPolicy(isTablet);
  const ensuringNextPageRef = useRef(false);
  const moreBtnRef = useRef<View>(null);

  const [mode, setMode] = useState<PageCanvasMode>("ink");
  modeRef.current = mode;
  const [inkTool, setInkTool] = useState<InkToolKind>("pen");
  const [inkColor, setInkColor] = useState<string>("202124");
  const [inkWidth, setInkWidth] = useState<number>(5.5);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toolPanel, setToolPanel] = useState<"none" | "text" | "pen" | "eraser" | "shape" | "templates">("none");
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<LayoutRectangle | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [stageWidth, setStageWidth] = useState(0);
  const [viewMode, setViewMode] = useState<NotebookPageView>(workspace.settings.notebookPageView ?? "seamless");
  /** Session-only document zoom; resets when leaving the note. */
  const [zoomScale, setZoomScale] = useState(1);
  const pencilReady = isPencilKitAvailable();

  const sheetSize = useMemo(() => {
    const width = stageWidth > 0 ? stageWidth : isWide ? 640 : 360;
    return pageSizeForWidth(width, page?.paperOrientation, page?.paperSize);
  }, [stageWidth, isWide, page?.paperOrientation, page?.paperSize]);

  useEffect(() => {
    setViewMode(workspace.settings.notebookPageView ?? "seamless");
  }, [workspace.settings.notebookPageView]);

  const persistPageById = useCallback(
    (targetPageId: string, patch: Partial<NotebookPage>) => {
      const latest = pagesByIdRef.current[targetPageId];
      if (!latest) return Promise.resolve();
      const next = {
        ...latest,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      pagesByIdRef.current = { ...pagesByIdRef.current, [targetPageId]: next };
      const save = upsertNotebookPage(next);
      saveQueueRef.current = saveQueueRef.current.then(
        () => save,
        () => save,
      );
      // Touch notebook timestamp in the background — don't block ink flush on it.
      void save.then(() => {
        const currentHub = hubRef.current;
        return updateNotebookHub({
          ...currentHub,
          notebooks: currentHub.notebooks.map((n) =>
            n.id === notebookId ? { ...n, updatedAt: new Date().toISOString() } : n,
          ),
        });
      });
      return save;
    },
    [notebookId, updateNotebookHub, upsertNotebookPage],
  );

  const flushInk = useCallback(async () => {
    const targetId = pageIdRef.current;
    try {
      // Read strokes straight from PencilKit and persist — don't rely only on draw events.
      const native = await pencilRef.current?.getCanvasDataAsBase64();
      if (typeof native === "string" && native.length > 0 && targetId) {
        await persistPageById(targetId, {
          ink: {
            version: 2,
            format: "pencilkit",
            data: native,
            updatedAt: Date.now(),
          },
        });
        return;
      }
      await pencilRef.current?.flush();
      await saveQueueRef.current;
    } catch {
      /* ignore flush races */
    }
  }, [persistPageById]);

  // Flush + await save before leaving (back button, swipe-back, stack pop).
  const allowRemoveRef = useRef(false);
  useEffect(() => {
    const unsub = navigation.addListener(
      "beforeRemove",
      (e: { preventDefault: () => void; data: { action: unknown } }) => {
        if (allowRemoveRef.current) return;
        e.preventDefault();
        setZoomScale(1);
        void flushInk().finally(() => {
          allowRemoveRef.current = true;
          navigation.dispatch(e.data.action as never);
        });
      },
    );
    return unsub;
  }, [navigation, flushInk]);

  // Keep PencilKit first-responder + LifeOS ink tool; never show Apple's floating picker.
  useEffect(() => {
    if (mode !== "ink") return;
    const timer = setTimeout(() => {
      void pencilRef.current?.assertToolPicker();
      void pencilRef.current?.setInkTool(inkTool, inkColor, inkWidth);
      void pencilRef.current?.setToolPickerVisible(false);
    }, 80);
    return () => clearTimeout(timer);
  }, [pageId, mode, inkTool, inkColor, inkWidth]);

  const jumpToPage = useCallback(
    async (nextPageId: string, opts?: { animated?: boolean }) => {
      if (!nextPageId || nextPageId === pageId) return;
      await flushInk();
      setSelectedId(null);
      setMode("ink");
      navigation.setParams({ pageId: nextPageId });
      if (viewMode === "seamless") {
        const index = pages.findIndex((p) => p.id === nextPageId);
        if (index >= 0) {
          requestAnimationFrame(() => {
            listRef.current?.scrollToIndex({ index, animated: opts?.animated ?? true, viewPosition: 0 });
          });
        }
      }
    },
    [flushInk, navigation, pageId, pages, viewMode],
  );

  // Keep Seamless list aligned when pageId changes from strip / chevrons only.
  // Never auto-scroll from viewability — that reintroduced page jumps while writing.
  useEffect(() => {
    if (viewMode !== "seamless" || pageIndex < 0 || stageWidth <= 0) return;
    if (ignoreScrollSyncRef.current) {
      ignoreScrollSyncRef.current = false;
      return;
    }
    // Don't yank the list during ink — live canvas + autosave already own the viewport.
    if (modeRef.current === "ink") return;
    if (scrollingRef.current) return;
    const timer = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index: pageIndex, animated: false, viewPosition: 0 });
      } catch {
        /* layout may not be ready */
      }
    }, 16);
    return () => clearTimeout(timer);
  }, [pageIndex, viewMode, stageWidth]);

  const touchPageCount = useCallback(
    async (count: number) => {
      const currentHub = hubRef.current;
      await updateNotebookHub({
        ...currentHub,
        notebooks: currentHub.notebooks.map((n) =>
          n.id === notebookId ? { ...n, pageCount: count, updatedAt: new Date().toISOString() } : n,
        ),
      });
    },
    [notebookId, updateNotebookHub],
  );

  const openCreatedPage = useCallback(
    (newPageId: string, scrollIndex: number) => {
      setSelectedId(null);
      setMode("ink");
      ignoreScrollSyncRef.current = false;
      animatePageChange();
      navigation.setParams({ pageId: newPageId });
      if (viewMode === "seamless") {
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({
            index: scrollIndex,
            animated: true,
            viewPosition: 0,
          });
        });
      }
    },
    [navigation, viewMode],
  );

  const addPage = useCallback(async () => {
    await flushInk();
    const insertAt = Math.min(pages.length, Math.max(0, pageIndex + 1));
    const newPage = createPage(notebookId, insertAt, page?.paper ?? "ruled");
    const nextList = [...pages];
    nextList.splice(insertAt, 0, newPage);
    await Promise.all(reindexPages(nextList).map((p) => upsertNotebookPage(p)));
    await touchPageCount(nextList.length);
    openCreatedPage(newPage.id, insertAt);
  }, [
    flushInk,
    notebookId,
    page?.paper,
    pageIndex,
    pages,
    upsertNotebookPage,
    touchPageCount,
    openCreatedPage,
  ]);

  /** Quietly append a trailing page so Seamless scroll never hits a hard end. */
  const ensureTrailingPage = useCallback(async () => {
    if (ensuringNextPageRef.current) return;
    const livePages = pagesForNotebook(pagesByIdRef.current, notebookId);
    const last = livePages[livePages.length - 1];
    if (!last) return;
    const lastEmpty =
      !last.ink?.data &&
      !last.ink?.pencilKitData &&
      !(last.textElements?.length) &&
      !(last.imageElements?.length);
    // Keep at most one empty page at the end — avoid infinite blank sheets.
    if (lastEmpty) return;

    ensuringNextPageRef.current = true;
    try {
      const newPage = createPage(notebookId, livePages.length, last.paper ?? "ruled");
      await upsertNotebookPage(newPage);
      await touchPageCount(livePages.length + 1);
    } finally {
      ensuringNextPageRef.current = false;
    }
  }, [notebookId, upsertNotebookPage, touchPageCount]);

  const addPageFromTemplate = useCallback(
    async (template: PageTemplate) => {
      await flushInk();
      const insertAt = Math.min(pages.length, Math.max(0, pageIndex + 1));
      const newPage = pageFromTemplate(notebookId, insertAt, template);
      const nextList = [...pages];
      nextList.splice(insertAt, 0, newPage);
      await Promise.all(reindexPages(nextList).map((p) => upsertNotebookPage(p)));
      await touchPageCount(nextList.length);
      setToolPanel("none");
      openCreatedPage(newPage.id, insertAt);
    },
    [flushInk, notebookId, pageIndex, pages, upsertNotebookPage, touchPageCount, openCreatedPage],
  );

  const duplicateCurrentPage = useCallback(async () => {
    const source = pagesByIdRef.current[pageIdRef.current];
    if (!source) return;
    await flushInk();
    const insertAt = Math.min(pages.length, pageIndex + 1);
    const copy = cloneNotebookPage(source, insertAt);
    const nextList = [...pages];
    nextList.splice(insertAt, 0, copy);
    await Promise.all(reindexPages(nextList).map((p) => upsertNotebookPage(p)));
    await touchPageCount(nextList.length);
    openCreatedPage(copy.id, insertAt);
  }, [flushInk, pageIndex, pages, upsertNotebookPage, touchPageCount, openCreatedPage]);

  const moveCurrentPage = useCallback(
    async (direction: -1 | 1) => {
      await flushInk();
      const next = movePageInList(pages, pageIdRef.current, direction);
      if (!next) return;
      await Promise.all(next.map((p) => upsertNotebookPage(p)));
      await touchPageCount(next.length);
      animatePageChange();
      const newIndex = next.findIndex((p) => p.id === pageIdRef.current);
      if (viewMode === "seamless" && newIndex >= 0) {
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({ index: newIndex, animated: true, viewPosition: 0 });
        });
      }
    },
    [flushInk, pages, upsertNotebookPage, touchPageCount, viewMode],
  );

  const deleteCurrentNotebook = useCallback(() => {
    const name = hubRef.current.notebooks.find((n) => n.id === notebookId)?.name ?? "this note";
    Alert.alert(
      "Delete note?",
      `"${name}" will move to Trash. Restore it later from Library → Trash.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move to Trash",
          style: "destructive",
          onPress: () => {
            void (async () => {
              allowRemoveRef.current = true;
              await updateNotebookHub(trashNotebook(hubRef.current, notebookId));
              navigation.navigate("NotebooksList");
            })();
          },
        },
      ],
    );
  }, [notebookId, updateNotebookHub, navigation]);

  const removeCurrentPage = useCallback(() => {
    if (pages.length <= 1) {
      Alert.alert("Only page", "Deleting the last page removes the whole note.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete note", style: "destructive", onPress: () => deleteCurrentNotebook() },
      ]);
      return;
    }
    const targetId = pageIdRef.current;
    const targetIndex = pageIndex;
    Alert.alert("Delete page?", "Handwriting and overlays on this page will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await flushInk();
            await deleteNotebookPage(targetId);
            const remaining = reindexPages(pages.filter((p) => p.id !== targetId));
            await Promise.all(remaining.map((p) => upsertNotebookPage(p)));
            await touchPageCount(remaining.length);
            const fallback = remaining[Math.max(0, Math.min(targetIndex, remaining.length - 1))];
            if (fallback) {
              animatePageChange();
              navigation.setParams({ pageId: fallback.id });
            }
          })();
        },
      },
    ]);
  }, [
    pages,
    pageIndex,
    flushInk,
    deleteNotebookPage,
    upsertNotebookPage,
    touchPageCount,
    navigation,
    deleteCurrentNotebook,
  ]);

  const texts = page?.textElements ?? [];
  const images = page?.imageElements ?? [];
  const selectedText = texts.find((t) => t.id === selectedId);
  const persistPage = (patch: Partial<NotebookPage>) => persistPageById(pageId, patch);

  const setPageView = (next: NotebookPageView) => {
    setViewMode(next);
    void updateSettings({ ...workspace.settings, notebookPageView: next });
  };

  const goPage = (delta: number) => {
    const next = pages[pageIndex + delta];
    if (!next) return;
    void jumpToPage(next.id);
  };

  const applyPaperTemplate = (selection: {
    paper: NotebookPage["paper"];
    paperColor: NonNullable<NotebookPage["paperColor"]>;
    paperOrientation: NonNullable<NotebookPage["paperOrientation"]>;
    paperSize: NonNullable<NotebookPage["paperSize"]>;
  }) => {
    setToolPanel("none");
    // Flush strokes first, then swap paper only — never clear ink / text / images.
    void (async () => {
      await flushInk();
      const latest = pagesByIdRef.current[pageIdRef.current];
      if (!latest) return;
      await persistPageById(pageIdRef.current, {
        paper: selection.paper,
        paperColor: selection.paperColor,
        // Keep existing layout unless the picker explicitly changed it.
        paperOrientation: selection.paperOrientation ?? latest.paperOrientation,
        paperSize: selection.paperSize ?? latest.paperSize,
        ink: latest.ink,
        textElements: latest.textElements,
        imageElements: latest.imageElements,
      });
    })();
  };

  const applyInk = (tool: InkToolKind, color: string, width: number) => {
    setMode("ink");
    setSelectedId(null);
    setInkTool(tool);
    setInkColor(color);
    setInkWidth(width);
    void pencilRef.current?.setInkTool(tool, color, width);
    void pencilRef.current?.setToolPickerVisible(false);
  };

  const selectInkTool = (tool: InkToolKind, panel: "none" | "pen" | "eraser" = "none", width = inkWidth) => {
    setToolPanel(panel);
    applyInk(tool, inkColor, width);
  };

  const clearPageInk = () => {
    Alert.alert("Clear page?", "This removes handwriting on this page. Overlays stay.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await pencilRef.current?.clearDrawing();
            } catch {
              /* ignore */
            }
            persistPage({
              ink: {
                version: 2,
                format: "pencilkit",
                data: "",
                updatedAt: Date.now(),
              },
            });
          })();
        },
      },
    ]);
  };

  const insertShape = (kind: "box" | "line") => {
    const el = createTextElement({
      y: 72 + (page?.textElements?.length ?? 0) * 20,
      width: kind === "line" ? 220 : 140,
      height: kind === "line" ? 28 : 100,
      text: kind === "line" ? "————————" : "",
      fontSize: kind === "line" ? 18 : 16,
    });
    persistPage({ textElements: [...(page?.textElements ?? []), el] });
    setSelectedId(el.id);
    setMode("text");
    setToolPanel("text");
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
        page?.title ?? "",
      );
      return;
    }
    const next = page?.title?.trim() ? undefined : `Page ${(page?.index ?? 0) + 1}`;
    persistPage({ title: next });
  };

  const askAi = async () => {
    if (!page) return;
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
        classId: notebook?.context?.classId,
        projectName: notebook?.context?.projectName,
      },
    });
    if (!result.ok) Alert.alert("Not available yet", result.reason);
  };

  const openMore = () => {
    moreBtnRef.current?.measureInWindow((x, y, width, height) => {
      setMoreAnchor({ x, y, width, height });
      setMoreOpen(true);
    });
  };

  const runMoreAction = (action: () => void) => {
    setMoreOpen(false);
    requestAnimationFrame(action);
  };

  const inkInteractive = mode === "ink";
  const overlayInteractive = mode !== "ink";
  /** Finger can scroll pages while inking when Pencil owns drawing. */
  const listScrollWhileInk = drawingPolicy === "pencilOnly";
  const listScrollEnabled =
    (mode !== "ink" || listScrollWhileInk) && zoomScale <= 1.01;

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const offsetY = contentOffset.y;
    const stride = sheetSize.height + PAGE_GAP;
    const index = Math.max(0, Math.min(pages.length - 1, Math.round(offsetY / stride)));
    const next = pages[index];
    if (next && next.id !== pageIdRef.current) {
      ignoreScrollSyncRef.current = true;
      void flushInk().then(() => {
        setSelectedId(null);
        navigation.setParams({ pageId: next.id });
      });
    }
    // Near the document end → append the next page so scroll never dead-ends.
    // Do this only on user scroll — never mid-stroke (appending reflows the list).
    const nearEnd =
      offsetY + layoutMeasurement.height >= contentSize.height - Math.max(120, sheetSize.height * 0.35);
    if (nearEnd && index >= pages.length - 1) {
      void ensureTrailingPage();
    }
    // Clear after sync so late layout passes don't treat this as an active drag.
    scrollingRef.current = false;
  };

  const onInkChangeLive = (ink: NoteInk) => {
    persistPage({ ink });
  };

  const pageIndicator = pageIndex >= 0 ? `Page ${pageIndex + 1} / ${pages.length}` : "";

  const renderSeamlessPage = useCallback(
    ({ item, index }: { item: NotebookPage; index: number }) => {
      const live = item.id === pageId;
      const size = pageSizeForWidth(
        stageWidth > 0 ? stageWidth : sheetSize.width,
        item.paperOrientation,
        item.paperSize,
      );
      return (
        <View style={{ marginBottom: PAGE_GAP }}>
          <PageSheet
            page={item}
            width={size.width}
            height={size.height}
            liveInk={live}
            inkInteractive={live && inkInteractive}
            overlayInteractive={live && overlayInteractive}
            mode={mode}
            selectedId={live ? selectedId : null}
            pageLabel={`${index + 1}`}
            pencilRef={live ? pencilRef : undefined}
            drawingPolicy={drawingPolicy}
            inkTool={inkTool}
            inkColor={inkColor}
            inkWidth={inkWidth}
            zoomScale={zoomScale}
            onInkChange={(ink) => {
              void persistPageById(item.id, { ink });
            }}
            onSelect={(id) => {
              if (!live) return;
              setSelectedId(id);
              if (id && (item.textElements ?? []).some((t) => t.id === id)) {
                setMode("text");
                setToolPanel("text");
              } else if (id) {
                setMode("select");
                setToolPanel("none");
              }
            }}
            onChangeTexts={(next) => persistPageById(item.id, { textElements: next })}
            onChangeImages={(next) => persistPageById(item.id, { imageElements: next })}
          />
        </View>
      );
    },
    [
      pageId,
      stageWidth,
      sheetSize.width,
      inkInteractive,
      overlayInteractive,
      mode,
      selectedId,
      drawingPolicy,
      inkTool,
      inkColor,
      inkWidth,
      zoomScale,
      persistPageById,
    ],
  );

  if (!page || !notebook) {
    return (
      <Page edges={["top", "bottom"]}>
        <View style={styles.missing}>
          <Text style={{ color: theme.muted }}>Page not found.</Text>
        </View>
      </Page>
    );
  }

  return (
    <Page edges={["top", "bottom"]} fullBleed>
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
            {pageIndicator ? ` · ${pageIndicator}` : ""}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={viewMode === "seamless" ? "Seamless view" : "Single page view"}
          onPress={() => setPageView(viewMode === "seamless" ? "single" : "seamless")}
          style={[styles.viewChip, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Feather name={viewMode === "seamless" ? "menu" : "square"} size={13} color={theme.muted} />
          <Text style={[styles.viewChipText, { color: theme.muted }]}>
            {viewMode === "seamless" ? "Seamless" : "Single"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={zoomScale > 1.01 ? "Reset zoom to 100%" : "Zoom to 160%"}
          onPress={() => setZoomScale((z) => (z > 1.05 ? 1 : 1.6))}
          style={[styles.viewChip, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Text style={[styles.viewChipText, { color: theme.muted }]}>
            {`${Math.round(zoomScale * 100)}%`}
          </Text>
        </Pressable>
        <Pressable accessibilityLabel="Previous page" disabled={pageIndex <= 0} onPress={() => goPage(-1)} style={[styles.chromeBtn, pageIndex <= 0 && { opacity: 0.3 }]}>
          <Feather name="chevron-up" size={18} color={theme.text} />
        </Pressable>
        <Pressable
          accessibilityLabel={pageIndex >= pages.length - 1 ? "Add page" : "Next page"}
          onPress={() => {
            if (pageIndex >= pages.length - 1) void addPage();
            else goPage(1);
          }}
          style={styles.chromeBtn}
        >
          <Feather
            name={pageIndex >= pages.length - 1 ? "plus" : "chevron-down"}
            size={18}
            color={theme.text}
          />
        </Pressable>
        <View ref={moreBtnRef} collapsable={false}>
          <Pressable accessibilityLabel="More" onPress={openMore} style={styles.chromeBtn}>
            <Feather name="more-horizontal" size={18} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.toolRail,
          {
            borderColor: "rgba(15,23,42,0.08)",
            backgroundColor: "rgba(245,248,250,0.94)",
          },
        ]}
      >
        <ToolBtn
          icon="edit-3"
          label="Pen"
          active={mode === "ink" && (inkTool === "pen" || inkTool === "pencil" || inkTool === "marker")}
          onPress={() => {
            const drawing =
              inkTool === "pen" || inkTool === "pencil" || inkTool === "marker" ? inkTool : "pen";
            if (mode === "ink" && toolPanel === "pen" && drawing === inkTool) {
              setToolPanel("none");
              return;
            }
            selectInkTool(drawing, "pen");
          }}
        />
        <ToolBtn
          icon="type"
          label="Text"
          active={mode === "text" || (mode === "select" && !!selectedText)}
          onPress={() => {
            setMode("text");
            setToolPanel("text");
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
            void insertImage();
          }}
        />
        <ToolBtn
          icon="square"
          label="Shape"
          active={toolPanel === "shape"}
          onPress={() => setToolPanel((p) => (p === "shape" ? "none" : "shape"))}
        />
        <ToolBtn
          icon="layout"
          label="Template"
          active={templatePickerOpen}
          onPress={() => {
            setToolPanel("none");
            setTemplatePickerOpen(true);
          }}
        />
        <ToolBtn
          icon="crop"
          label="Lasso"
          active={mode === "ink" && inkTool === "lasso"}
          onPress={() => selectInkTool("lasso")}
        />
        <ToolBtn
          icon="slash"
          label="Eraser"
          active={mode === "ink" && (inkTool === "eraser" || inkTool === "vectorEraser")}
          onPress={() => {
            const tool = inkTool === "vectorEraser" ? "vectorEraser" : "eraser";
            if (mode === "ink" && toolPanel === "eraser" && (inkTool === "eraser" || inkTool === "vectorEraser")) {
              setToolPanel("none");
              return;
            }
            selectInkTool(tool, "eraser");
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

      {toolPanel === "pen" || toolPanel === "eraser" ? (
        <InkToolTray
          mode={toolPanel === "eraser" ? "eraser" : "pen"}
          inkTool={inkTool}
          inkColor={inkColor}
          onSelectTip={(tip: DrawingTip, width: number) => {
            setToolPanel("pen");
            applyInk(tip, inkColor, width);
          }}
          onColorChange={(color) => applyInk(inkTool, color, inkWidth)}
          onWidthChange={(width) => applyInk(inkTool, inkColor, width)}
          onSelectEraser={(tool, width) => {
            setToolPanel("eraser");
            applyInk(tool, inkColor, width);
          }}
          onClearPage={clearPageInk}
        />
      ) : null}

      {toolPanel === "shape" ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paperRow} style={styles.contextBar}>
          <Pressable onPress={() => insertShape("box")} style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.bg }]}>
            <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>Box</Text>
          </Pressable>
          <Pressable onPress={() => insertShape("line")} style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.bg }]}>
            <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>Line</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {toolPanel === "templates" ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paperRow} style={styles.contextBar}>
          <Text style={[styles.templateHint, { color: theme.muted }]}>New page</Text>
          {PAGE_TEMPLATES.map((tpl) => (
            <Pressable
              key={tpl.id}
              onPress={() => void addPageFromTemplate(tpl)}
              style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.bg }]}
            >
              <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>{tpl.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

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
                  onPress={() => void jumpToPage(p.id)}
                  onLongPress={() => {
                    void jumpToPage(p.id).then(() => {
                      setTimeout(() => openMore(), 0);
                    });
                  }}
                  delayLongPress={350}
                  style={[
                    styles.stripItem,
                    {
                      borderColor: active ? theme.accent : theme.border,
                      backgroundColor: theme.surface,
                      shadowOpacity: active ? 0.12 : 0,
                    },
                  ]}
                >
                  <View style={styles.stripPaper}>
                    <PaperBackground paper={p.paper ?? "ruled"} paperColor={p.paperColor} />
                  </View>
                  <View style={[styles.stripBadge, { backgroundColor: active ? theme.accent : "rgba(15,23,42,0.55)" }]}>
                    <Text style={styles.stripBadgeText}>{p.index + 1}</Text>
                  </View>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityLabel="Add page"
              onPress={() => void addPage()}
              style={[
                styles.stripItem,
                styles.stripAdd,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            >
              <Feather name="plus" size={14} color={theme.muted} />
            </Pressable>
          </ScrollView>
        ) : null}

        <View
          style={styles.stageMain}
          onLayout={(event) => {
            const width = Math.round(event.nativeEvent.layout.width);
            if (width > 0 && width !== stageWidthRef.current) {
              stageWidthRef.current = width;
              setStageWidth(width);
            }
          }}
        >
          <DocumentZoom
            scale={zoomScale}
            onScaleChange={setZoomScale}
            enabled={mode === "ink" || zoomScale > 1.01}
          >
            {viewMode === "seamless" ? (
              <FlatList
                ref={listRef}
                data={pages}
                keyExtractor={(item) => item.id}
                renderItem={renderSeamlessPage}
                extraData={`${pageId}:${mode}:${selectedId}:${inkTool}:${zoomScale}`}
                showsVerticalScrollIndicator
                contentContainerStyle={styles.seamlessList}
                // Pencil-only: finger scrolls while Ink stays active. anyInput: leave Ink to scroll.
                // When zoomed, disable list scroll so two-finger pan owns the viewport.
                scrollEnabled={listScrollEnabled}
                onScrollBeginDrag={() => {
                  scrollingRef.current = true;
                }}
                onMomentumScrollEnd={onScrollEnd}
                onScrollEndDrag={(event) => {
                  // If momentum will continue, wait for onMomentumScrollEnd.
                  if (event.nativeEvent.velocity && Math.abs(event.nativeEvent.velocity.y) > 0.05) {
                    return;
                  }
                  onScrollEnd(event);
                }}
                getItemLayout={(_, index) => {
                  const stride = sheetSize.height + PAGE_GAP;
                  return { length: stride, offset: stride * index, index };
                }}
                initialScrollIndex={pageIndex >= 0 ? pageIndex : 0}
                // Virtualization: placeholders beyond ±2 keep 100-page notes light.
                windowSize={7}
                maxToRenderPerBatch={4}
                updateCellsBatchingPeriod={40}
                initialNumToRender={Math.min(pages.length, 3)}
                removeClippedSubviews={Platform.OS === "android"}
                onScrollToIndexFailed={(info) => {
                  const stride = sheetSize.height + PAGE_GAP;
                  listRef.current?.scrollToOffset({
                    offset: stride * info.index,
                    animated: false,
                  });
                }}
              />
            ) : (
              <View style={styles.singleWrap}>
                <PageSheet
                  page={page}
                  width={sheetSize.width}
                  height={Math.min(sheetSize.height, 900)}
                  liveInk
                  inkInteractive={inkInteractive}
                  overlayInteractive={overlayInteractive}
                  mode={mode}
                  selectedId={selectedId}
                  pageLabel={`${pageIndex + 1}`}
                  pencilRef={pencilRef}
                  drawingPolicy={drawingPolicy}
                  inkTool={inkTool}
                  inkColor={inkColor}
                  inkWidth={inkWidth}
                  zoomScale={zoomScale}
                  onInkChange={onInkChangeLive}
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
                />
              </View>
            )}
          </DocumentZoom>
          {!isWide ? (
            <Text style={[styles.hint, { color: theme.muted }]}>
              {viewMode === "seamless"
                ? pencilReady
                  ? "Pencil writes · finger scrolls pages · pinch to zoom"
                  : "Native build required for PencilKit"
                : pencilReady
                  ? "Pencil writes · switch to Seamless to scroll pages"
                  : "Native build required for PencilKit"}
            </Text>
          ) : null}
        </View>
      </View>

      <AnchoredPopover visible={moreOpen} onClose={() => setMoreOpen(false)} anchor={moreAnchor} width={268}>
        <MenuSection label="Page">
          <MenuRow label="Add page after" onPress={() => runMoreAction(() => void addPage())} />
          <MenuRow label="Duplicate page" onPress={() => runMoreAction(() => void duplicateCurrentPage())} />
          <MenuRow label="Rename page" onPress={() => runMoreAction(promptRename)} />
          <MenuRow
            label="Change template"
            onPress={() =>
              runMoreAction(() => {
                setTemplatePickerOpen(true);
              })
            }
          />
        </MenuSection>
        <MenuSection label="Organize">
          <MenuRow label="Move earlier" onPress={() => runMoreAction(() => void moveCurrentPage(-1))} />
          <MenuRow label="Move later" onPress={() => runMoreAction(() => void moveCurrentPage(1))} />
          <MenuRow
            label="Organize note"
            onPress={() =>
              runMoreAction(() => navigation.navigate("NotebookDetail", { notebookId, organizeOnly: true }))
            }
          />
          <MenuRow
            label="New from template…"
            onPress={() => runMoreAction(() => setToolPanel("templates"))}
          />
        </MenuSection>
        <MenuSection label="View">
          <MenuRow
            label={viewMode === "seamless" ? "Single" : "Seamless"}
            detail={viewMode === "seamless" ? "One page" : "Continuous"}
            onPress={() =>
              runMoreAction(() => setPageView(viewMode === "seamless" ? "single" : "seamless"))
            }
          />
        </MenuSection>
        <MenuSection label="Other">
          <MenuRow
            label={isNotebookAiAvailable() ? "Ask AI about this page" : "AI"}
            onPress={() =>
              runMoreAction(() => {
                if (isNotebookAiAvailable()) void askAi();
                else {
                  Alert.alert(
                    "AI stays quiet for now",
                    "Write first. Notebook AI actions will plug into LifeOS later without interrupting the page.",
                  );
                }
              })
            }
          />
          <MenuRow
            label="Import PDF"
            onPress={() =>
              runMoreAction(async () => {
                if (!isPdfPipelineAvailable()) return;
                const plan = await planPdfImport();
                if (!plan) return;
                const created = pagesFromPdfImport(notebookId, plan, pages.length);
                await Promise.all(created.map((p) => upsertNotebookPage(p)));
                await touchPageCount(pages.length + created.length);
                if (created[0]) await openCreatedPage(created[0].id);
              })
            }
          />
          <MenuRow
            label="Export PDF"
            onPress={() =>
              runMoreAction(async () => {
                // Persist live PencilKit strokes before compositing the PDF.
                await flushInk();
                const latestPages = {
                  ...workspace.notebookPages,
                  ...pagesByIdRef.current,
                };
                const result = await planPdfExport({
                  notebookId,
                  notebookName: notebook?.name || "notebook",
                  pages: notebookPagesForExport(latestPages, notebookId),
                  includeInk: true,
                  includeOverlays: true,
                  canvasWidth: sheetSize.width,
                  canvasHeight: sheetSize.height,
                });
                if (!result.ok) {
                  Alert.alert("Export failed", result.reason);
                  return;
                }
                await sharePdf(result.uri);
              })
            }
          />
        </MenuSection>
        <MenuSection label="Destructive" last>
          <MenuRow label="Delete page" danger onPress={() => runMoreAction(removeCurrentPage)} />
          <MenuRow label="Delete note" danger onPress={() => runMoreAction(deleteCurrentNotebook)} />
        </MenuSection>
      </AnchoredPopover>

      <TemplatePicker
        visible={templatePickerOpen}
        current={page.paper}
        currentColor={page.paperColor}
        currentOrientation={page.paperOrientation}
        currentSize={page.paperSize}
        preserveContent
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={applyPaperTemplate}
      />
    </Page>
  );
}

function MenuSection({
  label,
  children,
  last,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  const { theme } = useLifeOS();
  return (
    <View style={!last ? styles.menuSection : undefined}>
      <Text style={[styles.menuSectionLabel, { color: theme.muted }]}>{label}</Text>
      {children}
    </View>
  );
}

function MenuRow({
  label,
  detail,
  onPress,
  danger,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { theme } = useLifeOS();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: theme.soft }]}
    >
      <Text style={{ color: danger ? theme.danger : theme.text, fontWeight: "700", fontSize: 14, flex: 1 }}>
        {label}
      </Text>
      {detail ? <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "600" }}>{detail}</Text> : null}
    </Pressable>
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
      style={[styles.toolBtn, active && { backgroundColor: "#FFFFFF" }]}
    >
      <Feather name={icon} size={16} color={danger ? theme.danger : theme.text} />
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
  viewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    minHeight: 30,
    marginRight: 2,
  },
  viewChipText: { fontSize: 10, fontWeight: "800" },
  toolRail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginHorizontal: 12,
    marginBottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 2,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  toolBtn: { width: 40, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  toolDivider: { width: StyleSheet.hairlineWidth, height: 22, marginHorizontal: 4 },
  contextBar: { maxHeight: 46, marginBottom: 4, alignSelf: "center" },
  paperRow: { paddingHorizontal: 12, gap: 8, alignItems: "center", justifyContent: "center" },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  templateHint: { fontSize: 11, fontWeight: "800", marginRight: 4, alignSelf: "center" },
  stage: { flex: 1, minHeight: 0, paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  stageWide: { flexDirection: "row", paddingHorizontal: 8, paddingBottom: 0, gap: 0 },
  pageStrip: { width: 56, marginRight: 8, flexGrow: 0, flexShrink: 0 },
  pageStripInner: { gap: 8, paddingBottom: 24, paddingTop: 2 },
  stripAdd: { borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  stripItem: {
    width: 48,
    height: 64,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  stripPaper: { ...StyleSheet.absoluteFillObject, opacity: 0.95 },
  stripBadge: {
    position: "absolute",
    left: 4,
    bottom: 4,
    minWidth: 18,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  stripBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  menuSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(15,23,42,0.08)",
    paddingBottom: 4,
    marginBottom: 4,
  },
  menuSectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 2,
  },
  menuRow: {
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stageMain: { flex: 1, minWidth: 0, minHeight: 0, gap: 8 },
  seamlessList: { paddingBottom: 40, alignItems: "center" },
  singleWrap: { flex: 1, minHeight: 0, alignItems: "center", justifyContent: "flex-start" },
  hint: { fontSize: 11, fontWeight: "600", textAlign: "center" },
});
