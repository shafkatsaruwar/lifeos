import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createDayMemory,
  getExpoAv,
  isAudioRecordingAvailable,
  persistMemoryAudio,
  upsertDayMemory,
} from "../lib/dayMemories";
import { useLifeOS } from "../lib/LifeOSContext";
import { toDateKey } from "../lib/helpers";
import { isSpeechRecognitionAvailable, stopDictation } from "../lib/speechRecognition";
import { ActionButton } from "./UI";
import { VoiceDumpField } from "./VoiceDumpField";

type Mode = "speak" | "tape";

export function RecordMemoryModal({
  visible,
  onClose,
  dayKey,
}: {
  visible: boolean;
  onClose: () => void;
  dayKey?: string;
}) {
  const { theme, workspace, updateSettings } = useLifeOS();
  const [transcript, setTranscript] = useState("");
  const [mode, setMode] = useState<Mode>("speak");
  const [taping, setTaping] = useState(false);
  const [tapeMs, setTapeMs] = useState(0);
  const [pendingAudioUri, setPendingAudioUri] = useState<string | null>(null);
  const [pendingDurationMs, setPendingDurationMs] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const recordingRef = useRef<{
    stopAndUnloadAsync: () => Promise<unknown>;
    getURI: () => string | null;
  } | null>(null);
  const tapeStartedAt = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetDay = dayKey ?? toDateKey(new Date());
  const canTape = isAudioRecordingAvailable();

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const stopTape = async (keepUri: boolean) => {
    clearTick();
    setTaping(false);
    const recording = recordingRef.current;
    recordingRef.current = null;
    const started = tapeStartedAt.current;
    tapeStartedAt.current = null;
    if (!recording) return null;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const durationMs = started != null ? Date.now() - started : undefined;
      if (keepUri && uri) {
        setPendingAudioUri(uri);
        setPendingDurationMs(durationMs);
        return { uri, durationMs };
      }
      return null;
    } catch {
      return null;
    }
  };

  const resetForm = () => {
    void stopTape(false);
    stopDictation();
    setTranscript("");
    setMode("speak");
    setTapeMs(0);
    setPendingAudioUri(null);
    setPendingDurationMs(undefined);
  };

  useEffect(() => {
    if (!visible) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    return () => {
      void stopTape(false);
      stopDictation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTape = async () => {
    const av = getExpoAv();
    if (!av) {
      Alert.alert(
        "Audio not in this build",
        "Speak mode still saves a transcript memory. Rebuild to keep the audio file.",
      );
      setMode("speak");
      return;
    }
    try {
      const permission = await av.Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Microphone needed", "Allow the mic to tape a voice memory.");
        return;
      }
      await av.Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new av.Audio.Recording();
      await recording.prepareToRecordAsync(av.Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      tapeStartedAt.current = Date.now();
      setPendingAudioUri(null);
      setPendingDurationMs(undefined);
      setTaping(true);
      setTapeMs(0);
      tickRef.current = setInterval(() => {
        if (tapeStartedAt.current) setTapeMs(Date.now() - tapeStartedAt.current);
      }, 250);
    } catch {
      Alert.alert("Couldn’t start tape", "Try Speak mode instead — it still saves to Day signals.");
      setMode("speak");
    }
  };

  const toggleTape = async () => {
    if (taping) {
      await stopTape(true);
      return;
    }
    await startTape();
  };

  const save = async () => {
    let audioUri = pendingAudioUri;
    let durationMs = pendingDurationMs;
    if (taping) {
      const result = await stopTape(true);
      audioUri = result?.uri ?? audioUri;
      durationMs = result?.durationMs ?? durationMs;
    }

    const text = transcript.trim();
    if (!text && !audioUri) {
      Alert.alert("Say or type something", "A memory needs a transcript (or a taped note).");
      return;
    }

    setSaving(true);
    try {
      const draft = createDayMemory({
        transcript: text || "Voice note",
        dayKey: targetDay,
        durationMs,
      });
      let localAudioUri: string | undefined;
      if (audioUri) {
        localAudioUri = (await persistMemoryAudio(audioUri, draft.id)) ?? undefined;
      }
      const memory = { ...draft, localAudioUri };
      await updateSettings({
        ...workspace.settings,
        dayMemories: upsertDayMemory(workspace.settings.dayMemories, memory),
      });
      resetForm();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Record a memory</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color={theme.muted} />
          </Pressable>
        </View>
        <Text style={[styles.sub, { color: theme.muted }]}>
          Speak what mattered. It shows as a memory dot on Day signals for {targetDay}.
        </Text>

        {Platform.OS === "ios" ? (
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => {
                void stopTape(false);
                setMode("speak");
              }}
              style={[
                styles.modeChip,
                {
                  borderColor: mode === "speak" ? theme.accent : theme.border,
                  backgroundColor: mode === "speak" ? theme.soft : theme.surface,
                },
              ]}
            >
              <Feather name="mic" size={14} color={mode === "speak" ? theme.accent : theme.muted} />
              <Text style={{ color: theme.text, fontWeight: "700", fontSize: 13 }}>Speak</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                stopDictation();
                setMode("tape");
              }}
              style={[
                styles.modeChip,
                {
                  borderColor: mode === "tape" ? theme.accent : theme.border,
                  backgroundColor: mode === "tape" ? theme.soft : theme.surface,
                  opacity: canTape ? 1 : 0.55,
                },
              ]}
            >
              <Feather name="circle" size={14} color={mode === "tape" ? theme.accent : theme.muted} />
              <Text style={{ color: theme.text, fontWeight: "700", fontSize: 13 }}>Tape</Text>
            </Pressable>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {mode === "speak" ? (
            <VoiceDumpField
              value={transcript}
              onChangeText={setTranscript}
              placeholder="What do you want to remember about today?"
              autoFocus
              minHeight={160}
            />
          ) : (
            <View style={[styles.tapeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.tapeTime, { color: theme.text }]}>{formatMs(tapeMs)}</Text>
              <Text style={{ color: theme.muted, textAlign: "center", marginBottom: 16 }}>
                {taping
                  ? "Listening…"
                  : pendingAudioUri
                    ? "Tape ready — add a caption if you want, then save."
                    : "Tape the moment, then add a line of text if you want."}
              </Text>
              <Pressable
                onPress={() => void toggleTape()}
                style={[styles.tapeBtn, { backgroundColor: taping ? theme.danger : theme.accent }]}
              >
                <Feather name={taping ? "square" : "mic"} size={22} color="#fff" />
                <Text style={styles.tapeBtnText}>{taping ? "Stop" : pendingAudioUri ? "Re-tape" : "Start tape"}</Text>
              </Pressable>
              {!canTape ? (
                <Text style={{ color: theme.muted, fontSize: 12, marginTop: 12, textAlign: "center" }}>
                  Tape needs a rebuild with expo-av. Speak mode works now.
                </Text>
              ) : null}
              <TextInput
                value={transcript}
                onChangeText={setTranscript}
                placeholder="Optional caption / transcript"
                placeholderTextColor={theme.muted}
                multiline
                style={[styles.caption, { color: theme.text, borderColor: theme.border }]}
              />
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <ActionButton
            label={saving ? "Saving…" : targetDay === toDateKey(new Date()) ? "Save to today" : "Save memory"}
            icon="bookmark"
            onPress={() => void save()}
          />
          {!isSpeechRecognitionAvailable() && mode === "speak" ? (
            <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center" }}>
              Type here, or use the keyboard mic.
            </Text>
          ) : null}
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
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: { fontSize: 22, fontWeight: "800" },
  sub: { paddingHorizontal: 20, marginTop: 8, fontSize: 14, lineHeight: 20 },
  modeRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginTop: 16 },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  body: { padding: 20, paddingBottom: 12, flexGrow: 1 },
  tapeBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  tapeTime: { fontSize: 36, fontWeight: "800", fontVariant: ["tabular-nums"], marginBottom: 8 },
  tapeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  tapeBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  caption: {
    alignSelf: "stretch",
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 72,
    textAlignVertical: "top",
  },
  footer: { padding: 20, gap: 10 },
});
