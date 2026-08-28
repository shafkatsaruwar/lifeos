import Feather from "@expo/vector-icons/Feather";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionButton } from "./UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { captureLiveProofImage } from "../lib/focusEnforcer/camera";
import { verifyFocusProof } from "../lib/focusEnforcer/verify";
import type { FocusProofPhase, FocusProofResult } from "../lib/focusEnforcer/shared";

type Props = {
  visible: boolean;
  taskTitle: string;
  phase: FocusProofPhase;
  onResult: (proof: FocusProofResult) => void;
  onClose: () => void;
};

const PHASE_COPY: Record<FocusProofPhase, { title: string; body: string }> = {
  start: {
    title: "Prove you're starting",
    body: "Take a live photo that shows you're set up on this task.",
  },
  check: {
    title: "Focus check",
    body: "Take a live photo that shows you're still on the task.",
  },
  complete: {
    title: "Prove you finished",
    body: "Take a live photo that shows evidence you completed the work.",
  },
};

export function FocusProofModal({ visible, taskTitle, phase, onResult, onClose }: Props) {
  const { theme } = useLifeOS();
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const emit = useCallback(
    (partial: Omit<FocusProofResult, "at" | "proofType" | "phase">) => {
      onResult({
        ...partial,
        at: new Date().toISOString(),
        proofType: "live_camera",
        phase,
      });
    },
    [onResult, phase],
  );

  const captureAndVerify = async () => {
    if (busy) return;
    setBusy(true);
    setStatusText("Opening camera…");
    try {
      const shot = await captureLiveProofImage();
      if (!shot) {
        setStatusText(null);
        return;
      }
      setStatusText("Verifying…");
      // Never log base64 — pass through verify only.
      const verified = await verifyFocusProof({
        taskTitle,
        phase,
        mimeType: shot.mimeType,
        imageBase64: shot.base64,
      });
      emit({
        match: verified.match,
        confidence: verified.confidence,
        reason: verified.reason,
        manualOverride: false,
      });
      setStatusText(null);
    } catch (error) {
      const message =
        error instanceof Error && error.message === "PROOF_TOO_LARGE"
          ? "Photo is too large. Try again closer / with less detail, or use manual override."
          : error instanceof Error
            ? error.message
            : "Could not capture proof.";
      Alert.alert("Focus proof", message);
      setStatusText(null);
    } finally {
      setBusy(false);
    }
  };

  const override = () => {
    if (busy) return;
    emit({
      match: true,
      confidence: 0,
      reason: "Manual override — you confirmed you're on task.",
      manualOverride: true,
    });
  };

  const copy = PHASE_COPY[phase];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} disabled={busy} accessibilityLabel="Close">
            <Feather name="x" size={22} color={theme.muted} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Live proof</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.body}>
          <Text style={[styles.title, { color: theme.text }]}>{copy.title}</Text>
          <Text style={[styles.task, { color: theme.accent }]} numberOfLines={2}>
            {taskTitle}
          </Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{copy.body}</Text>

          {busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={theme.accent} />
              <Text style={{ color: theme.muted, fontWeight: "600" }}>{statusText || "Working…"}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <ActionButton
              label="Take live photo"
              icon="camera"
              onPress={() => void captureAndVerify()}
              disabled={busy}
            />
            <ActionButton
              label="Manual override"
              icon="check-circle"
              quiet
              onPress={override}
              disabled={busy}
            />
            <ActionButton label="Cancel" quiet onPress={onClose} disabled={busy} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.8 },
  task: { fontSize: 16, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  busyRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  actions: { marginTop: 20, gap: 10 },
});
