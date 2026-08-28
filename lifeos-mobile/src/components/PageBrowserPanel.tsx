import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import { useLayout } from "../lib/layout";
import { pageAspectFor } from "../lib/notebooks";
import type { NotebookPage } from "../types";
import { PaperBackground } from "./PaperBackground";

type Props = {
  visible: boolean;
  onClose: () => void;
  notebookName: string;
  pages: NotebookPage[];
  currentPageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
};

export function PageBrowserPanel({
  visible,
  onClose,
  notebookName,
  pages,
  currentPageId,
  onSelectPage,
  onAddPage,
}: Props) {
  const { theme } = useLifeOS();
  const { isWide } = useLayout();
  const { width: winW } = useWindowDimensions();
  const [query, setQuery] = useState("");

  const panelWidth = isWide ? Math.min(240, Math.round(winW * 0.28)) : Math.min(winW - 48, 320);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => {
      const title = p.title?.trim().toLowerCase() ?? "";
      const num = String(p.index + 1);
      return title.includes(q) || num.includes(q);
    });
  }, [pages, query]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <View
          style={[
            styles.panel,
            {
              width: panelWidth,
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={[styles.head, { borderBottomColor: theme.border }]}>
            <Pressable accessibilityLabel="Close pages" onPress={onClose} style={styles.headBtn}>
              <Feather name="chevron-left" size={20} color={theme.text} />
            </Pressable>
            <Text style={[styles.headTitle, { color: theme.text }]} numberOfLines={1}>
              {notebookName || "Note"}
            </Text>
            <Pressable accessibilityLabel="Hide pages" onPress={onClose} style={styles.headBtn}>
              <Feather name="x" size={18} color={theme.muted} />
            </Pressable>
          </View>

          <View style={[styles.searchRow, { borderBottomColor: theme.border }]}>
            <Feather name="search" size={15} color={theme.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search pages"
              placeholderTextColor={theme.muted}
              style={[styles.searchInput, { color: theme.text }]}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          </View>

          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator>
            {filtered.map((p) => {
              const active = p.id === currentPageId;
              const landscape = (p.paperOrientation ?? "portrait") === "landscape";
              const aspect = pageAspectFor(p.paperOrientation, p.paperSize);
              const thumbW = landscape ? 132 : 96;
              const thumbH = Math.round(thumbW / aspect);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    onSelectPage(p.id);
                    onClose();
                  }}
                  style={[
                    styles.row,
                    active && { backgroundColor: theme.soft },
                  ]}
                >
                  <View
                    style={[
                      styles.thumb,
                      {
                        width: thumbW,
                        height: thumbH,
                        borderColor: active ? theme.accent : theme.border,
                        backgroundColor: theme.bg,
                      },
                    ]}
                  >
                    <View style={StyleSheet.absoluteFillObject}>
                      <PaperBackground paper={p.paper ?? "ruled"} paperColor={p.paperColor} />
                    </View>
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                      {p.title?.trim() || `Page ${p.index + 1}`}
                    </Text>
                    <Text style={[styles.rowSub, { color: theme.muted }]}>{p.index + 1}</Text>
                  </View>
                  <Feather name="chevron-down" size={14} color={theme.muted} style={{ opacity: 0.35 }} />
                </Pressable>
              );
            })}
            {filtered.length === 0 ? (
              <Text style={[styles.empty, { color: theme.muted }]}>No matching pages</Text>
            ) : null}
          </ScrollView>

          <Pressable
            accessibilityLabel="Add page"
            onPress={() => {
              onAddPage();
              onClose();
            }}
            style={[styles.addRow, { borderTopColor: theme.border }]}
          >
            <Feather name="plus" size={16} color={theme.accent} />
            <Text style={[styles.addText, { color: theme.accent }]}>Add page</Text>
          </Pressable>
        </View>

        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Hide pages" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.22)" },
  panel: {
    borderRightWidth: StyleSheet.hairlineWidth,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headTitle: { flex: 1, fontSize: 15, fontWeight: "800" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "600", paddingVertical: 4 },
  list: { paddingVertical: 8, paddingBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 56,
  },
  thumb: {
    borderRadius: 8,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  rowMeta: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 13, fontWeight: "700" },
  rowSub: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  empty: { textAlign: "center", paddingVertical: 24, fontSize: 13, fontWeight: "600" },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addText: { fontSize: 14, fontWeight: "800" },
});
