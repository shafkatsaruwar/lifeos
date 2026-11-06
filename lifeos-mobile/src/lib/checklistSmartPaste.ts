/**
 * Smart Paste helpers for the Notes-style checklist editor.
 * Pure functions — unit-tested; UI wires selection + TextInput changes.
 */

const LIST_MARKER_RE =
  /^\s*(?:(?:[-*+•·▪▸►○●]|–|—)|\d+[.)]|[a-zA-Z][.)]|\[[ xX]?\]|[☐☑✓✔])\s+/u;

/** Strip a leading bullet / number / checkbox marker from one line. */
export function stripChecklistListMarker(line: string): string {
  const trimmedStart = line.replace(/^\s+/, "");
  return trimmedStart.replace(LIST_MARKER_RE, "").replace(/\s+$/, "");
}

/**
 * Split pasted text into checklist item bodies.
 * Drops empty lines; strips list markers; preserves order.
 */
export function parsePastedChecklistLines(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/\r\n|\n|\r/)
    .map(stripChecklistListMarker)
    .filter((line) => line.length > 0);
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
  // Fallback: treat the whole next value as the inserted payload.
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
      /** Row index that should receive focus after the paste. */
      focusIndex: number;
    };

/**
 * Apply a text change to one checklist row.
 * Multiline inserts (paste) become multiple items; single-line stays a normal edit.
 * Existing siblings are never overwritten — new rows are inserted after `index`.
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
  const { items, progress, index, previousText, nextText, selectionStart, selectionEnd } = args;
  const inserted = extractInsertedText(previousText, nextText, selectionStart, selectionEnd);

  if (!isMultilineChecklistPaste(inserted)) {
    return { kind: "replace", text: nextText };
  }

  const start = Math.max(0, Math.min(selectionStart, previousText.length));
  const end = Math.max(start, Math.min(selectionEnd, previousText.length));
  const before = previousText.slice(0, start);
  const after = previousText.slice(end);
  const lines = parsePastedChecklistLines(inserted);

  if (lines.length === 0) {
    return { kind: "replace", text: before + after };
  }

  // A leading newline in the paste means "break after the text before the caret"
  // so the existing prefix stays its own item (e.g. caret at end + paste "\nA\nB").
  const rawParts = inserted.split(/\r\n|\n|\r/);
  const startsWithBreak = rawParts.length > 1 && stripChecklistListMarker(rawParts[0] ?? "").length === 0;
  const endsWithBreak =
    rawParts.length > 1 && stripChecklistListMarker(rawParts[rawParts.length - 1] ?? "").length === 0;

  let segment: string[];
  if (startsWithBreak && before.length > 0) {
    const body =
      endsWithBreak && after.length > 0
        ? [...lines, after]
        : [...lines.slice(0, -1), lines[lines.length - 1] + after];
    segment = [before, ...body];
  } else if (endsWithBreak && after.length > 0) {
    segment = [before + lines[0], ...lines.slice(1), after];
  } else {
    const first = before + lines[0];
    segment =
      lines.length === 1
        ? [first + after]
        : [first, ...lines.slice(1, -1), lines[lines.length - 1] + after];
  }

  const headItems = items.slice(0, index);
  const tailItems = items.slice(index + 1);
  const checklist = [...headItems, ...segment, ...tailItems];

  const headProgress = items.slice(0, index).map((_, i) => progress[i] ?? false);
  const kept = progress[index] ?? false;
  const segmentProgress = segment.map((_, i) => (i === 0 ? kept : false));
  const tailProgress = items.slice(index + 1).map((_, i) => progress[index + 1 + i] ?? false);
  const checklistProgress = [...headProgress, ...segmentProgress, ...tailProgress];

  return {
    kind: "split",
    checklist,
    checklistProgress,
    focusIndex: index + segment.length - 1,
  };
}
