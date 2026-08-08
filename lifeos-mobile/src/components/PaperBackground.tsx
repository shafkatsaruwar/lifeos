import { StyleSheet, View } from "react-native";
import type { PaperStyle } from "../types";

type Props = {
  paper: PaperStyle;
  /** When true, used as a non-interactive overlay above PencilKit (guides only). */
  overlay?: boolean;
};

/**
 * Calm paper guides. As an overlay (pointerEvents none), touches pass through
 * to PencilKit. True under-ink paper via background image is a later polish step.
 */
export function PaperBackground({ paper, overlay }: Props) {
  if (paper === "blank") {
    return <View style={[styles.fill, overlay && styles.transparent]} pointerEvents="none" />;
  }

  const lineGap = paper === "narrowRuled" ? 22 : paper === "ruled" || paper === "cornell" ? 32 : 28;
  const lines = Array.from({ length: 48 }, (_, i) => i);

  return (
    <View style={[styles.fill, overlay ? styles.transparent : styles.paper]} pointerEvents="none">
      {(paper === "ruled" || paper === "narrowRuled" || paper === "cornell") &&
        lines.map((i) => (
          <View
            key={`h-${i}`}
            style={[
              styles.hLine,
              { top: 48 + i * lineGap, backgroundColor: paper === "cornell" ? "rgba(99,122,180,0.22)" : "rgba(99,122,180,0.28)" },
            ]}
          />
        ))}

      {paper === "ruled" || paper === "narrowRuled" ? (
        <View style={[styles.marginLine, { left: 36 }]} />
      ) : null}

      {paper === "cornell" ? (
        <>
          <View style={[styles.cornellCue, { width: "32%" }]} />
          <View style={[styles.cornellSummary, { height: "22%" }]} />
        </>
      ) : null}

      {paper === "grid"
        ? lines.map((i) => (
            <View key={`gv-${i}`}>
              <View style={[styles.hLine, { top: 16 + i * 28, backgroundColor: "rgba(120,130,150,0.2)" }]} />
              <View style={[styles.vLine, { left: 16 + i * 28, backgroundColor: "rgba(120,130,150,0.2)" }]} />
            </View>
          ))
        : null}

      {paper === "dotted"
        ? Array.from({ length: 40 }, (_, row) =>
            Array.from({ length: 24 }, (_, col) => (
              <View
                key={`d-${row}-${col}`}
                style={[styles.dot, { top: 20 + row * 24, left: 16 + col * 24 }]}
              />
            )),
          )
        : null}
    </View>
  );
}

/** Compact thumbnail paper for page grids. */
export function PaperThumb({ paper, color }: { paper: PaperStyle; color?: string }) {
  return (
    <View style={[styles.thumb, { backgroundColor: "#FFFEFA", borderColor: "rgba(15,23,42,0.08)" }]}>
      <View style={[styles.thumbAccent, { backgroundColor: color || "#625AF6" }]} />
      <View style={styles.thumbInner}>
        <PaperBackground paper={paper} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  paper: { backgroundColor: "#FFFEFA" },
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
  thumb: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  thumbAccent: { height: 6, width: "100%" },
  thumbInner: { flex: 1 },
});
