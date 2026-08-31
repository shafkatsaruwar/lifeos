import {
  buildCaptureCommands,
  filterCaptureCommands,
  isInstantCaptureShortcut,
  resolveCaptureAction,
} from "../lifeos-mobile/src/lib/captureCommands";

describe("captureCommands", () => {
  const commands = buildCaptureCommands({
    enableWorkOS: true,
    enableStudyAbroad: true,
    enableMasterOS: true,
  });

  it("lists core and optional shortcuts", () => {
    expect(commands.map((c) => c.shortcut)).toEqual(
      expect.arrayContaining([
        "/t",
        "/tm",
        "/asg",
        "/a",
        "/spaces",
        "/break",
        "/focus",
        "/clock",
        "/w task",
        "/w proj",
        "/w meet",
        "/sa",
        "/mos",
      ]),
    );
  });

  it("filters by prefix", () => {
    const filtered = filterCaptureCommands(commands, "/t");
    expect(filtered.some((c) => c.shortcut === "/t")).toBe(true);
    expect(filtered.some((c) => c.shortcut === "/tm")).toBe(true);
    expect(filtered.some((c) => c.shortcut === "/break")).toBe(false);
  });

  it("resolves task and assignment capture", () => {
    expect(resolveCaptureAction("/t Buy milk", { enableWorkOS: true })).toEqual({
      type: "addTask",
      title: "Buy milk",
    });
    expect(resolveCaptureAction("/asg Problem set 3", { enableWorkOS: true })).toEqual({
      type: "addAssignment",
      title: "Problem set 3",
    });
  });

  it("resolves instant shortcuts", () => {
    expect(isInstantCaptureShortcut("/break")).toBe(true);
    expect(isInstantCaptureShortcut("/a")).toBe(true);
    expect(resolveCaptureAction("/a", { enableWorkOS: true })).toEqual({
      type: "instant",
      command: "ai",
    });
    expect(resolveCaptureAction("/spaces", { enableWorkOS: true })).toEqual({
      type: "instant",
      command: "spaces",
    });
  });

  it("resolves work commands when Work OS enabled", () => {
    expect(resolveCaptureAction("/w task Email client", { enableWorkOS: true })).toEqual({
      type: "addWorkTask",
      title: "Email client",
    });
    expect(resolveCaptureAction("/w proj Client site", { enableWorkOS: true })).toEqual({
      type: "addWorkProject",
      name: "Client site",
    });
    expect(resolveCaptureAction("/w meet Standup", { enableWorkOS: true })).toEqual({
      type: "addWorkMeeting",
      title: "Standup",
    });
  });

  it("blocks work commands when Work OS disabled", () => {
    expect(resolveCaptureAction("/w task Email client", { enableWorkOS: false })).toEqual({
      type: "workDisabled",
    });
  });

  it("routes study abroad commands to web guidance on mobile", () => {
    expect(resolveCaptureAction("/sa", { enableStudyAbroad: true })).toEqual({
      type: "studyAbroadWebOnly",
    });
    expect(resolveCaptureAction("/sa country Japan", { enableStudyAbroad: true })).toEqual({
      type: "studyAbroadWebOnly",
    });
  });
});
