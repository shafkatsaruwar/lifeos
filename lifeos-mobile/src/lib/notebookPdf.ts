/**
 * PDF notebook pipeline — import pages + export annotated notebooks.
 * Export composites paper guides + PencilKit ink (via native PKDrawing render) + overlays.
 */
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { Platform } from "react-native";
import type { NotebookPage, PaperColor, PaperStyle } from "../types";
import { createPage, pagesForNotebook, paperColorHex, reindexPages } from "./notebooks";

async function renderDrawingPng(
  base64String: string,
  width: number,
  height: number,
  scale = 2,
): Promise<string> {
  try {
    // Lazy: expo-pencilkit-ui must not load during app startup / before native runtime.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-pencilkit-ui") as {
      renderDrawingPng?: (data: string, w: number, h: number, s?: number) => Promise<string>;
    };
    if (!mod.renderDrawingPng) return "";
    return (await mod.renderDrawingPng(base64String, width, height, scale)) || "";
  } catch {
    return "";
  }
}

export type PdfImportPlan = {
  fileName: string;
  localUri: string;
  storagePath: string;
  pageCount: number;
};

export type PdfExportPlan = {
  notebookId: string;
  notebookName: string;
  pages: NotebookPage[];
  includeInk: boolean;
  includeOverlays: boolean;
  /** Editor canvas size in points — must match where PencilKit strokes were drawn. */
  canvasWidth?: number;
  canvasHeight?: number;
};

const BASE64 = "base64" as const;
/** US Letter in PDF points */
const LETTER_W = 612;
const LETTER_H = 792;

export function isPdfPipelineAvailable(): boolean {
  return true;
}

export async function planPdfImport(_fileUri?: string): Promise<PdfImportPlan | null> {
  let uri = _fileUri;
  let fileName = _fileUri?.split("/").pop() || "import.pdf";

  if (!uri) {
    const picked = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.length) return null;
    uri = picked.assets[0].uri;
    fileName = picked.assets[0].name || fileName;
  }
  if (!uri) return null;

  const dir = `${FileSystem.documentDirectory}notebookPdfs/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  const storagePath = `${dir}${Date.now()}-${fileName.replace(/[^\w.\-]+/g, "_")}`;
  await FileSystem.copyAsync({ from: uri, to: storagePath });

  const bytes = await FileSystem.readAsStringAsync(storagePath, { encoding: BASE64 });
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = Math.max(1, pdf.getPageCount());

  return { fileName, localUri: storagePath, storagePath, pageCount };
}

/** One extracted PDF page — always a single-page file for reliable WKWebView display. */
export type PdfPageSlice = {
  storagePath: string;
  /** Original page index inside the imported source PDF (0-based). */
  sourcePageIndex: number;
};

async function renderPdfPagePngNative(
  filePath: string,
  pageIndex: number,
  scale = 2,
): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-pencilkit-ui") as {
      renderPdfPagePng?: (path: string, pageIndex: number, scale?: number) => Promise<string>;
    };
    if (!mod.renderPdfPagePng || Platform.OS !== "ios") return "";
    return (await mod.renderPdfPagePng(filePath, pageIndex, scale)) || "";
  } catch {
    return "";
  }
}

function pdfPreviewCachePath(sourcePath: string, pageIndex: number) {
  const dir = `${FileSystem.documentDirectory}notebookPdfs/previews/`;
  return `${dir}${pdfSliceCacheKey(sourcePath, pageIndex)}-v2.png`;
}

/**
 * Rasterize one PDF page to a cached PNG via native PDFKit.
 * Works for multi-page source files — each pageIndex renders the matching PDF page.
 */
export async function rasterizePdfPageImage(
  storagePath: string,
  pageIndex: number,
  scale = 2,
): Promise<string | null> {
  const previewDir = `${FileSystem.documentDirectory}notebookPdfs/previews/`;
  await FileSystem.makeDirectoryAsync(previewDir, { intermediates: true }).catch(() => undefined);
  const outPath = pdfPreviewCachePath(storagePath, pageIndex);
  const cached = await FileSystem.getInfoAsync(outPath);
  if (cached.exists) return outPath;

  const pngB64 = await renderPdfPagePngNative(storagePath, pageIndex, scale);
  if (!pngB64) return null;

  await FileSystem.writeAsStringAsync(outPath, pngB64, { encoding: BASE64 });
  return outPath;
}

/** Local file URI for the rasterized PDF page image backing a notebook page. */
export async function resolvePdfPageImageUri(
  ref: NonNullable<NotebookPage["pdfRef"]>,
): Promise<string | null> {
  if (ref.previewImagePath) {
    const info = await FileSystem.getInfoAsync(ref.previewImagePath);
    if (info.exists) return ref.previewImagePath;
  }
  return await rasterizePdfPageImage(ref.storagePath, ref.pageIndex);
}

function pdfSliceCacheKey(sourcePath: string, pageIndex: number) {
  const base = sourcePath.split("/").pop() || "pdf";
  return `${base.replace(/[^\w.\-]+/g, "_")}-p${pageIndex + 1}`;
}

/**
 * WKWebView ignores `#page=` on local PDFs — extract one page into its own file.
 * Cached under notebookPdfs/split/ so legacy imports self-heal on first view.
 */
export async function extractSinglePagePdf(
  sourcePath: string,
  pageIndex: number,
): Promise<string> {
  const dir = `${FileSystem.documentDirectory}notebookPdfs/split/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  const cachePath = `${dir}${pdfSliceCacheKey(sourcePath, pageIndex)}.pdf`;
  const cached = await FileSystem.getInfoAsync(cachePath);
  if (cached.exists) return cachePath;

  const bytes = await FileSystem.readAsStringAsync(sourcePath, { encoding: BASE64 });
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const idx = Math.min(Math.max(0, pageIndex), source.getPageCount() - 1);
  const doc = await PDFDocument.create();
  const [copied] = await doc.copyPages(source, [idx]);
  doc.addPage(copied);
  const outB64 = await doc.saveAsBase64({ dataUri: false });
  await FileSystem.writeAsStringAsync(cachePath, outB64, { encoding: BASE64 });
  return cachePath;
}

/** Split an imported PDF into single-page files (capped for safety). */
export async function splitPdfToSinglePageFiles(
  plan: PdfImportPlan,
  maxPages = 100,
): Promise<PdfPageSlice[]> {
  const count = Math.min(plan.pageCount, maxPages);
  const dir = `${FileSystem.documentDirectory}notebookPdfs/split/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  const stamp = Date.now();
  const baseName = plan.fileName.replace(/\.pdf$/i, "").replace(/[^\w.\-]+/g, "_");

  const bytes = await FileSystem.readAsStringAsync(plan.storagePath, { encoding: BASE64 });
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const slices: PdfPageSlice[] = [];
  for (let i = 0; i < count; i++) {
    const cachePath = `${dir}${stamp}-${baseName}-p${i + 1}.pdf`;
    const doc = await PDFDocument.create();
    const [copied] = await doc.copyPages(source, [i]);
    doc.addPage(copied);
    const outB64 = await doc.saveAsBase64({ dataUri: false });
    await FileSystem.writeAsStringAsync(cachePath, outB64, { encoding: BASE64 });
    slices.push({ storagePath: cachePath, sourcePageIndex: i });
  }
  return slices;
}

/**
 * Resolve a display URI for WKWebView. iOS cannot jump to arbitrary PDF pages via URL fragments,
 * so each notebook page must point at a single-page PDF file.
 */
export async function resolvePdfDisplayUri(
  ref: NonNullable<NotebookPage["pdfRef"]>,
): Promise<string | null> {
  if (!ref.storagePath) return null;
  try {
    const info = await FileSystem.getInfoAsync(ref.storagePath);
    if (!info.exists) return null;

    const bytes = await FileSystem.readAsStringAsync(ref.storagePath, { encoding: BASE64 });
    const probe = await PDFDocument.load(bytes, { ignoreEncryption: true });
    if (probe.getPageCount() <= 1) return ref.storagePath;

    return await extractSinglePagePdf(ref.storagePath, ref.pageIndex);
  } catch {
    return null;
  }
}

/** Base64 PDF bytes + 1-based page number for PDF.js rendering in WebView. */
export async function resolvePdfDisplayPayload(
  ref: NonNullable<NotebookPage["pdfRef"]>,
): Promise<{ base64: string; pageNumber: number } | null> {
  const path = await resolvePdfDisplayUri(ref);
  if (!path) return null;
  try {
    const base64 = await FileSystem.readAsStringAsync(path, { encoding: BASE64 });
    return { base64, pageNumber: 1 };
  } catch {
    return null;
  }
}

/**
 * Fill notebook pages starting at `startAtIndex` with consecutive PDF pages.
 * Example: import on notebook page 3 with a 10-page PDF → page 3 = PDF p.1, page 4 = PDF p.2, …
 */
export async function applyPdfImportToNotebook(
  notebookId: string,
  plan: PdfImportPlan,
  existingPages: NotebookPage[],
  startAtIndex: number,
  maxPages = 100,
): Promise<{ pages: NotebookPage[] }> {
  const slices = await splitPdfToSinglePageFiles(plan, maxPages);
  const sorted = [...existingPages].sort((a, b) => a.index - b.index);
  const merged = new Map(sorted.map((p) => [p.id, { ...p }]));
  const baseTitle = plan.fileName.replace(/\.pdf$/i, "");

  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    const targetIndex = startAtIndex + i;
    const previewImagePath = await rasterizePdfPageImage(plan.storagePath, slice.sourcePageIndex);
    const pdfRef = {
      storagePath: plan.storagePath,
      pageIndex: slice.sourcePageIndex,
      pageCount: plan.pageCount,
      fileName: plan.fileName,
      previewImagePath: previewImagePath || undefined,
    };
    const title = `${baseTitle} · p.${slice.sourcePageIndex + 1}`;
    const existing = sorted.find((p) => p.index === targetIndex);

    if (existing) {
      merged.set(existing.id, {
        ...existing,
        pdfRef,
        title: existing.title || title,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const page = createPage(notebookId, targetIndex, "blank");
      page.pdfRef = pdfRef;
      page.title = title;
      merged.set(page.id, page);
    }
  }

  const pages = reindexPages(Array.from(merged.values()).sort((a, b) => a.index - b.index));
  return { pages };
}

/** @deprecated Use applyPdfImportToNotebook — fills from a start index instead of always appending. */
export async function pagesFromPdfImport(
  notebookId: string,
  plan: PdfImportPlan,
  startIndex = 0,
  maxPages = 40,
): Promise<NotebookPage[]> {
  const { pages } = await applyPdfImportToNotebook(notebookId, plan, [], startIndex, maxPages);
  return pages;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const n = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

function drawPaperGuides(
  pdfPage: PDFPage,
  paper: PaperStyle,
  paperColor: PaperColor | undefined,
  width: number,
  height: number,
) {
  const tint = hexToRgb(paperColorHex(paperColor));
  pdfPage.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(tint.r, tint.g, tint.b),
  });

  if (paper === "blank") return;

  // Scale PaperBackground's canvas-ish spacing onto the PDF page.
  const refW = 390;
  const refH = 504;
  const sx = width / refW;
  const sy = height / refH;
  const dark = paperColor === "black";

  const hLine = (canvasY: number, color: ReturnType<typeof rgb>, thickness = 0.55) => {
    const y = height - canvasY * sy;
    if (y < 0 || y > height) return;
    pdfPage.drawLine({
      start: { x: 0, y },
      end: { x: width, y },
      thickness,
      color,
    });
  };

  if (paper === "ruled" || paper === "narrowRuled") {
    const gap = paper === "narrowRuled" ? 22 : 32;
    const line = dark ? rgb(0.86, 0.88, 0.92) : rgb(0.55, 0.62, 0.78);
    for (let i = 0; i < 48; i++) hLine(48 + i * gap, line);
    const marginX = 36 * sx;
    pdfPage.drawLine({
      start: { x: marginX, y: 0 },
      end: { x: marginX, y: height },
      thickness: 0.9,
      color: dark ? rgb(0.97, 0.44, 0.44) : rgb(0.86, 0.47, 0.47),
    });
    return;
  }

  if (paper === "grid" || paper === "graph") {
    const gap = paper === "graph" ? 16 : 28;
    const color = dark ? rgb(0.55, 0.58, 0.64) : rgb(0.72, 0.75, 0.8);
    for (let i = 0; i < 80; i++) {
      const x = 16 * sx + i * gap * sx;
      if (x > width) break;
      pdfPage.drawLine({
        start: { x, y: 0 },
        end: { x, y: height },
        thickness: 0.4,
        color,
      });
    }
    for (let i = 0; i < 80; i++) hLine(16 + i * gap, color, 0.4);
    return;
  }

  if (paper === "dotted") {
    const color = dark ? rgb(0.75, 0.78, 0.85) : rgb(0.55, 0.58, 0.65);
    for (let row = 0; row < 36; row++) {
      for (let col = 0; col < 24; col++) {
        const cx = (18 + col * 22) * sx;
        const cy = height - (18 + row * 22) * sy;
        if (cx > width || cy < 0) continue;
        pdfPage.drawCircle({ x: cx, y: cy, size: 1.15, color });
      }
    }
    return;
  }

  if (paper === "cornell") {
    const line = dark ? rgb(0.86, 0.88, 0.92) : rgb(0.55, 0.62, 0.78);
    for (let i = 0; i < 40; i++) hLine(48 + i * 32, line, 0.5);
    const cueW = width * 0.32;
    const summaryY = height * 0.22;
    pdfPage.drawLine({
      start: { x: cueW, y: summaryY },
      end: { x: cueW, y: height },
      thickness: 0.8,
      color: rgb(0.7, 0.72, 0.78),
    });
    pdfPage.drawLine({
      start: { x: 0, y: summaryY },
      end: { x: width, y: summaryY },
      thickness: 0.8,
      color: rgb(0.7, 0.72, 0.78),
    });
  }
}

async function embedInkPng(
  pdf: PDFDocument,
  pdfPage: PDFPage,
  page: NotebookPage,
  canvasW: number,
  canvasH: number,
  pdfW: number,
  pdfH: number,
) {
  const data = page.ink?.data || page.ink?.pencilKitData;
  if (!data || Platform.OS !== "ios") return;

  try {
    const pngB64 = await renderDrawingPng(data, canvasW, canvasH, 2);
    if (!pngB64) return;
    const bytes = Uint8Array.from(atob(pngB64), (c) => c.charCodeAt(0));
    const image = await pdf.embedPng(bytes);
    pdfPage.drawImage(image, {
      x: 0,
      y: 0,
      width: pdfW,
      height: pdfH,
    });
  } catch {
    /* keep paper / overlays even if ink render fails */
  }
}

async function drawOverlays(
  pdf: PDFDocument,
  pdfPage: PDFPage,
  page: NotebookPage,
  canvasW: number,
  canvasH: number,
  pdfW: number,
  pdfH: number,
  font: PDFFont,
  fontBold: PDFFont,
) {
  const sx = pdfW / canvasW;
  const sy = pdfH / canvasH;

  for (const el of page.imageElements || []) {
    try {
      const info = await FileSystem.getInfoAsync(el.uri);
      if (!info.exists) continue;
      const b64 = await FileSystem.readAsStringAsync(el.uri, { encoding: BASE64 });
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const lower = el.uri.toLowerCase();
      const image = lower.endsWith(".jpg") || lower.endsWith(".jpeg")
        ? await pdf.embedJpg(bytes)
        : await pdf.embedPng(bytes);
      const w = (el.width || 120) * sx;
      const h = (el.height || 120) * sy;
      const x = el.x * sx;
      const y = pdfH - el.y * sy - h;
      pdfPage.drawImage(image, { x, y, width: w, height: h, opacity: el.opacity ?? 1 });
    } catch {
      /* skip broken image */
    }
  }

  for (const el of page.textElements || []) {
    const size = (el.fontSize || 14) * Math.min(sx, sy);
    const x = el.x * sx;
    const y = pdfH - el.y * sy - size;
    pdfPage.drawText(el.text || "", {
      x,
      y: Math.max(8, y),
      size,
      font: el.bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.12),
      maxWidth: (el.width || canvasW - el.x) * sx,
      lineHeight: size * 1.3,
      opacity: el.opacity ?? 1,
    });
  }
}

export async function planPdfExport(
  plan: PdfExportPlan,
): Promise<{ ok: true; uri: string } | { ok: false; reason: string }> {
  try {
    const ordered = [...plan.pages].sort((a, b) => a.index - b.index);
    if (!ordered.length) return { ok: false, reason: "No pages to export." };

    const canvasW = Math.max(240, plan.canvasWidth || 390);
    const canvasH = Math.max(320, plan.canvasHeight || Math.round(canvasW / (8.5 / 11)));

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    for (const page of ordered) {
      if (page.pdfRef?.storagePath) {
        try {
          const exists = await FileSystem.getInfoAsync(page.pdfRef.storagePath);
          if (exists.exists) {
            const b64 = await FileSystem.readAsStringAsync(page.pdfRef.storagePath, {
              encoding: BASE64,
            });
            const source = await PDFDocument.load(b64, { ignoreEncryption: true });
            const idx = Math.min(page.pdfRef.pageIndex, source.getPageCount() - 1);
            const [copied] = await pdf.copyPages(source, [idx]);
            pdf.addPage(copied);
            const { width, height } = copied.getSize();
            if (plan.includeInk) {
              await embedInkPng(pdf, copied, page, canvasW, canvasH, width, height);
            }
            if (plan.includeOverlays) {
              await drawOverlays(pdf, copied, page, canvasW, canvasH, width, height, font, fontBold);
            }
            continue;
          }
        } catch {
          /* fall through to paper page */
        }
      }

      const orientation = page.paperOrientation === "landscape" ? "landscape" : "portrait";
      const pdfW = orientation === "landscape" ? LETTER_H : LETTER_W;
      const pdfH = orientation === "landscape" ? LETTER_W : LETTER_H;
      const blank = pdf.addPage([pdfW, pdfH]);

      drawPaperGuides(blank, page.paper || "blank", page.paperColor, pdfW, pdfH);

      if (plan.includeInk) {
        await embedInkPng(pdf, blank, page, canvasW, canvasH, pdfW, pdfH);
      }
      if (plan.includeOverlays) {
        await drawOverlays(pdf, blank, page, canvasW, canvasH, pdfW, pdfH, font, fontBold);
      }
    }

    const outB64 = await pdf.saveAsBase64({ dataUri: false });
    const outPath = `${FileSystem.cacheDirectory}${plan.notebookName.replace(/[^\w.\-]+/g, "_") || "notebook"}-${Date.now()}.pdf`;
    await FileSystem.writeAsStringAsync(outPath, outB64, { encoding: BASE64 });
    return { ok: true, uri: outPath };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Export failed",
    };
  }
}

export async function sharePdf(uri: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
  }
}

export function notebookPagesForExport(
  pages: Record<string, NotebookPage>,
  notebookId: string,
): NotebookPage[] {
  return pagesForNotebook(pages, notebookId);
}
