import { createItemBlock } from "../lifeos-mobile/src/lib/checklistBlocks";
import {
  applyChecklistBlockTextChange,
  applyChecklistItemTextChange,
  extractInsertedText,
  isMultilineChecklistPaste,
  parsePastedChecklistBlocks,
  parsePastedChecklistLines,
  stripChecklistListMarker,
} from "../lifeos-mobile/src/lib/checklistSmartPaste";

describe("stripChecklistListMarker", () => {
  it("strips bullets without altering the item text", () => {
    expect(stripChecklistListMarker("- Buy milk")).toBe("Buy milk");
    expect(stripChecklistListMarker("* Eggs")).toBe("Eggs");
    expect(stripChecklistListMarker("• Bread")).toBe("Bread");
    expect(stripChecklistListMarker("+ Butter")).toBe("Butter");
  });

  it("strips numbered prefixes", () => {
    expect(stripChecklistListMarker("1. First")).toBe("First");
    expect(stripChecklistListMarker("12) Twelfth")).toBe("Twelfth");
    expect(stripChecklistListMarker("3. Keep 3.14 intact")).toBe("Keep 3.14 intact");
  });

  it("leaves plain lines and non-marker text alone", () => {
    expect(stripChecklistListMarker("Just text")).toBe("Just text");
    expect(stripChecklistListMarker("3.14 apples")).toBe("3.14 apples");
  });
});

describe("parsePastedChecklistLines", () => {
  it("splits multiline paste into separate items in order", () => {
    expect(parsePastedChecklistLines("Alpha\nBeta\nGamma")).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("drops empty lines", () => {
    expect(parsePastedChecklistLines("A\n\n\nB\n  \nC")).toEqual(["A", "B", "C"]);
  });

  it("handles bullets and numbered lists", () => {
    expect(parsePastedChecklistLines("- one\n- two\n* three")).toEqual(["one", "two", "three"]);
    expect(parsePastedChecklistLines("1. red\n2. green\n3) blue")).toEqual(["red", "green", "blue"]);
  });

  it("preserves Unicode item text", () => {
    expect(parsePastedChecklistLines("買う 牛乳\n• café\n日本語")).toEqual([
      "買う 牛乳",
      "café",
      "日本語",
    ]);
  });

  it("returns a single entry for one non-empty line", () => {
    expect(parsePastedChecklistLines("Only one")).toEqual(["Only one"]);
  });
});

describe("isMultilineChecklistPaste / extractInsertedText", () => {
  it("detects newline-containing inserts only", () => {
    expect(isMultilineChecklistPaste("hello")).toBe(false);
    expect(isMultilineChecklistPaste("a\nb")).toBe(true);
    expect(isMultilineChecklistPaste("a\r\nb")).toBe(true);
  });

  it("extracts the pasted slice from selection", () => {
    expect(extractInsertedText("Hello world", "Hello A\nB world", 6, 6)).toBe("A\nB ");
    expect(extractInsertedText("ab", "aXYZb", 1, 1)).toBe("XYZ");
  });
});

describe("applyChecklistItemTextChange", () => {
  it("keeps normal single-line editing", () => {
    const result = applyChecklistItemTextChange({
      items: ["Hello", ""],
      progress: [false, false],
      index: 0,
      previousText: "Hello",
      nextText: "Hello!",
      selectionStart: 5,
      selectionEnd: 5,
    });
    expect(result).toEqual({ kind: "replace", text: "Hello!" });
  });

  it("splits multiline paste into new items without combining", () => {
    const result = applyChecklistItemTextChange({
      items: ["", ""],
      progress: [false, false],
      index: 0,
      previousText: "",
      nextText: "A\nB\nC",
      selectionStart: 0,
      selectionEnd: 0,
    });
    expect(result.kind).toBe("split");
    if (result.kind !== "split") return;
    expect(result.checklist).toEqual(["A", "B", "C", ""]);
    expect(result.checklistProgress).toEqual([false, false, false, false]);
    expect(result.focusIndex).toBe(2);
  });

  it("strips bullets/numbers on paste and skips empty lines", () => {
    const result = applyChecklistItemTextChange({
      items: [""],
      progress: [false],
      index: 0,
      previousText: "",
      nextText: "- milk\n\n1. eggs\n* bread",
      selectionStart: 0,
      selectionEnd: 0,
    });
    expect(result.kind).toBe("split");
    if (result.kind !== "split") return;
    expect(result.checklist).toEqual(["milk", "eggs", "bread"]);
  });

  it("preserves text before/after the cursor when editing an existing item", () => {
    const result = applyChecklistItemTextChange({
      items: ["Hello world", "Keep me", ""],
      progress: [true, false, false],
      index: 0,
      previousText: "Hello world",
      nextText: "Hello A\nB\nC world",
      selectionStart: 6,
      selectionEnd: 6,
    });
    expect(result.kind).toBe("split");
    if (result.kind !== "split") return;
    // before = "Hello ", after = "world" → first/last keep those sides.
    expect(result.checklist).toEqual(["Hello A", "B", "Cworld", "Keep me", ""]);
    // First segment keeps the original checkbox; new rows are unchecked; siblings preserved.
    expect(result.checklistProgress).toEqual([true, false, false, false, false]);
    expect(result.focusIndex).toBe(2);
  });

  it("appends pasted lines after an existing item when caret is at the end", () => {
    // Paste "\nNext one\nNext two" at end → leading break keeps "Existing" as its own row.
    const result = applyChecklistItemTextChange({
      items: ["Existing", "Keep me", ""],
      progress: [true, false, false],
      index: 0,
      previousText: "Existing",
      nextText: "Existing\nNext one\nNext two",
      selectionStart: 8,
      selectionEnd: 8,
    });
    expect(result.kind).toBe("split");
    if (result.kind !== "split") return;
    expect(result.checklist).toEqual(["Existing", "Next one", "Next two", "Keep me", ""]);
    expect(result.checklistProgress).toEqual([true, false, false, false, false]);
  });

  it("joins the first pasted line onto existing text when paste has no leading break", () => {
    const result = applyChecklistItemTextChange({
      items: ["Existing", ""],
      progress: [false, false],
      index: 0,
      previousText: "Existing",
      nextText: "ExistingNext one\nNext two",
      selectionStart: 8,
      selectionEnd: 8,
    });
    expect(result.kind).toBe("split");
    if (result.kind !== "split") return;
    expect(result.checklist).toEqual(["ExistingNext one", "Next two", ""]);
  });

  it("does not overwrite existing checklist items after the edit row", () => {
    const result = applyChecklistItemTextChange({
      items: ["Old", "Sibling", ""],
      progress: [false, true, false],
      index: 0,
      previousText: "Old",
      nextText: "One\nTwo",
      selectionStart: 0,
      selectionEnd: 3,
    });
    expect(result.kind).toBe("split");
    if (result.kind !== "split") return;
    expect(result.checklist).toEqual(["One", "Two", "Sibling", ""]);
    expect(result.checklistProgress).toEqual([false, false, true, false]);
  });

  it("handles Unicode multiline paste", () => {
    const result = applyChecklistItemTextChange({
      items: [""],
      progress: [false],
      index: 0,
      previousText: "",
      nextText: "買う\ncafé",
      selectionStart: 0,
      selectionEnd: 0,
    });
    expect(result.kind).toBe("split");
    if (result.kind !== "split") return;
    expect(result.checklist).toEqual(["買う", "café"]);
  });
});

describe("parsePastedChecklistBlocks / headings", () => {
  it("recognizes markdown headings and ordinary item lines", () => {
    expect(parsePastedChecklistBlocks("# Health\n- Run\n## Clothes\nSocks")).toEqual([
      { type: "heading", text: "Health" },
      { type: "item", text: "Run" },
      { type: "heading", text: "Clothes" },
      { type: "item", text: "Socks" },
    ]);
  });
});

describe("applyChecklistBlockTextChange", () => {
  it("inserts heading and item blocks from a markdown paste", () => {
    const result = applyChecklistBlockTextChange({
      blocks: [createItemBlock("", false, "i0")],
      index: 0,
      previousText: "",
      nextText: "# Health\nRun\n## Clothes\nFold laundry",
      selectionStart: 0,
      selectionEnd: 0,
    });
    expect(result.kind).toBe("split");
    if (result.kind !== "split") return;
    expect(result.blocks.map((b) => ({ type: b.type, text: b.text }))).toEqual([
      { type: "heading", text: "Health" },
      { type: "item", text: "Run" },
      { type: "heading", text: "Clothes" },
      { type: "item", text: "Fold laundry" },
    ]);
  });

  it("keeps siblings when pasting headings into the middle of a list", () => {
    const result = applyChecklistBlockTextChange({
      blocks: [
        createItemBlock("Before", false, "a"),
        createItemBlock("Focus", false, "b"),
        createItemBlock("After", true, "c"),
      ],
      index: 1,
      previousText: "Focus",
      nextText: "# Mid\nX",
      selectionStart: 0,
      selectionEnd: 5,
    });
    expect(result.kind).toBe("split");
    if (result.kind !== "split") return;
    expect(result.blocks.map((b) => ({ type: b.type, text: b.text, done: b.type === "item" ? b.done : undefined }))).toEqual([
      { type: "item", text: "Before", done: false },
      { type: "heading", text: "Mid", done: undefined },
      { type: "item", text: "X", done: false },
      { type: "item", text: "After", done: true },
    ]);
  });
});
