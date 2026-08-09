import { memo, type Ref, useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import {
  HandwritingCanvas,
  type DrawingPolicy,
  type HandwritingCanvasRef,
  type InkToolKind,
} from "./HandwritingCanvas";
import { PageElementsLayer } from "./PageElementsLayer";
import { PaperBackground } from "./PaperBackground";
import { PAGE_SHEET_COLOR, paperColorHex } from "../lib/notebooks";
import type { NoteInk, NotebookPage, PageCanvasMode, PageImageElement, PageTextElement } from "../types";

type Props = {
  page: NotebookPage;
  width: number;
  height: number;
  /** Mount live PencilKit on this sheet. */
  liveInk: boolean;
  inkInteractive: boolean;
  overlayInteractive: boolean;
  mode: PageCanvasMode;
  selectedId: string | null;
  pageLabel?: string;
  pencilRef?: Ref<HandwritingCanvasRef | null>;
  drawingPolicy?: DrawingPolicy;
  /** Document zoom scale — overlay drag deltas are corrected by 1/zoom. */
  zoomScale?: number;
  inkTool?: InkToolKind;
  inkColor?: string;
  inkWidth?: number;
  onInkChange: (ink: NoteInk) => void;
  onSelect: (id: string | null) => void;
  onChangeTexts: (next: PageTextElement[]) => void;
  onChangeImages: (next: PageImageElement[]) => void;
};

/**
 * One notebook page frame: optional live ink + paper guides + text/image overlays.
 * Used by Seamless (stacked) and Single Page modes.
 */
export const PageSheet = memo(function PageSheet({
  page,
  width,
  height,
  liveInk,
  inkInteractive,
  overlayInteractive,
  mode,
  selectedId,
  pageLabel,
  pencilRef,
  drawingPolicy = "pencilOnly",
  zoomScale = 1,
  inkTool = "pen",
  inkColor = "202124",
  inkWidth = 5.5,
  onInkChange,
  onSelect,
  onChangeTexts,
  onChangeImages,
}: Props) {
  const texts = page.textElements ?? [];
  const images = page.imageElements ?? [];
  const sheetColor = paperColorHex(page.paperColor) || PAGE_SHEET_COLOR;
  const focusAnim = useRef(new Animated.Value(liveInk ? 1 : 0.92)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: liveInk ? 1 : 0.94,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [liveInk, focusAnim]);

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          width,
          height,
          opacity: focusAnim,
          borderColor: liveInk ? "rgba(98,90,246,0.28)" : "rgba(15,23,42,0.12)",
          borderWidth: liveInk ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: sheetColor }]} />
      {liveInk ? (
        <View style={StyleSheet.absoluteFill} pointerEvents={inkInteractive ? "auto" : "none"}>
          <HandwritingCanvas
            key={page.id}
            ref={pencilRef}
            documentKey={page.id}
            toolPickerKey={page.id}
            drawingPolicy={drawingPolicy}
            inkTool={inkTool}
            inkColor={inkColor}
            inkWidth={inkWidth}
            ink={page.ink}
            onChange={onInkChange}
            backgroundColor={sheetColor.replace("#", "")}
          />
        </View>
      ) : null}
      {page.paper !== "blank" ? (
        <PaperBackground paper={page.paper} paperColor={page.paperColor} overlay />
      ) : null}
      <PageElementsLayer
        mode={mode}
        texts={texts}
        images={images}
        selectedId={liveInk ? selectedId : null}
        onSelect={onSelect}
        onChangeTexts={onChangeTexts}
        onChangeImages={onChangeImages}
        interactive={liveInk && overlayInteractive}
        zoomScale={zoomScale}
      />
      {pageLabel ? (
        <View style={[styles.pageBadge, liveInk && styles.pageBadgeLive]} pointerEvents="none">
          <Text style={[styles.pageBadgeText, liveInk && styles.pageBadgeTextLive]}>{pageLabel}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  sheet: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: PAGE_SHEET_COLOR,
  },
  pageBadge: {
    position: "absolute",
    right: 10,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  pageBadgeLive: {
    backgroundColor: "rgba(98,90,246,0.12)",
  },
  pageBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#777B84",
    letterSpacing: 0.3,
  },
  pageBadgeTextLive: {
    color: "#625AF6",
  },
});
