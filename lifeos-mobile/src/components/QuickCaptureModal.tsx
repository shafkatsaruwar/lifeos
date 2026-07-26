import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import { uid } from "../lib/helpers";

// Mirrors web's CaptureModal ("Quick capture Fn B"): appends a raw string to
// the users/{userId}/brain array. Voice dictation on web uses the browser
// SpeechRecognition API; on mobile we rely on the OS keyboard's built-in
// dictation (mic button on the native keyboard) instead of reimplementing
// speech recognition, which keeps this dependency-free.
export function QuickCaptureModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, workspace, updateBrain, updateSettings } = useLifeOS();
  const [text, setText] = useState("");

  const capture = () => {
    const clean = text.trim();
    if (!clean) return;
    updateBrain([clean, ...workspace.brain]);
    const momentumLog = [{ id: uid(), at: new Date().toISOString(), type: "capture" as const, title: clean.slice(0, 80) }, ...(workspace.settings.momentumLog ?? [])].slice(0, 50);
    updateSettings({ ...workspace.settings, momentumLog });
    setText("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.avoidWrap}>
          <Pressable onPress={(e) => e.stopPropagation()} style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.head}>
              <View style={[styles.dot, { backgroundColor: theme.soft }]}>
                <Feather name="zap" size={16} color={theme.accent} />
              </View>
              <View style={styles.grow}>
                <Text style={[styles.title, { color: theme.text }]}>Quick capture</Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>Send it to your Brain inbox</Text>
              </View>
              <Pressable onPress={onClose}><Feather name="x" size={20} color={theme.muted} /></Pressable>
            </View>
            <TextInput
              autoFocus
              multiline
              value={text}
              onChangeText={setText}
              placeholder="What’s on your mind?"
              placeholderTextColor={theme.muted}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
            />
            <View style={styles.footerRow}>
              <Text style={[styles.footerHint, { color: theme.muted }]}>Organize it later. Just get it out.</Text>
              <Pressable
                disabled={!text.trim()}
                onPress={capture}
                style={[styles.captureButton, { backgroundColor: theme.text, opacity: text.trim() ? 1 : 0.4 }]}
              >
                <Text style={[styles.captureText, { color: theme.surface }]}>Capture</Text>
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
  input: { minHeight: 120, borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 16, textAlignVertical: "top" },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  footerHint: { fontSize: 12, flex: 1 },
  captureButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  captureText: { fontWeight: "800", fontSize: 14 },
});
