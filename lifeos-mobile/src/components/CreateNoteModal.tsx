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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotebookCoverFace } from "./NotebookCoverFace";
import { PaperThumb } from "./PaperBackground";
import { ActionButton } from "./UI";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  NOTEBOOK_COLORS,
  NOTEBOOK_COVERS,
  PAGE_TEMPLATES,
  type PageTemplate,
} from "../lib/notebooks";
import type { NotebookCoverStyle } from "../types";

export type CreateNoteResult = {
  name: string;
  color: string;
  cover: NotebookCoverStyle;
  template: PageTemplate;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (result: CreateNoteResult) => void;
};

/**
 * Create flow: name → cover (visual) → starting page template (visual).
 */
export function CreateNoteModal({ visible, onClose, onCreate }: Props) {
  const { theme } = useLifeOS();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(NOTEBOOK_COLORS[0]);
  const [cover, setCover] = useState<NotebookCoverStyle>("solid");
  const [templateId, setTemplateId] = useState("ruled");

  const template = useMemo(
    () => PAGE_TEMPLATES.find((t) => t.id === templateId) ?? PAGE_TEMPLATES[1],
    [templateId],
  );
  const coverLabel = useMemo(
    () => NOTEBOOK_COVERS.find((c) => c.key === cover)?.label ?? "Simple",
    [cover],
  );

  const cardW = Math.min(520, winW - 40);
  const coverCols = 3;
  const coverGap = 10;
  const coverCell = (cardW - 36 - coverGap * (coverCols - 1)) / coverCols;
  const coverH = coverCell * 1.25;
  const pageCols = 3;
  const pageCell = (cardW - 36 - coverGap * (pageCols - 1)) / pageCols;

  const reset = () => {
    setStep(0);
    setName("");
    setColor(NOTEBOOK_COLORS[0]);
    setCover("solid");
    setTemplateId("ruled");
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    onCreate({
      name: name.trim() || "Untitled note",
      color,
      cover,
      template,
    });
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, width: cardW }]}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: theme.text }]}>Create new note</Text>
            <Pressable onPress={close} hitSlop={12}>
              <Text style={{ color: theme.muted, fontWeight: "700" }}>Cancel</Text>
            </Pressable>
          </View>

          <View style={styles.steps}>
            {["Name", "Cover", "Page"].map((label, i) => (
              <Pressable
                key={label}
                onPress={() => setStep(i)}
                style={[
                  styles.stepChip,
                  {
                    backgroundColor: i === step ? theme.soft : theme.bg,
                    borderColor: i === step ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text style={{ color: i === step ? theme.accent : theme.muted, fontWeight: "800", fontSize: 11 }}>
                  {label}
                </Text>
              </Pressable>
            ))}
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
            <View style={styles.pagePreview}>
              <PaperThumb paper={template.paper} color={color} />
              <Text style={[styles.pagePreviewLabel, { color: theme.muted }]} numberOfLines={1}>
                {template.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.templateHint, { color: theme.muted }]}>
            Start with this template, change it whenever you want.
          </Text>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {step === 0 ? (
              <View style={styles.block}>
                <Text style={[styles.label, { color: theme.muted }]}>Note name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Untitled note"
                  placeholderTextColor={theme.muted}
                  autoFocus
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                />
              </View>
            ) : null}

            {step === 1 ? (
              <View style={styles.block}>
                <Text style={[styles.label, { color: theme.muted }]}>Cover style</Text>
                <View style={[styles.grid, { gap: coverGap }]}>
                  {NOTEBOOK_COVERS.map((opt) => {
                    const on = cover === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => setCover(opt.key)}
                        style={{ width: coverCell }}
                      >
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
                        <Text
                          style={[styles.pickLabel, { color: on ? theme.accent : theme.text }]}
                          numberOfLines={1}
                        >
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
            ) : null}

            {step === 2 ? (
              <View style={styles.block}>
                <Text style={[styles.label, { color: theme.muted }]}>Starting page</Text>
                <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>
                  Page 1 only. Change any page later without losing your writing.
                </Text>
                <View style={[styles.grid, { gap: coverGap }]}>
                  {PAGE_TEMPLATES.map((tpl) => {
                    const on = templateId === tpl.id;
                    return (
                      <Pressable
                        key={tpl.id}
                        onPress={() => setTemplateId(tpl.id)}
                        style={{ width: pageCell }}
                      >
                        <View
                          style={[
                            styles.pagePick,
                            {
                              borderColor: on ? theme.accent : theme.border,
                              backgroundColor: on ? theme.soft : theme.bg,
                            },
                          ]}
                        >
                          <View style={styles.pageThumbWrap}>
                            <PaperThumb paper={tpl.paper} color={color} />
                          </View>
                        </View>
                        <Text
                          style={[styles.pickLabel, { color: on ? theme.accent : theme.text }]}
                          numberOfLines={1}
                        >
                          {tpl.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {step > 0 ? (
              <ActionButton label="Back" quiet onPress={() => setStep((s) => s - 1)} />
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {step < 2 ? (
              <ActionButton label="Continue" onPress={() => setStep((s) => s + 1)} />
            ) : (
              <ActionButton label="Create note" onPress={submit} />
            )}
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
  steps: { flexDirection: "row", gap: 8 },
  stepChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  preview: {
    flexDirection: "row",
    gap: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    alignItems: "center",
  },
  pagePreview: { width: 100, gap: 6 },
  pagePreviewLabel: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  templateHint: { fontSize: 12, fontWeight: "600", lineHeight: 17, marginTop: -4 },
  body: { flexGrow: 0, maxHeight: 320 },
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
  pagePick: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 6,
    overflow: "hidden",
  },
  pageThumbWrap: { borderRadius: 8, overflow: "hidden" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  footer: { flexDirection: "row", gap: 10, alignItems: "center" },
});
