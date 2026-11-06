/**
 * Smart Paste helpers for the Notes-style checklist editor.
 * Pure functions — unit-tested; UI wires selection + TextInput changes.
 */

import {
  createHeadingBlock,
  createItemBlock,
  type ChecklistBlock,
  type ChecklistItemBlock,
} from "./checklistBlocks";

const LIST_MARKER_RE =
  /^\s*(?:(?:[-*+•·▪▸►○●]|–|—)|\d+[.)]|[a-zA-Z][.)]|\[[ xX]?\]|[☐☑✓✔])\s+/u;

const MARKDOWN_HEADING_RE = /^(#{1,6})\s+(.+)$/;

/** Strip a leading bullet / number / checkbox marker from one line. */
export function stripChecklistListMarker(line: string): string {
  const trimmedStart = line.replace(/^\s+/, "");
  return trimmedStart.replace(LIST_MARKER_RE, "").replace(/\s+$/, "");
}

export type PastedChecklistLine =
  | { type: "item"; text: string }
  | { type: "heading"; text: string };

/** Parse one pasted line into an item or explicit markdown heading (`#` / `##`). */
export function parsePastedChecklistLine(rawLine: string): PastedChecklistLine | null {
  const trimmed = rawLine.replace(/^\s+/, "").replace(/\s+$/, "");
  if (!trimmed) return null;

  const heading = trimmed.match(MARKDOWN_HEADING_RE);
  if (heading) {
    const text = (heading[2] ?? "").trim();
    return text ? { type: "heading", text } : null;
  }

  const text = stripChecklistListMarker(trimmed);
  return text ? { type: "item", text } : null;
}

/**
 * Split pasted text into checklist lines (items + headings).
 * Drops empty lines; strips list markers; recognizes `# Heading` lines.
 */
export function parsePastedChecklistBlocks(raw: string): PastedChecklistLine[] {
  if (!raw) return [];
  return raw
    .split(/\r\n|\n|\r/)
    .map(parsePastedChecklistLine)
    .filter((line): line is PastedChecklistLine => line != null);
}

/** @deprecated Prefer parsePastedChecklistBlocks — item texts only. */
export function parsePastedChecklistLines(raw: string): string[] {
  return parsePastedChecklistBlocks(raw)
    .filter((line): line is Extract<PastedChecklistLine, { type: "item" }> => line.type === "item")
    .map((line) => line.text);
}

/** Extract the inserted slice using the pre-change selection when possible. */
export function extractInsertedText(
  previousText: string,
  nextText: string,
  selectionStart: number,
  selectionEnd: number,
): string {
  const start = Math.max(0, Math.min(selectionStart, previousText.length));
  const end = Math.max(start, Math.min(selectionEnd, previousText.length));
  const before = previousText.slice(0, start);
  const after = previousText.slice(end);
  if (
    nextText.startsWith(before) &&
    nextText.endsWith(after) &&
    nextText.length >= before.length + after.length
  ) {
    return nextText.slice(before.length, nextText.length - after.length);
  }
  return nextText;
}

export function isMultilineChecklistPaste(insertedText: string): boolean {
  return /[\r\n]/.test(insertedText);
}

export type ChecklistTextChangeResult =
  | { kind: "replace"; text: string }
  | {
      kind: "split";
      checklist: string[];
      checklistProgress: boolean[];
      focusIndex: number;
    };

export type ChecklistBlockTextChangeResult =
  | { kind: "replace"; text: string }
  | {
      kind: "split";
      blocks: ChecklistBlock[];
      focusIndex: number;
    };

function lineToBlock(line: PastedChecklistLine, done = false): ChecklistBlock {
  return line.type === "heading"
    ? createHeadingBlock(line.text)
    : createItemBlock(line.text, done);
}

function joinPrefix(before: string, line: PastedChecklistLine): ChecklistBlock[] {
  if (!before) return [lineToBlock(line)];
  if (line.type === "heading") {
    return [createItemBlock(before), createHeadingBlock(line.text)];
  }
  return [createItemBlock(before + line.text)];
}

function joinSuffix(line: PastedChecklistLine, after: string, done = false): ChecklistBlock[] {
  if (!after) return [lineToBlock(line, done)];
  if (line.type === "heading") {
    return [createHeadingBlock(line.text), createItemBlock(after, done)];
  }
  return [createItemBlock(line.text + after, done)];
}

/**
 * Apply a text change to one checklist item block.
 * Multiline inserts (paste) become multiple blocks; `#` lines become headings.
 */
export function applyChecklistBlockTextChange(args: {
  blocks: ChecklistBlock[];
  index: number;
  previousText: string;
  nextText: string;
  selectionStart: number;
  selectionEnd: number;
}): ChecklistBlockTextChangeResult {
  const { blocks, index, previousText, nextText, selectionStart, selectionEnd } = args;
  const current = blocks[index];
  if (!current || current.type !== "item") {
    return { kind: "replace", text: nextText };
  }

  const inserted = extractInsertedText(previousText, nextText, selectionStart, selectionEnd);
  if (!isMultilineChecklistPaste(inserted)) {
    return { kind: "replace", text: nextText };
  }

  const start = Math.max(0, Math.min(selectionStart, previousText.length));
  const end = Math.max(start, Math.min(selectionEnd, previousText.length));
  const before = previousText.slice(0, start);
  const after = previousText.slice(end);
  const lines = parsePastedChecklistBlocks(inserted);

  if (lines.length === 0) {
    return { kind: "replace", text: before + after };
  }

  const rawParts = inserted.split(/\r\n|\n|\r/);
  const startsWithBreak =
    rawParts.length > 1 && parsePastedChecklistLine(rawParts[0] ?? "") == null;
  const endsWithBreak =
    rawParts.length > 1 && parsePastedChecklistLine(rawParts[rawParts.length - 1] ?? "") == null;

  const segment = buildPasteSegment({
    before,
    after,
    lines,
    startsWithBreak,
    endsWithBreak,
    keptDone: current.done,
  });

  const nextBlocks = [...blocks.slice(0, index), ...segment, ...blocks.slice(index + 1)];
  return {
    kind: "split",
    blocks: nextBlocks,
    focusIndex: index + Math.max(segment.length - 1, 0),
  };
}

function buildPasteSegment(args: {
  before: string;
  after: string;
  lines: PastedChecklistLine[];
  startsWithBreak: boolean;
  endsWithBreak: boolean;
  keptDone: boolean;
}): ChecklistBlock[] {
  const { before, after, lines, startsWithBreak, endsWithBreak, keptDone } = args;

  if (startsWithBreak && before.length > 0) {
    const head = createItemBlock(before, keptDone);
    if (endsWithBreak && after.length > 0) {
      return [head, ...lines.map((line) => lineToBlock(line)), createItemBlock(after)];
    }
    const mid = lines.slice(0, -1).map((line) => lineToBlock(line));
    const last = joinSuffix(lines[lines.length - 1], after);
    return [head, ...mid, ...last];
  }

  if (endsWithBreak && after.length > 0) {
    const first = joinPrefix(before, lines[0]);
    if (first[0]?.type === "item") (first[0] as ChecklistItemBlock).done = keptDone;
    return [
      ...first,
      ...lines.slice(1).map((line) => lineToBlock(line)),
      createItemBlock(after),
    ];
  }

  if (lines.length === 1) {
    const only = lines[0];
    if (only.type === "heading") {
      return [
        ...(before ? [createItemBlock(before, keptDone)] : []),
        createHeadingBlock(only.text),
        ...(after ? [createItemBlock(after)] : []),
      ];
    }
    return [createItemBlock(before + only.text + after, keptDone)];
  }

  const first = joinPrefix(before, lines[0]);
  if (first[0]?.type === "item") (first[0] as ChecklistItemBlock).done = keptDone;
  const mid = lines.slice(1, -1).map((line) => lineToBlock(line));
  const last = joinSuffix(lines[lines.length - 1], after);
  return [...first, ...mid, ...last];
}

/**
 * Legacy string-array paste API (used by older tests / mirrors).
 * Headings are flattened to their display text as ordinary items.
 */
export function applyChecklistItemTextChange(args: {
  items: string[];
  progress: boolean[];
  index: number;
  previousText: string;
  nextText: string;
  selectionStart: number;
  selectionEnd: number;
}): ChecklistTextChangeResult {
  const blocks: ChecklistBlock[] = args.items.map((text, i) =>
    createItemBlock(text, args.progress[i] ?? false, `tmp-${i}`),
  );
  const result = applyChecklistBlockTextChange({
    blocks,
    index: args.index,
    previousText: args.previousText,
    nextText: args.nextText,
    selectionStart: args.selectionStart,
    selectionEnd: args.selectionEnd,
  });
  if (result.kind === "replace") return result;

  const checklist: string[] = [];
  const checklistProgress: boolean[] = [];
  for (const block of result.blocks) {
    if (block.type === "heading") {
      checklist.push(block.text);
      checklistProgress.push(false);
    } else {
      checklist.push(block.text);
      checklistProgress.push(block.done);
    }
  }
  return {
    kind: "split",
    checklist,
    checklistProgress,
    focusIndex: Math.min(result.focusIndex, checklist.length - 1),
  };
}
