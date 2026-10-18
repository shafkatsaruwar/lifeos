"use client";

import { useEffect, useMemo, useState } from "react";
import { Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import type { ThemeMode } from "@/lib/appearancePrefs";
import {
  applyAppearanceChrome,
  appearanceSettingsPatchFromStudio,
  appearanceStudioFromSettings,
  CURATED_ACCENTS,
  DEFAULT_APPEARANCE_STUDIO,
  type AppearanceStudioState,
  type GlassLevel,
  type WallpaperId,
  WALLPAPER_PRESETS,
  wallpaperCssFor,
} from "@/lib/appearanceStudio";

export type AppearanceStudioProps = {
  /** Committed settings slice (themeMode, accent, wallpaper*, glass*, compact, reduceMotion). */
  settings: Parameters<typeof appearanceStudioFromSettings>[0];
  /** Persist on Apply / Restore — caller dual-writes dark + syncs Firebase via existing update path. */
  onCommit: (patch: ReturnType<typeof appearanceSettingsPatchFromStudio>) => void;
  systemDark?: boolean;
  flash?: (message: string) => void;
};

const GLASS_OPTIONS: { id: GlassLevel; label: string; hint: string }[] = [
  { id: "off", label: "Off", hint: "Solid panels" },
  { id: "subtle", label: "Subtle", hint: "Light blur" },
  { id: "balanced", label: "Balanced", hint: "Soft glass" },
  { id: "high", label: "High", hint: "Stronger glass; falls back to solid if unsupported" },
];

const THEME_OPTIONS: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
];

function sameStudio(a: AppearanceStudioState, b: AppearanceStudioState): boolean {
  return (
    a.themeMode === b.themeMode &&
    a.accent === b.accent &&
    a.wallpaperId === b.wallpaperId &&
    a.wallpaperSolid === b.wallpaperSolid &&
    a.glassLevel === b.glassLevel &&
    a.compactMode === b.compactMode &&
    a.reduceMotion === b.reduceMotion
  );
}

export function AppearanceStudio({ settings, onCommit, systemDark = false, flash }: AppearanceStudioProps) {
  const committed = useMemo(() => appearanceStudioFromSettings(settings), [settings]);
  const [draft, setDraft] = useState<AppearanceStudioState>(committed);
  const dirty = !sameStudio(draft, committed);

  // Reset draft when committed settings change externally (e.g. after Apply or sync).
  useEffect(() => {
    setDraft(committed);
  }, [committed]);

  // Live preview chrome (wallpaper / glass / accent) — does not write Firebase.
  useEffect(() => {
    applyAppearanceChrome(draft);
    return () => {
      applyAppearanceChrome(committed);
    };
  }, [draft, committed]);

  const previewWallpaper = wallpaperCssFor(draft);
  const previewIsDark =
    draft.themeMode === "dark" || (draft.themeMode === "system" && systemDark);

  const setTheme = (themeMode: ThemeMode) => setDraft((d) => ({ ...d, themeMode }));
  const setWallpaper = (wallpaperId: WallpaperId) => setDraft((d) => ({ ...d, wallpaperId }));

  const handleApply = () => {
    const patch = appearanceSettingsPatchFromStudio(draft, systemDark);
    onCommit(patch);
    flash?.("Appearance applied");
  };

  const handleCancel = () => {
    setDraft(committed);
    applyAppearanceChrome(committed);
    flash?.("Appearance changes discarded");
  };

  const handleRestore = () => {
    setDraft(DEFAULT_APPEARANCE_STUDIO);
    flash?.("Defaults loaded — click Apply to save");
  };

  return (
    <div className="appearance-studio" data-testid="appearance-studio">
      <div className="appearance-studio-layout">
        <div className="appearance-studio-controls">
          <div className="appearance-studio-block">
            <p className="settings-field-label">Theme</p>
            <div className="theme-options theme-options-triple">
              {THEME_OPTIONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={draft.themeMode === id ? "selected" : ""}
                  onClick={() => setTheme(id)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="appearance-studio-block">
            <p className="settings-field-label">Accent</p>
            <div className="accent-picker">
              {CURATED_ACCENTS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={draft.accent.toLowerCase() === color.toLowerCase() ? "selected" : ""}
                  style={{ background: color }}
                  onClick={() => setDraft((d) => ({ ...d, accent: color }))}
                  aria-label={`Set accent ${color}`}
                />
              ))}
            </div>
            <label className="appearance-custom-accent">
              <span>Custom</span>
              <input
                type="color"
                value={/^#[0-9A-Fa-f]{6}$/.test(draft.accent) ? draft.accent : DEFAULT_APPEARANCE_STUDIO.accent}
                onChange={(e) => setDraft((d) => ({ ...d, accent: e.target.value }))}
                aria-label="Custom accent color"
              />
            </label>
          </div>

          <div className="appearance-studio-block">
            <p className="settings-field-label">Wallpaper</p>
            <div className="appearance-wallpaper-grid">
              <button
                type="button"
                className={draft.wallpaperId === "none" ? "selected" : ""}
                onClick={() => setWallpaper("none")}
              >
                <i className="appearance-wallpaper-swatch appearance-wallpaper-none" />
                <span>None</span>
              </button>
              <button
                type="button"
                className={draft.wallpaperId === "solid" ? "selected" : ""}
                onClick={() => setWallpaper("solid")}
              >
                <i
                  className="appearance-wallpaper-swatch"
                  style={{ background: draft.wallpaperSolid }}
                />
                <span>Solid</span>
              </button>
              {WALLPAPER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={draft.wallpaperId === preset.id ? "selected" : ""}
                  onClick={() => setWallpaper(preset.id)}
                >
                  <i className="appearance-wallpaper-swatch" style={{ background: preset.css }} />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
            {draft.wallpaperId === "solid" && (
              <label className="appearance-custom-accent">
                <span>Solid color</span>
                <input
                  type="color"
                  value={draft.wallpaperSolid}
                  onChange={(e) => setDraft((d) => ({ ...d, wallpaperSolid: e.target.value }))}
                  aria-label="Solid wallpaper color"
                />
              </label>
            )}
            <p className="settings-note">
              Image upload deferred — needs owner-scoped storage. Curated gradients and solid colors are available now.
            </p>
          </div>

          <div className="appearance-studio-block">
            <p className="settings-field-label">Glass</p>
            <div className="appearance-glass-options">
              {GLASS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={draft.glassLevel === opt.id ? "selected" : ""}
                  onClick={() => setDraft((d) => ({ ...d, glassLevel: opt.id }))}
                  title={opt.hint}
                >
                  <strong>{opt.label}</strong>
                  <span>{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-toggle-pair">
            <label className="setting-row appearance-toggle-row">
              <div>
                <strong>Compact</strong>
                <p>Tighter spacing.</p>
              </div>
              <input
                type="checkbox"
                checked={draft.compactMode}
                onChange={(e) => setDraft((d) => ({ ...d, compactMode: e.target.checked }))}
              />
            </label>
            <label className="setting-row appearance-toggle-row">
              <div>
                <strong>Reduce motion</strong>
                <p>Calmer transitions.</p>
              </div>
              <input
                type="checkbox"
                checked={draft.reduceMotion}
                onChange={(e) => setDraft((d) => ({ ...d, reduceMotion: e.target.checked }))}
              />
            </label>
          </div>
        </div>

        <aside className="appearance-studio-preview" aria-label="Live preview">
          <p className="settings-field-label">Preview</p>
          <div
            className={`appearance-preview-frame ${previewIsDark ? "is-dark" : "is-light"}`}
            data-glass={draft.glassLevel}
            style={
              previewWallpaper
                ? { background: previewWallpaper }
                : undefined
            }
          >
            <div className="appearance-preview-chrome">
              <div className="appearance-preview-sidebar" />
              <div className="appearance-preview-main">
                <div
                  className="appearance-preview-card"
                  style={{ ["--preview-accent" as string]: draft.accent }}
                >
                  <strong>Now</strong>
                  <span>Command center preview</span>
                  <em style={{ background: draft.accent }} />
                </div>
                <div className="appearance-preview-card appearance-preview-glass">
                  <strong>Glass</strong>
                  <span>{draft.glassLevel}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="settings-note">
            Preview updates live. Firebase writes only when you Apply.
          </p>
        </aside>
      </div>

      <div className="appearance-studio-actions">
        <button type="button" className="appearance-restore" onClick={handleRestore}>
          <RotateCcw size={14} /> Restore defaults
        </button>
        <div className="appearance-studio-actions-end">
          <button type="button" onClick={handleCancel} disabled={!dirty}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={handleApply} disabled={!dirty}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppearanceStudio;
