import {
  blocksToLegacy,
  coerceChecklistBlocks,
  convertChecklistBlockType,
  createHeadingBlock,
  createItemBlock,
  deleteHeadingKeepItems,
  ensureTrailingBlankItem,
  finalizeHeadingEdit,
  finalizeItemEdit,
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

  it("encodes headings in legacy mirror and restores them on migrate", () => {
    const blocks = [
      createHeadingBlock("CLOTHES", "h1"),
      createItemBlock("Socks", true, "i1"),
    ];
    const legacy = blocksToLegacy(blocks);
    expect(legacy).toEqual({
      checklist: ["# CLOTHES", "Socks"],
      checklistProgress: [false, true],
    });
    const restored = migrateLegacyChecklistToBlocks(legacy.checklist, legacy.checklistProgress, 5);
    expect(restored.map((b) => ({ type: b.type, text: b.text }))).toEqual([
      { type: "heading", text: "CLOTHES" },
      { type: "item", text: "Socks" },
    ]);
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

describe("finalizeHeadingEdit (keyboard dismiss / blur regression)", () => {
  it("keeps a nonempty heading when React state still has empty text", () => {
    // Mirrors the bug: onChangeText saved "Health" in a draft, but `blocks`
    // from the last render still has text "" when onBlur runs.
    const items = [
      createItemBlock("Milk", true, "i0"),
      createHeadingBlock("", "h-new"),
      createItemBlock("Eggs", false, "i1"),
      createItemBlock("", false, "i2"),
    ];
    const next = finalizeHeadingEdit(items, 1, "Health");
    expect(next.find((b) => b.id === "h-new")).toMatchObject({
      type: "heading",
      text: "Health",
    });
    expect(next.find((b) => b.id === "i0")).toMatchObject({ text: "Milk", done: true });
    expect(next.find((b) => b.id === "i1")).toMatchObject({ text: "Eggs", done: false });
  });

  it("keeps committed heading text when blur draft is spuriously empty", () => {
    // After Smart Paste, FlatList remount can blur with draft "" while block.text is set.
    const items = [
      createHeadingBlock("CLOTHES", "h1"),
      createItemBlock("Socks", false, "i1"),
    ];
    const next = finalizeHeadingEdit(items, 0, "");
    expect(next.find((b) => b.id === "h1")).toMatchObject({ type: "heading", text: "CLOTHES" });
  });

  it("discards only a genuinely empty heading on blur", () => {
    const items = [
      createItemBlock("Milk", false, "i0"),
      createHeadingBlock("", "h-new"),
      createItemBlock("", false, "i1"),
    ];
    const next = finalizeHeadingEdit(items, 1, "   ");
    expect(next.map((b) => b.id)).toEqual(["i0", "i1"]);
  });

  it("preserves heading position among existing items", () => {
    const items = [
      createItemBlock("A", false, "a"),
      createHeadingBlock("Mid", "h"),
      createItemBlock("B", true, "b"),
    ];
    const next = finalizeHeadingEdit(items, 1, "Mid");
    expect(next).toBe(items); // no change when draft matches
    expect(next.map((b) => b.id)).toEqual(["a", "h", "b"]);
  });
});

describe("heading create → edit → dismiss → reload (persistence)", () => {
  it("survives legacy mirror + resolve after create/edit (nav / restart)", () => {
    const started = [
      createItemBlock("Milk", true, "legacy-1-0"),
      createItemBlock("Eggs", false, "legacy-1-1"),
      createItemBlock("", false, "legacy-1-2"),
    ];
    const withHeading = [
      ...started.slice(0, 1),
      createHeadingBlock("", "h1"),
      ...started.slice(1),
    ];
    // Type + dismiss keyboard (draft ahead of committed empty text).
    const afterBlur = finalizeHeadingEdit(withHeading, 1, "Health");
    const saved = ensureTrailingBlankItem(afterBlur);
    const legacy = blocksToLegacy(saved);

    // Simulate Firebase round-trip: blocks as sparse object, legacy arrays present.
    const asObject = Object.fromEntries(saved.map((b, i) => [String(i), b]));
    const reloaded = resolveChecklistBlocks({
      checklistBlocks: asObject,
      checklist: legacy.checklist,
      checklistProgress: legacy.checklistProgress,
      taskId: 1,
    });

    expect(reloaded.map((b) => ({ type: b.type, text: b.text, done: b.type === "item" ? b.done : undefined }))).toEqual(
      expect.arrayContaining([
        { type: "item", text: "Milk", done: true },
        { type: "heading", text: "Health", done: undefined },
        { type: "item", text: "Eggs", done: false },
      ]),
    );
    expect(reloaded.find((b) => b.type === "heading")).toMatchObject({ text: "Health" });
    // Heading sits between Milk and Eggs.
    const headingAt = reloaded.findIndex((b) => b.type === "heading");
    expect(reloaded[headingAt - 1]).toMatchObject({ text: "Milk" });
    expect(reloaded[headingAt + 1]).toMatchObject({ text: "Eggs" });
  });

  it("coerceChecklistBlocks reads RTDB object lists", () => {
    const coerced = coerceChecklistBlocks({
      0: createHeadingBlock("Clothes", "h"),
      1: createItemBlock("Socks", false, "i"),
    });
    expect(coerced).toHaveLength(2);
    expect(coerced[0]).toMatchObject({ type: "heading", text: "Clothes" });
  });

  it("does not remigrate from legacy when blocks exist (headings would be lost)", () => {
    const resolved = resolveChecklistBlocks({
      checklistBlocks: [createHeadingBlock("Health", "h"), createItemBlock("Run", false, "i")],
      checklist: ["Run", "ONLY_LEGACY"],
      checklistProgress: [false, true],
      taskId: 9,
    });
    expect(resolved.map((b) => b.text)).toEqual(["Health", "Run"]);
  });
});

describe("finalizeItemEdit", () => {
  it("keeps trailing blank items", () => {
    const items = [createItemBlock("A", false, "a"), createItemBlock("", false, "b")];
    expect(finalizeItemEdit(items, 1, "")).toEqual(items);
  });
});

describe("convertChecklistBlockType", () => {
  it("converts an item to a heading in place (id, text, position)", () => {
    const blocks = [
      createItemBlock("Before", false, "a"),
      createItemBlock("Health", true, "mid"),
      createItemBlock("After", true, "c"),
    ];
    const next = convertChecklistBlockType(blocks, 1, "heading");
    expect(next.map((b) => b.id)).toEqual(["a", "mid", "c"]);
    expect(next[1]).toEqual({
      id: "mid",
      type: "heading",
      text: "Health",
      priorDone: true,
    });
    expect(next[0]).toMatchObject({ type: "item", text: "Before", done: false });
    expect(next[2]).toMatchObject({ type: "item", text: "After", done: true });
  });

  it("converts a heading back to an unchecked item", () => {
    const blocks = [
      createItemBlock("Before", false, "a"),
      { id: "mid", type: "heading" as const, text: "Health", priorDone: true },
      createItemBlock("After", true, "c"),
    ];
    const next = convertChecklistBlockType(blocks, 1, "item");
    expect(next[1]).toEqual({ id: "mid", type: "item", text: "Health", done: false });
    expect(next[0]).toMatchObject({ text: "Before", done: false });
    expect(next[2]).toMatchObject({ text: "After", done: true });
  });

  it("does not convert the trailing blank item", () => {
    const blocks = [createItemBlock("A", false, "a"), createItemBlock("", false, "blank")];
    expect(convertChecklistBlockType(blocks, 1, "heading")).toBe(blocks);
  });

  it("survives persistence round-trip after convert", () => {
    const blocks = [
      createItemBlock("Milk", true, "i0"),
      createItemBlock("Health", false, "i1"),
      createItemBlock("Eggs", false, "i2"),
    ];
    const converted = convertChecklistBlockType(blocks, 1, "heading");
    const saved = ensureTrailingBlankItem(converted);
    const legacy = blocksToLegacy(saved);
    const reloaded = resolveChecklistBlocks({
      checklistBlocks: saved,
      checklist: legacy.checklist,
      checklistProgress: legacy.checklistProgress,
      taskId: 7,
    });
    expect(reloaded[1]).toMatchObject({ id: "i1", type: "heading", text: "Health" });
    expect(reloaded[0]).toMatchObject({ text: "Milk", done: true });
    expect(reloaded[2]).toMatchObject({ text: "Eggs", done: false });
  });
});
