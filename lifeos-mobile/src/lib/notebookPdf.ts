/**
 * PDF notebook architecture (Phase 6) — placeholders only.
 *
 * Goal (eventually):
 * - Import a PDF into a notebook (one NotebookPage per PDF page, or lazy pages)
 * - Show the PDF page as an underlay
 * - Annotate with Apple PencilKit on top (ink stays editable PKDrawing)
 * - Export annotated PDF
 *
 * Do NOT fake PDF viewing or annotation. Wire these functions when
 * a PDF renderer + Storage upload path exist (e.g. react-native-pdf + Firebase Storage).
 */

export type PdfImportPlan = {
  fileName: string;
  localUri: string;
  /** Destination under users/{uid}/notebookPdfs/… */
  storagePath?: string;
  pageCount?: number;
};

export type PdfExportPlan = {
  notebookId: string;
  /** Flatten ink + overlays onto PDF pages — requires native render pass */
  includeInk: boolean;
  includeOverlays: boolean;
};

/** Returns false until a PDF module and Storage path are implemented. */
export function isPdfPipelineAvailable(): boolean {
  return false;
}

export async function planPdfImport(_fileUri: string): Promise<PdfImportPlan | null> {
  // Architecture hook: pick file → upload to Storage → create pages with pdfRef.
  return null;
}

export async function planPdfExport(_plan: PdfExportPlan): Promise<{ ok: false; reason: string }> {
  return { ok: false, reason: "PDF export is not implemented yet." };
}
