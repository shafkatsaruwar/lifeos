import fs from "fs";
import path from "path";

/**
 * Guards Atelier Light freeze across LifeOS 3.0 phases.
 * Dark may change under `.dark` / `[data-personality="atelier-dark"]` only.
 */

const LIGHT_HEXES = {
  "--canvas": "#F7F9FC",
  "--panel": "#FFFFFF",
  "--surface-2": "#EEF3FA",
  "--ink": "#111827",
  "--muted": "#64748B",
  "--line": "#E2E8F0",
  "--accent": "#2563EB",
  "--accent-2": "#7C3AED",
  "--accent-teal": "#0D9488",
  "--accent-coral": "#F43F5E",
} as const;

const DARK_HEXES = {
  "--canvas": "#0B1020",
  "--sidebar": "#101729",
  "--panel": "#141C2E",
  "--surface-2": "#1A2438",
  "--ink": "#E8EEF8",
  "--muted": "#8B9BB4",
  "--line": "#1E2A3F",
  "--accent": "#5B8DEF",
  "--accent-2": "#8B7EC8",
} as const;

function extractBlock(css: string, startPattern: RegExp): string {
  const start = css.search(startPattern);
  expect(start).toBeGreaterThanOrEqual(0);
  const from = css.slice(start);
  const end = from.indexOf("\n}");
  expect(end).toBeGreaterThan(0);
  return from.slice(0, end + 2);
}

describe("Atelier token freeze / Phase 2 Dark", () => {
  const cssPath = path.join(process.cwd(), "app/globals.css");
  const css = fs.readFileSync(cssPath, "utf8");

  it("keeps Atelier Light :root hexes frozen", () => {
    const light = extractBlock(css, /:root,\s*\n\[data-personality="atelier-light"\]/);
    for (const [token, hex] of Object.entries(LIGHT_HEXES)) {
      expect(light).toContain(`${token}:${hex}`);
    }
  });

  it("ships Phase 2 Atelier Dark command-center palette", () => {
    const dark = extractBlock(css, /\.dark,\s*\n\[data-personality="atelier-dark"\]/);
    for (const [token, hex] of Object.entries(DARK_HEXES)) {
      expect(dark).toContain(`${token}:${hex}`);
    }
    expect(dark).toContain("--glow-accent:");
    expect(dark).toContain("--glow-violet:");
  });

  it("Light block still matches design-archive snapshot hexes", () => {
    const archivePath = path.join(
      process.cwd(),
      "docs/design-archive/current-2026-10-18/snapshots/globals.css",
    );
    const archive = fs.readFileSync(archivePath, "utf8");
    const archiveRoot = extractBlock(archive, /:root\s*\{/);
    for (const [token, hex] of Object.entries(LIGHT_HEXES)) {
      expect(archiveRoot).toContain(`${token}:${hex}`);
    }
  });
});
