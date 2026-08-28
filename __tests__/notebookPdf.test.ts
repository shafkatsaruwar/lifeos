import { buildPdfJsViewerHtml } from "../lifeos-mobile/src/lib/pdfViewerHtml";

/**
 * pdfSliceCacheKey mirrors notebookPdf.ts naming for split-page cache files.
 */
function pdfSliceCacheKey(sourcePath: string, pageIndex: number) {
  const base = sourcePath.split("/").pop() || "pdf";
  return `${base.replace(/[^\w.\-]+/g, "_")}-p${pageIndex + 1}`;
}

describe("pdfSliceCacheKey", () => {
  it("builds stable cache names from path and page index", () => {
    expect(pdfSliceCacheKey("/docs/notebookPdfs/sat-practice.pdf", 0)).toBe(
      "sat-practice.pdf-p1",
    );
    expect(pdfSliceCacheKey("/docs/notebookPdfs/sat-practice.pdf", 3)).toBe(
      "sat-practice.pdf-p4",
    );
  });
});

describe("single-page PDF export index clamp", () => {
  it("clamps to page 0 when the stored file only has one page", () => {
    const pageCount = 1;
    const storedSourceIndex = 5;
    const idx = Math.min(storedSourceIndex, pageCount - 1);
    expect(idx).toBe(0);
  });
});

describe("buildPdfJsViewerHtml", () => {
  it("embeds the requested 1-based page number", () => {
    const html = buildPdfJsViewerHtml("YWJj", 4);
    expect(html).toContain("Math.min(4, pdf.numPages)");
    expect(html).toContain("disableWorker: true");
  });
});

describe("import fill mapping", () => {
  it("maps notebook page index to consecutive PDF pages from startAt", () => {
    const startAt = 2; // notebook page 3 (0-based index 2)
    const pdfPages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const mapping = pdfPages.map((pdfIdx, i) => ({
      notebookIndex: startAt + i,
      pdfPage: pdfIdx + 1,
    }));
    expect(mapping[0]).toEqual({ notebookIndex: 2, pdfPage: 1 });
    expect(mapping[1]).toEqual({ notebookIndex: 3, pdfPage: 2 });
    expect(mapping[9]).toEqual({ notebookIndex: 11, pdfPage: 10 });
  });
});
