import type {
  Notebook,
  NotebookContextLink,
  NotebookFolder,
  NotebookHub,
  NotebookPage,
  PageImageElement,
  PageTextElement,
  PaperStyle,
} from "../types";
import { recognitionSearchText } from "./handwritingRecognition";
import { uid } from "./helpers";

export const PAPER_OPTIONS: { key: PaperStyle; label: string }[] = [
  { key: "blank", label: "Blank" },
  { key: "ruled", label: "Ruled" },
  { key: "narrowRuled", label: "Narrow" },
  { key: "grid", label: "Grid" },
  { key: "dotted", label: "Dotted" },
  { key: "cornell", label: "Cornell" },
];

export const NOTEBOOK_COLORS = ["#625AF6", "#3F7ED7", "#31926A", "#D38232", "#D95754", "#202124"] as const;

export const TEXT_SIZES = [14, 18, 24, 32] as const;

export function emptyNotebookHub(): NotebookHub {
  return { folders: [], notebooks: [] };
}

export function createFolder(name: string, color?: string): NotebookFolder {
  const now = new Date().toISOString();
  return { id: uid(), name: name.trim() || "Untitled folder", color, createdAt: now, updatedAt: now };
}

export function createNotebook(
  name: string,
  opts?: { folderId?: string; color?: string; context?: NotebookContextLink },
): Notebook {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: name.trim() || "Untitled notebook",
    folderId: opts?.folderId,
    color: opts?.color ?? NOTEBOOK_COLORS[0],
    cover: "solid",
    context: opts?.context,
    pageCount: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function createTextElement(partial?: Partial<PageTextElement>): PageTextElement {
  return {
    id: uid(),
    x: 40,
    y: 60,
    width: 220,
    height: 80,
    text: "",
    fontSize: 18,
    list: "none",
    ...partial,
  };
}

export function createImageElement(uri: string, partial?: Partial<PageImageElement>): PageImageElement {
  return {
    id: uid(),
    x: 48,
    y: 80,
    width: 200,
    height: 160,
    uri,
    storage: "local",
    ...partial,
  };
}

/** Typed + titled + ready recognition text for search (never invents OCR). */
export function pageSearchBlob(page: NotebookPage): string {
  const bits = [
    page.title ?? "",
    ...(page.textElements ?? []).map((t) => t.text),
    recognitionSearchText(page),
  ];
  return bits.join(" ").toLowerCase();
}

export function createPage(notebookId: string, index: number, paper: PaperStyle = "ruled"): NotebookPage {
  return {
    id: uid(),
    notebookId,
    index,
    paper,
    updatedAt: new Date().toISOString(),
  };
}

export function pagesForNotebook(pages: Record<string, NotebookPage>, notebookId: string): NotebookPage[] {
  return Object.values(pages || {})
    .filter((p) => p.notebookId === notebookId)
    .sort((a, b) => a.index - b.index);
}

export function reindexPages(pages: NotebookPage[]): NotebookPage[] {
  return pages.map((p, index) => ({ ...p, index, updatedAt: new Date().toISOString() }));
}
