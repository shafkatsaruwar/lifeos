import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import { isSpeechRecognitionAvailable, startDictation, stopDictation } from "../lib/speechRecognition";

function joinSpoken(base: string, spoken: string) {
  const lead = base.trimEnd();
  const next = spoken.trim();
  if (!next) return base;
  if (!lead) return next;
  return /[\s\n]$/.test(base) ? `${base}${next}` : `${lead} ${next}`;
}

export function VoiceDumpField({
  value,
  onChangeText,
  placeholder,
  autoFocus = false,
  minHeight = 120,
}: {
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  minHeight?: number;
}) {
  const { theme, workspace } = useLifeOS();
  const reduceMotion = Boolean(workspace.settings.reduceMotion);
  const [listening, setListening] = useState(false);
  const committedRef = useRef(value);
  const listeningRef = useRef(false);
  const fromSpeechRef = useRef(false);
  const stopRef = useRef<(() => void) | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      stopRef.current?.();
      stopDictation();
    };
  }, []);

  useEffect(() => {
    if (!listening || reduceMotion) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.25, duration: 280, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [listening, pulse, reduceMotion]);

  const applyTyped = (next: string) => {
    if (fromSpeechRef.current) {
      fromSpeechRef.current = false;
      onChangeText(next);
      return;
    }
    committedRef.current = next;
    onChangeText(next);
  };

  const stop = () => {
    listeningRef.current = false;
    setListening(false);
    stopRef.current?.();
    stopRef.current = null;
    stopDictation();
    committedRef.current = value;
  };

  const start = async () => {
    if (listeningRef.current) {
      stop();
      return;
    }
    if (Platform.OS !== "ios" || !isSpeechRecognitionAvailable()) {
      Alert.alert(
        "Type or use the keyboard mic",
        "Live dump needs a LifeOS build with speech recognition. Keep typing here, or tap the microphone on the iOS keyboard.",
      );
      return;
    }

    committedRef.current = value;
    listeningRef.current = true;
    setListening(true);

    const cleanup = await startDictation({
      onStart: () => {
        listeningRef.current = true;
        setListening(true);
      },
      onEnd: () => {
        listeningRef.current = false;
        setListening(false);
        stopRef.current = null;
      },
      onResult: (spoken, isFinal) => {
        const next = joinSpoken(committedRef.current, spoken);
        fromSpeechRef.current = true;
        onChangeText(next);
        if (isFinal) committedRef.current = next;
      },
      onError: (message) => {
        listeningRef.current = false;
        setListening(false);
        stopRef.current = null;
        if (message === "not-allowed") {
          Alert.alert("Microphone needed", "Allow speech recognition in Settings to dump by voice.");
          return;
        }
        if (message !== "unavailable" && message !== "no-speech") {
          Alert.alert("Couldn’t hear that", "Try again, or type it in.");
        }
      },
    });
    stopRef.current = cleanup;
  };

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <View style={styles.wrap}>
      <TextInput
        autoFocus={autoFocus}
        multiline
        value={value}
        onChangeText={applyTyped}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: listening ? theme.accent : theme.border,
            backgroundColor: theme.bg,
            minHeight,
          },
        ]}
      />
      <View style={styles.micRow}>
        <Text style={[styles.hint, { color: theme.muted }]}>
          {listening ? "Listening — keep talking, or type over it." : "Tap the mic to blab. Keyboard still works."}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listening ? "Stop dictation" : "Start dictation"}
          onPress={() => void start()}
          style={({ pressed }) => [
            styles.micButton,
            {
              backgroundColor: listening ? theme.danger : theme.text,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: listening ? scale : 1 }] }}>
            <Feather name={listening ? "square" : "mic"} size={18} color={theme.surface} />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    paddingBottom: 16,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: "top",
  },
  micRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  hint: { flex: 1, fontSize: 12, lineHeight: 16 },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
