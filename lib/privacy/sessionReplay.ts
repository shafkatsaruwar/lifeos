/**
 * Session replay / product analytics privacy defaults.
 * No third-party replay vendor is shipped today; any future integration MUST
 * read these defaults (replay off unless explicit opt-in) and always mask inputs.
 */

export type SessionReplayConfig = {
  /** Master switch — default OFF (privacy-first). */
  enabled: boolean;
  /** Mask text inputs, passwords, and textareas in any capture. */
  maskInputs: boolean;
  /** Mask elements marked with data-privacy="mask" or .privacy-mask. */
  maskSelectors: string[];
};

export const DEFAULT_SESSION_REPLAY: SessionReplayConfig = {
  enabled: false,
  maskInputs: true,
  maskSelectors: [
    "input",
    "textarea",
    "[contenteditable='true']",
    "[data-privacy='mask']",
    ".privacy-mask",
  ],
};

/** Flip to true only after a real vendor is wired behind opt-in. */
const SESSION_REPLAY_VENDOR_AVAILABLE = false;

const STORAGE_KEY = "lifeos_session_replay_opt_in_v1";

export function readSessionReplayOptIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSessionReplayOptIn(optIn: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (optIn) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Effective config: default off; inputs always masked; vendor gate keeps enabled false until shipped. */
export function resolveSessionReplayConfig(optIn = readSessionReplayOptIn()): SessionReplayConfig {
  return {
    ...DEFAULT_SESSION_REPLAY,
    enabled: SESSION_REPLAY_VENDOR_AVAILABLE && Boolean(optIn),
    maskInputs: true,
  };
}

/**
 * Call once on client boot. Guarantees no replay SDK loads when disabled.
 * When a vendor is added, gate it behind `config.enabled` and apply `maskSelectors`.
 */
export function initSessionReplay(): SessionReplayConfig {
  const config = resolveSessionReplayConfig();
  if (typeof window !== "undefined") {
    (window as Window & { __LIFEOS_SESSION_REPLAY__?: SessionReplayConfig }).__LIFEOS_SESSION_REPLAY__ = config;
  }
  // No vendor init while SESSION_REPLAY_VENDOR_AVAILABLE is false.
  return config;
}
