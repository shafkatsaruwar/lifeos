import Feather from "@expo/vector-icons/Feather";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PaperThumb } from "./PaperBackground";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  PAPER_COLOR_OPTIONS,
  PAPER_CUSTOM,
  PAPER_ESSENTIALS,
  PAPER_OPTIONS,
  PAPER_SIZE_OPTIONS,
} from "../lib/notebooks";
import type {
  PaperColor,
  PaperOrientation,
  PaperSizePreset,
  PaperStyle,
} from "../types";

export type PaperTemplateSelection = {
  paper: PaperStyle;
  paperColor: PaperColor;
  paperOrientation: PaperOrientation;
  paperSize: PaperSizePreset;
};

type Props = {
  visible: boolean;
  current?: PaperStyle;
  currentColor?: PaperColor;
  currentOrientation?: PaperOrientation;
  currentSize?: PaperSizePreset;
  onClose: () => void;
  onSelect: (selection: PaperTemplateSelection) => void;
  /**
   * Editor “Change template”: paper style/color only.
   * Hides size/orientation so the canvas doesn’t resize and wipe strokes.
   */
  preserveContent?: boolean;
};

const ACCENT = "#2A9D8F";

type Tab = "essentials" | "favorites" | "custom";

/** Noteshelf-style Paper Template modal — applies to the current page only. */
export function TemplatePicker({
  visible,
  current = "ruled",
  currentColor = "white",
  currentOrientation = "portrait",
  currentSize = "ipad",
  onClose,
  onSelect,
  preserveContent = false,
}: Props) {
  const { theme, workspace, updateSettings } = useLifeOS();
  const insets = useSafeAreaInsets();
  const favorites = workspace.settings.favoritePaperStyles ?? [];

  const [tab, setTab] = useState<Tab>("essentials");
  const [paper, setPaper] = useState<PaperStyle>(current);
  const [paperColor, setPaperColor] = useState<PaperColor>(currentColor);
  const [orientation, setOrientation] = useState<PaperOrientation>(currentOrientation);
  const [paperSize, setPaperSize] = useState<PaperSizePreset>(currentSize);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPaper(current);
    setPaperColor(currentColor);
    setOrientation(currentOrientation);
    setPaperSize(currentSize);
    setTab("essentials");
    setSizeMenuOpen(false);
  }, [visible, current, currentColor, currentOrientation, currentSize]);

  const labelFor = (key: PaperStyle) => PAPER_OPTIONS.find((o) => o.key === key)?.label ?? key;

  const gridStyles = useMemo(() => {
    if (tab === "favorites") return favorites.length ? favorites : [];
    if (tab === "custom") return PAPER_CUSTOM;
    return PAPER_ESSENTIALS;
  }, [tab, favorites]);

  const toggleFavorite = (key: PaperStyle) => {
    const next = favorites.includes(key)
      ? favorites.filter((f) => f !== key)
      : [...favorites, key];
    void updateSettings({ ...workspace.settings, favoritePaperStyles: next });
  };

  const confirm = () => {
    onSelect({
      paper,
      paperColor,
      // Lock layout when editing an existing page so ink/overlays stay put.
      paperOrientation: preserveContent ? currentOrientation : orientation,
      paperSize: preserveContent ? currentSize : paperSize,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.card}>
          <View style={styles.head}>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.headBtn}>
              <Feather name="x" size={22} color="#334155" />
            </Pressable>
            <Text style={styles.title}>Paper Template</Text>
            <Pressable accessibilityLabel="Apply template" onPress={confirm} style={styles.checkBtn}>
              <Feather name="check" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {(
              [
                { key: "essentials" as const, label: "Essentials" },
                { key: "favorites" as const, label: "Favorites" },
                { key: "custom" as const, label: "Custom" },
              ] as const
            ).map((t) => {
              const on = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={[styles.tab, on && styles.tabOn]}
                >
                  <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.styleRow}>
            {PAPER_COLOR_OPTIONS.map((c) => {
              const on = paperColor === c.key;
              return (
                <Pressable
                  key={c.key}
                  accessibilityLabel={c.label}
                  onPress={() => setPaperColor(c.key)}
                  style={[
                    styles.colorSq,
                    {
                      backgroundColor: c.hex,
                      borderColor: on ? ACCENT : "rgba(15,23,42,0.12)",
                      borderWidth: on ? 2.5 : 1,
                    },
                  ]}
                />
              );
            })}
            <View style={styles.styleSpacer} />
            <Pressable
              accessibilityLabel="Plain paper"
              onPress={() => setPaper("blank")}
              style={[styles.styleCircle, paper === "blank" && styles.styleCircleOn]}
            >
              <View style={[styles.styleCircleFill, { backgroundColor: paperColorHexLocal(paperColor) }]} />
            </Pressable>
            <Pressable
              accessibilityLabel="Ruled paper"
              onPress={() => setPaper("ruled")}
              style={[styles.styleCircle, paper === "ruled" && styles.styleCircleOn]}
            >
              <View style={[styles.styleCircleFill, { backgroundColor: paperColorHexLocal(paperColor) }]}>
                <View style={styles.miniLine} />
                <View style={[styles.miniLine, { top: 12 }]} />
                <View style={[styles.miniLine, { top: 18 }]} />
              </View>
            </Pressable>
            {!preserveContent ? (
              <View style={styles.orientGroup}>
                <Pressable
                  accessibilityLabel="Portrait"
                  onPress={() => setOrientation("portrait")}
                  style={[styles.orientBtn, orientation === "portrait" && styles.orientBtnOn]}
                >
                  <View style={styles.orientPort} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Landscape"
                  onPress={() => setOrientation("landscape")}
                  style={[styles.orientBtn, orientation === "landscape" && styles.orientBtnOn]}
                >
                  <View style={styles.orientLand} />
                </Pressable>
              </View>
            ) : null}
          </View>

          {preserveContent ? (
            <Text style={styles.preserveHint}>
              Changes the paper only — your handwriting and notes stay on the page.
            </Text>
          ) : null}

          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {tab === "favorites" && gridStyles.length === 0 ? (
              <Text style={styles.emptyFav}>
                Long-press a template to add it to Favorites.
              </Text>
            ) : null}
            {gridStyles.map((key) => {
              const active = paper === key;
              const fav = favorites.includes(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => setPaper(key)}
                  onLongPress={() => toggleFavorite(key)}
                  delayLongPress={350}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.thumbFrame,
                      {
                        borderColor: active ? ACCENT : "rgba(15,23,42,0.08)",
                        borderWidth: active ? 2.5 : 1,
                        aspectRatio: orientation === "landscape" ? 1.35 : 0.78,
                      },
                    ]}
                  >
                    <PaperThumb paper={key} paperColor={paperColor} color={ACCENT} />
                    {fav ? (
                      <View style={styles.favBadge}>
                        <Feather name="heart" size={11} color="#E11D48" />
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.cellLabel, active && { color: ACCENT }]}>{labelFor(key)}</Text>
                </Pressable>
              );
            })}
            {tab === "essentials" ? (
              <Pressable onPress={() => setTab("custom")} style={styles.cell}>
                <View style={[styles.thumbFrame, styles.moreFrame, { aspectRatio: orientation === "landscape" ? 1.35 : 0.78 }]}>
                  <View style={styles.moreCollage}>
                    {(["ruled", "grid", "dotted", "cornell"] as PaperStyle[]).map((p, i) => (
                      <View key={p} style={[styles.moreTile, { zIndex: 4 - i, marginLeft: i === 0 ? 0 : -18 }]}>
                        <PaperThumb paper={p} paperColor={paperColor} />
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={styles.cellLabel}>More Templates</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          {!preserveContent ? (
            <>
              <View style={styles.sizeBar}>
                <Text style={styles.sizeLabel}>Paper Size</Text>
                <Pressable onPress={() => setSizeMenuOpen((v) => !v)} style={styles.sizeValue}>
                  <Text style={styles.sizeValueText}>
                    {PAPER_SIZE_OPTIONS.find((s) => s.key === paperSize)?.label ?? "iPad"}
                  </Text>
                  <Feather name="chevrons-up" size={14} color={ACCENT} />
                </Pressable>
              </View>
              {sizeMenuOpen ? (
                <View style={styles.sizeMenu}>
                  {PAPER_SIZE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.key}
                      onPress={() => {
                        setPaperSize(opt.key);
                        setSizeMenuOpen(false);
                      }}
                      style={styles.sizeMenuRow}
                    >
                      <Text
                        style={{
                          color: paperSize === opt.key ? ACCENT : theme.text,
                          fontWeight: paperSize === opt.key ? "800" : "600",
                          fontSize: 15,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function paperColorHexLocal(color: PaperColor): string {
  return PAPER_COLOR_OPTIONS.find((c) => c.key === color)?.hex ?? "#FFFFFF";
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#EEF1F4",
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    maxHeight: "92%",
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
    gap: 12,
  },
  preserveHint: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 17,
    paddingHorizontal: 4,
    marginTop: -4,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    fontStyle: "italic",
    letterSpacing: -0.2,
  },
  checkBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(148,163,184,0.28)",
    borderRadius: 12,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabOn: { backgroundColor: "#FFFFFF" },
  tabText: { fontSize: 13, fontWeight: "700", color: "#64748B" },
  tabTextOn: { color: "#0F172A" },
  styleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  colorSq: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  styleSpacer: { width: 6 },
  styleCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  styleCircleOn: { borderColor: ACCENT, borderWidth: 2 },
  styleCircleFill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: "hidden",
  },
  miniLine: {
    position: "absolute",
    left: 3,
    right: 3,
    top: 6,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(99,122,180,0.55)",
  },
  orientGroup: {
    marginLeft: "auto",
    flexDirection: "row",
    backgroundColor: "rgba(148,163,184,0.25)",
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  orientBtn: {
    width: 34,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  orientBtnOn: { backgroundColor: "#FFFFFF" },
  orientPort: {
    width: 12,
    height: 16,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: "#64748B",
  },
  orientLand: {
    width: 16,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: "#64748B",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    paddingVertical: 4,
    paddingBottom: 8,
  },
  cell: { width: "30%", minWidth: 96, flexGrow: 1, maxWidth: "32%", gap: 6 },
  thumbFrame: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  cellLabel: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  favBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyFav: {
    width: "100%",
    textAlign: "center",
    color: "#94A3B8",
    fontWeight: "600",
    paddingVertical: 28,
  },
  moreFrame: { alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  moreCollage: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8 },
  moreTile: {
    width: 48,
    height: 64,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
  },
  sizeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sizeLabel: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  sizeValue: { flexDirection: "row", alignItems: "center", gap: 4 },
  sizeValueText: { fontSize: 16, fontWeight: "700", color: ACCENT },
  sizeMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: -4,
  },
  sizeMenuRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(15,23,42,0.06)",
  },
});
