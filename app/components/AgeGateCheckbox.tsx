"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  AGE_GATE_BLOCKED_MESSAGE,
  AGE_GATE_LABEL,
  isAgeConfirmed,
  persistAgeConfirmation,
  readStoredAgeConfirmation,
} from "@/lib/legal/ageGate";

type AgeGateProps = {
  /** When true, signup actions may proceed. */
  onChange: (confirmed: boolean) => void;
  /** Dark login screen vs light legal pages. */
  tone?: "dark" | "light";
};

/** COPPA age confirmation checkbox for signup / account creation. */
export function AgeGateCheckbox({ onChange, tone = "dark" }: AgeGateProps) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const stored = readStoredAgeConfirmation();
    if (stored) {
      setConfirmed(true);
      onChange(true);
    }
    // intentionally once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const color = tone === "dark" ? "rgba(255,255,255,0.75)" : "var(--muted)";
  const border = tone === "dark" ? "rgba(255,255,255,0.25)" : "var(--line)";

  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        textAlign: "left",
        fontSize: 12,
        lineHeight: 1.45,
        color,
        cursor: "pointer",
        margin: "0 0 16px",
      }}
    >
      <input
        type="checkbox"
        checked={confirmed}
        onChange={(event) => {
          const next = event.target.checked;
          setConfirmed(next);
          persistAgeConfirmation(next);
          onChange(isAgeConfirmed(next));
        }}
        style={{ marginTop: 2, accentColor: "#625af6", width: 16, height: 16, flexShrink: 0 }}
        aria-required
      />
      <span>
        {AGE_GATE_LABEL}{" "}
        <span style={{ opacity: 0.75 }}>({AGE_GATE_BLOCKED_MESSAGE.replace("LifeOS is not available to users under", "Required — under")})</span>
      </span>
    </label>
  );
}

export function ageGateBlockedStyle(tone: "dark" | "light" = "dark"): CSSProperties {
  return {
    fontSize: 12,
    color: tone === "dark" ? "#ff6b6b" : "#b42318",
    marginTop: 8,
    border: `1px solid ${tone === "dark" ? "rgba(255,107,107,0.35)" : "var(--line)"}`,
    borderRadius: 8,
    padding: "8px 10px",
    textAlign: "left",
  };
}

export { AGE_GATE_BLOCKED_MESSAGE, AGE_GATE_LABEL };
