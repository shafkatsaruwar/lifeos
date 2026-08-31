import {
  buildCaptureCommands,
  filterCaptureCommands,
  isInstantCaptureShortcut,
  resolveCaptureAction,
} from "../lifeos-mobile/src/lib/captureCommands";

describe("captureCommands", () => {
  const commands = buildCaptureCommands({ enableWorkOS: true });

  it("lists core shortcuts", () => {
    expect(commands.map((c) => c.shortcut)).toEqual(
      expect.arrayContaining(["/t", "/tm", "/break", "/focus", "/clock", "/w task"]),
    );
  });

  it("filters by prefix", () => {
    const filtered = filterCaptureCommands(commands, "/t");
    expect(filtered.some((c) => c.shortcut === "/t")).toBe(true);
    expect(filtered.some((c) => c.shortcut === "/tm")).toBe(true);
    expect(filtered.some((c) => c.shortcut === "/break")).toBe(false);
  });

  it("resolves task capture", () => {
    expect(resolveCaptureAction("/t Buy milk", { enableWorkOS: true })).toEqual({
      type: "addTask",
      title: "Buy milk",
    });
    expect(resolveCaptureAction("/tm Quick errand", { enableWorkOS: true })).toEqual({
      type: "addTask",
      title: "Quick errand",
      minor: true,
    });
  });

  it("resolves instant shortcuts", () => {
    expect(isInstantCaptureShortcut("/break")).toBe(true);
    expect(resolveCaptureAction("/break", { enableWorkOS: true })).toEqual({
      type: "instant",
      command: "break",
    });
  });

  it("resolves work task when Work OS enabled", () => {
    expect(resolveCaptureAction("/w task Email client", { enableWorkOS: true })).toEqual({
      type: "addWorkTask",
      title: "Email client",
    });
  });
});
