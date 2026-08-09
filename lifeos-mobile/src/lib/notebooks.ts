import type {
  Notebook,
  NotebookContextLink,
  NotebookCoverStyle,
  NotebookFolder,
  NotebookHub,
  NotebookPage,
  PageImageElement,
  PageTextElement,
  PaperColor,
  PaperOrientation,
  PaperSizePreset,
  PaperStyle,
} from "../types";
import { recognitionSearchText } from "./handwritingRecognition";
import { uid } from "./helpers";

export const PAPER_OPTIONS: { key: PaperStyle; label: string }[] = [
  { key: "blank", label: "Plain" },
  { key: "ruled", label: "Ruled" },
  { key: "narrowRuled", label: "Legal" },
  { key: "grid", label: "Checked" },
  { key: "graph", label: "Graph" },
  { key: "dotted", label: "Dotted" },
  { key: "cornell", label: "Cornell" },
  { key: "todo", label: "To-do" },
  { key: "music", label: "Music" },
];

/** Essentials tab — Noteshelf-style core set. */
export const PAPER_ESSENTIALS: PaperStyle[] = ["blank", "ruled", "grid", "dotted", "narrowRuled"];

/** Custom / more templates beyond essentials. */
export const PAPER_CUSTOM: PaperStyle[] = ["cornell", "todo", "music", "graph", "narrowRuled"];

export const PAPER_COLOR_OPTIONS: { key: PaperColor; hex: string; label: string }[] = [
  { key: "white", hex: "#FFFFFF", label: "White" },
  { key: "cream", hex: "#F4EFE4", label: "Cream" },
  { key: "yellow", hex: "#F7E7A5", label: "Yellow" },
  { key: "black", hex: "#1C1C1E", label: "Black" },
];

export const PAPER_SIZE_OPTIONS: { key: PaperSizePreset; label: string }[] = [
  { key: "ipad", label: "iPad" },
  { key: "letter", label: "Letter" },
  { key: "a4", label: "A4" },
];

export function paperColorHex(color?: PaperColor): string {
  return PAPER_COLOR_OPTIONS.find((c) => c.key === color)?.hex ?? "#FFFFFF";
}

/** Starter page templates — paper + optional seed text (no fake handwriting). */
export type PageTemplate = {
  id: string;
  label: string;
  paper: PaperStyle;
  title?: string;
  seedTexts?: Array<Partial<PageTextElement> & { text: string }>;
};

export const PAGE_TEMPLATES: PageTemplate[] = [
  { id: "blank", label: "Blank", paper: "blank" },
  { id: "ruled", label: "Ruled", paper: "ruled" },
  { id: "legal", label: "Legal", paper: "narrowRuled" },
  { id: "checked", label: "Checked", paper: "grid" },
  { id: "graph", label: "Graph", paper: "graph" },
  { id: "dotted", label: "Dotted", paper: "dotted" },
  { id: "cornell", label: "Cornell", paper: "cornell", title: "Notes" },
  {
    id: "todo",
    label: "To-do",
    paper: "todo",
    title: "To-do",
    seedTexts: [{ text: "Today", y: 40, fontSize: 18, bold: true, width: 220, height: 40 }],
  },
  { id: "music", label: "Music", paper: "music" },
  {
    id: "meeting",
    label: "Meeting",
    paper: "ruled",
    title: "Meeting",
    seedTexts: [
      { text: "Attendees", y: 56, fontSize: 14, bold: true, width: 280, height: 36 },
      { text: "Agenda", y: 120, fontSize: 14, bold: true, width: 280, height: 36 },
      { text: "Actions", y: 280, fontSize: 14, bold: true, width: 280, height: 36 },
    ],
  },
  {
    id: "lecture",
    label: "Lecture",
    paper: "cornell",
    title: "Lecture",
    seedTexts: [
      { text: "Topic", y: 40, fontSize: 16, bold: true, width: 240, height: 32 },
      { text: "Key ideas", y: 100, fontSize: 14, bold: true, width: 240, height: 32 },
    ],
  },
  {
    id: "daily",
    label: "Daily",
    paper: "ruled",
    title: "Daily",
    seedTexts: [
      { text: "Focus", y: 48, fontSize: 16, bold: true, width: 220, height: 32 },
      { text: "Notes", y: 140, fontSize: 14, bold: true, width: 220, height: 32 },
    ],
  },
  {
    id: "brainstorm",
    label: "Ideas",
    paper: "dotted",
    title: "Ideas",
    seedTexts: [{ text: "Brainstorm", y: 40, fontSize: 18, bold: true, width: 240, height: 36 }],
  },
];

export const NOTEBOOK_COLORS = [
  "#625AF6",
  "#3F7ED7",
  "#31926A",
  "#D38232",
  "#D95754",
  "#202124",
  "#8B5CF6",
  "#0D9488",
  "#DB2777",
  "#4338CA",
  "#EA580C",
  "#64748B",
] as const;

export const NOTEBOOK_COVERS: { key: NotebookCoverStyle; label: string }[] = [
  { key: "solid", label: "Simple" },
  { key: "minimal", label: "Minimal" },
  { key: "colorful", label: "Colorful" },
  { key: "academic", label: "Academic" },
  { key: "gradient", label: "Gradient" },
  { key: "linen", label: "Linen" },
  { key: "slate", label: "Slate" },
  { key: "leather", label: "Leather" },
  { key: "band", label: "Band" },
  { key: "sketch", label: "Sketch" },
  { key: "midnight", label: "Midnight" },
  { key: "mosaic", label: "Mosaic" },
  { key: "ribbon", label: "Ribbon" },
  { key: "kraft", label: "Kraft" },
];

export const TEXT_SIZES = [14, 18, 24, 32] as const;

/** US Letter aspect (width:height) for notebook sheets in the editor. */
export const PAGE_ASPECT = 8.5 / 11;
/** Subtle gap between pages in Seamless view — keeps pages continuous, not separate screens. */
export const PAGE_GAP = 8;
export const PAGE_SHEET_COLOR = "#FFFFFF";

export function pageAspectFor(
  orientation: PaperOrientation = "portrait",
  size: PaperSizePreset = "ipad",
): number {
  const base = size === "a4" ? 210 / 297 : size === "letter" ? 8.5 / 11 : PAGE_ASPECT;
  return orientation === "landscape" ? 1 / base : base;
}

export function pageHeightForWidth(
  width: number,
  orientation: PaperOrientation = "portrait",
  size: PaperSizePreset = "ipad",
): number {
  const aspect = pageAspectFor(orientation, size);
  return Math.max(240, Math.round(width / aspect));
}

export function pageSizeForWidth(
  width: number,
  orientation: PaperOrientation = "portrait",
  size: PaperSizePreset = "ipad",
): { width: number; height: number } {
  const w = Math.max(240, Math.round(width));
  return { width: w, height: pageHeightForWidth(w, orientation, size) };
}

export function emptyNotebookHub(): NotebookHub {
  return { folders: [], notebooks: [] };
}

export function createFolder(name: string, color?: string): NotebookFolder {
  const now = new Date().toISOString();
  return { id: uid(), name: name.trim() || "Untitled folder", color, createdAt: now, updatedAt: now };
}

export function createNotebook(
  name: string,
  opts?: {
    folderId?: string;
    color?: string;
    cover?: NotebookCoverStyle;
    coverSubtitle?: string;
    context?: NotebookContextLink;
  },
): Notebook {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: name.trim() || "Untitled note",
    folderId: opts?.folderId,
    color: opts?.color ?? NOTEBOOK_COLORS[0],
    cover: opts?.cover ?? "solid",
    coverSubtitle: opts?.coverSubtitle,
    context: opts?.context,
    pageCount: 1,
    createdAt: now,
    updatedAt: now,
  };
}

/** Move a notebook into a folder, or pass `undefined` / omit to unfile it. */
export function setNotebookFolder(
  hub: NotebookHub,
  notebookId: string,
  folderId: string | undefined,
): NotebookHub {
  const now = new Date().toISOString();
  return {
    ...hub,
    notebooks: hub.notebooks.map((notebook) => {
      if (notebook.id !== notebookId) return notebook;
      const next = { ...notebook, updatedAt: now };
      if (folderId) next.folderId = folderId;
      else delete next.folderId;
      return next;
    }),
  };
}

export function setNotebookStarred(hub: NotebookHub, notebookId: string, starred: boolean): NotebookHub {
  const now = new Date().toISOString();
  return {
    ...hub,
    notebooks: hub.notebooks.map((notebook) => {
      if (notebook.id !== notebookId) return notebook;
      const next = { ...notebook, updatedAt: now };
      if (starred) next.starred = true;
      else delete next.starred;
      return next;
    }),
  };
}

export function trashNotebook(hub: NotebookHub, notebookId: string): NotebookHub {
  const now = new Date().toISOString();
  return {
    ...hub,
    notebooks: hub.notebooks.map((notebook) =>
      notebook.id === notebookId ? { ...notebook, trashedAt: now, updatedAt: now } : notebook,
    ),
  };
}

export function restoreNotebook(hub: NotebookHub, notebookId: string): NotebookHub {
  const now = new Date().toISOString();
  return {
    ...hub,
    notebooks: hub.notebooks.map((notebook) => {
      if (notebook.id !== notebookId) return notebook;
      const next = { ...notebook, updatedAt: now };
      delete next.trashedAt;
      return next;
    }),
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

/** Deep-ish copy for Duplicate — new ids on overlays so edits don't alias. */
export function cloneNotebookPage(source: NotebookPage, index: number): NotebookPage {
  const base = createPage(source.notebookId, index, source.paper);
  return {
    ...base,
    ink: source.ink ? { ...source.ink } : undefined,
    title: source.title ? `${source.title} copy` : undefined,
    textElements: (source.textElements ?? []).map((t) => ({ ...t, id: uid() })),
    imageElements: (source.imageElements ?? []).map((img) => ({ ...img, id: uid() })),
    recognition: undefined,
  };
}

export function pageFromTemplate(
  notebookId: string,
  index: number,
  template: PageTemplate,
): NotebookPage {
  const page = createPage(notebookId, index, template.paper);
  return {
    ...page,
    title: template.title,
    textElements: (template.seedTexts ?? []).map((seed) => createTextElement(seed)),
  };
}

export function pagesForNotebook(pages: Record<string, NotebookPage>, notebookId: string): NotebookPage[] {
  return Object.values(pages || {})
    .filter((p) => p.notebookId === notebookId)
    .sort((a, b) => a.index - b.index);
}

/** Page to open when tapping a note — most recently edited, else first page. */
export function primaryPageForNotebook(
  pages: Record<string, NotebookPage>,
  notebookId: string,
): NotebookPage | undefined {
  const list = pagesForNotebook(pages, notebookId);
  if (!list.length) return undefined;
  return [...list].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0] ?? list[0];
}

export function reindexPages(pages: NotebookPage[]): NotebookPage[] {
  return pages.map((p, index) => ({ ...p, index, updatedAt: new Date().toISOString() }));
}

/** Swap two pages in order, then reindex. */
export function movePageInList(pages: NotebookPage[], pageId: string, direction: -1 | 1): NotebookPage[] | null {
  const index = pages.findIndex((p) => p.id === pageId);
  const swap = index + direction;
  if (index < 0 || swap < 0 || swap >= pages.length) return null;
  const next = [...pages];
  const tmp = next[index];
  next[index] = next[swap];
  next[swap] = tmp;
  return reindexPages(next);
}
