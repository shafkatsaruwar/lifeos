import Feather from "@expo/vector-icons/Feather";
import { useRef } from "react";
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import type { PageCanvasMode, PageImageElement, PageTextElement } from "../types";

type Props = {
  mode: PageCanvasMode;
  texts: PageTextElement[];
  images: PageImageElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChangeTexts: (next: PageTextElement[]) => void;
  onChangeImages: (next: PageImageElement[]) => void;
  /** When true, layer receives touches (text/image/select modes). */
  interactive: boolean;
  /** Document zoom — pan/resize deltas are divided by this so overlays track the finger. */
  zoomScale?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function PageElementsLayer({
  mode,
  texts,
  images,
  selectedId,
  onSelect,
  onChangeTexts,
  onChangeImages,
  interactive,
  zoomScale = 1,
}: Props) {
  const { theme } = useLifeOS();
  const zoom = zoomScale > 0.01 ? zoomScale : 1;

  const updateText = (id: string, patch: Partial<PageTextElement>) => {
    onChangeTexts(texts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const updateImage = (id: string, patch: Partial<PageImageElement>) => {
    onChangeImages(images.map((img) => (img.id === id ? { ...img, ...patch } : img)));
  };

  return (
    <View style={styles.layer} pointerEvents={interactive ? "box-none" : "none"}>
      {images.map((img) => (
        <DraggableBox
          key={img.id}
          selected={selectedId === img.id}
          interactive={interactive}
          x={img.x}
          y={img.y}
          width={img.width}
          height={img.height}
          rotation={img.rotation ?? 0}
          zoomScale={zoom}
          allowRotate
          onSelect={() => onSelect(img.id)}
          onMove={(x, y) => updateImage(img.id, { x, y })}
          onResize={(width, height) => updateImage(img.id, { width, height })}
          onRotate={(rotation) => updateImage(img.id, { rotation })}
          borderColor={theme.accent}
        >
          <Image source={{ uri: img.uri }} style={styles.image} resizeMode="cover" />
        </DraggableBox>
      ))}

      {texts.map((el) => {
        const selected = selectedId === el.id;
        const prefix = el.list === "bullet" ? "• " : el.list === "number" ? "1. " : "";
        return (
          <DraggableBox
            key={el.id}
            selected={selected}
            interactive={interactive}
            x={el.x}
            y={el.y}
            width={el.width}
            height={el.height}
            zoomScale={zoom}
            onSelect={() => onSelect(el.id)}
            onMove={(x, y) => updateText(el.id, { x, y })}
            onResize={(width, height) => updateText(el.id, { width, height })}
            borderColor={theme.accent}
          >
            {interactive && (mode === "text" || mode === "select") && selected ? (
              <TextInput
                value={el.text}
                onChangeText={(text) => updateText(el.id, { text })}
                multiline
                autoFocus={mode === "text"}
                placeholder="Type…"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.textInput,
                  {
                    fontSize: el.fontSize,
                    fontWeight: el.bold ? "700" : "400",
                    fontStyle: el.italic ? "italic" : "normal",
                    opacity: el.opacity ?? 1,
                    color: "#0F172A",
                  },
                ]}
              />
            ) : (
              <Text
                style={[
                  styles.textPreview,
                  {
                    fontSize: el.fontSize,
                    fontWeight: el.bold ? "700" : "400",
                    fontStyle: el.italic ? "italic" : "normal",
                    opacity: el.opacity ?? 1,
                    color: "#0F172A",
                  },
                ]}
              >
                {prefix}
                {el.text || "Text"}
              </Text>
            )}
          </DraggableBox>
        );
      })}
    </View>
  );
}

function DraggableBox({
  children,
  selected,
  interactive,
  x,
  y,
  width,
  height,
  rotation = 0,
  zoomScale = 1,
  allowRotate = false,
  onSelect,
  onMove,
  onResize,
  onRotate,
  borderColor,
}: {
  children: React.ReactNode;
  selected: boolean;
  interactive: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zoomScale?: number;
  allowRotate?: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  onRotate?: (degrees: number) => void;
  borderColor: string;
}) {
  const origin = useRef({ x, y, width, height, rotation });
  const live = useRef({
    x,
    y,
    width,
    height,
    rotation,
    zoomScale,
    interactive,
    selected,
    onSelect,
    onMove,
    onResize,
    onRotate,
  });
  live.current = {
    x,
    y,
    width,
    height,
    rotation,
    zoomScale,
    interactive,
    selected,
    onSelect,
    onMove,
    onResize,
    onRotate,
  };

  const moveResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => live.current.interactive,
      onMoveShouldSetPanResponder: () => live.current.interactive,
      onPanResponderGrant: () => {
        origin.current = {
          x: live.current.x,
          y: live.current.y,
          width: live.current.width,
          height: live.current.height,
          rotation: live.current.rotation,
        };
        live.current.onSelect();
      },
      onPanResponderMove: (_: GestureResponderEvent, g: PanResponderGestureState) => {
        const z = live.current.zoomScale > 0.01 ? live.current.zoomScale : 1;
        live.current.onMove(
          clamp(origin.current.x + g.dx / z, 0, 2000),
          clamp(origin.current.y + g.dy / z, 0, 2000),
        );
      },
    }),
  ).current;

  const resizeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => live.current.interactive && live.current.selected,
      onMoveShouldSetPanResponder: () => live.current.interactive && live.current.selected,
      onPanResponderGrant: () => {
        origin.current = {
          x: live.current.x,
          y: live.current.y,
          width: live.current.width,
          height: live.current.height,
          rotation: live.current.rotation,
        };
      },
      onPanResponderMove: (_: GestureResponderEvent, g: PanResponderGestureState) => {
        const z = live.current.zoomScale > 0.01 ? live.current.zoomScale : 1;
        live.current.onResize(
          clamp(origin.current.width + g.dx / z, 80, 600),
          clamp(origin.current.height + g.dy / z, 48, 600),
        );
      },
    }),
  ).current;

  const rotateResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => live.current.interactive && live.current.selected,
      onMoveShouldSetPanResponder: () => live.current.interactive && live.current.selected,
      onPanResponderGrant: () => {
        origin.current = {
          x: live.current.x,
          y: live.current.y,
          width: live.current.width,
          height: live.current.height,
          rotation: live.current.rotation,
        };
      },
      onPanResponderMove: (_: GestureResponderEvent, g: PanResponderGestureState) => {
        if (!live.current.onRotate) return;
        // Horizontal drag ≈ degrees; keep it snappy but not twitchy.
        const next = Math.round(origin.current.rotation + g.dx * 0.35);
        const normalized = ((next % 360) + 360) % 360;
        live.current.onRotate(normalized);
      },
    }),
  ).current;

  return (
    <View
      style={[
        styles.box,
        {
          left: x,
          top: y,
          width,
          height,
          borderColor: selected ? borderColor : "transparent",
          borderWidth: selected ? 1.5 : 0,
          backgroundColor: selected ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.01)",
          transform: [{ rotate: `${rotation}deg` }],
        },
      ]}
      {...(interactive ? moveResponder.panHandlers : {})}
    >
      <Pressable style={styles.fill} onPress={interactive ? onSelect : undefined}>
        {children}
      </Pressable>
      {selected && interactive ? (
        <View style={styles.resizeHandle} {...resizeResponder.panHandlers}>
          <Feather name="maximize-2" size={12} color="#fff" />
        </View>
      ) : null}
      {selected && interactive && allowRotate ? (
        <View style={styles.rotateHandle} {...rotateResponder.panHandlers}>
          <Feather name="rotate-cw" size={12} color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 4 },
  box: { position: "absolute", borderRadius: 8, overflow: "visible" },
  fill: { flex: 1, padding: 8 },
  textInput: { flex: 1, textAlignVertical: "top", padding: 0 },
  textPreview: { flex: 1 },
  image: { ...StyleSheet.absoluteFillObject, borderRadius: 6 },
  resizeHandle: {
    position: "absolute",
    right: -10,
    bottom: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#625AF6",
    alignItems: "center",
    justifyContent: "center",
  },
  rotateHandle: {
    position: "absolute",
    right: -10,
    top: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
});
