import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import type { NoteInk } from "../types";

export type PencilKitViewRef = {
  setupToolPicker(): Promise<void>;
  clearDrawing(): Promise<void>;
  undo(): Promise<void>;
  redo(): Promise<void>;
  getCanvasDataAsBase64(): Promise<string>;
  setCanvasDataFromBase64(base64String: string): Promise<boolean>;
  setCanvasBackgroundColor(colorString: string): Promise<void>;
};

type PencilKitViewProps = {
  style?: object;
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

function loadPencilKit(): PencilKitModule | null {
  if (!isPencilKitAvailable()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-pencilkit-ui") as PencilKitModule;
  } catch {
    return null;
  }
}

type Props = {
  ink: NoteInk | undefined;
  onChange: (ink: NoteInk) => void;
  backgroundColor?: string;
};

/**
 * Apple PencilKit canvas + system PKToolPicker (pen, pencil, marker, eraser, colors…).
 * Requires a native iOS build with expo-pencilkit-ui (EAS development/production client).
 */
export const HandwritingCanvas = React.forwardRef<PencilKitViewRef | null, Props>(function HandwritingCanvas(
  { ink, onChange, backgroundColor = "#FFFFFF" },
  ref,
) {
  const pencilKit = useRef(loadPencilKit()).current;
  const canvasRef = useRef<PencilKitViewRef | null>(null);
  const [ready, setReady] = useState(false);
  const loadedKey = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useImperativeHandle(ref, () => ({
    setupToolPicker: async () => canvasRef.current?.setupToolPicker(),
    clearDrawing: async () => canvasRef.current?.clearDrawing(),
    undo: async () => canvasRef.current?.undo(),
    redo: async () => canvasRef.current?.redo(),
    getCanvasDataAsBase64: async () => (await canvasRef.current?.getCanvasDataAsBase64()) ?? "",
    setCanvasDataFromBase64: async (data: string) =>
      (await canvasRef.current?.setCanvasDataFromBase64(data)) ?? false,
    setCanvasBackgroundColor: async (color: string) => canvasRef.current?.setCanvasBackgroundColor(color),
  }), []);

  const persistData = useCallback(
    (data: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onChange({
          version: 2,
          format: "pencilkit",
          data,
          updatedAt: Date.now(),
        });
      }, 350);
    },
    [onChange],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!pencilKit || !ready || !canvasRef.current) return;
    let cancelled = false;

    (async () => {
      const native = canvasRef.current;
      if (!native) return;
      await native.setupToolPicker();
      await native.setCanvasBackgroundColor(backgroundColor.replace("#", ""));

      const data = ink?.format === "pencilkit" ? ink.data : ink?.pencilKitData ?? (ink?.data && !ink.strokes?.length ? ink.data : undefined);
      const key = `${ink?.updatedAt ?? 0}:${data?.length ?? 0}`;
      if (data && loadedKey.current !== key) {
        loadedKey.current = key;
        await native.setCanvasDataFromBase64(data);
      } else if (!data) {
        loadedKey.current = key;
      }
      if (cancelled) return;
    })().catch(() => {
      /* tool picker / hydrate can race on unmount */
    });

    return () => {
      cancelled = true;
    };
  }, [pencilKit, ready, backgroundColor, ink?.updatedAt, ink?.format, ink?.data, ink?.pencilKitData, ink?.strokes?.length]);

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
          pen, pencil, marker, and eraser picker.
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
        onDrawEnd={(event) => {
          const data = event.nativeEvent?.data;
          if (typeof data === "string" && data.length) persistData(data);
        }}
        onDrawChange={(event) => {
          const data = event.nativeEvent?.data;
          if (typeof data === "string" && data.length) persistData(data);
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 420,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.12)",
  },
  canvas: { flex: 1, minHeight: 420 },
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
