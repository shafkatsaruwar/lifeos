import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { clearInk, HandwritingCanvas, undoInk, type InkTool } from "../components/HandwritingCanvas";
import { Page, SegmentedControl } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import type { NoteInk, NoteTemplate } from "../types";

// Web renders templates as contentEditable HTML transforms (ruled/dotted
// background images, a two-column Cornell layout, a structured meeting
// outline). React Native has no equivalent to contentEditable, so mobile
// keeps the same five template *identities* but implements them as either a
// styled background treatment behind a plain multiline TextInput (blank /
// lined / dotted) or a lightweight structured multi-field form (cornell /
// meeting) that concatenates back into a single `body` string using the
// same section markers web uses when exporting, so notes stay readable on
// both clients.
const TEMPLATES: { key: NoteTemplate; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "blank", label: "Blank", icon: "file" },
  { key: "lined", label: "Lined", icon: "align-justify" },
  { key: "dotted", label: "Dotted", icon: "grid" },
  { key: "cornell", label: "Cornell", icon: "columns" },
  { key: "meeting", label: "Meeting", icon: "users" },
];

type EditorMode = "type" | "draw";

const PEN_COLORS = ["#0F172A", "#2563EB", "#DC2626", "#16A34A", "#7C3AED"] as const;
const WIDTHS: Record<InkTool, number[]> = {
  pen: [2, 3.5, 6],
  highlighter: [12, 18, 24],
  eraser: [16, 28, 40],
};

export function NoteEditorScreen() {
  const { theme, workspace, updateNotes } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const noteId = route.params?.noteId as string;
  const note = workspace.notes.find((n) => n.id === noteId);

  const [mode, setMode] = useState<EditorMode>(() => ((note?.ink?.strokes?.length ?? 0) > 0 ? "draw" : "type"));
  const [tool, setTool] = useState<InkTool>("pen");
  const [color, setColor] = useState<string>(PEN_COLORS[0]);
  const [widthIndex, setWidthIndex] = useState(1);

  const strokeWidth = useMemo(() => WIDTHS[tool][widthIndex] ?? WIDTHS[tool][1], [tool, widthIndex]);

  if (!note) {
    return (
      <Page>
        <View style={styles.missing}><Text style={{ color: theme.muted }}>Note not found.</Text></View>
      </Page>
    );
  }

  const persist = (patch: Partial<typeof note>) =>
    updateNotes(workspace.notes.map((n) => (n.id === noteId ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)));

  const deleteNote = () => {
    Alert.alert("Delete note", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { updateNotes(workspace.notes.filter((n) => n.id !== noteId)); navigation.goBack(); } },
    ]);
  };

  const applyTemplate = (template: NoteTemplate) => {
    if (template === "cornell" && note.template !== "cornell") {
      persist({ template, body: note.body || "CUES:\n\n---\nNOTES:\n\n---\nSUMMARY:\n" });
    } else if (template === "meeting" && note.template !== "meeting") {
      persist({ template, body: note.body || "ATTENDEES:\n\nAGENDA:\n\nNOTES:\n\nACTION ITEMS:\n" });
    } else {
      persist({ template });
    }
  };

  const onInkChange = (ink: NoteInk) => persist({ ink });

  const paperStyle = paperStyleFor(note.template ?? "blank", theme);
  const paperBg = mode === "draw" ? "#FFFFFF" : (paperStyle.backgroundColor as string);

  return (
    <Page edges={["top", "bottom"]}>
      <View style={styles.headRow}>
        <Pressable accessibilityLabel="Back to notes" accessibilityRole="button" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Feather name="chevron-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.heading}>
          <TextInput
            value={note.title}
            onChangeText={(v) => persist({ title: v })}
            accessibilityLabel="Note title"
            placeholder="Untitled note"
            placeholderTextColor={theme.muted}
            style={[styles.titleInput, { color: theme.text }]}
          />
          <Text style={[styles.spaceLabel, { color: theme.muted }]} numberOfLines={1}>{note.projectName || "Unfiled"}</Text>
        </View>
        <Pressable accessibilityLabel="Delete note" accessibilityRole="button" onPress={deleteNote} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Feather name="trash-2" size={18} color={theme.danger} />
        </Pressable>
      </View>

      <View style={styles.modeRow}>
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { key: "type", label: "Type", icon: "type" },
            { key: "draw", label: "Draw", icon: "edit-3" },
          ]}
        />
      </View>

      {mode === "type" ? (
        <View style={styles.templateRow}>
          <SegmentedControl value={note.template ?? "blank"} onChange={applyTemplate} options={TEMPLATES.map((t) => ({ key: t.key, label: t.label, icon: t.icon }))} />
        </View>
      ) : (
        <View style={styles.inkToolbar}>
          <View style={styles.toolRow}>
            {([
              { key: "pen" as const, icon: "edit-2" as const, label: "Pen" },
              { key: "highlighter" as const, icon: "minus" as const, label: "Highlight" },
              { key: "eraser" as const, icon: "slash" as const, label: "Eraser" },
            ]).map((item) => {
              const active = tool === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityLabel={item.label}
                  accessibilityRole="button"
                  onPress={() => {
                    setTool(item.key);
                    setWidthIndex(1);
                  }}
                  style={[styles.toolChip, { borderColor: theme.border, backgroundColor: active ? theme.text : theme.surface }]}
                >
                  <Feather name={item.icon} size={14} color={active ? theme.surface : theme.muted} />
                  <Text style={{ color: active ? theme.surface : theme.muted, fontSize: 12, fontWeight: "700" }}>{item.label}</Text>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityLabel="Undo stroke"
              accessibilityRole="button"
              onPress={() => persist({ ink: undoInk(note.ink) })}
              style={[styles.toolIcon, { borderColor: theme.border, backgroundColor: theme.surface }]}
            >
              <Feather name="rotate-ccw" size={15} color={theme.text} />
            </Pressable>
            <Pressable
              accessibilityLabel="Clear drawing"
              accessibilityRole="button"
              onPress={() => {
                Alert.alert("Clear drawing?", "Removes all handwriting on this note.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear", style: "destructive", onPress: () => persist({ ink: clearInk() }) },
                ]);
              }}
              style={[styles.toolIcon, { borderColor: theme.border, backgroundColor: theme.surface }]}
            >
              <Feather name="trash" size={15} color={theme.danger} />
            </Pressable>
          </View>
          {tool !== "eraser" ? (
            <View style={styles.colorRow}>
              {PEN_COLORS.map((c) => (
                <Pressable
                  key={c}
                  accessibilityLabel={`Color ${c}`}
                  onPress={() => setColor(c)}
                  style={[styles.swatch, { backgroundColor: c, borderColor: color === c ? theme.accent : "transparent" }]}
                />
              ))}
              <Pressable
                accessibilityLabel="Stroke width"
                onPress={() => setWidthIndex((i) => (i + 1) % WIDTHS[tool].length)}
                style={[styles.widthChip, { borderColor: theme.border, backgroundColor: theme.surface }]}
              >
                <View style={{ width: 22, height: strokeWidth, borderRadius: 99, backgroundColor: tool === "highlighter" ? `${color}99` : color }} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.colorRow}>
              <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "600", flex: 1 }}>Eraser paints over ink</Text>
              <Pressable
                accessibilityLabel="Eraser size"
                onPress={() => setWidthIndex((i) => (i + 1) % WIDTHS.eraser.length)}
                style={[styles.widthChip, { borderColor: theme.border, backgroundColor: theme.surface }]}
              >
                <View style={{ width: 22, height: Math.min(strokeWidth / 2, 14), borderRadius: 99, backgroundColor: theme.muted }} />
              </Pressable>
            </View>
          )}
        </View>
      )}

      {mode === "type" ? (
        <ScrollView contentContainerStyle={styles.body} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" style={styles.grow}>
          <View style={[styles.paper, paperStyle]}>
            <TextInput
              value={note.body}
              onChangeText={(v) => persist({ body: v })}
              accessibilityLabel="Note body"
              multiline
              placeholder={placeholderFor(note.template ?? "blank")}
              placeholderTextColor={theme.muted}
              style={[styles.bodyInput, { color: theme.text }]}
            />
          </View>
        </ScrollView>
      ) : (
        <View style={styles.drawPane}>
          <HandwritingCanvas
            ink={note.ink}
            tool={tool}
            color={color}
            width={strokeWidth}
            onChange={onInkChange}
            backgroundColor={paperBg}
          />
          <Text style={[styles.drawHint, { color: theme.muted }]}>
            Apple Pencil or finger · ink saves with the note
          </Text>
        </View>
      )}
    </Page>
  );
}

function placeholderFor(template: NoteTemplate) {
  if (template === "cornell") return "CUES:\n\n---\nNOTES:\n\n---\nSUMMARY:";
  if (template === "meeting") return "ATTENDEES:\n\nAGENDA:\n\nNOTES:\n\nACTION ITEMS:";
  return "Start writing…";
}

function paperStyleFor(template: NoteTemplate, theme: any) {
  if (template === "lined") {
    return { backgroundColor: theme.surface, borderColor: theme.border };
  }
  if (template === "dotted") {
    return { backgroundColor: theme.surface, borderColor: theme.border, borderStyle: "dashed" as const };
  }
  if (template === "cornell" || template === "meeting") {
    return { backgroundColor: theme.soft, borderColor: theme.accent };
  }
  return { backgroundColor: theme.surface, borderColor: theme.border };
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
  headRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingTop: 2, paddingBottom: 8, gap: 8 },
  heading: { flex: 1, minWidth: 0 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.55 },
  modeRow: { paddingHorizontal: 16, paddingBottom: 8 },
  templateRow: { paddingHorizontal: 16, paddingBottom: 10 },
  inkToolbar: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  toolRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  toolChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  toolIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  colorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  widthChip: { marginLeft: "auto", minWidth: 44, height: 36, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1 },
  body: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 96 },
  titleInput: { fontSize: 20, lineHeight: 25, fontWeight: "700", paddingVertical: 0 },
  spaceLabel: { fontSize: 12, lineHeight: 16, fontWeight: "700", marginTop: 1 },
  paper: { flex: 1, minHeight: 360, borderWidth: 1, borderRadius: 14, padding: 16 },
  bodyInput: { flex: 1, minHeight: 328, fontSize: 15, lineHeight: 24, textAlignVertical: "top" },
  drawPane: { flex: 1, paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  drawHint: { fontSize: 11, fontWeight: "600", textAlign: "center" },
});
