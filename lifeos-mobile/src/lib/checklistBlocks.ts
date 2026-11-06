/**
 * Ordered checklist blocks (items + section headings) for the Notes-style editor.
 * Legacy `checklist` / `checklistProgress` stay mirrored for older surfaces.
 */

export type ChecklistItemBlock = {
  id: string;
  type: "item";
  text: string;
  done: boolean;
};

export type ChecklistHeadingBlock = {
  id: string;
  type: "heading";
  text: string;
};

export type ChecklistBlock = ChecklistItemBlock | ChecklistHeadingBlock;

let blockIdSeq = 0;

export function createChecklistBlockId(prefix = "b"): string {
  blockIdSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${blockIdSeq.toString(36)}`;
}

export function createItemBlock(text = "", done = false, id?: string): ChecklistItemBlock {
  return { id: id ?? createChecklistBlockId("i"), type: "item", text, done };
}

export function createHeadingBlock(text = "", id?: string): ChecklistHeadingBlock {
  return { id: id ?? createChecklistBlockId("h"), type: "heading", text };
}

/** Migrate legacy parallel arrays into blocks (stable ids from task + index). */
export function migrateLegacyChecklistToBlocks(
  checklist: string[] | undefined,
  checklistProgress: boolean[] | undefined,
  taskId?: number,
): ChecklistBlock[] {
  const items = checklist ?? [];
  const progress = checklistProgress ?? [];
  return items.map((text, index) =>
    createItemBlock(
      text,
      Boolean(progress[index]),
      taskId != null ? `legacy-${taskId}-${index}` : undefined,
    ),
  );
}

/** Prefer persisted blocks; otherwise migrate legacy arrays. */
export function resolveChecklistBlocks(input: {
  checklistBlocks?: ChecklistBlock[] | null;
  checklist?: string[] | null;
  checklistProgress?: boolean[] | null;
  taskId?: number;
}): ChecklistBlock[] {
  const existing = input.checklistBlocks;
  if (Array.isArray(existing) && existing.length > 0) {
    return existing.map((block) => normalizeBlock(block));
  }
  return migrateLegacyChecklistToBlocks(
    input.checklist ?? undefined,
    input.checklistProgress ?? undefined,
    input.taskId,
  );
}

function normalizeBlock(block: ChecklistBlock): ChecklistBlock {
  if (block.type === "heading") {
    return {
      id: block.id || createChecklistBlockId("h"),
      type: "heading",
      text: typeof block.text === "string" ? block.text : "",
    };
  }
  return {
    id: block.id || createChecklistBlockId("i"),
    type: "item",
    text: typeof block.text === "string" ? block.text : "",
    done: Boolean(block.done),
  };
}

/** Mirror blocks back to legacy fields (items only — headings omitted). */
export function blocksToLegacy(blocks: ChecklistBlock[]): {
  checklist: string[];
  checklistProgress: boolean[];
} {
  const items = blocks.filter((b): b is ChecklistItemBlock => b.type === "item");
  return {
    checklist: items.map((item) => item.text),
    checklistProgress: items.map((item) => item.done),
  };
}

export function ensureTrailingBlankItem(blocks: ChecklistBlock[]): ChecklistBlock[] {
  const last = blocks[blocks.length - 1];
  if (last?.type === "item" && last.text.trim() === "") return blocks;
  return [...blocks, createItemBlock("")];
}

export function isTrailingBlankItem(blocks: ChecklistBlock[], index: number): boolean {
  const block = blocks[index];
  return (
    index === blocks.length - 1 &&
    block?.type === "item" &&
    (block.text ?? "").trim() === ""
  );
}

/** Items under a heading until the next heading (exclusive of the heading). */
export function sectionRange(blocks: ChecklistBlock[], headingIndex: number): {
  start: number;
  end: number;
} {
  if (blocks[headingIndex]?.type !== "heading") {
    return { start: headingIndex, end: headingIndex + 1 };
  }
  let end = headingIndex + 1;
  while (end < blocks.length && blocks[end]?.type !== "heading") end += 1;
  return { start: headingIndex, end };
}

/** Delete a heading only — items beneath stay in place. */
export function deleteHeadingKeepItems(
  blocks: ChecklistBlock[],
  headingIndex: number,
): ChecklistBlock[] {
  if (blocks[headingIndex]?.type !== "heading") return blocks;
  return blocks.filter((_, i) => i !== headingIndex);
}

/**
 * Move a heading alone (items stay) by swapping with the nearest block
 * in `direction`, skipping into gaps between sections.
 */
export function moveHeadingAlone(
  blocks: ChecklistBlock[],
  headingIndex: number,
  direction: -1 | 1,
): ChecklistBlock[] {
  if (blocks[headingIndex]?.type !== "heading") return blocks;
  const target = headingIndex + direction;
  if (target < 0 || target >= blocks.length) return blocks;
  const next = [...blocks];
  const [heading] = next.splice(headingIndex, 1);
  next.splice(target, 0, heading);
  return next;
}

/** Move heading + following items until the next heading as one section. */
export function moveSection(
  blocks: ChecklistBlock[],
  headingIndex: number,
  direction: -1 | 1,
): ChecklistBlock[] {
  if (blocks[headingIndex]?.type !== "heading") return blocks;
  const { start, end } = sectionRange(blocks, headingIndex);
  const section = blocks.slice(start, end);

  if (direction < 0) {
    let prevHeading = -1;
    for (let i = start - 1; i >= 0; i -= 1) {
      if (blocks[i]?.type === "heading") {
        prevHeading = i;
        break;
      }
    }
    if (prevHeading < 0) {
      if (start === 0) return blocks;
      // Leading items before this first heading — park the section at the top.
      return [...section, ...blocks.slice(0, start), ...blocks.slice(end)];
    }
    return [
      ...blocks.slice(0, prevHeading),
      ...section,
      ...blocks.slice(prevHeading, start),
      ...blocks.slice(end),
    ];
  }

  if (end >= blocks.length) return blocks;
  let nextEnd = end;
  if (blocks[end]?.type === "heading") {
    nextEnd = sectionRange(blocks, end).end;
  } else {
    while (nextEnd < blocks.length && blocks[nextEnd]?.type !== "heading") nextEnd += 1;
    if (nextEnd >= blocks.length) return blocks;
    nextEnd = sectionRange(blocks, nextEnd).end;
  }
  return [
    ...blocks.slice(0, start),
    ...blocks.slice(end, nextEnd),
    ...section,
    ...blocks.slice(nextEnd),
  ];
}

export function insertBlockAt(
  blocks: ChecklistBlock[],
  index: number,
  block: ChecklistBlock,
): ChecklistBlock[] {
  const at = Math.max(0, Math.min(index, blocks.length));
  return [...blocks.slice(0, at), block, ...blocks.slice(at)];
}

export function listItemProgress(blocks: ChecklistBlock[]): { done: number; total: number } {
  const items = blocks.filter(
    (b): b is ChecklistItemBlock => b.type === "item" && b.text.trim().length > 0,
  );
  const done = items.reduce((count, item) => count + (item.done ? 1 : 0), 0);
  return { done, total: items.length };
}

export function blocksHaveContent(blocks: ChecklistBlock[] | undefined): boolean {
  return (blocks ?? []).some((b) => b.text.trim().length > 0 || b.type === "heading");
}
