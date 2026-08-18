import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import { uid } from "../lib/helpers";
import { stopDictation } from "../lib/speechRecognition";
import { VoiceDumpField } from "./VoiceDumpField";

export function QuickCaptureModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, workspace, updateBrain, updateSettings } = useLifeOS();
  const [text, setText] = useState("");

  const close = () => {
    stopDictation();
    setText("");
    onClose();
  };

  const capture = () => {
    const clean = text.trim();
    if (!clean) return;
    updateBrain([clean, ...workspace.brain]);
    const momentumLog = [
      { id: uid(), at: new Date().toISOString(), type: "capture" as const, title: clean.slice(0, 80) },
      ...(workspace.settings.momentumLog ?? []),
    ].slice(0, 50);
    updateSettings({ ...workspace.settings, momentumLog });
    setText("");
    stopDictation();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.avoidWrap}>
          <Pressable onPress={(e) => e.stopPropagation()} style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.head}>
              <View style={[styles.dot, { backgroundColor: theme.soft }]}>
                <Feather name="mic" size={16} color={theme.accent} />
              </View>
              <View style={styles.grow}>
                <Text style={[styles.title, { color: theme.text }]}>Dump it</Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>Send it to MindDump. Sort later.</Text>
              </View>
              <Pressable accessibilityLabel="Close" onPress={close} hitSlop={8}>
                <Feather name="x" size={20} color={theme.muted} />
              </Pressable>
            </View>
            {visible ? (
              <VoiceDumpField
                autoFocus
                value={text}
                onChangeText={setText}
                placeholder="What’s on your mind?"
                minHeight={140}
              />
            ) : null}
            <View style={styles.footerRow}>
              <Text style={[styles.footerHint, { color: theme.muted }]}>Blab it out. Type if that’s faster.</Text>
              <Pressable
                disabled={!text.trim()}
                onPress={capture}
                style={[styles.captureButton, { backgroundColor: theme.text, opacity: text.trim() ? 1 : 0.4 }]}
              >
                <Text style={[styles.captureText, { color: theme.surface }]}>Dump</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  avoidWrap: { width: "100%" },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1 },
  title: { fontSize: 17, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  footerHint: { fontSize: 12, flex: 1 },
  captureButton: { paddingHorizontal: 20, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  captureText: { fontWeight: "800", fontSize: 14 },
});
