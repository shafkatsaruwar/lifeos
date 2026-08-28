import Feather from "@expo/vector-icons/Feather";
import { useMemo, useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import type { InkToolKind } from "./HandwritingCanvas";

export type DrawingTip = "pen" | "pencil" | "marker";

type WidthPresets = Record<DrawingTip, [number, number, number]>;
type PresetIndex = 0 | 1 | 2;

const INK_COLORS_PRIMARY = ["202124", "3F7ED7", "D95754"] as const;
const INK_COLORS_EXTRA = ["31926A", "D38232", "8B5CF6", "FFFFFF"] as const;
const INK_COLORS = [...INK_COLORS_PRIMARY, ...INK_COLORS_EXTRA] as const;

const DEFAULT_PRESETS: WidthPresets = {
  pen: [2.5, 5.5, 9],
  pencil: [1.8, 4, 7],
  marker: [8, 14, 22],
};

const ERASER_SIZES = [
  { key: "xs", label: "Smallest", width: 4, dot: 6 },
  { key: "sm", label: "Small", width: 8, dot: 10 },
  { key: "md", label: "Medium", width: 14, dot: 14 },
  { key: "auto", label: "Auto", width: 18, dot: 16, auto: true },
] as const;

const WIDTH_MIN = 1;
const WIDTH_MAX = 30;

function clampWidth(n: number) {
  return Math.round(Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, n)) * 10) / 10;
}

function isDrawingTip(tool: InkToolKind): tool is DrawingTip {
  return tool === "pen" || tool === "pencil" || tool === "marker";
}

type Props = {
  mode: "pen" | "eraser";
  inkTool: InkToolKind;
  inkColor: string;
  onSelectTip: (tip: DrawingTip, width: number) => void;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onSelectEraser: (tool: "eraser" | "vectorEraser", width: number) => void;
  onClearPage: () => void;
};

/**
 * Noteshelf-style ink / eraser trays:
 * - Pen/Pencil/Marker each keep 3 editable width presets
 * - Tap preset to use; tap again (or long-press) to tune with a slider
 * - Eraser: size presets, erase-entire-stroke, clear page
 */
export function InkToolTray({
  mode,
  inkTool,
  inkColor,
  onSelectTip,
  onColorChange,
  onWidthChange,
  onSelectEraser,
  onClearPage,
}: Props) {
  const [presets, setPresets] = useState<WidthPresets>(DEFAULT_PRESETS);
  const [activeSlot, setActiveSlot] = useState<Record<DrawingTip, PresetIndex>>({
    pen: 1,
    pencil: 1,
    marker: 1,
  });
  const [colorsExpanded, setColorsExpanded] = useState(false);
  const [editorSlot, setEditorSlot] = useState<PresetIndex | null>(null);
  const [eraseEntireStroke, setEraseEntireStroke] = useState(inkTool === "vectorEraser");
  const [eraserSizeKey, setEraserSizeKey] = useState<(typeof ERASER_SIZES)[number]["key"]>("md");

  const tip: DrawingTip = isDrawingTip(inkTool) ? inkTool : "pen";
  const tipPresets = presets[tip];
  const tipSlot = activeSlot[tip];

  const widthFor = (nextTip: DrawingTip, slot: PresetIndex, width?: number) =>
    clampWidth(width ?? presets[nextTip][slot]);

  const openOrSelectPreset = (slot: PresetIndex) => {
    if (tipSlot === slot && editorSlot === slot) {
      setEditorSlot(null);
      return;
    }
    if (tipSlot === slot) {
      setEditorSlot(slot);
      return;
    }
    setEditorSlot(null);
    setActiveSlot((prev) => ({ ...prev, [tip]: slot }));
    onWidthChange(widthFor(tip, slot));
  };

  const updatePresetWidth = (slot: PresetIndex, width: number) => {
    const w = clampWidth(width);
    setPresets((prev) => {
      const next = [...prev[tip]] as [number, number, number];
      next[slot] = w;
      return { ...prev, [tip]: next };
    });
    setActiveSlot((prev) => ({ ...prev, [tip]: slot }));
    onWidthChange(w);
  };

  if (mode === "eraser") {
    return (
      <View style={styles.wrap}>
        <View style={styles.eraserCard}>
          <Text style={styles.eraserTitle}>Eraser</Text>
          <View style={styles.eraserSizes}>
            {ERASER_SIZES.map((size) => {
              const on = eraserSizeKey === size.key;
              return (
                <Pressable
                  key={size.key}
                  accessibilityLabel={size.label}
                  onPress={() => {
                    setEraserSizeKey(size.key);
                    onSelectEraser(eraseEntireStroke ? "vectorEraser" : "eraser", size.width);
                  }}
                  style={[styles.eraserSizeHit, on && styles.eraserSizeHitOn]}
                >
                  {size.auto ? (
                    <View style={[styles.autoDot, on && styles.autoDotOn]}>
                      <Text style={[styles.autoText, on && styles.autoTextOn]}>AUTO</Text>
                    </View>
                  ) : (
                    <View
                      style={{
                        width: size.dot,
                        height: size.dot,
                        borderRadius: size.dot,
                        backgroundColor: on ? "#94A3B8" : "#CBD5E1",
                      }}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Erase entire stroke</Text>
            <Switch
              value={eraseEntireStroke}
              onValueChange={(value) => {
                setEraseEntireStroke(value);
                const size = ERASER_SIZES.find((s) => s.key === eraserSizeKey) ?? ERASER_SIZES[2];
                onSelectEraser(value ? "vectorEraser" : "eraser", size.width);
              }}
              trackColor={{ false: "#D1D5DB", true: "#5EEAD4" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Pressable
            onPress={onClearPage}
            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.clearText}>Clear Page</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const visibleColors = colorsExpanded ? INK_COLORS : INK_COLORS_PRIMARY;

  return (
    <View style={styles.wrap}>
      <View style={styles.tray}>
        <View style={styles.group}>
          {(
            [
              { key: "pen" as const, icon: "edit-3" as const, label: "Pen" },
              { key: "pencil" as const, icon: "edit-2" as const, label: "Pencil" },
              { key: "marker" as const, icon: "underline" as const, label: "Marker" },
            ] as const
          ).map((opt) => {
            const on = tip === opt.key && isDrawingTip(inkTool);
            return (
              <Pressable
                key={opt.key}
                accessibilityLabel={opt.label}
                onPress={() => {
                  setEditorSlot(null);
                  const slot = activeSlot[opt.key];
                  onSelectTip(opt.key, widthFor(opt.key, slot));
                }}
                style={[styles.tipBtn, on && styles.tipBtnOn]}
              >
                <Feather name={opt.icon} size={16} color="#111827" />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />

        <View style={styles.group}>
          {visibleColors.map((c) => {
            const on = inkColor === c;
            const light = c.toUpperCase() === "FFFFFF";
            return (
              <Pressable
                key={c}
                accessibilityLabel={`Color ${c}`}
                onPress={() => onColorChange(c)}
                style={[styles.swatchHit, on && styles.swatchHitOn]}
              >
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: `#${c}`,
                      borderWidth: light ? StyleSheet.hairlineWidth : 0,
                      borderColor: "rgba(15,23,42,0.2)",
                    },
                  ]}
                />
              </Pressable>
            );
          })}
          <Pressable
            accessibilityLabel={colorsExpanded ? "Fewer colors" : "More colors"}
            onPress={() => setColorsExpanded((v) => !v)}
            style={styles.swatchHit}
          >
            <View style={styles.addSwatch}>
              <Feather name={colorsExpanded ? "minus" : "plus"} size={14} color="#6B7280" />
            </View>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.group}>
          {tipPresets.map((presetWidth, index) => {
            const slot = index as PresetIndex;
            const on = tipSlot === slot;
            const dot = 6 + slot * 5;
            return (
              <Pressable
                key={`${tip}-${slot}`}
                accessibilityLabel={`Width preset ${slot + 1}: ${presetWidth}`}
                onPress={() => openOrSelectPreset(slot)}
                onLongPress={() => {
                  setEditorSlot(slot);
                  setActiveSlot((prev) => ({ ...prev, [tip]: slot }));
                  onWidthChange(widthFor(tip, slot));
                }}
                delayLongPress={280}
                style={[styles.widthHit, on && styles.widthHitOn]}
              >
                <View
                  style={{
                    width: dot,
                    height: dot,
                    borderRadius: dot,
                    backgroundColor: `#${inkColor === "FFFFFF" ? "202124" : inkColor}`,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      {editorSlot != null ? (
        <View style={styles.widthEditor}>
          <View style={styles.presetRow}>
            {tipPresets.map((presetWidth, index) => {
              const slot = index as PresetIndex;
              const on = editorSlot === slot;
              const bar = 2 + slot * 2.5;
              return (
                <Pressable
                  key={`edit-${slot}`}
                  onPress={() => {
                    setEditorSlot(slot);
                    setActiveSlot((prev) => ({ ...prev, [tip]: slot }));
                    onWidthChange(widthFor(tip, slot));
                  }}
                  style={[styles.presetCircle, on && styles.presetCircleOn]}
                >
                  <View
                    style={{
                      width: 22 + slot * 4,
                      height: bar,
                      borderRadius: bar,
                      backgroundColor: on ? "#111827" : "#94A3B8",
                      transform: [{ rotate: "-28deg" }],
                    }}
                  />
                  <Text style={styles.presetValue}>{presetWidth.toFixed(1)}</Text>
                </Pressable>
              );
            })}
          </View>
          <WidthSlider
            value={tipPresets[editorSlot]}
            onChange={(w) => updatePresetWidth(editorSlot, w)}
          />
          <Text style={styles.editorHint}>Drag to set this preset · saved for {tip}</Text>
        </View>
      ) : null}
    </View>
  );
}

function WidthSlider({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const trackW = useRef(200);
  const [bubble, setBubble] = useState(value);

  const ratio = useMemo(() => (clampWidth(value) - WIDTH_MIN) / (WIDTH_MAX - WIDTH_MIN), [value]);

  const setFromX = (x: number) => {
    const r = Math.min(1, Math.max(0, x / Math.max(1, trackW.current)));
    const next = clampWidth(WIDTH_MIN + r * (WIDTH_MAX - WIDTH_MIN));
    setBubble(next);
    onChange(next);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e: GestureResponderEvent) => setFromX(e.nativeEvent.locationX),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    trackW.current = e.nativeEvent.layout.width;
  };

  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderTrack} onLayout={onLayout} {...pan.panHandlers}>
        <View style={[styles.sliderFill, { width: `${Math.max(4, ratio * 100)}%` }]} />
        <View style={[styles.sliderThumb, { left: `${ratio * 100}%` }]}>
          <View style={styles.valueTag}>
            <Text style={styles.valueTagText}>{(bubble || value).toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  tray: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "rgba(245,248,250,0.94)",
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  group: { flexDirection: "row", alignItems: "center", gap: 6 },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: "rgba(15,23,42,0.14)",
    marginHorizontal: 2,
  },
  tipBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tipBtnOn: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  swatchHit: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchHitOn: {
    borderWidth: 2,
    borderColor: "#111827",
    backgroundColor: "#FFFFFF",
  },
  swatch: { width: 20, height: 20, borderRadius: 10 },
  addSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(148,163,184,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  widthHit: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  widthHitOn: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  widthEditor: {
    width: 280,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  presetRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  presetCircle: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.1)",
    backgroundColor: "rgba(248,250,252,0.95)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  presetCircleOn: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(15,23,42,0.22)",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
  },
  presetValue: { fontSize: 11, fontWeight: "800", color: "#64748B" },
  editorHint: { fontSize: 11, fontWeight: "600", color: "#94A3B8", textAlign: "center" },
  sliderBlock: { paddingTop: 8, paddingBottom: 4 },
  sliderTrack: {
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.25)",
    justifyContent: "center",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#64748B",
    marginHorizontal: 4,
  },
  sliderThumb: {
    position: "absolute",
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#111827",
    top: 4,
  },
  valueTag: {
    position: "absolute",
    top: 24,
    left: -14,
    minWidth: 40,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.12)",
    alignItems: "center",
  },
  valueTagText: { fontSize: 12, fontWeight: "800", color: "#111827" },
  eraserCard: {
    width: 300,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "rgba(248,250,252,0.97)",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  eraserTitle: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    fontStyle: "italic",
  },
  eraserSizes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  eraserSizeHit: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(241,245,249,0.9)",
  },
  eraserSizeHitOn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(15,23,42,0.18)",
  },
  autoDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  autoDotOn: { backgroundColor: "#0F172A" },
  autoText: { fontSize: 8, fontWeight: "900", color: "#64748B", letterSpacing: 0.3 },
  autoTextOn: { color: "#FFFFFF" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: "#0F172A", flex: 1, paddingRight: 12 },
  clearBtn: { alignItems: "center", paddingVertical: 10 },
  clearText: { fontSize: 16, fontWeight: "700", color: "#DC2626" },
});
