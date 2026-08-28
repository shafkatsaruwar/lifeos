import { requireOptionalNativeModule } from "expo-modules-core";

type SpeechApi = typeof import("expo-speech-recognition");
type SpeechResultEvent = { results: { transcript: string }[]; isFinal?: boolean };
type SpeechErrorEvent = { error?: string; message?: string };
type VolumeEvent = { value?: number };

let cached: SpeechApi | null | undefined;

/** Native speech recognition is only present after a binary that includes the module. */
export function getSpeechRecognition(): SpeechApi | null {
  if (cached !== undefined) return cached;
  try {
    if (!requireOptionalNativeModule("ExpoSpeechRecognition")) {
      cached = null;
      return cached;
    }
    cached = require("expo-speech-recognition") as SpeechApi;
    return cached;
  } catch {
    cached = null;
    return cached;
  }
}

export function isSpeechRecognitionAvailable() {
  return getSpeechRecognition() != null;
}

export async function startDictation(handlers: {
  onStart?: () => void;
  onEnd?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  onVolume?: (value: number) => void;
}) {
  const api = getSpeechRecognition();
  if (!api) {
    handlers.onError?.("unavailable");
    return () => undefined;
  }

  const { ExpoSpeechRecognitionModule } = api;
  const permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!permissions.granted) {
    handlers.onError?.("not-allowed");
    return () => undefined;
  }

  const subs = [
    ExpoSpeechRecognitionModule.addListener("start", () => handlers.onStart?.()),
    ExpoSpeechRecognitionModule.addListener("end", () => handlers.onEnd?.()),
    ExpoSpeechRecognitionModule.addListener("result", (event: SpeechResultEvent) => {
      const spoken = event.results?.[0]?.transcript ?? "";
      handlers.onResult?.(spoken, Boolean(event.isFinal));
    }),
    ExpoSpeechRecognitionModule.addListener("error", (event: SpeechErrorEvent) => {
      handlers.onError?.(event.message || event.error || "recognition-failed");
    }),
    ExpoSpeechRecognitionModule.addListener("volumechange", (event: VolumeEvent) => {
      handlers.onVolume?.(typeof event.value === "number" ? event.value : 0);
    }),
  ];

  try {
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      iosTaskHint: "dictation",
      volumeChangeEventOptions: { enabled: true, intervalMillis: 80 },
    });
  } catch {
    subs.forEach((sub) => sub.remove());
    handlers.onError?.("recognition-failed");
    return () => undefined;
  }

  return () => {
    subs.forEach((sub) => sub.remove());
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Native module may already have torn down.
    }
  };
}

export function stopDictation() {
  const api = getSpeechRecognition();
  try {
    api?.ExpoSpeechRecognitionModule.stop();
  } catch {
    // Ignore if recognition was never started.
  }
}
