import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Canvas, Circle, Group, Path, Skia } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import type { InkPoint, InkStroke, NoteInk } from "../types";

export type InkTool = "pen" | "highlighter" | "eraser";

type Props = {
  ink: NoteInk | undefined;
  tool: InkTool;
  color: string;
  width: number;
  onChange: (ink: NoteInk) => void;
  backgroundColor?: string;
};

function strokeToPath(stroke: InkStroke) {
  const path = Skia.Path.Make();
  if (!stroke.points.length) return path;
  path.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i++) {
    path.lineTo(stroke.points[i].x, stroke.points[i].y);
  }
  return path;
}

export function HandwritingCanvas({
  ink,
  tool,
  color,
  width,
  onChange,
  backgroundColor = "#FFFFFF",
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [strokes, setStrokes] = useState<InkStroke[]>(() => ink?.strokes ?? []);
  const [draft, setDraft] = useState<InkPoint[] | null>(null);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const widthRef = useRef(width);
  const onChangeRef = useRef(onChange);
  const strokesRef = useRef(strokes);
  const drawingRef = useRef(false);
  toolRef.current = tool;
  colorRef.current = color;
  widthRef.current = width;
  onChangeRef.current = onChange;
  strokesRef.current = strokes;

  const hydratedKey = useRef<string | null>(null);
  useEffect(() => {
    const key = `${ink?.updatedAt ?? 0}:${ink?.strokes?.length ?? 0}`;
    if (hydratedKey.current === key) return;
    // Only hydrate from external ink when we don't have local drafts in flight
    if (draft) return;
    hydratedKey.current = key;
    setStrokes(ink?.strokes ?? []);
  }, [ink, draft]);

  const emit = useCallback((next: InkStroke[]) => {
    onChangeRef.current({
      version: 1,
      strokes: next,
      updatedAt: Date.now(),
    });
  }, []);

  const beginStroke = useCallback((x: number, y: number) => {
    drawingRef.current = true;
    setDraft([{ x, y, t: Date.now() }]);
  }, []);

  const moveStroke = useCallback((x: number, y: number) => {
    if (!drawingRef.current) return;
    setDraft((prev) => (prev ? [...prev, { x, y, t: Date.now() }] : prev));
  }, []);

  const endStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setDraft((points) => {
      if (!points || points.length < 1) return null;
      const stroke: InkStroke = {
        id: `ink_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        tool: toolRef.current,
        color: colorRef.current,
        width: widthRef.current,
        points,
      };
      const next = [...strokesRef.current, stroke];
      setStrokes(next);
      emit(next);
      return null;
    });
  }, [emit]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .averageTouches(false)
        .onBegin((e) => {
          runOnJS(beginStroke)(e.x, e.y);
        })
        .onUpdate((e) => {
          runOnJS(moveStroke)(e.x, e.y);
        })
        .onFinalize(() => {
          runOnJS(endStroke)();
        }),
    [beginStroke, moveStroke, endStroke]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setSize({ w, h });
  };

  const draftPath = useMemo(() => {
    if (!draft?.length) return null;
    return strokeToPath({
      id: "draft",
      tool,
      color,
      width,
      points: draft,
    });
  }, [draft, tool, color, width]);

  return (
    <View style={[styles.root, { backgroundColor }]} onLayout={onLayout}>
      {size.w > 0 && size.h > 0 ? (
        <GestureDetector gesture={gesture}>
          <View style={styles.fill} collapsable={false}>
            <Canvas style={{ width: size.w, height: size.h }}>
              <Group>
                {strokes.map((stroke) => {
                  const path = strokeToPath(stroke);
                  const isHL = stroke.tool === "highlighter";
                  const isEraser = stroke.tool === "eraser";
                  return (
                    <Path
                      key={stroke.id}
                      path={path}
                      color={isEraser ? backgroundColor : stroke.color}
                      style="stroke"
                      strokeWidth={stroke.width}
                      strokeCap="round"
                      strokeJoin="round"
                      opacity={isHL ? 0.35 : 1}
                      blendMode={isEraser ? "srcOver" : isHL ? "multiply" : "srcOver"}
                    />
                  );
                })}
                {draftPath ? (
                  <Path
                    path={draftPath}
                    color={tool === "eraser" ? backgroundColor : color}
                    style="stroke"
                    strokeWidth={width}
                    strokeCap="round"
                    strokeJoin="round"
                    opacity={tool === "highlighter" ? 0.35 : 1}
                  />
                ) : null}
                {/* Tiny anchor so empty canvas still mounts */}
                <Circle cx={-10} cy={-10} r={1} color="transparent" />
              </Group>
            </Canvas>
          </View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

export function undoInk(ink: NoteInk | undefined): NoteInk {
  const strokes = ink?.strokes ?? [];
  return {
    version: 1,
    strokes: strokes.slice(0, -1),
    updatedAt: Date.now(),
  };
}

export function clearInk(): NoteInk {
  return { version: 1, strokes: [], updatedAt: Date.now() };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 420,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.12)",
  },
  fill: { flex: 1 },
});
