"use client";

import { useEffect, useState } from "react";
import {
  initSessionReplay,
  readSessionReplayOptIn,
  resolveSessionReplayConfig,
  writeSessionReplayOptIn,
} from "@/lib/privacy/sessionReplay";

/** Boots privacy defaults (replay off, inputs masked) and exposes the opt-in control. */
export function PrivacyTelemetryBoot() {
  useEffect(() => {
    initSessionReplay();
  }, []);
  return null;
}

export function SessionReplaySettingsRow() {
  const [optIn, setOptIn] = useState(false);
  const [config, setConfig] = useState(() => resolveSessionReplayConfig(false));

  useEffect(() => {
    const stored = readSessionReplayOptIn();
    setOptIn(stored);
    setConfig(resolveSessionReplayConfig(stored));
  }, []);

  return (
    <div className="settings-toggle-pair" style={{ marginTop: 12 }}>
      <div className="toggle-row" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <strong style={{ display: "block", fontSize: 12 }}>Session replay</strong>
          <p className="settings-note" style={{ margin: "4px 0 0" }}>
            Off by default. Input fields are always masked. LifeOS does not load a replay vendor unless you opt in
            and a vendor is configured.
          </p>
          <p className="settings-note" style={{ margin: "6px 0 0" }}>
            Status: {config.enabled ? "Recording (masked inputs)" : "Off"} · maskInputs={String(config.maskInputs)}
          </p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted)" }}>
          Opt in
          <input
            type="checkbox"
            checked={optIn}
            onChange={(event) => {
              const next = event.target.checked;
              writeSessionReplayOptIn(next);
              setOptIn(next);
              const resolved = resolveSessionReplayConfig(next);
              setConfig(resolved);
              initSessionReplay();
            }}
          />
        </label>
      </div>
    </div>
  );
}
