/**
 * Phase 8 — assert mobile theme.ts tracks web Atelier hexes without importing
 * the Expo package (jest ignores `lifeos-mobile/` via modulePathIgnorePatterns).
 */
import { readFileSync } from "fs";
import { join } from "path";

const themeSrc = readFileSync(join(__dirname, "../lifeos-mobile/src/lib/theme.ts"), "utf8");

describe("mobileThemeParity", () => {
  it("ships Atelier Light hexes matching web :root", () => {
    expect(themeSrc).toContain('bg: "#F7F9FC"');
    expect(themeSrc).toContain('text: "#111827"');
    expect(themeSrc).toContain('muted: "#64748B"');
    expect(themeSrc).toContain('border: "#E2E8F0"');
    expect(themeSrc).toContain('accent: "#2563EB"');
  });

  it("ships Atelier Dark command-center hexes matching web .dark", () => {
    expect(themeSrc).toContain('bg: "#0B1020"');
    expect(themeSrc).toContain('surface: "#141C2E"');
    expect(themeSrc).toContain('text: "#E8EEF8"');
    expect(themeSrc).toContain('muted: "#8B9BB4"');
    expect(themeSrc).toContain('border: "#1E2A3F"');
    expect(themeSrc).toContain('accent: "#5B8DEF"');
  });

  it("documents Expo ≠ CSS backdrop-filter port", () => {
    expect(themeSrc).toMatch(/backdrop-filter/i);
    expect(themeSrc).toMatch(/Expo/);
  });
});
