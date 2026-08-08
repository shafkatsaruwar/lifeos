import Feather from "@expo/vector-icons/Feather";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  LayoutAnimation,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
  type ViewToken,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { DocumentZoom } from "../components/DocumentZoom";
import {
  isPencilKitAvailable,
  preferredDrawingPolicy,
  type HandwritingCanvasRef,
} from "../components/HandwritingCanvas";
import { PageSheet } from "../components/PageSheet";
import { Page } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { useLayout } from "../lib/layout";
import { buildPageAiContext, isNotebookAiAvailable, runNotebookAi } from "../lib/notebookAi";
import { isPdfPipelineAvailable } from "../lib/notebookPdf";
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
  PAPER_OPTIONS,
  reindexPages,
  TEXT_SIZES,
  type PageTemplate,
} from "../lib/notebooks";
import type {
  NoteInk,
  NotebookPage,
  NotebookPageView,
  PageCanvasMode,
  PageImageElement,
  PageTextElement,
  PaperStyle,
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
  /**
   * Freeze list→page sync while writing when the list can't scroll (finger draws).
   * With pencilOnly, finger scrolls — unlock so scroll-end can change pages.
   */
  const inkLockScrollRef = useRef(true);
  const drawingPolicy = preferredDrawingPolicy(isTablet);

  const [mode, setMode] = useState<PageCanvasMode>("ink");
  modeRef.current = mode;
  inkLockScrollRef.current = mode === "ink" && drawingPolicy === "any";
  const [paperOpen, setPaperOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toolPanel, setToolPanel] = useState<"none" | "text" | "paper" | "templates">("none");
  const [stageWidth, setStageWidth] = useState(0);
  const [viewMode, setViewMode] = useState<NotebookPageView>(workspace.settings.notebookPageView ?? "seamless");
  /** Session-only document zoom; resets when leaving the note. */
  const [zoomScale, setZoomScale] = useState(1);
  const pencilReady = isPencilKitAvailable();

  const sheetSize = useMemo(() => {
    const width = stageWidth > 0 ? stageWidth : isWide ? 640 : 360;
    return pageSizeForWidth(width);
  }, [stageWidth, isWide]);

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

  // Re-assert system tool picker (eraser / lasso / pens) when the focused page changes.
  useEffect(() => {
    if (mode !== "ink") return;
    const timer = setTimeout(() => {
      void pencilRef.current?.assertToolPicker();
    }, 80);
    return () => clearTimeout(timer);
  }, [pageId, mode]);

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

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    // Ink mode disables list scrolling — ignore viewability churn from autosave re-renders
    // (old logic picked the topmost index, so writing on page 4 could snap back to page 2).
    if (inkLockScrollRef.current) return;
    if (scrollingRef.current) return;
    const visible = viewableItems.filter((token) => token.isViewable && token.item);
    if (!visible.length) return;
    // Most-visible page wins; index is only a tie-breaker.
    const best = visible.reduce((a, b) => {
      const ap = a.percentVisible ?? 0;
      const bp = b.percentVisible ?? 0;
      if (bp !== ap) return bp > ap ? b : a;
      return (a.index ?? 0) <= (b.index ?? 0) ? a : b;
    });
    const nextId = (best.item as NotebookPage | undefined)?.id;
    if (nextId && nextId !== pageIdRef.current) {
      ignoreScrollSyncRef.current = true;
      void flushInk().then(() => {
        setSelectedId(null);
        navigation.setParams({ pageId: nextId });
      });
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 120,
  }).current;

  // Keep Seamless list aligned when pageId changes from strip / chevrons only.
  useEffect(() => {
    if (viewMode !== "seamless" || pageIndex < 0 || stageWidth <= 0) return;
    if (ignoreScrollSyncRef.current) {
      ignoreScrollSyncRef.current = false;
      return;
    }
    // Don't yank the list during ink — live canvas + autosave already own the viewport.
    if (modeRef.current === "ink") return;
    const timer = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index: pageIndex, animated: false, viewPosition: 0 });
      } catch {
        /* layout may not be ready */
      }
    }, 16);
    return () => clearTimeout(timer);
  }, [pageIndex, viewMode, stageWidth]);

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

  const persistPage = (patch: Partial<NotebookPage>) => persistPageById(pageId, patch);
  const onInkChange = (ink: NoteInk) => persistPage({ ink });

  const setPageView = (next: NotebookPageView) => {
    setViewMode(next);
    void updateSettings({ ...workspace.settings, notebookPageView: next });
  };

  const goPage = (delta: number) => {
    const next = pages[pageIndex + delta];
    if (!next) return;
    void jumpToPage(next.id);
  };

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

  const addPageFromTemplate = useCallback(
    async (template: PageTemplate) => {
      await flushInk();
      const insertAt = Math.min(pages.length, Math.max(0, pageIndex + 1));
      const newPage = pageFromTemplate(notebookId, insertAt, template);
      const nextList = [...pages];
      nextList.splice(insertAt, 0, newPage);
      await Promise.all(reindexPages(nextList).map((p) => upsertNotebookPage(p)));
      await touchPageCount(nextList.length);
      setPaperOpen(false);
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

  const removeCurrentPage = useCallback(() => {
    if (pages.length <= 1) {
      Alert.alert("Keep at least one page", "A note needs a page to write on.");
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
  ]);

  const setPaper = (paper: PaperStyle) => {
    setPaperOpen(false);
    setToolPanel("none");
    persistPage({ paper });
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

  const openMore = () => {
    const actions = [
      "Add page after",
      "Duplicate page",
      "Move earlier",
      "Move later",
      "Delete page",
      "New from template…",
      "Rename page",
      "Organize note",
      viewMode === "seamless" ? "View: Single page" : "View: Seamless",
      ...(isNotebookAiAvailable() ? ["Ask AI about this page"] : ["AI (coming later)"]),
      ...(isPdfPipelineAvailable() ? ["Import PDF page"] : ["PDF import (architecture ready)"]),
      "Cancel",
    ];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: actions,
          cancelButtonIndex: actions.length - 1,
          destructiveButtonIndex: actions.indexOf("Delete page"),
        },
        (index) => {
          const label = actions[index];
          if (label === "Add page after") void addPage();
          else if (label === "Duplicate page") void duplicateCurrentPage();
          else if (label === "Move earlier") void moveCurrentPage(-1);
          else if (label === "Move later") void moveCurrentPage(1);
          else if (label === "Delete page") removeCurrentPage();
          else if (label === "New from template…") {
            setPaperOpen(false);
            setToolPanel("templates");
          } else if (label === "Rename page") promptRename();
          else if (label === "Organize note") {
            navigation.navigate("NotebookDetail", { notebookId, organizeOnly: true });
          } else if (label?.startsWith("View:")) {
            setPageView(viewMode === "seamless" ? "single" : "seamless");
          } else if (label?.startsWith("Ask AI")) void askAi();
          else if (label?.startsWith("AI")) {
            Alert.alert("AI stays quiet for now", "Write first. Notebook AI actions will plug into LifeOS later without interrupting the page.");
          } else if (label?.startsWith("PDF")) {
            Alert.alert("PDF pipeline", "Import/annotate/export hooks live in notebookPdf.ts — not faked in the UI yet.");
          }
        },
      );
    } else {
      Alert.alert("Page", undefined, [
        { text: "Add page after", onPress: () => void addPage() },
        { text: "Duplicate", onPress: () => void duplicateCurrentPage() },
        { text: "Delete page", style: "destructive", onPress: () => removeCurrentPage() },
        { text: "Templates", onPress: () => setToolPanel("templates") },
        { text: "Rename page", onPress: promptRename },
        {
          text: "Organize note",
          onPress: () => navigation.navigate("NotebookDetail", { notebookId, organizeOnly: true }),
        },
        {
          text: viewMode === "seamless" ? "View: Single page" : "View: Seamless",
          onPress: () => setPageView(viewMode === "seamless" ? "single" : "seamless"),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const inkInteractive = mode === "ink";
  const overlayInteractive = mode !== "ink";
  /** Finger can scroll pages while inking when Pencil owns drawing. */
  const listScrollWhileInk = drawingPolicy === "pencilOnly";
  const listScrollEnabled =
    (mode !== "ink" || listScrollWhileInk) && zoomScale <= 1.01;

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollingRef.current = false;
    if (inkLockScrollRef.current) return;
    const offsetY = event.nativeEvent.contentOffset.y;
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
  };

  const pageIndicator = pageIndex >= 0 ? `Page ${pageIndex + 1} / ${pages.length}` : "";

  const renderSeamlessPage = useCallback(
    ({ item, index }: { item: NotebookPage; index: number }) => {
      const live = item.id === pageId;
      return (
        <View style={{ marginBottom: index === pages.length - 1 ? 28 : PAGE_GAP }}>
          <PageSheet
            page={item}
            width={sheetSize.width}
            height={sheetSize.height}
            liveInk={live}
            inkInteractive={live && inkInteractive}
            overlayInteractive={live && overlayInteractive}
            mode={mode}
            selectedId={live ? selectedId : null}
            pageLabel={`${index + 1}`}
            pencilRef={live ? pencilRef : undefined}
            drawingPolicy={drawingPolicy}
            zoomScale={zoomScale}
            onInkChange={(ink) => persistPageById(item.id, { ink })}
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
      pages.length,
      sheetSize.width,
      sheetSize.height,
      inkInteractive,
      overlayInteractive,
      mode,
      selectedId,
      drawingPolicy,
      zoomScale,
      persistPageById,
    ],
  );

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
        <Pressable accessibilityLabel="More" onPress={openMore} style={styles.chromeBtn}>
          <Feather name="more-horizontal" size={18} color={theme.text} />
        </Pressable>
      </View>

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
        <ToolBtn
          icon="copy"
          label="Templates"
          active={toolPanel === "templates"}
          onPress={() => {
            setPaperOpen(false);
            setToolPanel((p) => (p === "templates" ? "none" : "templates"));
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
                      // Defer so pageId matches the strip target before sheet actions run.
                      setTimeout(() => openMore(), 0);
                    });
                  }}
                  delayLongPress={350}
                  style={[
                    styles.stripItem,
                    {
                      borderColor: active ? theme.accent : theme.border,
                      backgroundColor: active ? theme.soft : theme.surface,
                      transform: [{ scale: active ? 1.04 : 1 }],
                    },
                  ]}
                >
                  <Text style={{ color: active ? theme.accent : theme.text, fontWeight: "800", fontSize: 11 }}>
                    {p.index + 1}
                  </Text>
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
                extraData={`${pageId}:${mode}:${zoomScale}`}
                showsVerticalScrollIndicator
                contentContainerStyle={styles.seamlessList}
                // Pencil-only: finger scrolls while Ink stays active. anyInput: leave Ink to scroll.
                // When zoomed, disable list scroll so two-finger pan owns the viewport.
                scrollEnabled={listScrollEnabled}
                onScrollBeginDrag={() => {
                  scrollingRef.current = true;
                }}
                onMomentumScrollEnd={onScrollEnd}
                onScrollEndDrag={onScrollEnd}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
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
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
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
                  zoomScale={zoomScale}
                  onInkChange={onInkChange}
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
                ? mode === "ink"
                  ? pencilReady
                    ? listScrollWhileInk
                      ? "Pencil writes · finger scrolls · pinch to zoom"
                      : "Ink mode · switch tool to scroll · pinch to zoom"
                    : "Native build required for PencilKit"
                  : "Scroll pages · move overlays · switch to Ink to draw"
                : mode === "ink"
                  ? pencilReady
                    ? "Apple PencilKit · ink autosaves · pinch to zoom"
                    : "Native build required for PencilKit"
                  : "Move · resize · edit overlays · switch to Ink to draw"}
            </Text>
          ) : null}
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
  templateHint: { fontSize: 11, fontWeight: "800", marginRight: 4, alignSelf: "center" },
  stage: { flex: 1, minHeight: 0, paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  stageWide: { flexDirection: "row", paddingHorizontal: 8, paddingBottom: 0, gap: 0 },
  pageStrip: { width: 52, marginRight: 8, flexGrow: 0, flexShrink: 0 },
  pageStripInner: { gap: 8, paddingBottom: 24, paddingTop: 2 },
  stripAdd: { borderStyle: "dashed" },
  stripItem: {
    width: 44,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stageMain: { flex: 1, minWidth: 0, minHeight: 0, gap: 8 },
  seamlessList: { paddingBottom: 40, alignItems: "center" },
  singleWrap: { flex: 1, minHeight: 0, alignItems: "center", justifyContent: "flex-start" },
  hint: { fontSize: 11, fontWeight: "600", textAlign: "center" },
});
