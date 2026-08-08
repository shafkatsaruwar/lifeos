/**
 * Handwriting recognition architecture (Phase 6) — placeholders only.
 *
 * Intended path on Apple platforms:
 * - PKDrawing → image or stroke path
 * - Vision framework / PencilKit recognition APIs when available
 * - Persist result on NotebookPage.recognition (status + transcript)
 *
 * Search must only match `recognition.transcript` when status === "ready".
 * Never invent OCR text for ink.
 */

import type { NotebookPage, PageRecognitionIndex, NoteInk } from "../types";

export function emptyRecognition(): PageRecognitionIndex {
  return { status: "idle", engine: "none" };
}

/** True when a native recognizer module is linked. Always false until wired. */
export function isHandwritingRecognitionAvailable(): boolean {
  return false;
}

/**
 * Queue recognition for a page. No-op until an engine exists.
 * Callers should set recognition.status = "unavailable" rather than fake "ready".
 */
export async function recognizePageInk(
  _page: NotebookPage,
  _ink?: NoteInk,
): Promise<PageRecognitionIndex> {
  if (!isHandwritingRecognitionAvailable()) {
    return { status: "unavailable", engine: "none", updatedAt: new Date().toISOString() };
  }
  return { status: "pending", engine: "apple-vision", updatedAt: new Date().toISOString() };
}

/** Searchable text from recognition only when actually ready. */
export function recognitionSearchText(page: NotebookPage): string {
  if (page.recognition?.status === "ready" && page.recognition.transcript) {
    return page.recognition.transcript;
  }
  return "";
}
