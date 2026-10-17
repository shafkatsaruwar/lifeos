import { useEffect, useMemo, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotebookCoverFace } from "./NotebookCoverFace";
import { ActionButton } from "./UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { NOTEBOOK_COLORS, NOTEBOOK_COVERS } from "../lib/notebooks";
import type { Notebook, NotebookCoverStyle } from "../types";

export type EditNotebookResult = {
  name: string;
  color: string;
  cover: NotebookCoverStyle;
};

type Props = {
  visible: boolean;
  notebook: Notebook | null;
  /** When true, jump straight to the cover/color picker (Change Cover). */
  focusCover?: boolean;
  onClose: () => void;
  onSave: (result: EditNotebookResult) => void;
};

/**
 * Rename + restyle an existing notebook (Noteshelf “Change Cover” / Rename).
 */
export function EditNotebookModal({ visible, notebook, focusCover = false, onClose, onSave }: Props) {
  const { theme } = useLifeOS();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(NOTEBOOK_COLORS[0]);
  const [cover, setCover] = useState<NotebookCoverStyle>("solid");

  useEffect(() => {
    if (!visible || !notebook) return;
    setName(notebook.name);
    setColor(notebook.color || NOTEBOOK_COLORS[0]);
    setCover(notebook.cover ?? "solid");
  }, [visible, notebook]);

  const coverLabel = useMemo(
    () => NOTEBOOK_COVERS.find((c) => c.key === cover)?.label ?? "Simple",
    [cover],
  );

  const cardW = Math.min(520, winW - 40);
  const coverCols = 3;
  const coverGap = 10;
  const coverCell = (cardW - 36 - coverGap * (coverCols - 1)) / coverCols;
  const coverH = coverCell * 1.25;

  const close = () => onClose();

  const submit = () => {
    onSave({
      name: name.trim() || notebook?.name || "Untitled note",
      color,
      cover,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, width: cardW }]}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: theme.text }]}>
              {focusCover ? "Change cover" : "Edit notebook"}
            </Text>
            <Pressable onPress={close} hitSlop={12}>
              <Text style={{ color: theme.muted, fontWeight: "700" }}>Cancel</Text>
            </Pressable>
          </View>

          <View style={[styles.preview, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <NotebookCoverFace
              color={color}
              cover={cover}
              title={name.trim() || "Untitled note"}
              subtitle={coverLabel}
              width={118}
              height={148}
              showTitle
              borderColor={theme.border}
            />
            <View style={styles.previewCopy}>
              <Text style={[styles.previewName, { color: theme.text }]} numberOfLines={2}>
                {name.trim() || "Untitled note"}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "600" }}>{coverLabel}</Text>
            </View>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {!focusCover ? (
              <View style={styles.block}>
                <Text style={[styles.label, { color: theme.muted }]}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Untitled note"
                  placeholderTextColor={theme.muted}
                  autoFocus={!focusCover}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                />
              </View>
            ) : null}

            <View style={styles.block}>
              <Text style={[styles.label, { color: theme.muted }]}>Cover style</Text>
              <View style={[styles.grid, { gap: coverGap }]}>
                {NOTEBOOK_COVERS.map((opt) => {
                  const on = cover === opt.key;
                  return (
                    <Pressable key={opt.key} onPress={() => setCover(opt.key)} style={{ width: coverCell }}>
                      <View
                        style={[
                          styles.pickRing,
                          {
                            borderColor: on ? theme.accent : "transparent",
                            backgroundColor: on ? theme.soft : "transparent",
                          },
                        ]}
                      >
                        <NotebookCoverFace
                          color={color}
                          cover={opt.key}
                          width={coverCell - 10}
                          height={coverH - 10}
                          borderColor={theme.border}
                        />
                      </View>
                      <Text style={[styles.pickLabel, { color: on ? theme.accent : theme.text }]} numberOfLines={1}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: theme.muted, marginTop: 12 }]}>Accent color</Text>
              <View style={styles.swatches}>
                {NOTEBOOK_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[
                      styles.swatch,
                      { backgroundColor: c, borderColor: color === c ? theme.text : "transparent" },
                    ]}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <ActionButton label="Save" onPress={submit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "center", paddingHorizontal: 20 },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 12,
    alignSelf: "center",
    maxHeight: "92%",
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  preview: {
    flexDirection: "row",
    gap: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    alignItems: "center",
  },
  previewCopy: { flex: 1, gap: 6 },
  previewName: { fontSize: 17, fontWeight: "800" },
  body: { flexGrow: 0, maxHeight: 360 },
  block: { gap: 8, paddingBottom: 8 },
  label: { fontSize: 12, fontWeight: "800", letterSpacing: 0.2 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  pickRing: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  pickLabel: { marginTop: 6, fontSize: 11, fontWeight: "700", textAlign: "center" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  footer: { flexDirection: "row", gap: 10, alignItems: "center" },
});
