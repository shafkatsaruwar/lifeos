/**
 * Notebook AI architecture (Phase 6) — placeholders only.
 *
 * Principles (from product brief):
 * - Writing comes first; AI is secondary and never interrupts the canvas
 * - No giant AI button on the page
 * - Do not pretend model results if nothing is wired
 *
 * Future actions (post-write, optional sheet):
 * - Summarize this page
 * - Explain this note
 * - Turn into flashcards / study guide
 * - Extract tasks into LifeOS
 * - Find related notebooks
 *
 * Wire to existing `/api/ai` copilot with notebook/page context when ready.
 */

export type NotebookAiAction =
  | "summarize-page"
  | "explain"
  | "flashcards"
  | "study-guide"
  | "extract-tasks"
  | "related";

export type NotebookAiRequest = {
  action: NotebookAiAction;
  notebookId: string;
  pageId: string;
  /** Typed text + optional recognition transcript — never fake ink OCR */
  contextText: string;
  lifeOsContext?: { classId?: string; projectName?: string };
};

export type NotebookAiResult = {
  ok: false;
  reason: string;
};

export function isNotebookAiAvailable(): boolean {
  // Mobile already has askCopilot for general LifeOS; notebook-scoped actions are not wired.
  return false;
}

export async function runNotebookAi(_request: NotebookAiRequest): Promise<NotebookAiResult> {
  return {
    ok: false,
    reason: "Notebook AI actions are not connected yet. Write first — AI comes later.",
  };
}

/** Build context string from real page data only (typed text + ready recognition). */
export function buildPageAiContext(input: {
  title?: string;
  textElements?: Array<{ text: string }>;
  recognitionTranscript?: string;
}): string {
  const parts: string[] = [];
  if (input.title?.trim()) parts.push(input.title.trim());
  for (const el of input.textElements ?? []) {
    if (el.text?.trim()) parts.push(el.text.trim());
  }
  if (input.recognitionTranscript?.trim()) parts.push(input.recognitionTranscript.trim());
  return parts.join("\n\n");
}
