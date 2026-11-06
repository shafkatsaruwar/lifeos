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
  /**
   * Prior item completion, kept when converting item → heading.
   * Never shown as a checkbox on headings.
   */
  priorDone?: boolean;
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

/** Legacy mirror encodes headings as `# Title` / `## Title` lines in `checklist`. */
export const LEGACY_HEADING_LINE_RE = /^(#{1,6})\s+(.+)$/;

export function legacyLineToBlock(
  text: string,
  done: boolean,
  id?: string,
): ChecklistBlock {
  const heading = text.match(LEGACY_HEADING_LINE_RE);
  if (heading) {
    const title = (heading[2] ?? "").trim();
    if (title) return createHeadingBlock(title, id);
  }
  return createItemBlock(text, done, id);
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
    legacyLineToBlock(
      text,
      Boolean(progress[index]),
      taskId != null ? `legacy-${taskId}-${index}` : undefined,
    ),
  );
}

/** RTDB may return lists as arrays or as sparse objects — normalize either. */
export function coerceChecklistBlocks(
  value: ChecklistBlock[] | Record<string, ChecklistBlock> | null | undefined,
): ChecklistBlock[] {
  if (Array.isArray(value)) return value.map((block) => normalizeBlock(block));
  if (value && typeof value === "object") {
    return Object.values(value).map((block) => normalizeBlock(block as ChecklistBlock));
  }
  return [];
}

/** Prefer persisted blocks; otherwise migrate legacy arrays. */
export function resolveChecklistBlocks(input: {
  checklistBlocks?: ChecklistBlock[] | Record<string, ChecklistBlock> | null;
  checklist?: string[] | null;
  checklistProgress?: boolean[] | null;
  taskId?: number;
}): ChecklistBlock[] {
  const existing = coerceChecklistBlocks(input.checklistBlocks);
  if (existing.length > 0) return existing;
  return migrateLegacyChecklistToBlocks(
    input.checklist ?? undefined,
    input.checklistProgress ?? undefined,
    input.taskId,
  );
}

/**
 * End editing on a heading: commit the draft text, discard only if genuinely empty.
 * If the draft is blank but the committed block still has text (common after a
 * FlatList remount blanks the TextInput draft), keep the committed text — never
 * delete a nonempty heading because of a stale empty draft.
 */
export function finalizeHeadingEdit(
  blocks: ChecklistBlock[],
  index: number,
  draftText: string,
): ChecklistBlock[] {
  const block = blocks[index];
  if (!block || block.type !== "heading") return blocks;
  const text = draftText.trim() !== "" ? draftText : block.text;
  if (text.trim() === "") {
    return blocks.filter((_, i) => i !== index);
  }
  if (block.text === text) return blocks;
  return blocks.map((b, i) => (i === index && b.type === "heading" ? { ...b, text } : b));
}

/** End editing on an item: drop mid-list empties; keep trailing blank. */
export function finalizeItemEdit(
  blocks: ChecklistBlock[],
  index: number,
  draftText: string,
): ChecklistBlock[] {
  const block = blocks[index];
  if (!block || block.type !== "item") return blocks;
  const withText =
    block.text === draftText
      ? blocks
      : blocks.map((b, i) => (i === index && b.type === "item" ? { ...b, text: draftText } : b));
  if (isTrailingBlankItem(withText, index)) return withText;
  if (draftText.trim() !== "") return withText;
  return withText.filter((_, i) => i !== index);
}

function normalizeBlock(block: ChecklistBlock): ChecklistBlock {
  if (block.type === "heading") {
    const heading: ChecklistHeadingBlock = {
      id: block.id || createChecklistBlockId("h"),
      type: "heading",
      text: typeof block.text === "string" ? block.text : "",
    };
    if (block.priorDone) heading.priorDone = true;
    return heading;
  }
  return {
    id: block.id || createChecklistBlockId("i"),
    type: "item",
    text: typeof block.text === "string" ? block.text : "",
    done: Boolean(block.done),
  };
}

/**
 * Convert a checklist item ↔ heading in place.
 * Preserves id, text, and list position; does not touch neighbors.
 * Item → heading: stores `priorDone` when the item was completed (no checkbox shown).
 * Heading → item: always unchecked per product rules.
 */
export function convertChecklistBlockType(
  blocks: ChecklistBlock[],
  index: number,
  to: "heading" | "item",
): ChecklistBlock[] {
  const block = blocks[index];
  if (!block) return blocks;

  if (to === "heading") {
    if (block.type === "heading") return blocks;
    if (isTrailingBlankItem(blocks, index)) return blocks;
    const heading: ChecklistHeadingBlock = {
      id: block.id,
      type: "heading",
      text: block.text,
    };
    if (block.done) heading.priorDone = true;
    return blocks.map((b, i) => (i === index ? heading : b));
  }

  if (block.type === "item") return blocks;
  const item: ChecklistItemBlock = {
    id: block.id,
    type: "item",
    text: block.text,
    done: false,
  };
  return blocks.map((b, i) => (i === index ? item : b));
}

/**
 * Mirror blocks into legacy `checklist` / `checklistProgress`.
 * Headings are encoded as `# Title` so a blocks-less reload still restores them
 * (RTDB/clients that drop `checklistBlocks` must not erase section structure).
 */
export function blocksToLegacy(blocks: ChecklistBlock[]): {
  checklist: string[];
  checklistProgress: boolean[];
} {
  const checklist: string[] = [];
  const checklistProgress: boolean[] = [];
  for (const block of blocks) {
    if (block.type === "heading") {
      checklist.push(`# ${block.text}`);
      checklistProgress.push(false);
    } else {
      checklist.push(block.text);
      checklistProgress.push(block.done);
    }
  }
  return { checklist, checklistProgress };
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
