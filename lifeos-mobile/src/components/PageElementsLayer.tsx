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
}: Props) {
  const { theme } = useLifeOS();

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
          onSelect={() => onSelect(img.id)}
          onMove={(x, y) => updateImage(img.id, { x, y })}
          onResize={(width, height) => updateImage(img.id, { width, height })}
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
  onSelect,
  onMove,
  onResize,
  borderColor,
}: {
  children: React.ReactNode;
  selected: boolean;
  interactive: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  borderColor: string;
}) {
  const origin = useRef({ x, y, width, height });
  const live = useRef({
    x,
    y,
    width,
    height,
    interactive,
    selected,
    onSelect,
    onMove,
    onResize,
  });
  live.current = { x, y, width, height, interactive, selected, onSelect, onMove, onResize };

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
        };
        live.current.onSelect();
      },
      onPanResponderMove: (_: GestureResponderEvent, g: PanResponderGestureState) => {
        live.current.onMove(clamp(origin.current.x + g.dx, 0, 2000), clamp(origin.current.y + g.dy, 0, 2000));
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
        };
      },
      onPanResponderMove: (_: GestureResponderEvent, g: PanResponderGestureState) => {
        live.current.onResize(
          clamp(origin.current.width + g.dx, 80, 600),
          clamp(origin.current.height + g.dy, 48, 600),
        );
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
});
