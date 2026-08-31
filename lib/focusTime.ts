/** Countdown display for focus timers (MM:SS under 1h, H:MM:SS at 1h+). */
export function formatFocusTime(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const totalMinutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(totalMinutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/** "4 hour session" / "1 hour 30 minute session" / "45 minute session" */
export function formatFocusSessionLabel(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m >= 60) {
    const hours = Math.floor(m / 60);
    const rem = m % 60;
    if (rem === 0) return `${hours} hour${hours === 1 ? "" : "s"} session`;
    return `${hours} hour${hours === 1 ? "" : "s"} ${rem} minute${rem === 1 ? "" : "s"} session`;
  }
  return `${m} minute${m === 1 ? "" : "s"} session`;
}

/** Short badge: "4 hr" / "1 hr 30 min" / "45 min" */
export function formatFocusMinutesShort(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m >= 60) {
    const hours = Math.floor(m / 60);
    const rem = m % 60;
    if (rem === 0) return `${hours} hr`;
    return `${hours} hr ${rem} min`;
  }
  return `${m} min`;
}
