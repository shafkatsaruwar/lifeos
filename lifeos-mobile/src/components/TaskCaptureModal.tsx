import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import { stopDictation } from "../lib/speechRecognition";
import { VoiceDumpField } from "./VoiceDumpField";

export function TaskCaptureModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, options?: { minor?: boolean; openEditor?: boolean }) => void;
}) {
  const { theme } = useLifeOS();
  const [text, setText] = useState("");

  const close = () => {
    stopDictation();
    setText("");
    onClose();
  };

  const submit = (options?: { minor?: boolean; openEditor?: boolean }) => {
    const clean = text.trim();
    if (!clean && !options?.openEditor) return;
    onCreate(clean || "New task", options);
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
                <Feather name="check-square" size={16} color={theme.accent} />
              </View>
              <View style={styles.grow}>
                <Text style={[styles.title, { color: theme.text }]}>New task</Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>Speak it or type it. Same dump, into Tasks.</Text>
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
                placeholder="What needs to happen?"
                minHeight={110}
              />
            ) : null}
            <View style={styles.actions}>
              <Pressable
                onPress={() => submit({ minor: true })}
                disabled={!text.trim()}
                style={({ pressed }) => [
                  styles.secondary,
                  { borderColor: theme.border, opacity: !text.trim() ? 0.4 : pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.secondaryText, { color: theme.text }]}>Minor</Text>
              </Pressable>
              <Pressable
                onPress={() => submit({ openEditor: true })}
                style={({ pressed }) => [styles.secondary, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.secondaryText, { color: theme.text }]}>Details</Text>
              </Pressable>
              <Pressable
                disabled={!text.trim()}
                onPress={() => submit()}
                style={[styles.primary, { backgroundColor: theme.text, opacity: text.trim() ? 1 : 0.4 }]}
              >
                <Text style={[styles.primaryText, { color: theme.surface }]}>Add task</Text>
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
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  secondary: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontWeight: "800", fontSize: 13 },
  primary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontWeight: "800", fontSize: 14 },
});
