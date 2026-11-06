import {
  blocksToLegacy,
  createHeadingBlock,
  createItemBlock,
  deleteHeadingKeepItems,
  ensureTrailingBlankItem,
  listItemProgress,
  migrateLegacyChecklistToBlocks,
  moveHeadingAlone,
  moveSection,
  resolveChecklistBlocks,
  sectionRange,
} from "../lifeos-mobile/src/lib/checklistBlocks";

describe("migrateLegacyChecklistToBlocks", () => {
  it("preserves order, text, and completion state", () => {
    const blocks = migrateLegacyChecklistToBlocks(["Milk", "Eggs", ""], [true, false, false], 42);
    expect(blocks).toEqual([
      { id: "legacy-42-0", type: "item", text: "Milk", done: true },
      { id: "legacy-42-1", type: "item", text: "Eggs", done: false },
      { id: "legacy-42-2", type: "item", text: "", done: false },
    ]);
  });

  it("round-trips through blocksToLegacy", () => {
    const blocks = migrateLegacyChecklistToBlocks(["A", "B"], [false, true], 1);
    expect(blocksToLegacy(blocks)).toEqual({
      checklist: ["A", "B"],
      checklistProgress: [false, true],
    });
  });
});

describe("resolveChecklistBlocks", () => {
  it("prefers persisted blocks over legacy arrays", () => {
    const blocks = resolveChecklistBlocks({
      checklistBlocks: [createHeadingBlock("Health", "h1"), createItemBlock("Run", false, "i1")],
      checklist: ["ignored"],
      checklistProgress: [true],
      taskId: 9,
    });
    expect(blocks.map((b) => b.type)).toEqual(["heading", "item"]);
    expect(blocks[0]).toMatchObject({ text: "Health" });
  });

  it("migrates when blocks are missing", () => {
    const blocks = resolveChecklistBlocks({
      checklist: ["Only"],
      checklistProgress: [true],
      taskId: 3,
    });
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: "item", text: "Only", done: true });
  });
});

describe("heading delete and move", () => {
  const sample = [
    createHeadingBlock("Health", "h1"),
    createItemBlock("Run", false, "i1"),
    createItemBlock("Stretch", true, "i2"),
    createHeadingBlock("Clothes", "h2"),
    createItemBlock("Laundry", false, "i3"),
    createItemBlock("", false, "i4"),
  ];

  it("sectionRange covers items until the next heading", () => {
    expect(sectionRange(sample, 0)).toEqual({ start: 0, end: 3 });
    expect(sectionRange(sample, 3)).toEqual({ start: 3, end: 6 });
  });

  it("deletes a heading without removing items beneath it", () => {
    const next = deleteHeadingKeepItems(sample, 0);
    expect(next.map((b) => ("text" in b ? b.text : ""))).toEqual([
      "Run",
      "Stretch",
      "Clothes",
      "Laundry",
      "",
    ]);
    expect(next.some((b) => b.id === "h1")).toBe(false);
    expect(next.find((b) => b.id === "i1")).toMatchObject({ text: "Run" });
  });

  it("moves a heading alone", () => {
    const down = moveHeadingAlone(sample, 0, 1);
    expect(down.map((b) => b.id)).toEqual(["i1", "h1", "i2", "h2", "i3", "i4"]);
  });

  it("moves a section (heading + items) down and up", () => {
    const down = moveSection(sample, 0, 1);
    expect(down.map((b) => b.id)).toEqual(["h2", "i3", "i4", "h1", "i1", "i2"]);
    const up = moveSection(down, 3, -1);
    expect(up.map((b) => b.id)).toEqual(["h1", "i1", "i2", "h2", "i3", "i4"]);
  });
});

describe("ensureTrailingBlankItem / listItemProgress", () => {
  it("appends a blank item when needed", () => {
    const blocks = [createHeadingBlock("A"), createItemBlock("One")];
    const next = ensureTrailingBlankItem(blocks);
    expect(next[next.length - 1]).toMatchObject({ type: "item", text: "" });
  });

  it("counts only nonempty items for progress", () => {
    expect(
      listItemProgress([
        createHeadingBlock("H"),
        createItemBlock("A", true),
        createItemBlock("B", false),
        createItemBlock(""),
      ]),
    ).toEqual({ done: 1, total: 2 });
  });
});
