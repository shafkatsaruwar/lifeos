import { Platform, StyleSheet, Text, View } from "react-native";
import type { NotebookCoverStyle } from "../types";

type Props = {
  color: string;
  cover?: NotebookCoverStyle;
  title?: string;
  subtitle?: string;
  width: number;
  height: number;
  /** Show title on the face (create preview). Library cards usually put title underneath. */
  showTitle?: boolean;
  borderColor?: string;
};

function mix(hex: string, alpha: number) {
  const n = hex.replace("#", "");
  if (n.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Shared notebook cover art for library grid + create-note preview.
 */
export function NotebookCoverFace({
  color,
  cover = "solid",
  title,
  subtitle,
  width,
  height,
  showTitle = false,
  borderColor = "rgba(15,23,42,0.12)",
}: Props) {
  const c = color || "#625AF6";
  const lightText = cover === "slate" || cover === "midnight" || cover === "leather" || cover === "solid" || cover === "gradient" || cover === "colorful" || cover === "band" || cover === "ribbon" || cover === "academic";

  const faceBg =
    cover === "slate"
      ? "#3A3D45"
      : cover === "linen"
        ? "#EDE6DA"
        : cover === "leather"
          ? "#4A3428"
          : cover === "midnight"
            ? "#14182A"
            : cover === "kraft"
              ? "#C4A574"
              : cover === "sketch"
                ? "#F7F4EE"
                : cover === "minimal"
                  ? "#F8F8FA"
                  : c;

  const titleColor = lightText && cover !== "minimal" && cover !== "linen" && cover !== "kraft" && cover !== "sketch" ? "#FFFFFF" : "#202124";
  const metaColor = lightText && cover !== "minimal" && cover !== "linen" && cover !== "kraft" && cover !== "sketch" ? "rgba(255,255,255,0.82)" : "#777B84";

  return (
    <View style={[styles.face, { width, height, backgroundColor: faceBg, borderColor }]}>
      <View style={[styles.spine, { backgroundColor: cover === "minimal" || cover === "sketch" ? mix(c, 0.85) : mix("#000000", 0.22) }]} />

      {cover === "gradient" || cover === "colorful" ? (
        <>
          <View style={[styles.wash, { backgroundColor: mix("#FFFFFF", 0.18) }]} />
          <View style={[styles.blob, { backgroundColor: mix("#FFFFFF", 0.2), top: 18, right: -20 }]} />
        </>
      ) : null}

      {cover === "academic" ? <View style={[styles.bandTop, { backgroundColor: mix("#FFFFFF", 0.22) }]} /> : null}
      {cover === "band" ? <View style={[styles.midBand, { backgroundColor: mix("#000000", 0.28) }]} /> : null}
      {cover === "ribbon" ? <View style={[styles.ribbon, { backgroundColor: mix("#FFFFFF", 0.28) }]} /> : null}
      {cover === "mosaic" ? (
        <>
          <View style={[styles.mosaicA, { backgroundColor: mix("#FFFFFF", 0.22) }]} />
          <View style={[styles.mosaicB, { backgroundColor: mix("#000000", 0.18) }]} />
        </>
      ) : null}
      {cover === "linen" || cover === "kraft" ? (
        <View style={[styles.linenGrid, { borderColor: mix("#000000", 0.08) }]} />
      ) : null}
      {cover === "leather" ? <View style={[styles.leatherShine, { backgroundColor: mix("#FFFFFF", 0.08) }]} /> : null}
      {cover === "midnight" ? <View style={[styles.stars, { backgroundColor: mix(c, 0.55) }]} /> : null}
      {cover === "sketch" ? <View style={[styles.sketchFrame, { borderColor: mix(c, 0.55) }]} /> : null}
      {cover === "minimal" ? <View style={[styles.minimalRule, { backgroundColor: c }]} /> : null}
      {cover === "solid" || cover === "slate" ? <View style={[styles.softMark, { borderColor: mix("#FFFFFF", 0.22) }]} /> : null}

      {showTitle ? (
        <View style={styles.titleBlock}>
          <Text
            style={[
              styles.title,
              {
                color: titleColor,
                fontFamily: Platform.OS === "ios" ? "Georgia" : undefined,
              },
            ]}
            numberOfLines={3}
          >
            {title || "Untitled note"}
          </Text>
          {subtitle ? (
            <Text style={[styles.sub, { color: metaColor }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={[styles.decorMark, { borderColor: mix(lightText ? "#FFFFFF" : c, 0.35) }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  spine: { position: "absolute", left: 0, top: 0, bottom: 0, width: 7 },
  wash: { ...StyleSheet.absoluteFillObject, left: 7 },
  blob: { position: "absolute", width: 90, height: 90, borderRadius: 45 },
  bandTop: { position: "absolute", left: 7, right: 0, top: 0, height: 18 },
  midBand: { position: "absolute", left: 7, right: 0, top: "42%", height: 28 },
  ribbon: {
    position: "absolute",
    width: "140%",
    height: 22,
    top: "30%",
    left: -20,
    transform: [{ rotate: "-18deg" }],
  },
  mosaicA: { position: "absolute", left: 7, top: 0, width: "55%", height: "38%" },
  mosaicB: { position: "absolute", right: 0, bottom: 0, width: "48%", height: "42%" },
  linenGrid: {
    ...StyleSheet.absoluteFillObject,
    left: 7,
    borderWidth: 1,
    opacity: 0.5,
  },
  leatherShine: {
    position: "absolute",
    left: 18,
    right: 12,
    top: 16,
    height: "40%",
    borderRadius: 10,
  },
  stars: {
    position: "absolute",
    right: 16,
    top: 18,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sketchFrame: {
    position: "absolute",
    left: 16,
    right: 10,
    top: 12,
    bottom: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 8,
  },
  minimalRule: { position: "absolute", left: 18, right: 14, top: 16, height: 3, borderRadius: 2 },
  softMark: {
    position: "absolute",
    left: 22,
    right: 14,
    top: 22,
    bottom: 22,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  decorMark: {
    position: "absolute",
    left: 22,
    right: 14,
    top: 22,
    bottom: 22,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  titleBlock: {
    flex: 1,
    justifyContent: "flex-end",
    paddingLeft: 18,
    paddingRight: 12,
    paddingBottom: 14,
    paddingTop: 22,
    gap: 4,
  },
  title: { fontSize: 16, fontWeight: "700", lineHeight: 21 },
  sub: { fontSize: 11, fontWeight: "600" },
});
