/**
 * Exact user journey the product requires:
 * Paste → dismiss keyboard → leave checklist → reopen → restart LifeOS → reopen.
 * Headings must survive every step.
 */
import {
  blocksToLegacy,
  coerceChecklistBlocks,
  ensureTrailingBlankItem,
  finalizeHeadingEdit,
  finalizeItemEdit,
  resolveChecklistBlocks,
  type ChecklistBlock,
} from "../lifeos-mobile/src/lib/checklistBlocks";
import { applyChecklistBlockTextChange } from "../lifeos-mobile/src/lib/checklistSmartPaste";
import { createItemBlock } from "../lifeos-mobile/src/lib/checklistBlocks";

const PACKING_LIST = `# CLOTHES
T-shirts
Socks

# HEALTH & TOILETRIES
Toothbrush
Sunscreen

# TECH
Charger
Adapters`;

const EXPECTED_HEADINGS = ["CLOTHES", "HEALTH & TOILETRIES", "TECH"];

const EXPECTED_SHAPE = [
  "heading:CLOTHES",
  "item:T-shirts",
  "item:Socks",
  "heading:HEALTH & TOILETRIES",
  "item:Toothbrush",
  "item:Sunscreen",
  "heading:TECH",
  "item:Charger",
  "item:Adapters",
];

function shape(blocks: ChecklistBlock[]): string[] {
  return blocks
    .filter((b) => !(b.type === "item" && b.text.trim() === ""))
    .map((b) => `${b.type}:${b.text}`);
}

function headingsOf(blocks: ChecklistBlock[]): string[] {
  return blocks.filter((b) => b.type === "heading").map((b) => b.text);
}

/** What SimpleChecklistScreen persists when leaving the screen. */
function saveTaskSnapshot(blocks: ChecklistBlock[]) {
  const ensured = ensureTrailingBlankItem(blocks);
  const legacy = blocksToLegacy(ensured);
  const task = {
    id: 42,
    title: "Packing",
    checklistBlocks: ensured,
    checklist: legacy.checklist,
    checklistProgress: legacy.checklistProgress,
  };
  // App.tsx saveWorkspacePart: JSON.parse(JSON.stringify(value))
  return JSON.parse(JSON.stringify(task)) as typeof task;
}

/** RTDB often rehydrates arrays as sparse objects. */
function simulateFirebaseTaskReload(task: ReturnType<typeof saveTaskSnapshot>) {
  const raw = JSON.parse(JSON.stringify(task));
  if (Array.isArray(raw.checklistBlocks)) {
    raw.checklistBlocks = Object.fromEntries(
      raw.checklistBlocks.map((b: ChecklistBlock, i: number) => [String(i), b]),
    );
  }
  if (Array.isArray(raw.checklist)) {
    raw.checklist = Object.fromEntries(raw.checklist.map((t: string, i: number) => [String(i), t]));
  }
  if (Array.isArray(raw.checklistProgress)) {
    raw.checklistProgress = Object.fromEntries(
      raw.checklistProgress.map((d: boolean, i: number) => [String(i), d]),
    );
  }
  return raw;
}

function openChecklist(task: {
  id: number;
  checklistBlocks?: unknown;
  checklist?: unknown;
  checklistProgress?: unknown;
}): ChecklistBlock[] {
  const checklist = Array.isArray(task.checklist)
    ? task.checklist
    : task.checklist && typeof task.checklist === "object"
      ? Object.values(task.checklist as Record<string, string>)
      : [];
  const progress = Array.isArray(task.checklistProgress)
    ? task.checklistProgress
    : task.checklistProgress && typeof task.checklistProgress === "object"
      ? Object.values(task.checklistProgress as Record<string, boolean>)
      : [];
  return resolveChecklistBlocks({
    checklistBlocks: task.checklistBlocks as ChecklistBlock[] | Record<string, ChecklistBlock> | null,
    checklist: checklist as string[],
    checklistProgress: progress as boolean[],
    taskId: task.id,
  });
}

describe("heading survival journey", () => {
  it("Paste → dismiss keyboard → leave → reopen → restart LifeOS → reopen", () => {
    // 1) Paste into a new empty checklist row
    const pasted = applyChecklistBlockTextChange({
      blocks: [createItemBlock("", false, "blank")],
      index: 0,
      previousText: "",
      nextText: PACKING_LIST,
      selectionStart: 0,
      selectionEnd: 0,
    });
    expect(pasted.kind).toBe("split");
    if (pasted.kind !== "split") return;
    let blocks = pasted.blocks;
    expect(headingsOf(blocks)).toEqual(EXPECTED_HEADINGS);
    expect(shape(blocks)).toEqual(EXPECTED_SHAPE);

    // 2) Dismiss keyboard — every row blurs (draft may be "" after remount)
    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      blocks =
        block.type === "heading"
          ? finalizeHeadingEdit(blocks, i, "")
          : finalizeItemEdit(blocks, i, block.text);
    }
    expect(headingsOf(blocks)).toEqual(EXPECTED_HEADINGS);
    expect(shape(blocks)).toEqual(EXPECTED_SHAPE);

    // 3) Leave checklist — persist like updateTasks / saveWorkspacePart
    const saved = saveTaskSnapshot(blocks);
    expect(headingsOf(saved.checklistBlocks)).toEqual(EXPECTED_HEADINGS);
    expect(saved.checklist.filter((line) => line.startsWith("# "))).toEqual([
      "# CLOTHES",
      "# HEALTH & TOILETRIES",
      "# TECH",
    ]);

    // 4) Reopen checklist — resolve from saved task (checklistBlocks present)
    const reopened = openChecklist(saved);
    expect(headingsOf(reopened)).toEqual(EXPECTED_HEADINGS);
    expect(shape(reopened)).toEqual(EXPECTED_SHAPE);

    // 5) Restart LifeOS — full JSON + RTDB object-shaped lists
    const afterRestart = simulateFirebaseTaskReload(saved);
    expect(coerceChecklistBlocks(afterRestart.checklistBlocks).length).toBeGreaterThan(0);

    // 6) Reopen again after restart
    const reopenedAfterRestart = openChecklist(afterRestart);
    expect(headingsOf(reopenedAfterRestart)).toEqual(EXPECTED_HEADINGS);
    expect(shape(reopenedAfterRestart)).toEqual(EXPECTED_SHAPE);

    // Harsh restart: checklistBlocks missing, only legacy arrays (older clients / partial sync)
    const legacyOnly = {
      id: 42,
      checklist: saved.checklist,
      checklistProgress: saved.checklistProgress,
    };
    const fromLegacyOnly = openChecklist(legacyOnly);
    expect(headingsOf(fromLegacyOnly)).toEqual(EXPECTED_HEADINGS);
    expect(shape(fromLegacyOnly)).toEqual(EXPECTED_SHAPE);
  });
});
