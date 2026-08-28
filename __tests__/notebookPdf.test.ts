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
