/** Accidental mic-tap timeout for Kept listening (web + iOS). */

/** No interim/final transcript activity for this long → cancel listening. */
export const KEPT_MIC_INACTIVITY_MS = 3000;

export const KEPT_LISTENING_CANCELED_STATUS = "Listening canceled";

export type MicInactivityTimer = {
  /** Start or restart the inactivity countdown. */
  bump: () => void;
  /** Clear without firing. */
  clear: () => void;
};

/**
 * Starts a countdown immediately. Call `bump` on speech activity to reset;
 * call `clear` when leaving Listening (stop, end, error, unmount).
 */
export function createMicInactivityTimer(
  onTimeout: () => void,
  ms: number = KEPT_MIC_INACTIVITY_MS,
): MicInactivityTimer {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const bump = () => {
    clear();
    timer = setTimeout(() => {
      timer = null;
      onTimeout();
    }, ms);
  };

  bump();
  return { bump, clear };
}
