const PDF_JS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

/** Inline PDF.js viewer — WKWebView's built-in PDF renderer ignores #page= on local PDF URIs. */
export function buildPdfJsViewerHtml(pdfBase64: string, pageNumber: number): string {
  const safeB64 = pdfBase64.replace(/\\/g, "").replace(/'/g, "");
  const page = Math.max(1, Math.floor(pageNumber));
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #fff; overflow: hidden; }
  #wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
  canvas { display: block; max-width: 100%; max-height: 100%; }
</style>
<script src="${PDF_JS}"></script>
</head>
<body>
<div id="wrap"><canvas id="c"></canvas></div>
<script>
  (async function () {
    try {
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib) return;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const raw = atob("${safeB64}");
      const data = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i);
      const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
      const pageNum = Math.min(${page}, pdf.numPages);
      const pdfPage = await pdf.getPage(pageNum);
      const canvas = document.getElementById("c");
      const wrap = document.getElementById("wrap");
      const vp1 = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(wrap.clientWidth / vp1.width, wrap.clientHeight / vp1.height);
      const vp = pdfPage.getViewport({ scale });
      canvas.width = vp.width;
      canvas.height = vp.height;
      await pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
    } catch (e) {
      /* keep blank — underlay is optional */
    }
  })();
</script>
</body>
</html>`;
}
