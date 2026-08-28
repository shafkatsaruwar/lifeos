import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { paperColorHex } from "../lib/notebooks";
import type { PaperColor, PaperStyle } from "../types";

type Props = {
  paper: PaperStyle;
  paperColor?: PaperColor;
  /** When true, used as a non-interactive overlay above PencilKit (guides only). */
  overlay?: boolean;
};

/**
 * Calm paper guides. As an overlay (pointerEvents none), touches pass through
 * to PencilKit. True under-ink paper via background image is a later polish step.
 */
export const PaperBackground = memo(function PaperBackground({ paper, paperColor, overlay }: Props) {
  const tint = paperColorHex(paperColor);
  const lineMul = paperColor === "black" ? 0.55 : 1;

  if (paper === "blank") {
    return (
      <View
        style={[styles.fill, overlay ? styles.transparent : { backgroundColor: tint }]}
        pointerEvents="none"
      />
    );
  }

  return (
    <View
      style={[styles.fill, overlay ? styles.transparent : { backgroundColor: tint }]}
      pointerEvents="none"
    >
      {paper === "ruled" || paper === "narrowRuled" ? (
        <RuledLines narrow={paper === "narrowRuled"} dark={paperColor === "black"} />
      ) : null}
      {paper === "cornell" ? <CornellGuides dark={paperColor === "black"} /> : null}
      {paper === "grid" ? <GridLines gap={28} opacity={0.2 * lineMul} /> : null}
      {paper === "graph" ? <GridLines gap={16} opacity={0.16 * lineMul} /> : null}
      {paper === "dotted" ? <DotField dark={paperColor === "black"} /> : null}
      {paper === "todo" ? <TodoGuides /> : null}
      {paper === "music" ? <MusicStaves /> : null}
    </View>
  );
});

function RuledLines({ narrow, dark }: { narrow?: boolean; dark?: boolean }) {
  const gap = narrow ? 22 : 32;
  const lines = useMemo(() => Array.from({ length: 48 }, (_, i) => i), []);
  const line = dark ? "rgba(226,232,240,0.22)" : "rgba(99,122,180,0.28)";
  return (
    <>
      {lines.map((i) => (
        <View key={`h-${i}`} style={[styles.hLine, { top: 48 + i * gap, backgroundColor: line }]} />
      ))}
      <View style={[styles.marginLine, { left: 36, backgroundColor: dark ? "rgba(248,113,113,0.55)" : "rgba(220,120,120,0.45)" }]} />
    </>
  );
}

function CornellGuides({ dark }: { dark?: boolean }) {
  const lines = useMemo(() => Array.from({ length: 48 }, (_, i) => i), []);
  const line = dark ? "rgba(226,232,240,0.2)" : "rgba(99,122,180,0.22)";
  return (
    <>
      {lines.map((i) => (
        <View key={`c-${i}`} style={[styles.hLine, { top: 48 + i * 32, backgroundColor: line }]} />
      ))}
      <View style={[styles.cornellCue, { width: "32%" }]} />
      <View style={[styles.cornellSummary, { height: "22%" }]} />
    </>
  );
}

function GridLines({ gap, opacity }: { gap: number; opacity: number }) {
  const count = useMemo(() => Math.ceil(1200 / gap) + 2, [gap]);
  const lines = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  const color = `rgba(120,130,150,${opacity})`;
  return (
    <>
      {lines.map((i) => (
        <View key={`g-${i}`}>
          <View style={[styles.hLine, { top: 16 + i * gap, backgroundColor: color }]} />
          <View style={[styles.vLine, { left: 16 + i * gap, backgroundColor: color }]} />
        </View>
      ))}
    </>
  );
}

/** Sparse dots — fewer Views than a dense lattice so Seamless stays smooth. */
function DotField({ dark }: { dark?: boolean }) {
  const rows = useMemo(() => Array.from({ length: 28 }, (_, i) => i), []);
  const cols = useMemo(() => Array.from({ length: 22 }, (_, i) => i), []);
  return (
    <>
      {rows.map((row) =>
        cols.map((col) => (
          <View
            key={`d-${row}-${col}`}
            style={[
              styles.dot,
              {
                top: 20 + row * 32,
                left: 18 + col * 32,
                backgroundColor: dark ? "rgba(226,232,240,0.35)" : "rgba(120,130,150,0.45)",
              },
            ]}
          />
        )),
      )}
    </>
  );
}

function TodoGuides() {
  const rows = useMemo(() => Array.from({ length: 22 }, (_, i) => i), []);
  return (
    <>
      {rows.map((i) => {
        const top = 72 + i * 36;
        return (
          <View key={`t-${i}`}>
            <View style={[styles.checkbox, { top: top + 6 }]} />
            <View style={[styles.hLine, { top: top + 28, left: 52, backgroundColor: "rgba(99,122,180,0.22)" }]} />
          </View>
        );
      })}
    </>
  );
}

function MusicStaves() {
  const staves = useMemo(() => Array.from({ length: 8 }, (_, i) => i), []);
  return (
    <>
      {staves.map((s) => {
        const base = 56 + s * 96;
        return (
          <View key={`ms-${s}`}>
            {Array.from({ length: 5 }, (_, line) => (
              <View
                key={`ml-${s}-${line}`}
                style={[
                  styles.hLine,
                  {
                    top: base + line * 10,
                    left: 28,
                    right: 28,
                    backgroundColor: "rgba(40,48,64,0.45)",
                  },
                ]}
              />
            ))}
          </View>
        );
      })}
    </>
  );
}

/** Compact thumbnail paper for page grids. */
export function PaperThumb({
  paper,
  paperColor,
  color,
}: {
  paper: PaperStyle;
  paperColor?: PaperColor;
  color?: string;
}) {
  const tint = paperColorHex(paperColor);
  return (
    <View style={[styles.thumb, { backgroundColor: tint, borderColor: "rgba(15,23,42,0.08)" }]}>
      <View style={[styles.thumbAccent, { backgroundColor: color || "#2A9D8F" }]} />
      <View style={styles.thumbInner}>
        <PaperBackground paper={paper} paperColor={paperColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  paper: { backgroundColor: "#FFFFFF" },
  transparent: { backgroundColor: "transparent" },
  hLine: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth },
  vLine: { position: "absolute", top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  marginLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: "rgba(220,120,120,0.45)",
  },
  cornellCue: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: "22%",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(15,23,42,0.18)",
    backgroundColor: "rgba(239,238,255,0.35)",
  },
  cornellSummary: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(15,23,42,0.18)",
    backgroundColor: "rgba(248,250,252,0.4)",
  },
  dot: {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(120,130,150,0.45)",
  },
  checkbox: {
    position: "absolute",
    left: 20,
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: "rgba(99,122,180,0.55)",
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  thumb: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  thumbAccent: { height: 4 },
  thumbInner: { flex: 1 },
});
