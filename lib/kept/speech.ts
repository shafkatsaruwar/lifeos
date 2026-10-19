/** Web Speech API helpers for Kept (browser only). */

export type KeptSpeechStatus =
  | "unsupported"
  | "idle"
  | "listening"
  | "processing"
  | "error";

export type KeptSpeechHandlers = {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
};

type RecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: Event & { error?: string }) => void) | null;
  onresult: ((ev: Event & { results: ArrayLike<{ isFinal?: boolean; 0?: { transcript?: string } }> }) => void) | null;
};

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isKeptSpeechSupported(): boolean {
  return Boolean(getCtor());
}

export function startKeptSpeech(handlers: KeptSpeechHandlers): { stop: () => void } | null {
  const Ctor = getCtor();
  if (!Ctor) {
    handlers.onError?.("Speech recognition is not available in this browser. Type instead.");
    return null;
  }

  const recognition = new Ctor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";

  recognition.onstart = () => handlers.onStart?.();
  recognition.onend = () => handlers.onEnd?.();
  recognition.onerror = (ev) => {
    const code = ev.error || "error";
    if (code === "aborted" || code === "no-speech") {
      handlers.onEnd?.();
      return;
    }
    handlers.onError?.(
      code === "not-allowed"
        ? "Microphone permission is blocked. Allow mic access or type instead."
        : `Speech error: ${code}`,
    );
  };
  recognition.onresult = (ev) => {
    let transcript = "";
    let isFinal = false;
    for (let i = 0; i < ev.results.length; i++) {
      const row = ev.results[i];
      transcript += row[0]?.transcript || "";
      if (row.isFinal) isFinal = true;
    }
    handlers.onResult?.(transcript.trim(), isFinal);
  };

  try {
    recognition.start();
  } catch {
    handlers.onError?.("Could not start the microphone.");
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
