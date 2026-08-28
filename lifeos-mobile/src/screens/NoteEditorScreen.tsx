import Feather from "@expo/vector-icons/Feather";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  HandwritingCanvas,
  isPencilKitAvailable,
  type PencilKitViewRef,
} from "../components/HandwritingCanvas";
import { Page, SegmentedControl } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";
import { htmlToPlainText } from "../lib/helpers";
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

function noteHasInk(ink: NoteInk | undefined) {
  if (!ink) return false;
  if (ink.format === "pencilkit" && ink.data) return true;
  if (ink.pencilKitData) return true;
  if (ink.data && !ink.strokes?.length) return true;
  return (ink.strokes?.length ?? 0) > 0;
}

export function NoteEditorScreen() {
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const { theme, workspace, updateNotes } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const noteId = route.params?.noteId as string;
  const note = workspace.notes.find((n) => n.id === noteId);
  const pencilRef = useRef<PencilKitViewRef | null>(null);

  const [mode, setMode] = useState<EditorMode>(() => (noteHasInk(note?.ink) ? "draw" : "type"));

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
  const pencilReady = isPencilKitAvailable();
  const plainBody = htmlToPlainText(note.body || "");

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
          <Text style={[styles.spaceLabel, { color: theme.muted }]} numberOfLines={1}>{note.projectName || "Personal"}</Text>
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
      ) : pencilReady ? (
        <View style={styles.inkToolbar}>
          <Text style={[styles.toolHint, { color: theme.muted }]}>
            Uses Apple PencilKit — pens, pencil, marker, eraser from the system tool picker
          </Text>
          <View style={styles.toolRow}>
            <Pressable
              accessibilityLabel="Undo stroke"
              accessibilityRole="button"
              onPress={() => void pencilRef.current?.undo()}
              style={[styles.toolIcon, { borderColor: theme.border, backgroundColor: theme.surface }]}
            >
              <Feather name="rotate-ccw" size={15} color={theme.text} />
            </Pressable>
            <Pressable
              accessibilityLabel="Redo stroke"
              accessibilityRole="button"
              onPress={() => void pencilRef.current?.redo()}
              style={[styles.toolIcon, { borderColor: theme.border, backgroundColor: theme.surface }]}
            >
              <Feather name="rotate-cw" size={15} color={theme.text} />
            </Pressable>
            <Pressable
              accessibilityLabel="Clear drawing"
              accessibilityRole="button"
              onPress={() => {
                Alert.alert("Clear drawing?", "Removes all handwriting on this note.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: () => {
                      void pencilRef.current?.clearDrawing();
                      persist({ ink: { version: 2, format: "pencilkit", data: "", updatedAt: Date.now() } });
                    },
                  },
                ]);
              }}
              style={[styles.toolIcon, { borderColor: theme.border, backgroundColor: theme.surface }]}
            >
              <Feather name="trash" size={15} color={theme.danger} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {mode === "type" ? (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabBarPad }]} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" style={styles.grow}>
          <View style={[styles.paper, paperStyle]}>
            <TextInput
              value={plainBody}
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
          <HandwritingCanvas ref={pencilRef} ink={note.ink} onChange={onInkChange} backgroundColor="#FFFFFF" />
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
  toolHint: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  toolRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  toolIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1 },
  body: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 96 },
  titleInput: { fontSize: 20, lineHeight: 25, fontWeight: "700", paddingVertical: 0 },
  spaceLabel: { fontSize: 12, lineHeight: 16, fontWeight: "700", marginTop: 1 },
  paper: { flex: 1, minHeight: 360, borderWidth: 1, borderRadius: 14, padding: 16 },
  bodyInput: { flex: 1, minHeight: 328, fontSize: 15, lineHeight: 24, textAlignVertical: "top" },
  drawPane: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
});
