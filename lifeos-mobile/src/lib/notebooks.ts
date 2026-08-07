import type {
  Notebook,
  NotebookFolder,
  NotebookHub,
  NotebookPage,
  PaperStyle,
} from "../types";
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

export function emptyNotebookHub(): NotebookHub {
  return { folders: [], notebooks: [] };
}

export function createFolder(name: string, color?: string): NotebookFolder {
  const now = new Date().toISOString();
  return { id: uid(), name: name.trim() || "Untitled folder", color, createdAt: now, updatedAt: now };
}

export function createNotebook(name: string, opts?: { folderId?: string; color?: string }): Notebook {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: name.trim() || "Untitled notebook",
    folderId: opts?.folderId,
    color: opts?.color ?? NOTEBOOK_COLORS[0],
    cover: "solid",
    pageCount: 1,
    createdAt: now,
    updatedAt: now,
  };
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
