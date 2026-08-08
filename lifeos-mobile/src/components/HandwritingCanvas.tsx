import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo-modules-core";
import { cachePageInk, readCachedPageInk } from "../lib/inkCache";
import type { NoteInk } from "../types";

export type DrawingPolicy = "any" | "pencilOnly";

export type PencilKitViewRef = {
  setupToolPicker(): Promise<void>;
  clearDrawing(): Promise<void>;
  undo(): Promise<void>;
  redo(): Promise<void>;
  getCanvasDataAsBase64(): Promise<string>;
  setCanvasDataFromBase64(base64String: string): Promise<boolean>;
  setCanvasBackgroundColor(colorString: string): Promise<void>;
};

export type HandwritingCanvasRef = PencilKitViewRef & {
  /** Immediately persist any pending strokes (call before leaving a page). */
  flush(): Promise<void>;
  /** Re-show system tool picker (pen / eraser / lasso) after page focus changes. */
  assertToolPicker(): Promise<void>;
};

type PencilKitViewProps = {
  style?: object;
  drawingPolicy?: DrawingPolicy;
  onDrawEnd?: (event: { nativeEvent: { data: string } }) => void;
  onDrawChange?: (event: { nativeEvent: { data: string } }) => void;
};

type PencilKitModule = {
  PencilKitView: React.ForwardRefExoticComponent<
    PencilKitViewProps & React.RefAttributes<PencilKitViewRef>
  >;
};

/** True when Apple PencilKit native module is linked (dev/production build, not Expo Go). */
export function isPencilKitAvailable(): boolean {
  if (Platform.OS !== "ios") return false;
  return requireOptionalNativeModule("ExpoPencilKitModule") != null;
}

/**
 * Physical iPad → Pencil writes, finger scrolls.
 * Simulator / iPhone → finger/trackpad can draw.
 */
export function preferredDrawingPolicy(isTablet: boolean): DrawingPolicy {
  if (Platform.OS !== "ios" || !isTablet) return "any";
  if (!Constants.isDevice) return "any";
  return "pencilOnly";
}

function loadPencilKit(): PencilKitModule | null {
  if (!isPencilKitAvailable()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-pencilkit-ui") as PencilKitModule;
  } catch {
    return null;
  }
}

function inkPayload(ink: NoteInk | undefined): string | undefined {
  if (!ink) return undefined;
  if (typeof ink.data === "string" && ink.data.length > 0) return ink.data;
  if (typeof ink.pencilKitData === "string" && ink.pencilKitData.length > 0) return ink.pencilKitData;
  return undefined;
}

function pickInkData(...candidates: Array<string | null | undefined>): string | undefined {
  let best: string | undefined;
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) {
      if (!best || c.length >= best.length) best = c;
    }
  }
  return best;
}

type Props = {
  ink: NoteInk | undefined;
  onChange: (ink: NoteInk) => void;
  backgroundColor?: string;
  drawingPolicy?: DrawingPolicy;
  /**
   * Stable id for the document being edited (usually pageId).
   * Hydration runs only when this changes — never on autosave echo,
   * which would interrupt live PencilKit / trackpad drawing.
   */
  documentKey?: string;
  /** When this changes, re-assert the system tool picker (focused page). */
  toolPickerKey?: string;
};

/**
 * Apple PencilKit canvas + system PKToolPicker (pen, pencil, marker, eraser, lasso, colors…).
 * Requires a native iOS build with expo-pencilkit-ui (EAS development/production client).
 */
export const HandwritingCanvas = React.forwardRef<HandwritingCanvasRef | null, Props>(function HandwritingCanvas(
  { ink, onChange, backgroundColor = "#FFFFFF", documentKey, drawingPolicy = "any", toolPickerKey },
  ref,
) {
  const pencilKit = useRef(loadPencilKit()).current;
  const canvasRef = useRef<PencilKitViewRef | null>(null);
  const [ready, setReady] = useState(false);
  const hydratedDocKey = useRef<string | null>(null);
  /** Last payload applied via hydrate (null = hydrated empty). */
  const hydratedPayloadRef = useRef<string | null>(null);
  /** True once the user has drawn on this mount — blocks late hydrate from clobbering strokes. */
  const userDrawnRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const latestDataRef = useRef<string | null>(null);
  const inkRef = useRef(ink);
  inkRef.current = ink;
  const documentKeyRef = useRef(documentKey);
  documentKeyRef.current = documentKey;
  const backgroundColorRef = useRef(backgroundColor);
  backgroundColorRef.current = backgroundColor;

  const emitInk = useCallback((data: string) => {
    if (!data) return;
    latestDataRef.current = data;
    const pageId = documentKeyRef.current;
    if (pageId) void cachePageInk(pageId, data);
    onChangeRef.current({
      version: 2,
      format: "pencilkit",
      data,
      updatedAt: Date.now(),
    });
  }, []);

  const flush = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    try {
      const native = await canvasRef.current?.getCanvasDataAsBase64();
      const data =
        typeof native === "string" && native.length > 0 ? native : latestDataRef.current;
      if (typeof data === "string" && data.length) emitInk(data);
    } catch {
      if (latestDataRef.current) emitInk(latestDataRef.current);
    }
  }, [emitInk]);

  const assertToolPicker = useCallback(async () => {
    try {
      await canvasRef.current?.setupToolPicker();
    } catch {
      /* picker can race on unmount */
    }
  }, []);

  useImperativeHandle(ref, () => ({
    setupToolPicker: assertToolPicker,
    assertToolPicker,
    clearDrawing: async () => {
      await canvasRef.current?.clearDrawing();
    },
    undo: async () => {
      await canvasRef.current?.undo();
    },
    redo: async () => {
      await canvasRef.current?.redo();
    },
    getCanvasDataAsBase64: async () => (await canvasRef.current?.getCanvasDataAsBase64()) ?? "",
    setCanvasDataFromBase64: async (data: string) =>
      (await canvasRef.current?.setCanvasDataFromBase64(data)) ?? false,
    setCanvasBackgroundColor: async (color: string) => {
      await canvasRef.current?.setCanvasBackgroundColor(color);
    },
    flush,
  }), [flush, assertToolPicker]);

  const persistData = useCallback(
    (data: string, immediate = false) => {
      userDrawnRef.current = true;
      latestDataRef.current = data;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (immediate) {
        emitInk(data);
        return;
      }
      saveTimer.current = setTimeout(() => {
        emitInk(data);
      }, 350);
    },
    [emitInk],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (latestDataRef.current) {
        emitInk(latestDataRef.current);
      }
    };
  }, [emitInk]);

  // Setup tool picker + hydrate in one sequence so they can't race and wipe ink.
  useEffect(() => {
    if (!pencilKit || !ready || !canvasRef.current) return;
    const docKey = documentKey ?? "default";
    if (hydratedDocKey.current === docKey) return;

    let cancelled = false;
    (async () => {
      const native = canvasRef.current;
      if (!native) return;

      try {
        await native.setupToolPicker();
        if (cancelled) return;
        await native.setCanvasBackgroundColor(backgroundColorRef.current.replace("#", ""));
        if (cancelled) return;
      } catch {
        /* picker can fail if view is mid-unmount */
      }

      const cached = documentKey ? await readCachedPageInk(documentKey) : null;
      if (cancelled) return;
      const data = pickInkData(inkPayload(inkRef.current), cached);

      hydratedDocKey.current = docKey;
      userDrawnRef.current = false;
      hydratedPayloadRef.current = data ?? null;
      latestDataRef.current = data ?? null;

      if (data) {
        const ok = await native.setCanvasDataFromBase64(data);
        if (!ok && !cancelled) {
          await new Promise((r) => setTimeout(r, 50));
          if (!cancelled) await native.setCanvasDataFromBase64(data);
        }
        if (!inkPayload(inkRef.current)) emitInk(data);
      } else {
        await native.clearDrawing();
      }
    })().catch(() => {
      /* hydrate can race on unmount */
    });

    return () => {
      cancelled = true;
    };
  }, [pencilKit, ready, documentKey, emitInk]);

  // Late-arriving workspace ink after an empty first hydrate (sync catch-up).
  useEffect(() => {
    if (!pencilKit || !ready || !canvasRef.current) return;
    const docKey = documentKey ?? "default";
    if (hydratedDocKey.current !== docKey) return;
    if (userDrawnRef.current) return;

    const data = inkPayload(ink);
    if (!data || data === hydratedPayloadRef.current) return;
    if (hydratedPayloadRef.current && hydratedPayloadRef.current.length >= data.length) return;

    let cancelled = false;
    (async () => {
      const native = canvasRef.current;
      if (!native) return;
      hydratedPayloadRef.current = data;
      latestDataRef.current = data;
      await native.setCanvasDataFromBase64(data);
      if (cancelled) return;
      void cachePageInk(docKey, data);
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [pencilKit, ready, documentKey, ink]);

  // Re-assert tool picker when the focused page / live canvas changes.
  useEffect(() => {
    if (!pencilKit || !ready || !toolPickerKey) return;
    void assertToolPicker();
  }, [pencilKit, ready, toolPickerKey, assertToolPicker]);

  if (Platform.OS !== "ios") {
    return (
      <View style={[styles.fallback, { backgroundColor }]}>
        <Text style={styles.fallbackTitle}>Handwriting is iPad / iPhone only</Text>
        <Text style={styles.fallbackBody}>Apple PencilKit is not available on this platform.</Text>
      </View>
    );
  }

  if (!pencilKit) {
    return (
      <View style={[styles.fallback, { backgroundColor }]}>
        <Text style={styles.fallbackTitle}>Apple PencilKit needs a native build</Text>
        <Text style={styles.fallbackBody}>
          Expo Go can’t load Apple’s writing tools. Install a LifeOS development build
          (`npx expo run:ios` or EAS development), then open Draw again for the system
          pen, pencil, marker, eraser, and lasso picker.
        </Text>
      </View>
    );
  }

  const PencilKitView = pencilKit.PencilKitView;
  const hasLegacyStrokes =
    (ink?.strokes?.length ?? 0) > 0 &&
    ink?.format !== "pencilkit" &&
    !ink?.pencilKitData &&
    !(ink?.data && !ink.strokes?.length);

  return (
    <View style={styles.root}>
      {hasLegacyStrokes ? (
        <Text style={styles.legacyHint}>
          An older sketch is stored on this note. New strokes use Apple PencilKit and replace that format when you draw.
        </Text>
      ) : null}
      <PencilKitView
        ref={(node) => {
          canvasRef.current = node;
          if (node && !ready) setReady(true);
        }}
        style={[styles.canvas, { backgroundColor }]}
        drawingPolicy={drawingPolicy}
        onDrawEnd={(event) => {
          const raw = event?.nativeEvent ?? event;
          const data =
            typeof raw === "string" ? raw : (raw as { data?: string })?.data;
          if (typeof data === "string" && data.length) persistData(data, true);
        }}
        onDrawChange={(event) => {
          const raw = event?.nativeEvent ?? event;
          const data =
            typeof raw === "string" ? raw : (raw as { data?: string })?.data;
          if (typeof data === "string" && data.length) persistData(data, false);
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  canvas: { flex: 1, minHeight: 0 },
  legacyHint: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
  },
  fallback: {
    flex: 1,
    minHeight: 280,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.12)",
    padding: 20,
    justifyContent: "center",
    gap: 8,
  },
  fallbackTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  fallbackBody: { fontSize: 13, lineHeight: 19, fontWeight: "500", color: "#64748B" },
});
